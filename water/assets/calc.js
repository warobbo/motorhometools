/**
 * Pure motorhome water maths.
 * Works in the browser and in Node tests.
 * Grey water is fresh use minus drinking/cooking and cassette flushes.
 * Water weight uses 1 litre = 1 kg.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WaterCalc = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CHILD_FACTOR = 0.7;
  var KG_PER_LITRE = 1;
  var SHOWER_LITRES_PER_MINUTE = 4;
  var MAX_PEOPLE = 20;
  var MIN_TRIP_DAYS = 0.5;
  var MAX_TRIP_DAYS = 90;
  var MAX_SHOWERS_PER_DAY = 5;
  var MAX_SHOWER_LITRES = 80;
  var MAX_SHOWER_MINUTES = 20;
  var MAX_WASH_LITRES = 80;
  var MAX_LAUNDRY_LITRES = 80;
  var MAX_LAUNDRY_LOADS = 30;
  var MAX_DRINK_LITRES = 20;
  var MAX_FLUSHES = 20;
  var MAX_FLUSH_LITRES = 5;
  var MAX_TANK_LITRES = 500;

  var SHOWER_STYLES = {
    short: { id: "short", label: "Short", minutes: 1.5, litres: 6 },
    normal: { id: "normal", label: "Normal", minutes: 3, litres: 12 },
    long: { id: "long", label: "Long", minutes: 5, litres: 20 },
  };

  function toNumber(value, fallback) {
    var n = typeof value === "number" ? value : parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundPeople(value) {
    return Math.round(toNumber(value, 0));
  }

  function sanitiseShowerStyle(value) {
    if (value === "short" || value === "normal" || value === "long" || value === "custom") {
      return value;
    }
    return "short";
  }

  function matchShowerStyle(litres, minutes) {
    var ids = Object.keys(SHOWER_STYLES);
    for (var i = 0; i < ids.length; i += 1) {
      var style = SHOWER_STYLES[ids[i]];
      if (
        Math.abs(style.litres - litres) < 0.05 &&
        Math.abs(style.minutes - minutes) < 0.05
      ) {
        return style.id;
      }
    }
    return "custom";
  }

  function litresFromMinutes(minutes) {
    return clamp(toNumber(minutes, 0), 0, MAX_SHOWER_MINUTES) * SHOWER_LITRES_PER_MINUTE;
  }

  function peopleUnits(adults, children) {
    return Math.max(0, adults) + Math.max(0, children) * CHILD_FACTOR;
  }

  function normaliseUsage(raw) {
    var source = raw && typeof raw === "object" ? raw : {};
    var adults = clamp(roundPeople(source.adults != null ? source.adults : 2), 0, MAX_PEOPLE);
    var children = clamp(roundPeople(source.children != null ? source.children : 0), 0, MAX_PEOPLE);
    var tripDays = clamp(
      toNumber(source.tripDays, 2),
      MIN_TRIP_DAYS,
      MAX_TRIP_DAYS
    );
    var showerStyle = sanitiseShowerStyle(source.showerStyle);
    var showerMinutes = clamp(toNumber(source.showerMinutes, 1.5), 0, MAX_SHOWER_MINUTES);
    var showerLitres = clamp(toNumber(source.showerLitres, 6), 0, MAX_SHOWER_LITRES);

    if (showerStyle !== "custom" && SHOWER_STYLES[showerStyle]) {
      showerMinutes = SHOWER_STYLES[showerStyle].minutes;
      showerLitres = SHOWER_STYLES[showerStyle].litres;
    }

    return {
      adults: adults,
      children: children,
      tripDays: tripDays,
      showersPerPersonPerDay: clamp(
        toNumber(source.showersPerPersonPerDay, 0.5),
        0,
        MAX_SHOWERS_PER_DAY
      ),
      showerStyle: showerStyle,
      showerMinutes: showerMinutes,
      showerLitres: showerLitres,
      washUpLitresPerDay: clamp(toNumber(source.washUpLitresPerDay, 5), 0, MAX_WASH_LITRES),
      laundryEnabled: !!source.laundryEnabled,
      laundryLitresPerLoad: clamp(
        toNumber(source.laundryLitresPerLoad, 15),
        0,
        MAX_LAUNDRY_LITRES
      ),
      laundryLoadsPerTrip: clamp(
        toNumber(source.laundryLoadsPerTrip, 0),
        0,
        MAX_LAUNDRY_LOADS
      ),
      drinkCookLitresPerPersonPerDay: clamp(
        toNumber(source.drinkCookLitresPerPersonPerDay, 2.5),
        0,
        MAX_DRINK_LITRES
      ),
      cassetteEnabled: source.cassetteEnabled != null ? !!source.cassetteEnabled : true,
      cassetteFlushesPerPersonPerDay: clamp(
        toNumber(source.cassetteFlushesPerPersonPerDay, 5),
        0,
        MAX_FLUSHES
      ),
      cassetteLitresPerFlush: clamp(
        toNumber(source.cassetteLitresPerFlush, 0.25),
        0,
        MAX_FLUSH_LITRES
      ),
      freshTankLitres: clamp(toNumber(source.freshTankLitres, 0), 0, MAX_TANK_LITRES),
      activePreset: source.activePreset ? String(source.activePreset) : "",
    };
  }

  function calcWater(raw) {
    var usage = normaliseUsage(raw);
    var units = peopleUnits(usage.adults, usage.children);
    var heads = usage.adults + usage.children;
    var showerDaily = units * usage.showersPerPersonPerDay * usage.showerLitres;
    var washDaily = usage.washUpLitresPerDay;
    var laundryTrip = usage.laundryEnabled
      ? usage.laundryLitresPerLoad * usage.laundryLoadsPerTrip
      : 0;
    var laundryDaily = usage.tripDays > 0 ? laundryTrip / usage.tripDays : 0;
    var drinkDaily = units * usage.drinkCookLitresPerPersonPerDay;
    var cassetteDaily = usage.cassetteEnabled
      ? heads * usage.cassetteFlushesPerPersonPerDay * usage.cassetteLitresPerFlush
      : 0;

    var items = [
      { id: "showers", name: "Showers", litresPerDay: showerDaily },
      { id: "wash", name: "Washing up", litresPerDay: washDaily },
      { id: "laundry", name: "Laundry", litresPerDay: laundryDaily },
      { id: "drink", name: "Drinking and cooking", litresPerDay: drinkDaily },
      { id: "cassette", name: "Cassette flushes", litresPerDay: cassetteDaily },
    ];

    var freshDaily = items.reduce(function (sum, item) {
      return sum + item.litresPerDay;
    }, 0);
    var greyDaily = Math.max(0, freshDaily - drinkDaily - cassetteDaily);
    var freshTrip = freshDaily * usage.tripDays;
    var greyTrip = greyDaily * usage.tripDays;
    var hasTank = usage.freshTankLitres > 0;
    var daysUntilEmpty = hasTank && freshDaily > 0 ? usage.freshTankLitres / freshDaily : 0;

    return {
      usage: usage,
      peopleUnits: units,
      heads: heads,
      items: items.map(function (item) {
        return {
          id: item.id,
          name: item.name,
          litresPerDay: item.litresPerDay,
          litresTrip: item.litresPerDay * usage.tripDays,
        };
      }),
      freshDaily: freshDaily,
      freshTrip: freshTrip,
      greyDaily: greyDaily,
      greyTrip: greyTrip,
      drinkDaily: drinkDaily,
      cassetteDaily: cassetteDaily,
      laundryDaily: laundryDaily,
      laundryTrip: laundryTrip,
      tripWeightKg: freshTrip * KG_PER_LITRE,
      tankWeightKg: usage.freshTankLitres * KG_PER_LITRE,
      hasTank: hasTank,
      daysUntilEmpty: daysUntilEmpty,
      kgPerLitre: KG_PER_LITRE,
    };
  }

  return {
    CHILD_FACTOR: CHILD_FACTOR,
    KG_PER_LITRE: KG_PER_LITRE,
    SHOWER_LITRES_PER_MINUTE: SHOWER_LITRES_PER_MINUTE,
    MAX_PEOPLE: MAX_PEOPLE,
    MIN_TRIP_DAYS: MIN_TRIP_DAYS,
    MAX_TRIP_DAYS: MAX_TRIP_DAYS,
    MAX_SHOWERS_PER_DAY: MAX_SHOWERS_PER_DAY,
    MAX_SHOWER_LITRES: MAX_SHOWER_LITRES,
    MAX_SHOWER_MINUTES: MAX_SHOWER_MINUTES,
    MAX_WASH_LITRES: MAX_WASH_LITRES,
    MAX_LAUNDRY_LITRES: MAX_LAUNDRY_LITRES,
    MAX_LAUNDRY_LOADS: MAX_LAUNDRY_LOADS,
    MAX_DRINK_LITRES: MAX_DRINK_LITRES,
    MAX_FLUSHES: MAX_FLUSHES,
    MAX_FLUSH_LITRES: MAX_FLUSH_LITRES,
    MAX_TANK_LITRES: MAX_TANK_LITRES,
    SHOWER_STYLES: SHOWER_STYLES,
    toNumber: toNumber,
    clamp: clamp,
    sanitiseShowerStyle: sanitiseShowerStyle,
    matchShowerStyle: matchShowerStyle,
    litresFromMinutes: litresFromMinutes,
    peopleUnits: peopleUnits,
    normaliseUsage: normaliseUsage,
    calcWater: calcWater,
  };
});
