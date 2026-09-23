/**
 * UK leisure-van holding-tank defaults and named presets.
 * Litres are typical figures — users should edit them to match the van.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TankDefaults = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PRESET_ORDER = ["weekendWild", "typicalUk", "familyWeek", "defaults"];

  function createDefaultPlan(waterUsage) {
    var water = waterUsage && typeof waterUsage === "object" ? waterUsage : {};
    return {
      tripDays: water.tripDays != null ? water.tripDays : 2,
      freshTankLitres: water.freshTankLitres != null ? water.freshTankLitres : 100,
      greyTankLitres: 90,
      blackKind: "cassette",
      blackTankLitres: 18,
      freshStartPercent: 100,
      greyStartPercent: 0,
      blackStartPercent: 0,
      activePreset: "defaults",
    };
  }

  var PRESETS = {
    defaults: {
      label: "Reset to defaults",
      usage: createDefaultPlan(),
    },
    weekendWild: {
      label: "Weekend wild",
      sublabel: "small tanks · 2 days",
      usage: {
        tripDays: 2,
        freshTankLitres: 80,
        greyTankLitres: 65,
        blackKind: "cassette",
        blackTankLitres: 17,
        freshStartPercent: 100,
        greyStartPercent: 0,
        blackStartPercent: 0,
        activePreset: "weekendWild",
      },
    },
    typicalUk: {
      label: "Typical UK van",
      sublabel: "100 L fresh · cassette",
      usage: {
        tripDays: 3,
        freshTankLitres: 100,
        greyTankLitres: 90,
        blackKind: "cassette",
        blackTankLitres: 19,
        freshStartPercent: 100,
        greyStartPercent: 0,
        blackStartPercent: 0,
        activePreset: "typicalUk",
      },
    },
    familyWeek: {
      label: "Family week",
      sublabel: "bigger tanks · 7 days",
      usage: {
        tripDays: 7,
        freshTankLitres: 120,
        greyTankLitres: 100,
        blackKind: "cassette",
        blackTankLitres: 19,
        freshStartPercent: 100,
        greyStartPercent: 0,
        blackStartPercent: 0,
        activePreset: "familyWeek",
      },
    },
  };

  return {
    PRESET_ORDER: PRESET_ORDER,
    PRESETS: PRESETS,
    createDefaultPlan: createDefaultPlan,
  };
});
