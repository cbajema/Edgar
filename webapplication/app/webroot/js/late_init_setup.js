// Generated by CoffeeScript 1.3.3

/*
initialise some global variables.
these globals need to wait for the other files to be loaded (such as OpenLayers)
*/


/*
Projections
----------
*/


(function() {

  Edgar.util = {
    projections: {
      geographic: new OpenLayers.Projection("EPSG:4326"),
      mercator: new OpenLayers.Projection("EPSG:900913")
    }
  };

}).call(this);
