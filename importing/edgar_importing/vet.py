from edgar_importing import db
import sqlalchemy
import argparse
import logging
import json
import datetime
import shapely
import shapely.prepared
import shapely.wkt
import shapely.geometry
from pprint import pprint

def parse_args():
    parser = argparse.ArgumentParser(description='''Recalculates occurrence
        record classifications based on vettings''')

    parser.add_argument('config', type=str, help='''The JSON config file''')

    parser.add_argument('species_id', type=int, help='''The id of the species
        to recalculate vettings for''')

    return parser.parse_args()


def main():
    args = parse_args()

    logging.basicConfig()
    logging.root.setLevel(logging.INFO)

    with open(args.config, 'rb') as f:
        db.connect(json.load(f))

    log_info('Starting');
    connection = db.engine.connect()
    transaction = connection.begin()
    try:
        vet_species(args, connection)
        log_info('Committing transaction')
        transaction.commit()
    except:
        logging.warning('Performing rollback due to exception',)
        transaction.rollback()
        raise
    finally:
        connection.close()
        log_info('Finished')


def vet_species(args, connection):
    species = connection.execute(db.species.select()\
        .where(db.species.c.id == args.species_id)\
        ).fetchone()

    log_info('Loading all vettings')
    vettings = ordered_vettings_for_species_id(species['id'], connection)

    query = occurrences_for_species_id(species['id'], connection)
    log_info('Vetting %d occurrences through %d vettings', query.rowcount,
            len(vettings))

    rows_remaining = query.rowcount
    for occrow in query:
        update_occurrence(occrow, vettings, connection)
        rows_remaining -= 1
        if rows_remaining % 10000 == 0:
            log_info('%d rows remaining', rows_remaining)


def update_occurrence(occrow, ordered_vettings, connection):
    contention = False
    classification = None
    location = shapely.wkt.loads(occrow['location'])

    # for each vetting, ordered most-authoritive first
    for vetting in ordered_vettings:
        # check if the vetting applies to this occurrences' location
        if vetting.area.intersects(location):
            # first, look for classification (if not found previously)
            if classification is None:
                classification = vetting.classification
            # second, look for contention (if not found previously)
            elif classification != vetting.classification:
                contention = True
                # if both classification and contention are found, no need
                # to check the rest of the polygons
                break

    # if no vettings affect this occurrence, use source_classification
    if classification is None:
        classification = occrow['source_classification']

    # only update db if something changed
    if classification != occrow['classification'] or contention != occrow['contentious']:
        connection.execute('''
            UPDATE occurrences
            SET contentious = {cont}, classification = '{classi}'
            WHERE id = {occid}
            '''.format(
                cont=('TRUE' if contention else 'FALSE'),
                classi=classification,
                occid=occrow['id']
            ))


def ordered_vettings_for_species_id(species_id, connection):
    vettings = []

    query = connection.execute('''
        SELECT
            vettings.classification AS classi,
            ST_AsText(ST_SimplifyPreserveTopology(vettings.area, 0.001)) AS area
        FROM vettings INNER JOIN users ON vettings.user_id=users.id
        WHERE vettings.species_id = {sid} AND users.can_vet
        ORDER BY users.authority DESC, vettings.updated_on DESC
        '''.format(sid=int(species_id)))

    for row in query:
        vettings.append(Vetting(row['classi'], row['area']))

    return vettings


def occurrences_for_species_id(species_id, connection):
    return connection.execute('''
        SELECT
            id,
            classification,
            source_classification,
            contentious,
            ST_AsText(location) AS location
        FROM occurrences
        WHERE species_id = {sid}
        '''.format(sid=species_id))


class Vetting(object):
    def __init__(self, classi, wkt_area):
        self.classification = classi
        self.area = shapely.prepared.prep(shapely.wkt.loads(wkt_area))


def log_info(msg, *args, **kwargs):
    logging.info(datetime.datetime.today().strftime('%H:%M:%S: ') + msg, *args,
        **kwargs)
