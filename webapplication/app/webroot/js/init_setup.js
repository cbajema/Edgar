// Generated by CoffeeScript 1.3.3

/*
initialise some global variables and whatnot
*/


(function() {

  window.Edgar = window.Edgar || {};

  Edgar.map = Edgar.map || null;

  Edgar.mapmode = Edgar.mapmode || 'blank';

  Edgar.mapdata = Edgar.mapdata || {};

  Edgar.mapdata.species = null;

  Edgar.mapdata.emissionScenario = null;

  Edgar.mapdata.year = null;

  Edgar.user = Edgar.user || null;

  /*
  Projections
  ----------
  */


  Edgar.util = {
    projections: {
      geographic: new OpenLayers.Projection("EPSG:4326"),
      mercator: new OpenLayers.Projection("EPSG:900913")
    }
  };

}).call(this);
