// Generated by CoffeeScript 1.3.3

/*
# File to control entering and exiting vetting modes.
*/


(function() {

  Edgar.vetting = {
    /*
        # Define a style map for the vetting areas
    */

    _initAreaStyleMap: function() {
      return this.areaStyleMap = new OpenLayers.StyleMap({
        'default': {
          'fillOpacity': 0.3,
          'strokeOpacity': 0.9,
          'fillColor': '${fill_color}',
          'strokeColor': '${stroke_color}',
          'fontColor': '${font_color}',
          'label': '${classification}'
        },
        'select': {
          'fillOpacity': 0.6,
          'strokeOpacity': 1.0
        }
      });
    },
    /*
        # Initialise the classify habitat interface
    */

    init: function() {
      Edgar.vetting.classifyHabitat.init();
      Edgar.vetting.myHabitatClassifications.init();
      Edgar.vetting.theirHabitatClassifications.init();
      this._initAreaStyleMap();
      this._bindToChangeModeEvents();
      return null;
    },
    /*
        # Bind to the change mode events that occurr on the map
    */

    _bindToChangeModeEvents: function() {
      return $(Edgar.map).on('changemode', function(event, newMode) {
        if (!Edgar.vetting.isChangeModeOkay(newMode)) {
          return event.preventDefault();
        }
      });
    },
    isChangeModeOkay: function(newMode) {
      if (newMode === 'vetting') {
        if (Edgar.user === null || Edgar.mapdata.species === null) {
          alert("can't change to vetting mode. You need to have selected a species, and you need to be logged in to engage the vetting mode");
          return false;
        } else {
          return true;
        }
      } else if (Edgar.mapmode === 'vetting') {
        if (this.classifyHabitat.isChangeModeOkay(newMode) && this.myHabitatClassifications.isChangeModeOkay(newMode) && this.theirHabitatClassifications.isChangeModeOkay(newMode)) {
          return true;
        } else {
          consolelog('cancelling mode change.');
          return false;
        }
      } else {
        return true;
      }
    },
    /*
        # get ready to do vetting.  gets called by mapmodes.js, after
        # the vetting tools have been switched on
    */

    engageVettingMode: function() {
      console.log("engageVettingMode");
      Edgar.util.showhide(['button_current'], []);
      Edgar.vetting.myHabitatClassifications.engage();
      Edgar.vetting.theirHabitatClassifications.engage();
      Edgar.vetting.classifyHabitat.engage();
      return null;
    },
    /*
        # wrap up the vetting mode.  gets called by mapmodes.js, before
        # the vetting tools have been hidden
    */

    disengageVettingMode: function() {
      console.log("disengageVettingMode");
      Edgar.util.showhide([], ['button_current']);
      Edgar.vetting.myHabitatClassifications.disengage();
      Edgar.vetting.theirHabitatClassifications.disengage();
      return null;
    }
  };

  /*
  # Document Ready..
  */


  $(function() {
    return Edgar.vetting.init();
  });

}).call(this);
