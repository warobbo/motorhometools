/**
 * UK/EU motorhome water defaults and named presets.
 * Litres are typical leisure-vehicle figures — users should edit them.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WaterDefaults = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PRESET_ORDER = ["weekend", "family", "fulltime", "defaults"];

  function createDefaultUsage() {
    return {
      adults: 2,
      children: 0,
      tripDays: 2,
      showersPerPersonPerDay: 0.5,
      showerStyle: "short",
      showerMinutes: 1.5,
      showerLitres: 6,
      washUpLitresPerDay: 5,
      laundryEnabled: false,
      laundryLitresPerLoad: 15,
      laundryLoadsPerTrip: 0,
      drinkCookLitresPerPersonPerDay: 2.5,
      cassetteEnabled: true,
      cassetteFlushesPerPersonPerDay: 5,
      cassetteLitresPerFlush: 0.25,
      freshTankLitres: 100,
      activePreset: "defaults",
    };
  }

  var PRESETS = {
    defaults: {
      label: "Reset to defaults",
      usage: createDefaultUsage(),
    },
    weekend: {
      label: "Weekend",
      sublabel: "2 people · 2 days",
      usage: {
        adults: 2,
        children: 0,
        tripDays: 2,
        showersPerPersonPerDay: 0.5,
        showerStyle: "short",
        showerMinutes: 1.5,
        showerLitres: 6,
        washUpLitresPerDay: 5,
        laundryEnabled: false,
        laundryLitresPerLoad: 15,
        laundryLoadsPerTrip: 0,
        drinkCookLitresPerPersonPerDay: 2.5,
        cassetteEnabled: true,
        cassetteFlushesPerPersonPerDay: 4,
        cassetteLitresPerFlush: 0.25,
        freshTankLitres: 100,
        activePreset: "weekend",
      },
    },
    family: {
      label: "Family week",
      sublabel: "2 adults + 2 children",
      usage: {
        adults: 2,
        children: 2,
        tripDays: 7,
        showersPerPersonPerDay: 1,
        showerStyle: "normal",
        showerMinutes: 3,
        showerLitres: 12,
        washUpLitresPerDay: 10,
        laundryEnabled: true,
        laundryLitresPerLoad: 15,
        laundryLoadsPerTrip: 1,
        drinkCookLitresPerPersonPerDay: 3,
        cassetteEnabled: true,
        cassetteFlushesPerPersonPerDay: 5,
        cassetteLitresPerFlush: 0.25,
        freshTankLitres: 120,
        activePreset: "family",
      },
    },
    fulltime: {
      label: "Light full-time",
      sublabel: "careful week for two",
      usage: {
        adults: 2,
        children: 0,
        tripDays: 7,
        showersPerPersonPerDay: 0.5,
        showerStyle: "short",
        showerMinutes: 1.5,
        showerLitres: 6,
        washUpLitresPerDay: 6,
        laundryEnabled: true,
        laundryLitresPerLoad: 15,
        laundryLoadsPerTrip: 1,
        drinkCookLitresPerPersonPerDay: 2.5,
        cassetteEnabled: true,
        cassetteFlushesPerPersonPerDay: 5,
        cassetteLitresPerFlush: 0.25,
        freshTankLitres: 100,
        activePreset: "fulltime",
      },
    },
  };

  function createDefaultProfile() {
    return {
      version: 1,
      waterUsage: createDefaultUsage(),
    };
  }

  return {
    PRESET_ORDER: PRESET_ORDER,
    PRESETS: PRESETS,
    createDefaultUsage: createDefaultUsage,
    createDefaultProfile: createDefaultProfile,
  };
});
