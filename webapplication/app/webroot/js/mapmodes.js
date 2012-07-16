// Edgar's species map is always in one of four mapmodes.
// Read the value if Edgar.mapmode to determine which.
// DON'T WRITE TO Edgar.mapmode.

//
// Changing map mode
// -----------------
// trigger a changemode event to ask to change map modes:
//
//     $(Edgar.map).trigger('changemode', 'modename') to attempt
//
// This will only change modes if all the listeners are okay with it.
//
//
// Overriding / cancelling a mode change
// -------------------------------------
// if you want to be able to override a mode change, bind a handler
// to the changemode event like this:
//
//    $(Edgar.map).on('changemode', function(event, newMode) {
//        console.log('attempt to change mode to ' + newMode);
//    }
//
// you can prevent the mode change by calling event.preventDefault()
// in your handler:
//
//    $(Edgar.map).on('changemode', function(event, newMode) {
//        console.log('attempt to change mode from ' +
//                Edgar.mapmode + ' to ' + newMode);
//        if (notReady) {
//            console.log('cancelling mode change.');
//            event.preventDefault();
//        }
//    }
//
//
// Being notified of a mode change
// -------------------------------
// Because the mode change is overrideable, you can't use the 
// changemode event to react to a mode change.  For that you 
// need to listen for the modechanged event.
//
//    $(Edgar.map).on('modechanged', function(event, oldMode) {
//        console.log('mode has changed from ' + oldMode +
//            ' to ' + Edgar.mapmode);
//    }
//
//
// What modes are there?
// ---------------------
// The possible modes are:
//
// mapmode: 'blank'
//   No species has been selected yet
//
// mapmode: 'current'
//   A species is selected, and the map is showing the 
//   occurrences and the current climate suitability.
//
// mapmode: 'future'
//   A species is selected, and the map is showing the
//   current and future climate suitability (but no
//   occurrences).
//
// mapmode: 'vetting'
//   A species is selected, a user is logged in, and
//   the user is viewing or editing vetting information.

// -------------------------------------------------------------------------------
// presume the init_setup.js has already run and Edgar.mode
// exists and is initially set to 'blank'.
// e.g.  Edgar.mode = Edgar.mode || 'blank';

// call this function and pass in the map object to get modes working
function addMapModes(theMap) {
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    var validModes = ['blank','current','future','vetting'];
    var $map = $(theMap);
    theMap.destinationMode = 'blank';
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // the eventual change mode function - DON'T CALL THIS
    // if you want to change modes do    $(Edgar.map).trigger('changemode', 'vetting');
    theMap.changemode = function() {
        // what modes are we changing between?
        var oldMode = Edgar.mapmode;
        var newMode = theMap.destinationMode;

        function showhide(showlist, hidelist) { // - - - - - - - - 
            $.each(hidelist, function(i, tool) {
                $('#' + tool).hide('blind','slow');
            });
            $.each(showlist, function(i, tool) {
                $('#' + tool).show('blind','slow');
            });
        } // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

        consolelog('changing mode, ' + oldMode + ' to ' + newMode);

        if ( $.inArray(newMode, validModes) == -1 ) {
            consolelog('ERROR: attempt to change map to unrecognised mode "' + newMode + '".');
            consolelog('pretending mode "blank" was selected.');
            newMode = 'blank';
        }

        // do nothing if there was no adjustment of mode
        if (oldMode === newMode) {

            if (newMode == 'blank') {
                // special handling for blank-to-blank, the startup mode switch
                showhide(
                    ['tool-layers', 'tool-debug', 'tool-layers'],
                    ['oldvets','myvets','newvet','tool-legend','tool-emissions']
                );

            } else if (newMode == 'current') {
                // special handling for changing species when in current mode
                disengageCurrentMode();
                // Edgar.newSpecies is set by the species panel when a new species
                // is selected, then a current-to-current mode switch is triggered.
                // so here we can call _setupNewSpecies to actually switch to the
                // newly selected species.
                _setupNewSpecies();
                showhide(['currentspecies'],['speciesselector']);
                engageCurrentMode();
            }

            // if we've handled mode-to-samemode, we can bail out
            return;
        }

        //
        // transitions between modes
        //

        // illegal transitions
        if ( (oldMode === 'blank'   && newMode === 'future' ) || // can't skip current
             (oldMode === 'blank'   && newMode === 'vetting') || // can't skip current
             (oldMode === 'future'  && newMode === 'vetting') || // must go through current
             (oldMode === 'vetting' && newMode === 'future' ) || // must go through current
             (newMode === 'blank')                               // can't return to blank
        ) {
            consolelog('illegal mode transition: cannot move from "' + oldMode + '" to "' + newMode + '".');
        }

        if (oldMode === 'blank'   && newMode === 'current') {
            disengageBlankMode();
            // Edgar.newSpecies is set by the species panel when a new species
            // is selected.
            // so here we can call _setupNewSpecies to actually switch to the
            // newly selected species.
            _setupNewSpecies();
            showhide(['currentspecies'],['speciesselector']);
            engageCurrentMode();
        }

        if (oldMode === 'current' && newMode === 'future' ) {
        }

        if (oldMode === 'current' && newMode === 'vetting') {
            disengageCurrentMode();
            // show & hide the appropriate tools
            showhide(['oldvets','newvet','myvets'], ['tool-legend','tool-emissions']);
            Edgar.vetting.engageVettingMode();
        }

        if (oldMode === 'future'  && newMode === 'current') {
        }

        if (oldMode === 'vetting' && newMode === 'current') {
            Edgar.vetting.disengageVettingMode();
            showhide(['tool-legend'], ['oldvets','newvet','myvets']);
            engageCurrentMode();
        }

        // yay, we're almost done.. now change the mode record
        Edgar.mapmode = newMode;

        // finally, trigger the event that tells everyone about the new mode
        $map.trigger('modechanged', oldMode);

    }
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // bind a handler to remember the destination mode for later
    $map.on('changemode', function(event, newMode) {
        theMap.destinationMode = newMode;
    });
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // now that the map has mode changing, trigger a change to
    // blank mode to get everything set up nicely
    $map.trigger('changemode', 'blank');
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
}

$(function() {

    // test the mode changing stuff
    $('#vet').click( function() {
        $(Edgar.map).trigger('changemode', 'current');
        setTimeout( function() {
            $(Edgar.map).trigger('changemode', 'vetting');
        }, 1000);
    });

    $('#devet').click( function() {
        $(Edgar.map).trigger('changemode', 'current');
    });

});





