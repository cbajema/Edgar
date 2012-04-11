import db
import ala
import logging
import multiprocessing
import binascii
from sqlalchemy import func, select

log = logging.getLogger(__name__)


class Syncer:

    def __init__(self):
        '''TODO: might pass db into here for unit testing purposes instead of
        using the module directly. Might also do the same for ala module.'''

        row = db.sources.select('id')\
                .where(db.sources.c.name == 'ALA')\
                .execute().fetchone()

        if row is None:
            raise RuntimeError('ALA row missing from sources table in db')

        self.source_row_id = row['id']
        self.cached_upserts = []
        self.num_dirty_records_by_species_id = {}

    def local_species(self):
        '''Returns all species in the local db in a dict. Scientific name is the
        key, the db row is the value.'''

        species = {}
        for row in db.species.select().execute():
            species[row['scientific_name']] = row;
        return species

    def remote_species(self):
        '''Returns all species available at ALA in a dict. Scientific name is the
        key, the ala.Species object is the value.'''

        species = {}
        for bird in ala.all_bird_species():
            species[bird.scientific_name] = bird
        return species

    def added_and_deleted_species(self):
        '''Returns (added, deleted) where `added` is an iterable of ala.Species
        objects that are not present in the local db, and `deleted` is an iterable
        of rows from the db.species table that were not found at ALA.'''

        local = self.local_species()
        local_set = frozenset(local.keys())
        remote = self.remote_species()
        remote_set = frozenset(remote.keys())

        added_set = remote_set - local_set
        deleted_set = local_set - remote_set

        added = [species for name, species in remote.iteritems() if name in added_set]
        deleted = [row for name, row in local.iteritems() if name in deleted_set]

        return (added, deleted)


    def add_species(self, species):
        '''Adds `species` to the local db, where `s` is an ala.Species
        object'''

        log.info('Adding new species "%s"', species.scientific_name)
        db.species.insert().execute(
            scientific_name=species.scientific_name,
            common_name=species.common_name)

    def delete_species(self, row):
        '''Deletes `row` from the local db, where `s` is a row from the
        db.species table'''

        log.info('Deleting species "%s"', row['scientific_name'])
        db.species.delete().where(db.species.c.id == row['id']).execute()

    def upsert_occurrence(self, occurrence, species_id):
        '''Looks up whether `occurrence` (an ala.OccurrenceRecord object)
        already exists in the local db. If it does, the db row is updated with
        the information in `occurrence`. If it does not exist, a new row is
        inserted.

        `species_id` must be supplied as an argument because it is not
        obtainable from `occurrence`

        The inserts/updates are cached for performance reasons. The cache is
        flushed every 1000 occurrences. YOU MUST CALL `flush_upserts` AFTER YOU
        HAVE CALLED THIS METHOD FOR THE FINAL TIME.'''

        if len(self.cached_upserts) > 1000:
            self.flush_upserts()

        # TODO: determine rating better using lists of assertions
        rating = 'assumed invalid'
        if occurrence.is_geospatial_kosher:
            rating = 'assumed valid'

        # these should be escaped strings ready for insertion into the SQL
        cols = (str(float(occurrence.latitude)),
                str(float(occurrence.longitude)),
                '"' + rating + '"',
                str(int(species_id)),
                str(int(self.source_row_id)),
                _mysql_encode_binary(occurrence.uuid.bytes))

        self.cached_upserts.append('(' + ','.join(cols) + ')')

        # record how many changes are made
        if species_id not in self.num_dirty_records_by_species_id:
            self.num_dirty_records_by_species_id[species_id] = 0
        self.num_dirty_records_by_species_id[species_id] += 1

    def flush_upserts(self):
        if len(self.cached_upserts) <= 0:
            return

        query = '''INSERT INTO occurrences(
                        latitude, longitude, rating, species_id, source_id,
                        source_record_id)

                   VALUES ''' + \
                \
                ','.join(self.cached_upserts) + \
                \
                ''' ON DUPLICATE KEY UPDATE
                        latitude=VALUES(latitude),
                        longitude=VALUES(longitude),
                        rating=VALUES(rating),
                        species_id=VALUES(species_id);'''

        db.engine.execute(query)

        self.cached_upserts = []


    def occurrences_changed_since(self, since_date):
        '''Generator for ala.OccurrenceRecord objects.

        Will use whatever is in the species table of the database, so call
        update the species table before calling this function.

        Uses a pool of processes to fetch occurrence records. The subprocesses
        feed the records into a queue which the original process reads and
        yields. This should let the main process access the database at full
        speed while the subprocesses are waiting for more records to arrive
        over the network.'''

        record_q = multiprocessing.Queue(10000)
        pool = multiprocessing.Pool(8, _mp_init, [record_q])
        active_workers = 0

        # fill the pool full with every species
        for row in db.species.select().execute():
            args = (row['scientific_name'], row['id'], since_date)
            pool.apply_async(_mp_fetch, args)
            active_workers += 1

        pool.close()

        # keep reading from the queue until all the subprocesses are finished
        while active_workers > 0:
            record = record_q.get()
            if record is None:
                active_workers -= 1
            else:
                yield record

        # all the subprocesses should be dead by now
        pool.join()


    def local_species_with_no_occurrences(self):
        '''A generator for db.species rows, for rows without any occurrence
        records in the local database'''

        for row in self.local_species().itervalues():
            q = select(['count(*)'], db.occurrences.c.species_id == row['id'])
            if db.engine.execute(q).scalar() == 0:
                yield row


    def check_occurrence_counts(self):
        '''Checks to see if the number of occurrences in the local db is the
        same as the number that ALA has. Logs warnings if the numbers are
        different.

        Returns True if all the checks pass, or False if any of the checks
        fail.'''

        counts_are_all_correct = True

        for row in self.local_species().itervalues():
            species = ala.species_for_scientific_name(row['scientific_name'])
            if species is None:
                continue

            local_count = \
                db.engine.execute(select(
                    [func.count('*')],
                    #where
                     (db.occurrences.c.species_id == row['id']) &
                     (db.occurrences.c.source_id == self.source_row_id))
                ).scalar()

            remote_count = ala.num_records_for_lsid(species.lsid)

            if remote_count != local_count:
                counts_are_all_correct = False
                log.warning('Occurrence counts differ for species %s, ' +
                            '(local count = %d, ALA count = %d)',
                            species.scientific_name,
                            local_count,
                            remote_count)

        return counts_are_all_correct


    def update_num_dirty_occurrences(self):
        '''Updates the species.num_dirty_occurrences column with the number of
        occurrences that have been changed by self.

        TODO: account for deleted records
        '''
        dirty_col = db.species.c.num_dirty_occurrences

        for row in self.local_species().itervalues():
            if row['id'] not in self.num_dirty_records_by_species_id:
                continue

            newly_dirty = self.num_dirty_records_by_species_id[row['id']]
            if newly_dirty <= 0:
                continue

            db.species.update().\
                values(num_dirty_occurrences=(dirty_col + newly_dirty)).\
                where(db.species.c.id == row['id']).\
                execute()


