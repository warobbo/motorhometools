/**
 * UK motorhome LPG defaults, named presets, and common bottle sizes.
 * Kilograms are typical leisure-vehicle figures — users should edit them.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GasDefaults = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PRESET_ORDER = ["weekendSummer", "winterWeek", "fulltimeLight", "defaults"];

  function createDefaultUsage(waterUsage) {
    var water = waterUsage && typeof waterUsage === "object" ? waterUsage : {};
    return {
      adults: water.adults != null ? water.adults : 2,
      children: water.children != null ? water.children : 0,
      tripDays: water.tripDays != null ? water.tripDays : 2,
      season: "summer",
      mealsPerDay: 2,
      cookingStyle: "normal",
      heatingLevel: "off",
      heatingHours: 0,
      fridgeGasEnabled: false,
      fridgeHoursPerDay: 24,
      boilerEnabled: false,
      boilerLevel: "normal",
      boilerHours: 1.5,
      gasType: "butane",
      bottleId: "butane7",
      bottleKg: 7,
      activePreset: "defaults",
    };
  }

  var PRESETS = {
    defaults: {
      label: "Reset to defaults",
      usage: createDefaultUsage(),
    },
    weekendSummer: {
      label: "Weekend summer",
      sublabel: "cooking only · 2 days",
      usage: {
        adults: 2,
        children: 0,
        tripDays: 2,
        season: "summer",
        mealsPerDay: 2,
        cookingStyle: "normal",
        heatingLevel: "off",
        heatingHours: 0,
        fridgeGasEnabled: false,
        fridgeHoursPerDay: 24,
        boilerEnabled: false,
        boilerLevel: "normal",
        boilerHours: 1.5,
        gasType: "butane",
        bottleId: "butane45",
        bottleKg: 4.5,
        activePreset: "weekendSummer",
      },
    },
    winterWeek: {
      label: "Winter week",
      sublabel: "propane · heating on",
      // Product lock: frost → propane and the 13 kg Calor leisure bottle.
      usage: {
        adults: 2,
        children: 0,
        tripDays: 7,
        season: "winter",
        mealsPerDay: 2,
        cookingStyle: "normal",
        heatingLevel: "high",
        heatingHours: 12,
        fridgeGasEnabled: true,
        fridgeHoursPerDay: 24,
        boilerEnabled: true,
        boilerLevel: "normal",
        boilerHours: 1.5,
        gasType: "propane",
        bottleId: "propane13",
        bottleKg: 13,
        activePreset: "winterWeek",
      },
    },
    fulltimeLight: {
      label: "Full-time light",
      sublabel: "careful week for two",
      usage: {
        adults: 2,
        children: 0,
        tripDays: 7,
        season: "mild",
        mealsPerDay: 2,
        cookingStyle: "light",
        heatingLevel: "low",
        heatingHours: 2,
        fridgeGasEnabled: false,
        fridgeHoursPerDay: 24,
        boilerEnabled: true,
        boilerLevel: "light",
        boilerHours: 0.5,
        gasType: "butane",
        bottleId: "butane7",
        bottleKg: 7,
        activePreset: "fulltimeLight",
      },
    },
  };

  return {
    PRESET_ORDER: PRESET_ORDER,
    PRESETS: PRESETS,
    createDefaultUsage: createDefaultUsage,
  };
});
