/**
 * Pure motorhome holding-tank maths (fresh, grey, black / cassette).
 * Works in the browser and in Node tests.
 *
 * Daily litres come from the Water calculator (same showers, sink,
 * drinking and cassette flushes). This file only turns those rates
 * plus tank sizes and starting levels into days and fill/empty stops.
 *
 * Grey water is fresh use minus drinking/cooking and cassette flushes,
 * same as Water. Cassette / black fill uses the cassette flush litres
 * already counted on the Water page — a planning figure, not a waste
 * assay. Typical UK leisure vans use a 15–20 L cassette; a fixed black
 * tank is less common and usually larger.
 *
 * Water weight uses 1 litre = 1 kg.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./calc.js"));
  } else {
    root.TankCalc = factory(root.WaterCalc);
  }
})(typeof self !== "undefined" ? self : this, function (WaterCalc) {
  "use strict";

  var MIN_TRIP_DAYS = WaterCalc.MIN_TRIP_DAYS;
  var MAX_TRIP_DAYS = WaterCalc.MAX_TRIP_DAYS;
  var MAX_TANK_LITRES = WaterCalc.MAX_TANK_LITRES;
  var MIN_PERCENT = 0;
  var MAX_PERCENT = 100;
  var KG_PER_LITRE = WaterCalc.KG_PER_LITRE;
  var DEFAULT_GREY_LITRES = 90;
  var DEFAULT_CASSETTE_LITRES = 18;
  var DEFAULT_FIXED_BLACK_LITRES = 80;

  var BLACK_KINDS = {
    cassette: {
      id: "cassette",
      label: "Cassette",
      defaultLitres: DEFAULT_CASSETTE_LITRES,
    },
    fixed: {
      id: "fixed",
      label: "Fixed black tank",
      defaultLitres: DEFAULT_FIXED_BLACK_LITRES,
    },
  };

  function toNumber(value, fallback) {
    return WaterCalc.toNumber(value, fallback);
  }

  function clamp(value, min, max) {
    return WaterCalc.clamp(value, min, max);
  }

  function sanitiseBlackKind(value) {
    return BLACK_KINDS[value] ? value : "cassette";
  }

  function blackLabel(kind) {
    return BLACK_KINDS[sanitiseBlackKind(kind)].label;
  }

  function defaultBlackLitres(kind) {
    return BLACK_KINDS[sanitiseBlackKind(kind)].defaultLitres;
  }

  function looksLikeCassetteSize(litres) {
    return litres > 0 && litres <= 25;
  }

  function looksLikeFixedBlackSize(litres) {
    return litres >= 40;
  }

  function blackLitresForKind(kind, currentLitres) {
    var nextKind = sanitiseBlackKind(kind);
    var current = clamp(toNumber(currentLitres, 0), 0, MAX_TANK_LITRES);
    if (nextKind === "cassette" && looksLikeFixedBlackSize(current)) {
      return DEFAULT_CASSETTE_LITRES;
    }
    if (nextKind === "fixed" && looksLikeCassetteSize(current)) {
      return DEFAULT_FIXED_BLACK_LITRES;
    }
    if (current > 0) return current;
    return defaultBlackLitres(nextKind);
  }

  function normalisePlan(raw, waterUsage) {
    var source = raw && typeof raw === "object" ? raw : {};
    var water = waterUsage && typeof waterUsage === "object" ? waterUsage : {};
    var hasOwnTrip = source.tripDays != null && source.tripDays !== "";
    var hasOwnFresh = source.freshTankLitres != null && source.freshTankLitres !== "";

    var blackKind = sanitiseBlackKind(source.blackKind);
    var defaultFresh =
      water.freshTankLitres != null && water.freshTankLitres !== ""
        ? water.freshTankLitres
        : 100;
    var defaultBlack =
      source.blackTankLitres != null && source.blackTankLitres !== ""
        ? source.blackTankLitres
        : defaultBlackLitres(blackKind);

    return {
      tripDays: clamp(
        toNumber(hasOwnTrip ? source.tripDays : water.tripDays != null ? water.tripDays : 2),
        MIN_TRIP_DAYS,
        MAX_TRIP_DAYS
      ),
      freshTankLitres: clamp(
        toNumber(hasOwnFresh ? source.freshTankLitres : defaultFresh, 100),
        0,
        MAX_TANK_LITRES
      ),
      greyTankLitres: clamp(
        toNumber(source.greyTankLitres, DEFAULT_GREY_LITRES),
        0,
        MAX_TANK_LITRES
      ),
      blackKind: blackKind,
      blackTankLitres: clamp(toNumber(defaultBlack, defaultBlackLitres(blackKind)), 0, MAX_TANK_LITRES),
      freshStartPercent: clamp(toNumber(source.freshStartPercent, 100), MIN_PERCENT, MAX_PERCENT),
      greyStartPercent: clamp(toNumber(source.greyStartPercent, 0), MIN_PERCENT, MAX_PERCENT),
      blackStartPercent: clamp(toNumber(source.blackStartPercent, 0), MIN_PERCENT, MAX_PERCENT),
      activePreset: source.activePreset ? String(source.activePreset) : "",
    };
  }

  function daysFromRate(usableLitres, dailyLitres) {
    if (usableLitres <= 0 || dailyLitres <= 0) return 0;
    return usableLitres / dailyLitres;
  }

  function extraStops(tripNeedLitres, usableLitres, tankLitres) {
    if (tankLitres <= 0 || tripNeedLitres <= 0) return 0;
    var shortfall = tripNeedLitres - usableLitres;
    if (shortfall <= 0) return 0;
    return Math.ceil(shortfall / tankLitres - 1e-9);
  }

  function calcTanks(rawPlan, waterUsage) {
    var water = WaterCalc.calcWater(waterUsage);
    var plan = normalisePlan(rawPlan, water.usage);
    var freshDaily = water.freshDaily;
    var greyDaily = water.greyDaily;
    var blackDaily = water.cassetteDaily;

    var freshUsable = plan.freshTankLitres * (plan.freshStartPercent / 100);
    var greyUsable = plan.greyTankLitres * (1 - plan.greyStartPercent / 100);
    var blackUsable = plan.blackTankLitres * (1 - plan.blackStartPercent / 100);

    var daysFresh = daysFromRate(freshUsable, freshDaily);
    var daysGrey = daysFromRate(greyUsable, greyDaily);
    var daysBlack = daysFromRate(blackUsable, blackDaily);

    var candidates = [];
    if (plan.freshTankLitres > 0 && freshDaily > 0) {
      candidates.push({
        id: "fresh",
        name: "Fresh tank",
        days: daysFresh,
        verb: "runs dry",
      });
    }
    if (plan.greyTankLitres > 0 && greyDaily > 0) {
      candidates.push({
        id: "grey",
        name: "Grey tank",
        days: daysGrey,
        verb: "fills up",
      });
    }
    if (plan.blackTankLitres > 0 && blackDaily > 0) {
      candidates.push({
        id: "black",
        name: blackLabel(plan.blackKind),
        days: daysBlack,
        verb: plan.blackKind === "cassette" ? "needs emptying" : "fills up",
      });
    }

    candidates.sort(function (a, b) {
      return a.days - b.days;
    });

    var limiter = candidates.length ? candidates[0] : null;
    var stretchDays = limiter ? limiter.days : 0;

    return {
      plan: plan,
      water: water,
      freshDaily: freshDaily,
      greyDaily: greyDaily,
      blackDaily: blackDaily,
      freshUsable: freshUsable,
      greyUsable: greyUsable,
      blackUsable: blackUsable,
      daysFresh: daysFresh,
      daysGrey: daysGrey,
      daysBlack: daysBlack,
      limiter: limiter,
      stretchDays: stretchDays,
      freshFills: extraStops(freshDaily * plan.tripDays, freshUsable, plan.freshTankLitres),
      greyEmpties: extraStops(greyDaily * plan.tripDays, greyUsable, plan.greyTankLitres),
      blackEmpties: extraStops(blackDaily * plan.tripDays, blackUsable, plan.blackTankLitres),
      freshWeightKg: plan.freshTankLitres * KG_PER_LITRE,
      greyWeightKg: plan.greyTankLitres * KG_PER_LITRE,
      kgPerLitre: KG_PER_LITRE,
      blackLabel: blackLabel(plan.blackKind),
    };
  }

  return {
    MIN_TRIP_DAYS: MIN_TRIP_DAYS,
    MAX_TRIP_DAYS: MAX_TRIP_DAYS,
    MAX_TANK_LITRES: MAX_TANK_LITRES,
    MIN_PERCENT: MIN_PERCENT,
    MAX_PERCENT: MAX_PERCENT,
    DEFAULT_GREY_LITRES: DEFAULT_GREY_LITRES,
    DEFAULT_CASSETTE_LITRES: DEFAULT_CASSETTE_LITRES,
    DEFAULT_FIXED_BLACK_LITRES: DEFAULT_FIXED_BLACK_LITRES,
    BLACK_KINDS: BLACK_KINDS,
    toNumber: toNumber,
    clamp: clamp,
    sanitiseBlackKind: sanitiseBlackKind,
    blackLabel: blackLabel,
    defaultBlackLitres: defaultBlackLitres,
    blackLitresForKind: blackLitresForKind,
    normalisePlan: normalisePlan,
    calcTanks: calcTanks,
  };
});
