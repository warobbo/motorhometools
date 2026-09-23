/**
 * Pure cassette / black-tank empty maths.
 * Works in the browser and in Node tests.
 *
 * This planner is about empty stops. Daily waste is flush litres
 * (people × flushes × litres per flush) — a planning figure, not a
 * waste assay. Typical UK leisure vans use a 15–20 L Thetford-style
 * cassette; a fixed black tank is less common and usually larger.
 *
 * Days until empty use the room left from the starting fill.
 * Empties for the trip count every dump, including one at the end
 * if anything is in the tank.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./calc.js"), require("./tank-calc.js"));
  } else {
    root.CassetteCalc = factory(root.WaterCalc, root.TankCalc);
  }
})(typeof self !== "undefined" ? self : this, function (WaterCalc, TankCalc) {
  "use strict";

  var MAX_PEOPLE = WaterCalc.MAX_PEOPLE;
  var MIN_TRIP_DAYS = WaterCalc.MIN_TRIP_DAYS;
  var MAX_TRIP_DAYS = WaterCalc.MAX_TRIP_DAYS;
  var MAX_FLUSHES = WaterCalc.MAX_FLUSHES;
  var MAX_FLUSH_LITRES = WaterCalc.MAX_FLUSH_LITRES;
  var MAX_TANK_LITRES = WaterCalc.MAX_TANK_LITRES;
  var MIN_PERCENT = TankCalc.MIN_PERCENT;
  var MAX_PERCENT = TankCalc.MAX_PERCENT;
  var DEFAULT_CASSETTE_LITRES = TankCalc.DEFAULT_CASSETTE_LITRES;
  var DEFAULT_FIXED_BLACK_LITRES = TankCalc.DEFAULT_FIXED_BLACK_LITRES;
  var DEFAULT_FLUSHES = 5;
  var DEFAULT_LITRES_PER_FLUSH = 0.25;

  function toNumber(value, fallback) {
    return WaterCalc.toNumber(value, fallback);
  }

  function clamp(value, min, max) {
    return WaterCalc.clamp(value, min, max);
  }

  function roundPeople(value) {
    return Math.round(toNumber(value, 0));
  }

  function sanitiseBlackKind(value) {
    return TankCalc.sanitiseBlackKind(value);
  }

  function blackLabel(kind) {
    return TankCalc.blackLabel(kind);
  }

  function defaultBlackLitres(kind) {
    return TankCalc.defaultBlackLitres(kind);
  }

  function blackLitresForKind(kind, currentLitres) {
    return TankCalc.blackLitresForKind(kind, currentLitres);
  }

  function normalisePlan(raw, waterUsage, tankPlan) {
    var source = raw && typeof raw === "object" ? raw : {};
    var water = waterUsage && typeof waterUsage === "object" ? waterUsage : {};
    var tank = tankPlan && typeof tankPlan === "object" ? tankPlan : {};

    var hasOwnAdults = source.adults != null && source.adults !== "";
    var hasOwnChildren = source.children != null && source.children !== "";
    var hasOwnTrip = source.tripDays != null && source.tripDays !== "";
    var hasOwnFlushes = source.flushesPerPersonPerDay != null && source.flushesPerPersonPerDay !== "";
    var hasOwnFlushLitres = source.litresPerFlush != null && source.litresPerFlush !== "";
    var hasOwnKind = source.blackKind != null && source.blackKind !== "";
    var hasOwnSize = source.blackTankLitres != null && source.blackTankLitres !== "";
    var hasOwnStart = source.startPercent != null && source.startPercent !== "";

    var blackKind = sanitiseBlackKind(
      hasOwnKind ? source.blackKind : tank.blackKind != null ? tank.blackKind : "cassette"
    );
    var defaultSize = hasOwnSize
      ? source.blackTankLitres
      : tank.blackTankLitres != null && tank.blackTankLitres !== ""
        ? tank.blackTankLitres
        : defaultBlackLitres(blackKind);

    return {
      adults: clamp(
        roundPeople(hasOwnAdults ? source.adults : water.adults != null ? water.adults : 2),
        0,
        MAX_PEOPLE
      ),
      children: clamp(
        roundPeople(hasOwnChildren ? source.children : water.children != null ? water.children : 0),
        0,
        MAX_PEOPLE
      ),
      tripDays: clamp(
        toNumber(hasOwnTrip ? source.tripDays : water.tripDays != null ? water.tripDays : 2),
        MIN_TRIP_DAYS,
        MAX_TRIP_DAYS
      ),
      blackKind: blackKind,
      blackTankLitres: clamp(toNumber(defaultSize, defaultBlackLitres(blackKind)), 0, MAX_TANK_LITRES),
      flushesPerPersonPerDay: clamp(
        toNumber(
          hasOwnFlushes
            ? source.flushesPerPersonPerDay
            : water.cassetteFlushesPerPersonPerDay != null
              ? water.cassetteFlushesPerPersonPerDay
              : DEFAULT_FLUSHES
        ),
        0,
        MAX_FLUSHES
      ),
      litresPerFlush: clamp(
        toNumber(
          hasOwnFlushLitres
            ? source.litresPerFlush
            : water.cassetteLitresPerFlush != null
              ? water.cassetteLitresPerFlush
              : DEFAULT_LITRES_PER_FLUSH
        ),
        0,
        MAX_FLUSH_LITRES
      ),
      startPercent: clamp(
        toNumber(
          hasOwnStart
            ? source.startPercent
            : tank.blackStartPercent != null
              ? tank.blackStartPercent
              : 0
        ),
        MIN_PERCENT,
        MAX_PERCENT
      ),
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

  function tripEmpties(startLitres, wasteTrip, tankLitres) {
    if (tankLitres <= 0) return 0;
    var total = startLitres + wasteTrip;
    if (total <= 0) return 0;
    return Math.ceil(total / tankLitres - 1e-9);
  }

  function calcCassette(rawPlan, waterUsage, tankPlan) {
    var plan = normalisePlan(rawPlan, waterUsage, tankPlan);
    var heads = plan.adults + plan.children;
    var wasteDaily = heads * plan.flushesPerPersonPerDay * plan.litresPerFlush;
    var wasteTrip = wasteDaily * plan.tripDays;
    var startLitres = plan.blackTankLitres * (plan.startPercent / 100);
    var usable = plan.blackTankLitres * (1 - plan.startPercent / 100);
    var daysUntilEmpty = daysFromRate(usable, wasteDaily);
    var emptiesNeeded = tripEmpties(startLitres, wasteTrip, plan.blackTankLitres);
    var extraEmpties = extraStops(wasteTrip, usable, plan.blackTankLitres);

    return {
      plan: plan,
      heads: heads,
      flushesPerDay: heads * plan.flushesPerPersonPerDay,
      wasteDaily: wasteDaily,
      wasteTrip: wasteTrip,
      startLitres: startLitres,
      usable: usable,
      daysUntilEmpty: daysUntilEmpty,
      emptiesNeeded: emptiesNeeded,
      extraEmpties: extraEmpties,
      blackLabel: blackLabel(plan.blackKind),
    };
  }

  /**
   * Cassette URL prefill contract (Ask / share links).
   *
   * Recognised query params — unknown keys are ignored. A param only
   * overrides the existing cassettePlan field when it is present and
   * valid. Apply the patch onto the plan after defaults, then
   * normalisePlan; do not invent flush rates or tank sizes.
   *
   *   adults                   number
   *   children                 number
   *   tripDays                 number (optional)
   *   blackKind                cassette | fixed
   *                            (aliases: fixedBlack, fixed-black, fixed_black)
   *   blackTankLitres          number (one cassette / tank; Ask may pass
   *                            the already-multiplied total, e.g. 36 for
   *                            two 18 L cassettes)
   *   cassetteCount            optional positive integer. When present
   *                            and valid, effective capacity =
   *                            blackTankLitres × cassetteCount
   *                            (query litres if present, otherwise the
   *                            current plan / inherited size). Not a
   *                            form field — the page has no count input,
   *                            so the product is stored as blackTankLitres.
   *   flushesPerPersonPerDay   number
   *   litresPerFlush           number
   *   startPercent             number
   *
   * Page defaults (createDefaultPlan, when water/tanks have no values):
   *   adults 2, children 0, tripDays 2, blackKind cassette,
   *   blackTankLitres 18, flushesPerPersonPerDay 5,
   *   litresPerFlush 0.25, startPercent 0.
   *
   * Parse with parseCassettePrefillQuery(search).
   * Build with buildCassettePrefillHref(plan) → "cassette.html?...".
   * buildCassettePrefillQuery emits the effective blackTankLitres, not
   * cassetteCount (count is an Ask convenience, not stored on the plan).
   */
  var CASSETTE_PREFILL_KEYS = [
    "adults",
    "children",
    "tripDays",
    "blackKind",
    "blackTankLitres",
    "cassetteCount",
    "flushesPerPersonPerDay",
    "litresPerFlush",
    "startPercent",
  ];

  var BLACK_KIND_ALIASES = {
    cassette: "cassette",
    fixed: "fixed",
    fixedblack: "fixed",
    "fixed-black": "fixed",
    fixed_black: "fixed",
  };

  function decodeQueryPart(value) {
    try {
      return decodeURIComponent(String(value).replace(/\+/g, " "));
    } catch (err) {
      return String(value).replace(/\+/g, " ");
    }
  }

  function queryParamsFromSearch(input) {
    if (input == null || input === "") return {};
    if (typeof input === "object") {
      if (typeof input.get === "function") {
        var fromSearch = {};
        if (typeof input.forEach === "function") {
          input.forEach(function (value, key) {
            fromSearch[key] = value;
          });
          return fromSearch;
        }
        CASSETTE_PREFILL_KEYS.forEach(function (key) {
          if (typeof input.has === "function" && input.has(key)) {
            fromSearch[key] = input.get(key);
          }
        });
        return fromSearch;
      }
      return input;
    }

    var search = String(input);
    var qMark = search.indexOf("?");
    if (qMark >= 0) search = search.slice(qMark + 1);
    var hash = search.indexOf("#");
    if (hash >= 0) search = search.slice(0, hash);
    var out = {};
    if (!search) return out;
    search.split("&").forEach(function (pair) {
      if (!pair) return;
      var eq = pair.indexOf("=");
      var rawKey = eq >= 0 ? pair.slice(0, eq) : pair;
      var rawValue = eq >= 0 ? pair.slice(eq + 1) : "";
      var key = decodeQueryPart(rawKey);
      if (key) out[key] = decodeQueryPart(rawValue);
    });
    return out;
  }

  function hasOwnParam(params, key) {
    return !!(params && Object.prototype.hasOwnProperty.call(params, key));
  }

  function parseQueryNumber(value) {
    if (value == null) return undefined;
    var trimmed = String(value).trim();
    if (trimmed === "") return undefined;
    var n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  }

  function parseQueryBlackKind(value) {
    if (value == null) return undefined;
    var id = String(value).trim();
    if (!id) return undefined;
    var mapped = BLACK_KIND_ALIASES[id] || BLACK_KIND_ALIASES[id.toLowerCase()];
    return mapped || undefined;
  }

  function parseQueryCount(value) {
    var n = parseQueryNumber(value);
    if (n == null || n < 1 || Math.round(n) !== n) return undefined;
    return n;
  }

  function parseCassettePrefillQuery(search) {
    var params = queryParamsFromSearch(search);
    var patch = {};

    if (hasOwnParam(params, "adults")) {
      var adults = parseQueryNumber(params.adults);
      if (adults != null) patch.adults = adults;
    }
    if (hasOwnParam(params, "children")) {
      var children = parseQueryNumber(params.children);
      if (children != null) patch.children = children;
    }
    if (hasOwnParam(params, "tripDays")) {
      var tripDays = parseQueryNumber(params.tripDays);
      if (tripDays != null) patch.tripDays = tripDays;
    }
    if (hasOwnParam(params, "blackKind")) {
      var blackKind = parseQueryBlackKind(params.blackKind);
      if (blackKind) patch.blackKind = blackKind;
    }
    if (hasOwnParam(params, "blackTankLitres")) {
      var blackTankLitres = parseQueryNumber(params.blackTankLitres);
      if (blackTankLitres != null) patch.blackTankLitres = blackTankLitres;
    }
    if (hasOwnParam(params, "cassetteCount")) {
      var cassetteCount = parseQueryCount(params.cassetteCount);
      if (cassetteCount != null) patch.cassetteCount = cassetteCount;
    }
    if (hasOwnParam(params, "flushesPerPersonPerDay")) {
      var flushesPerPersonPerDay = parseQueryNumber(params.flushesPerPersonPerDay);
      if (flushesPerPersonPerDay != null) patch.flushesPerPersonPerDay = flushesPerPersonPerDay;
    }
    if (hasOwnParam(params, "litresPerFlush")) {
      var litresPerFlush = parseQueryNumber(params.litresPerFlush);
      if (litresPerFlush != null) patch.litresPerFlush = litresPerFlush;
    }
    if (hasOwnParam(params, "startPercent")) {
      var startPercent = parseQueryNumber(params.startPercent);
      if (startPercent != null) patch.startPercent = startPercent;
    }

    return Object.keys(patch).length ? patch : null;
  }

  function copyPlan(raw) {
    var copy = {};
    var source = raw && typeof raw === "object" ? raw : {};
    Object.keys(source).forEach(function (key) {
      copy[key] = source[key];
    });
    return copy;
  }

  function applyCassettePrefillToPlan(plan, search, waterUsage, tankPlan) {
    var patch = parseCassettePrefillQuery(search);
    if (!patch) return null;

    var merged = copyPlan(plan);
    Object.keys(patch).forEach(function (key) {
      if (key === "cassetteCount") return;
      merged[key] = patch[key];
    });

    if (patch.cassetteCount != null) {
      var unitLitres = patch.blackTankLitres;
      if (unitLitres == null || unitLitres === "") {
        unitLitres = normalisePlan(merged, waterUsage, tankPlan).blackTankLitres;
      }
      merged.blackTankLitres = toNumber(unitLitres, 0) * patch.cassetteCount;
    }

    var next = normalisePlan(merged, waterUsage, tankPlan);
    next.activePreset = "";
    return next;
  }

  function addPrefillParam(parts, key, value) {
    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
  }

  function buildCassettePrefillQuery(plan) {
    var p = plan && typeof plan === "object" ? plan : {};
    var parts = [];

    if (parseQueryNumber(p.adults) != null) addPrefillParam(parts, "adults", roundPeople(p.adults));
    if (parseQueryNumber(p.children) != null) addPrefillParam(parts, "children", roundPeople(p.children));
    if (parseQueryNumber(p.tripDays) != null) addPrefillParam(parts, "tripDays", toNumber(p.tripDays, 0));
    if (parseQueryBlackKind(p.blackKind)) addPrefillParam(parts, "blackKind", parseQueryBlackKind(p.blackKind));
    if (parseQueryNumber(p.blackTankLitres) != null) {
      addPrefillParam(parts, "blackTankLitres", toNumber(p.blackTankLitres, 0));
    }
    if (parseQueryNumber(p.flushesPerPersonPerDay) != null) {
      addPrefillParam(parts, "flushesPerPersonPerDay", toNumber(p.flushesPerPersonPerDay, 0));
    }
    if (parseQueryNumber(p.litresPerFlush) != null) {
      addPrefillParam(parts, "litresPerFlush", toNumber(p.litresPerFlush, 0));
    }
    if (parseQueryNumber(p.startPercent) != null) {
      addPrefillParam(parts, "startPercent", toNumber(p.startPercent, 0));
    }

    return parts.join("&");
  }

  function buildCassettePrefillHref(plan, base) {
    var query = buildCassettePrefillQuery(plan);
    var path = base == null || base === "" ? "cassette.html" : String(base);
    return query ? path + "?" + query : path;
  }

  return {
    MAX_PEOPLE: MAX_PEOPLE,
    MIN_TRIP_DAYS: MIN_TRIP_DAYS,
    MAX_TRIP_DAYS: MAX_TRIP_DAYS,
    MAX_FLUSHES: MAX_FLUSHES,
    MAX_FLUSH_LITRES: MAX_FLUSH_LITRES,
    MAX_TANK_LITRES: MAX_TANK_LITRES,
    MIN_PERCENT: MIN_PERCENT,
    MAX_PERCENT: MAX_PERCENT,
    DEFAULT_CASSETTE_LITRES: DEFAULT_CASSETTE_LITRES,
    DEFAULT_FIXED_BLACK_LITRES: DEFAULT_FIXED_BLACK_LITRES,
    DEFAULT_FLUSHES: DEFAULT_FLUSHES,
    DEFAULT_LITRES_PER_FLUSH: DEFAULT_LITRES_PER_FLUSH,
    toNumber: toNumber,
    clamp: clamp,
    sanitiseBlackKind: sanitiseBlackKind,
    blackLabel: blackLabel,
    defaultBlackLitres: defaultBlackLitres,
    blackLitresForKind: blackLitresForKind,
    normalisePlan: normalisePlan,
    extraStops: extraStops,
    tripEmpties: tripEmpties,
    calcCassette: calcCassette,
    CASSETTE_PREFILL_KEYS: CASSETTE_PREFILL_KEYS,
    parseCassettePrefillQuery: parseCassettePrefillQuery,
    applyCassettePrefillToPlan: applyCassettePrefillToPlan,
    buildCassettePrefillQuery: buildCassettePrefillQuery,
    buildCassettePrefillHref: buildCassettePrefillHref,
  };
});
