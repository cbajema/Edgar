// Author: Robert Pyke
//
// Assumes that the var species_id has already been set.
// Assumes that OpenLayer, jQuery, jQueryUI and Google Maps (v2) are all available.

var map, occurrence_select_control;

// Edgar bing api key.
// (registered under Robert's name)
var bing_api_key = "AkQSoOVJQm3w4z5uZeg1cPgJVUKqZypthn5_Y47NTFC6EZAGnO9rwAWBQORHqf4l";

$(document).ready(function() {

        // Projections
        // ----------

        // DecLat, DecLng 
        geographic = new OpenLayers.Projection("EPSG:4326");

        // Spherical Meters
        mercator = new OpenLayers.Projection("EPSG:900913");


        // Bounds
        // ----------

        // Costa Rica Bounds
        costa_rica_bounds = new OpenLayers.Bounds();
        costa_rica_bounds.extend(new OpenLayers.LonLat(-86,7));
        costa_rica_bounds.extend(new OpenLayers.LonLat(-82,13));
        costa_rica_bounds = costa_rica_bounds.transform(geographic, mercator);

        // The bounds of the world.
        // Used to set maxExtent on maps/layers
        world_bounds = new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34)

        // Where to zoom the map to on start.
        zoom_bounds = costa_rica_bounds;


        // The Map Object
        // ----------

        map = new OpenLayers.Map('map', {
            projection: mercator,
            displayProjection: geographic,
            units: "m",
            maxResolution: 156543.0339,
            maxExtent: world_bounds

            // Setting the restrictedExtent will change the bounds
            // that pressing the 'world' icon zooms to.
            // User can manually zoom out past this point.
//            restrictedExtent: zoom_bounds

        });


        // VMap0
        // ----------

        // The standard open layers VMAP0 layer.
        // A public domain layer.
        // Read about this layer here: http://earth-info.nga.mil/publications/vmap0.html
        // and here: http://en.wikipedia.org/wiki/Vector_map#Level_Zero_.28VMAP0.29
        var vmap0 = new OpenLayers.Layer.WMS(
            "World Map (VMAP0)",
            "http://vmap0.tiles.osgeo.org/wms/vmap0",
            {
                'layers':'basic',
            }
        );


        // Open Street Map
        // ----------------

        // The Open Street Map layer.
        // See more here: http://wiki.openstreetmap.org/wiki/Main_Page
        // and specifically here: http://wiki.openstreetmap.org/wiki/OpenLayers
        var osm = new OpenLayers.Layer.OSM(
            "Open Street Map"
        );


        // Google Maps Layers
        // --------------------
        //
        // requires google maps v2 (with valid API key)

        // Google Physical layer
        var gphy = new OpenLayers.Layer.Google(
                "Google Physical",
                {
                    type: G_PHYSICAL_MAP,
                    'sphericalMercator': true,
                    'maxExtent': world_bounds
                }
        );

        // Google Streets layer
        var gmap = new OpenLayers.Layer.Google(
                "Google Streets",
                {
                    numZoomLevels:20,
                    'sphericalMercator': true,
                    'maxExtent': world_bounds
                }
        );

        // Google Hybrid layer
        var ghyb = new OpenLayers.Layer.Google(
                "Google Hybrid",
                {
                    type: G_HYBRID_MAP,
                    'sphericalMercator': true,
                    'maxExtent': world_bounds
                }
        );

        // Google Satellite layer
        var gsat = new OpenLayers.Layer.Google(
                "Google Satellite",
                {
                    type: G_SATELLITE_MAP,
                    numZoomLevels: 22,
                    'sphericalMercator': true,
                    'maxExtent': world_bounds
                }
        );


        // Bing Maps Layers
        // --------------------
        //
        // Requires bing_api_key to be set
        // More info and registration here: http://bingmapsportal.com/

        // Bing Road layer
        var bing_road = new OpenLayers.Layer.Bing({
            name: "Bing Road",
            key: bing_api_key,
            type: "Road"
        });

        // Bing Hybrid layer
        var bing_hybrid = new OpenLayers.Layer.Bing({
            name: "Bing Hybrid",
            key: bing_api_key,
            type: "AerialWithLabels"
        });

        // Bing Aerial layer
        var bing_aerial = new OpenLayers.Layer.Bing({
            name: "Bing Aerial",
            key: bing_api_key,
            type: "Aerial"
        });



        // Species Distribution
        // ----------------------

        // Our distribution map layer.
        //
        // NOTE:
        // -----
        //
        // This code may need to be updated now that we are using mercator.
        // I believe that OpenLayers will send the correct projection request
        // to Map Server. I also believe that map script will correctly process the
        // projection request.
        // I could be wrong though...
        var dist = new OpenLayers.Layer.WMS(
            "Distribution",
            map_tool_url, // path to our map script handler.

            // Params to send as part of request (note: keys will be auto-upcased)
            // I'm typing them in caps so I don't get confused.
            {
                MODE: 'map', 
                MAP: 'raster.map', 
                DATA: (species_id + '_1975.asc'), 
                SPECIESID: species_id, 
                REASPECT: "false", 
                TRANSPARENT: 'true'
            },
            {
                // It's an overlay
                isBaseLayer: false,
            }
        );


        // Occurrences Layer
        // -----------------

        // See: http://geojson.org/geojson-spec.html For the GeoJSON spec.
        var occurrences_format = new OpenLayers.Format.GeoJSON({
// No need to convert..
// Looks like having a layer projection of geographic,
// and a map projection of mercator (displayProjection of geographic)
// means that OpenLayers is taking care of it..
//
//          'internalProjection': geographic,
//          'externalProjection': geographic 
        });

        // The default style for our occurrences
        var occurrences_default_style = new OpenLayers.Style({
                // externalGraphic: "${img_url}",
                pointRadius: "${point_radius}",
                fillColor: "#00ff66",
                strokeColor: "#00ff66",
                fillOpacity: 0.6,
                strokeOpacity: 0.6,
        });

        // The occurrences layer
        // Makes use of the BBOX strategy to dynamically load occurrences data.
        var occurrences = new OpenLayers.Layer.Vector(
            "Occurrences", 
            {
                // It's an overlay
                isBaseLayer: false,

                // our occurrence vector data is geographic (DecLat & DecLng)
                projection: geographic,

                // resFactor determines how often to update the map.
                // See: http://dev.openlayers.org/docs/files/OpenLayers/Strategy/BBOX-js.html#OpenLayers.Strategy.BBOX.resFactor
                // A setting of <= 1 will mean the map is updated every time its zoom/bounds change.
                strategies: [new OpenLayers.Strategy.BBOX({resFactor: 1.1})],
                protocol: new OpenLayers.Protocol.HTTP({
                    // Path to the geo_json_occurrences for this species.
                    // This probably should be stored in a javascript var
                    // similar to map_tool_url.
                    url: "../geo_json_occurrences/" + species_id + ".json",
                    params: {
                        // Place addition custom request params here..
                        bound: true,        // do bound the request
                        clustered: false    // don't bother clustering
                    },

                    // The data format
                    format: occurrences_format,
                }),

                // the layer style
                styleMap: new OpenLayers.StyleMap({
                    // Default style for this layer.
                    "default": occurrences_default_style,

                    // Specify style attribute overrides for selected.
                    "select": {
                        "fillColor": "#83aeef",
                        "strokeColor": "#000000",
                        "fillOpacity": 0.7,
                        "strokeOpacity": 0.7
                    },
                }),
            }

        );

        // Set the opacity of the layer using setOpacity 
        //
        // NOTE: Opacity is not supported as an option on layer..
        // so don't even try it. Setting it on the layer will cause
        // undesirable behaviour where the map layer will think the opacity 
        // has been updated when it hasn't. Worse yet, if you then
        // try and run setOpacity after specifying the opacity property on
        // the layer, it won't appear to do anything. This is because OpenLayers
        // tries to be smart, it will check if layer.opacity is different
        // to your setOpacity arg, and will determine that they haven't changed
        // and so will do nothing..
        occurrences.setOpacity(0.6);

        // Occurrence Feature Selection (on-click or on-hover)
        // --------------------------------------------------

        // what to do when the user presses close on the pop-up.
        function onPopupClose(evt) {
            // 'this' is the popup.
            occurrence_select_control.unselect(this.feature);
        }

        // what to do when the user clicks a feature
        function onFeatureSelect(evt) {
            feature = evt.feature;
            popup = new OpenLayers.Popup.FramedCloud(
                "featurePopup",
                feature.geometry.getBounds().getCenterLonLat(),
                new OpenLayers.Size(100,100),
                "<h2>" + feature.attributes.title + "</h2>" +
                feature.attributes.description,
                null, true, onPopupClose);
                feature.popup = popup;
                popup.feature = feature;
                map.addPopup(popup);
        }

        // what to do when a feature is no longed seected
        function onFeatureUnselect(evt) {
            feature = evt.feature;
            if (feature.popup) {
                popup.feature = null;
                map.removePopup(feature.popup);
                feature.popup.destroy();
                feature.popup = null;
            }
        }

        // Associate the above functions with the appropriate callbacks
        occurrences.events.on({
            'featureselected': onFeatureSelect,
            'featureunselected': onFeatureUnselect
        });

        // Specify the selection control for the occurrences layer.
        //
        // Note: change hover to true to make it a on hover interaction (instead
        // of an on-click interaction)
        var occurrence_select_control = new OpenLayers.Control.SelectFeature(
            occurrences, {hover: false}
        );


        // Map - Final Setup
        // -------------

        // Add the standard set of map controls
        map.addControl(new OpenLayers.Control.Permalink());
        map.addControl(new OpenLayers.Control.MousePosition());
        map.addControl(occurrence_select_control);
        occurrence_select_control.activate();

        // Let the user change between layers
        layer_switcher = new OpenLayers.Control.ExtendedLayerSwitcher();
        layer_switcher.roundedCornerColor = "#090909";
        layer_switcher.ascending = true;
        layer_switcher.useLegendGraphics = false;

        map.addControl(layer_switcher);
        layer_switcher.maximizeControl();

        // Add our layers
        map.addLayers([gphy, gmap, ghyb, gsat, bing_road, bing_hybrid, bing_aerial, osm, vmap0, occurrences]);

        // Zoom the map to the zoom_bounds specified earlier
        map.zoomToExtent(zoom_bounds);
});
