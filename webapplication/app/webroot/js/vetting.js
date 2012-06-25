/*
JS for doing vetting
*/

var new_vet_vectors, new_vet_edit_control, wkt;

function initVetting() {
    console.log("Starting to init vetting");

    // DecLat, DecLng 
    var geographic_proj = new OpenLayers.Projection("EPSG:4326");

    var wkt_in_options = {
         'internalProjection': Edgar.map.baseLayer.projection,
         'externalProjection': geographic_proj
     };
    wkt = new OpenLayers.Format.WKT(wkt_in_options);

    var new_vet_vectors_options = {
        'geometryType': OpenLayers.Geometry.Polygon
    };
    new_vet_vectors = new OpenLayers.Layer.Vector("New Vetting Layer", new_vet_vectors_options);
    new_vet_edit_control = new OpenLayers.Control.EditingToolbar(
        new_vet_vectors,
        {
            div: $('#newvet_control').get(0)
        }
    );

    Edgar.map.addLayers([new_vet_vectors]);
    Edgar.map.addControl(new_vet_edit_control)

    console.log("Finished init vetting");
}

function createNewVetting() {
    console.log("Processing create new vetting");
    // Get features from the vector layer (which are all known to be polygons)
    var new_vet_polygon_features = new_vet_vectors.features;

    if (new_vet_polygon_features.length === 0) {
        alert("No polygons provided");
        return false;
    }

    // Now convert our array of features into an array of geometries.
    var new_vet_polygon_geoms = [];
    for (var i = 0; i < new_vet_polygon_features.length; i++) {
        var i_feature = new_vet_polygon_features[i];
        var i_geom = i_feature.geometry;
        new_vet_polygon_geoms.push(i_geom);
    }

    // Create a MultiPolygon from our polygons.
    var new_vet_multipolygon = new OpenLayers.Geometry.MultiPolygon(new_vet_polygon_geoms);
    console.log("WKT");
    console.log(new_vet_multipolygon);

    // Get WKT (well known text) for the multipolygon
    var layer_wkt_str = wkt.extractGeometry(new_vet_multipolygon);
    // At this point, we have our WKT
    console.log(layer_wkt_str);

    var species_id = Edgar.mapdata.species.id;
    var new_vet_data = {
        area: layer_wkt_str,
        species_id: species_id,
        comment: $("#vetcomment").val(),
        classification: $("#vetclassification").val()
    };

    // At this point, we have filled out our submit form
    console.log("Post Data:");
    console.log(new_vet_data);
    var vet_data_as_json_str = JSON.stringify(new_vet_data);
    console.log(vet_data_as_json_str);
    var url = Edgar.baseUrl + "species/insert_vetting/" + species_id + ".json";

    // Send the new vet to the back-end
    $.post(url, vet_data_as_json_str, function(data, text_status, jqXHR) {
        console.log("New Vet Response", data, text_status, jqXHR);
        alert("New Vet Response: " + data);
    }, 'json');

    return true;
}

$(function() {

    var vetpanel = $('#newvet');
    var vetform = $('#vetform');

    vetpanel.find('button').click( function(e) {
        e.preventDefault();

        alert('Cylon says: Create New Vetting Pressed');
        createNewVetting();

    });

    initVetting();

/*
    // go through each tool panel and add opne/close behaviour to the header
    tools.each( function(index, tool) {
        tool = $(tool);
        var header = $(tool).children('h1').first();
        var body = tool.children('.toolcontent').first();
        header.disableSelection();
        header.click( function() {
            header.toggleClass('closed');
            body.toggle('blind', 'fast');
            return false;
        });
    });

    //
    // close all the tools that wanted to start closed
    //

    var fx = jQuery.fx.off; // disable fx animation
    jQuery.fx.off = true;
    var closetools = $('#toolspanel .tool.startclosed');
    closetools.each( function(index, tool) {
        // click the header of each tool to close it
        $(tool).children('h1').first().click();
    });
    // restore fx animation
    jQuery.fx.off = fx;

    //
    // set up the emission selecting stuff
    //

    $('#emission_scenarios').change(function() {
        Edgar.mapdata.emissionScenario = $(this).val();
        reloadDistributionLayers();
    });

    $('#year_selector').change(function() {
        Edgar.mapdata.year = $(this).val();
        reloadDistributionLayers();
    });

    $('#use_emission_and_year').change(reloadDistributionLayers);

    Edgar.mapdata.emissionScenario = $('#emission_scenarios').val();
    Edgar.mapdata.year = parseInt($('#year_selector').val());
    reloadDistributionLayers();

*/
});