def _mp_init(record_q):
    '''Called when a subprocess is started. See
    Syncer.occurrences_changed_since'''
    _mp_init.record_q = record_q
    _mp_init.log = multiprocessing.log_to_stderr()


def _mp_fetch(species_sname, species_id, since_date):
    '''Gets all relevant records for the given species from ALA, and pumps the
    records into _mp_init.record_q. Puts None into the queue when finished.

    Adds a `species_id` attribute to each species object set to the argument
    given to this function.'''
    try:
        _mp_fetch_inner(species_sname, species_id, since_date)
    except:
        _mp_init.log.exception('mp process failed with exception')

    _mp_init.record_q.put(None)

def _mp_fetch_inner(species_sname, species_id, since_date):
    species = ala.species_for_scientific_name(species_sname)
    if species is None:
        _mp_init.log.warning('Species not found at ALA: %s', species_sname)
        return

    num_records = 0
    for record in ala.records_for_species(species.lsid, since_date):
        record.species_id = species_id
        _mp_init.record_q.put(record)
        num_records += 1

    if num_records > 0:
        _mp_init.log.info('Found %d records for "%s"',
            num_records, species_sname)

def _mysql_encode_binary(binstr):
    '''
    >>> _mysql_encode_binary('hello')
    "x'68656c6c6f'"
    '''
    return "x'" + binascii.hexlify(binstr) + "'"
