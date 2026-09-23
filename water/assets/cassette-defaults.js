/**
 * UK leisure-van cassette / black-tank empty defaults and named presets.
 * Litres and flush habits are typical figures — users should edit them.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CassetteDefaults = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PRESET_ORDER = ["weekendCouple", "familyWeek", "soloWild", "defaults"];

  function createDefaultPlan(waterUsage, tankPlan) {
    var water = waterUsage && typeof waterUsage === "object" ? waterUsage : {};
    var tank = tankPlan && typeof tankPlan === "object" ? tankPlan : {};
    return {
      adults: water.adults != null ? water.adults : 2,
      children: water.children != null ? water.children : 0,
      tripDays: water.tripDays != null ? water.tripDays : 2,
      blackKind: tank.blackKind != null ? tank.blackKind : "cassette",
      blackTankLitres: tank.blackTankLitres != null ? tank.blackTankLitres : 18,
      flushesPerPersonPerDay:
        water.cassetteFlushesPerPersonPerDay != null ? water.cassetteFlushesPerPersonPerDay : 5,
      litresPerFlush: water.cassetteLitresPerFlush != null ? water.cassetteLitresPerFlush : 0.25,
      startPercent: tank.blackStartPercent != null ? tank.blackStartPercent : 0,
      activePreset: "defaults",
    };
  }

  var PRESETS = {
    defaults: {
      label: "Reset to defaults",
      usage: createDefaultPlan(),
    },
    weekendCouple: {
      label: "Weekend couple",
      sublabel: "2 people · 18 L",
      usage: {
        adults: 2,
        children: 0,
        tripDays: 2,
        blackKind: "cassette",
        blackTankLitres: 18,
        flushesPerPersonPerDay: 4,
        litresPerFlush: 0.25,
        startPercent: 0,
        activePreset: "weekendCouple",
      },
    },
    familyWeek: {
      label: "Family week",
      sublabel: "4 people · 7 days",
      usage: {
        adults: 2,
        children: 2,
        tripDays: 7,
        blackKind: "cassette",
        blackTankLitres: 19,
        flushesPerPersonPerDay: 5,
        litresPerFlush: 0.25,
        startPercent: 0,
        activePreset: "familyWeek",
      },
    },
    soloWild: {
      label: "Solo wild camp",
      sublabel: "1 person · 17 L",
      usage: {
        adults: 1,
        children: 0,
        tripDays: 3,
        blackKind: "cassette",
        blackTankLitres: 17,
        flushesPerPersonPerDay: 4,
        litresPerFlush: 0.25,
        startPercent: 0,
        activePreset: "soloWild",
      },
    },
  };

  return {
    PRESET_ORDER: PRESET_ORDER,
    PRESETS: PRESETS,
    createDefaultPlan: createDefaultPlan,
  };
});
