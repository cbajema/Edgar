// Generated by CoffeeScript 1.3.3

/*
File to control entering and exiting vetting modes.
*/


(function() {

  Edgar.vetting = {
    /*
        Initialise the classify habitat interface
    */

    init: function() {
      Edgar.vetting.classifyHabitat.init();
      return null;
    },
    /*
        get ready to do vetting.  gets called by mapmodes.js, after
        the vetting tools have been switched on
    */

    engageVettingMode: function() {
      console.log("engageVettingMode");
      Edgar.vetting.classifyHabitat.engage();
      return null;
    },
    /*
        wrap up the vetting mode.  gets called by mapmodes.js, before
        the vetting tools have been hidden
    */

    disengageVettingMode: function() {
      console.log("disengageVettingMode");
      return null;
    }
  };

  /*
  Document Ready..
  */


  $(function() {
    return Edgar.vetting.init();
  });

}).call(this);
