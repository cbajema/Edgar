<?php
App::uses('AppController', 'Controller');
App::uses('User', 'Model');
App::uses('Species', 'Model');

/**
 * Vetting Controller
 *
 * @property Species $Species
 */
class VettingsController extends AppController {
    public $components = array('RequestHandler');
    public $helpers = array('Form', 'Html', 'Js', 'Time');

    // Don't allow any interaction with the vetting controller unless logged in.
    public function beforeFilter() {
        parent::beforeFilter();
        $this->Auth->deny();
    }

    public function view($vetting_id) {
        $vetting = $this->Vetting->find('first', array(
            'conditions' => array('Vetting.id' => $vetting_id)
        ));

        $json_object = $vetting['Vetting'];

        $this->set('output', $json_object);
        $this->set('_serialize', 'output');
    }

    public function delete($vetting_id) {
        if ($this->request->is('get')) {
            throw new MethodNotAllowedException();
        }

        $vetting = $this->Vetting->find('first', array(
            'conditions' => array('Vetting.id' => $vetting_id)
        ));

        // If we can't find the vetting...
        if ( $vetting === false ) {
            // Couldn't find a vetting with that id
            throw new NotFoundException(__('Invalid vetting'));
        }

        if ( $vetting['Vetting']['deleted'] === null ) {
            $vetting['Vetting']['deleted'] = date(DATE_ISO8601);
            unset($vetting['Vetting']['modified']);
            $this->Vetting->save($vetting);
        }

        $json_object = $vetting['Vetting'];

        $this->set('output', $json_object);
        $this->set('_serialize', 'output');
    }

}
