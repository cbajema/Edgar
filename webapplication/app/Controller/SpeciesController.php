<?php
App::uses('AppController', 'Controller');
/**
 * Species Controller
 *
 * @property Species $Species
 */
class SpeciesController extends AppController {
    public $components = array('RequestHandler');
    public $helpers = array('Form', 'Html', 'Js', 'Time');

    /**
     * index method
     *
     * @return void
     */
    public function index() {
        $this->set('title_for_layout', 'Species - Index');

        $this->Species->recursive = 0;
        $this->set('species', $this->paginate());

        // Specify the output for the json view.
        $this->set('_serialize', 'species');
    }

    /**
     * view method
     *
     * @param string $id
     * @return void
     */
    public function view($id = null) {
        $this->set('title_for_layout', 'Species - View');

        $this->Species->id = $id;
        if (!$this->Species->exists()) {
            throw new NotFoundException(__('Invalid species'));
        }
        $this->set('species', $this->Species->read(null, $id));

        // Specify the output for the json view.
        $this->set('_serialize', 'species');
    }

    /**
     * minimal_view method
     *
     * @param string $id
     * @return void
     */
    public function minimal_view($id = null) {
        $this->set('title_for_layout', 'Species - View');

        $this->Species->recursive = 0;

        $this->Species->id = $id;
        if (!$this->Species->exists()) {
            throw new NotFoundException(__('Invalid species'));
        }
        $this->set('species', $this->Species->read(null, $id));

        // Specify the output for the json view.
        $this->set('_serialize', 'species');
    }

    /**
     * occurrences method
     *
     * @param string $id
     * @return void
     */
    public function occurrences($id = null) {
        $this->set('title_for_layout', 'Species - Occurrences');

        $this->Species->id = $id;
        if (!$this->Species->exists()) {
            throw new NotFoundException(__('Invalid species'));
        }

        $species = $this->Species->read(null, $id);
        $occurrences = $species['Occurrence'];

        $this->set('species', $species);
        $this->set('occurrences', $occurrences);

        // Specify the output for the json view.
        $this->set('_serialize', 'occurrences');

    }

    /**
     * geo_json_occurrences method
     *
     * Takes the following http_request_params:
     *  * bbox
     *
     * bbox is a comma seperated string representing the bounds of the user's view.
     * e.g. whole world, zoomed out:
     *      -607.5,-405,607.5,405
     *
     * e.g. bottom left corner of world, zoomed in:
     *      -198.984375,-102.65625,-123.046875,-52.03125
     *
     * 1st pair is the bottom left corner of the bounds.
     * 2nd pair is the top right corner of the bounds.
     *
     * Produces a GeoJSON object of type FeatureCollection.
     * Should only produce, at most, 1000 features.
     *
     * @param string $id
     * @return void
     */
    public function geo_json_occurrences($id = null) {
        $this->set('title_for_layout', 'Species - GeoJSON Occurrences');

        $this->Species->id = $id;
        if (!$this->Species->exists()) {
            throw new NotFoundException(__('Invalid species'));
        }

        // Look up the species provided
        $species = $this->Species->read(null, $id);

        // Check if we were provided a bbox (bounding box)
        $bbox = array();
        if ( array_key_exists('bbox', $this->request->query) ) {
            $bbox_param_string = $this->params->query['bbox'];
            $bbox_param_as_array = explode(',', $bbox_param_string);
            if ( sizeof($bbox_param_as_array) == 4 ) {
                $bbox = array(
                    "min_longitude" => $bbox_param_as_array[0],
                    "min_latitude"  => $bbox_param_as_array[1],
                    "max_longitude" => $bbox_param_as_array[2],
                    "max_latitude"  => $bbox_param_as_array[3],
                );
            }
        }

        // Check if clustered was set to true.
        // Default clustered to true
        $cluster_type = 'dotradius';

        if ( array_key_exists('clustered', $this->request->query) ) {
            $cluster_type = $this->request->query['clustered'];
        }

        $this->set('geo_object', $this->Species->toGeoJSONArray($bbox, $cluster_type));

        // Specify the output for the json view.
        $this->set('_serialize', 'geo_object');
    }

    /**
     * single_upload_json method
     *
     * @return void
     */
    public function single_upload_json() {
        $this->set('title_for_layout', 'Species - Single Species Upload (JSON)');

        // If user did a HTTP_POST, process the upload file
        if ($this->request->is('post')) {
            // File: data['Species']['upload_file'] => (array)
            $file = $this->request->data['Species']['upload_file'];

            // File's array:
            //   name => (name of file)
            //   type => (file type, e.g. image/jpeg)
            //   tmp_name => (file_path)
            //   error => 0
            //   size => (file_size in Bytes)
            $file_name = $file['name'];
            $file_type = $file['type'];
            $tmp_file_path= $file['tmp_name'];

            // Expected file type is application/json
            $file_contents = file_get_contents($tmp_file_path);
            $json_decoded_file_contents = json_decode($file_contents, true);

            if ($this->Species->saveAssociated($json_decoded_file_contents)) {
                $this->Session->setFlash(__('The species has been saved'));
                $this->redirect(array('action' => 'index'));
            } else {
                $this->Session->setFlash(__('The species could not be saved. Please, try again.'));
            }
        }
        // Else -> Fall through to render view (form to upload a single species json file)
    }

    /**
     * map method
     *
     * @param string $id
     * @return void
     */
    public function map($id = null) {
        $this->set('title_for_layout', 'Species - Map');
        if ($id == null) {
            $this->Species->recursive = 0;
            $this->set('single_species_map', false);
            $this->set('species', 
                $this->Species->find('list', 
                array(
                    'fields' => array('Species.id', 'Species.scientific_name'),
                    'recursive' => 0,
                    'order' => array('Species.scientific_name ASC'), //string or array defining order
                )
            ));
        } else {
            $this->Species->recursive = 0;

            $this->Species->id = $id;
            if (!$this->Species->exists()) {
                throw new NotFoundException(__('Invalid species'));
            }

            $this->set('single_species_map', true);
            $this->set('species', $this->Species->read(null, $id));
        }
    }


    /**
     * Returns JSON for a jQuery UI autocomplete box
     */
    public function autocomplete() {
        //get what the user typed in
        $partial = $this->request->query['term'];

        //query db
        $matched_species = $this->Species->find('all', array(
            'conditions' => array('OR' => array(
                array('species.scientific_name LIKE' => '%'.$partial.'%'),
                array('Species.common_name LIKE' => '%'.$partial.'%')
            )),
            'order' => array('Species.common_name DESC'),
            'recursive' => 0
        ));

        //convert $matched_species into json format expected by jquery ui
        foreach($matched_species as $key => $value){
            $species = $value['Species'];
            $matched_species[$key] = array(
                'id' => $species['id'],
                'value' => $species['scientific_name'],
                'label' => $species['common_name'] . ' - '.$species['scientific_name'],
            );
        }

        //render json
        $this->set('results', $matched_species);
        $this->set('_serialize', 'results');
    }

}
