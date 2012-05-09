<?php
/**
 *
 * PHP 5
 *
 * CakePHP(tm) : Rapid Development Framework (http://cakephp.org)
 * Copyright 2005-2012, Cake Software Foundation, Inc. (http://cakefoundation.org)
 *
 * Licensed under The MIT License
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright     Copyright 2005-2012, Cake Software Foundation, Inc. (http://cakefoundation.org)
 * @link          http://cakephp.org CakePHP(tm) Project
 * @package       Cake.View.Layouts
 * @since         CakePHP(tm) v 0.10.0.1076
 * @license       MIT License (http://www.opensource.org/licenses/mit-license.php)
 */

App::uses('Sanitize', 'Utility');
$user = AuthComponent::user();

?>
<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js lt-ie9 lt-ie8 lt-ie7" lang="en"> <![endif]-->
<!--[if IE 7]>    <html class="no-js lt-ie9 lt-ie8" lang="en"> <![endif]-->
<!--[if IE 8]>    <html class="no-js lt-ie9" lang="en"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js" lang="en"> <!--<![endif]-->
<head>
    <?php echo $this->Html->charset(); ?>
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0">

    <title><?php echo $title_for_layout; ?> - Edgar</title>

    <script type="text/javascript">
        window.Edgar = window.Edgar || {};
        Edgar.baseUrl = "<?php print $this->Html->url('', true) ?>";
        <?php if($user === null): ?>
            Edgar.user = null;
        <?php else: ?>
            Edgar.user = {
                canRate: true,
                canRemodel: true
            }
        <?php endif ?>
    </script>

    <?php
        echo $this->Html->meta('icon');
        echo $this->Html->css('h5bp');  // html5boilerplate "sanity reset" css
        echo $this->Html->css('edgar');
        echo $this->Html->css('edgarfullscreen');
        echo $this->Html->css('../js/jquery-ui-1.8.18/css/smoothness/jquery-ui-1.8.18.custom');
        echo $this->Html->css('openlayers');
        echo $this->Html->css('openlayers_extended');
        echo $this->Html->css('openlayers_google');

        // include Modernizr for html5 shims and feature detection
    	echo $this->Html->script('modernizr/modernizr-2.5.3.min.js');

        // Include jQuery and jQueryUI
        echo $this->Html->script('jquery-ui-1.8.18/js/jquery-1.7.1.min.js');
        echo $this->Html->script('jquery-ui-1.8.18/js/jquery-ui-1.8.18.custom.min.js');

        // Include Google API
        // Note: API Key is Robert's.
        echo "<script src='http://maps.google.com/maps?file=api&amp;v=2&amp;key=AIzaSyAo3TVBlAHxH57sROb2cV_7-Tar7bKnIcY'></script>";

        // Include OpenLayers
        echo $this->Html->script('OpenLayers.js');
        echo $this->Html->script('LayerSwitcher-extended.js');

        echo $this->fetch('meta');
        echo $this->fetch('css');
        echo $this->fetch('script');
    ?>
</head>
<body>

    <?php echo $this->fetch('content') ?>

    <div id="sidebar">
        <div id="user">
            <div class="wrapper">
                <?php
                    $user = AuthComponent::user();
                    if($user === NULL){
                        print $this->Html->link('Log In', '/users/login');
                    } else {
                        print 'Logged in as ' . Sanitize::html($user['email']) . ' (';
                        print $this->Html->link('Log Out', '/users/logout');
                        print ')';
                    }
                ?>
            </div>
        </div>

        <div id="flash">
            <div class="wrapper">
                <?php echo $this->Session->flash() ?>
            </div>
        </div>

        <div id="header">
            <div class="wrapper">
                <h1><?php echo $title_for_layout ?></h1>
            </div>
        </div>

        <div id="footer">
        </div>
    
    </div>

    <?php echo $this->element('sql_dump'); ?>
</body>
</html>
