/**
 * Pure motorhome LPG / gas maths (butane or propane).
 * Works in the browser and in Node tests.
 *
 * Rates are typical UK leisure-vehicle planning figures in kilograms
 * of LPG. The same kg rates are used for butane and propane — this is
 * a shopping estimate, not an energy-density model. They are not
 * manufacturer ratings and are not a safety certificate.
 *
 * Bottle sizes follow Calor UK leisure bottles:
 *   Butane (blue, default): 4.5 kg, 7 kg, 15 kg
 *   Propane (red):          3.9 kg, 6 kg, 13 kg
 *
 * Butane is the usual UK leisure choice in mild weather. Propane is
 * the better winter / freezing choice (butane struggles when it is
 * very cold).
 *
 *   Heater  0.18 kg/h   blown-air / Truma-style space heater on a
 *                       moderate setting (2–3 kW heaters are often
 *                       quoted around 0.15–0.25 kg/h).
 *   Cook    0.025 / 0.04 / 0.07 kg per person-unit per meal
 *                       light = kettle + one-pan; normal = typical hob
 *                       meal; heavy = oven, grill or a long simmer.
 *                       Children count as 0.7 of an adult, same idea
 *                       as the water calculator.
 *   Fridge  0.016 kg/h  3-way absorption fridge on gas
 *                       (~0.38 kg/day if left on for 24 hours).
 *   Boiler  0.12 kg/h   stored or Combi hot-water burner.
 *                       Light 0.5 h ≈ one heat-up; normal 1.5 h;
 *                       heavy 3 h.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GasCalc = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CHILD_FACTOR = 0.7;
  var HEATER_KG_PER_HOUR = 0.18;
  var FRIDGE_KG_PER_HOUR = 0.016;
  var BOILER_KG_PER_HOUR = 0.12;
  var MAX_PEOPLE = 20;
  var MIN_TRIP_DAYS = 0.5;
  var MAX_TRIP_DAYS = 90;
  var MAX_MEALS_PER_DAY = 6;
  var MAX_HEATING_HOURS = 24;
  var MAX_FRIDGE_HOURS = 24;
  var MAX_BOILER_HOURS = 12;
  var MIN_BOTTLE_KG = 1;
  var MAX_BOTTLE_KG = 47;

  var COOK_STYLES = {
    light: { id: "light", label: "Light", kgPerPersonPerMeal: 0.025 },
    normal: { id: "normal", label: "Normal", kgPerPersonPerMeal: 0.04 },
    heavy: { id: "heavy", label: "Heavy", kgPerPersonPerMeal: 0.07 },
  };

  var HEATING_LEVELS = {
    off: { id: "off", label: "Off", hours: 0 },
    low: { id: "low", label: "Low", hours: 2 },
    medium: { id: "medium", label: "Medium", hours: 6 },
    high: { id: "high", label: "High", hours: 12 },
  };

  var BOILER_LEVELS = {
    light: { id: "light", label: "Light", hours: 0.5 },
    normal: { id: "normal", label: "Normal", hours: 1.5 },
    heavy: { id: "heavy", label: "Heavy", hours: 3 },
  };

  var SEASONS = {
    summer: { id: "summer", label: "Summer", heatingLevel: "off", gasType: "butane" },
    mild: { id: "mild", label: "Mild", heatingLevel: "low", gasType: "butane" },
    winter: { id: "winter", label: "Winter", heatingLevel: "high", gasType: "propane" },
  };

  var GAS_TYPES = {
    butane: { id: "butane", label: "Butane", hint: "blue · usual UK leisure" },
    propane: { id: "propane", label: "Propane", hint: "red · better in the cold" },
  };

  var BOTTLES = {
    butane45: { id: "butane45", gasType: "butane", kg: 4.5, label: "4.5 kg", sublabel: "Calor butane" },
    butane7: { id: "butane7", gasType: "butane", kg: 7, label: "7 kg", sublabel: "Calor butane" },
    butane15: { id: "butane15", gasType: "butane", kg: 15, label: "15 kg", sublabel: "Calor butane" },
    propane39: { id: "propane39", gasType: "propane", kg: 3.9, label: "3.9 kg", sublabel: "Calor propane" },
    propane6: { id: "propane6", gasType: "propane", kg: 6, label: "6 kg", sublabel: "Calor propane" },
    propane13: { id: "propane13", gasType: "propane", kg: 13, label: "13 kg", sublabel: "Calor propane" },
  };

  var BOTTLE_ORDER = {
    butane: ["butane45", "butane7", "butane15"],
    propane: ["propane39", "propane6", "propane13"],
  };

  var DEFAULT_BOTTLE_ID = {
    butane: "butane7",
    propane: "propane13",
  };

  var LEGACY_BOTTLES = {
    calor6: { gasType: "propane", bottleId: "propane6" },
    calor13: { gasType: "propane", bottleId: "propane13" },
    calor19: { gasType: "propane", bottleId: "custom", bottleKg: 19 },
    refill11: { gasType: "propane", bottleId: "custom", bottleKg: 11 },
    refill14: { gasType: "propane", bottleId: "custom", bottleKg: 14 },
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

  function peopleUnits(adults, children) {
    return Math.max(0, adults) + Math.max(0, children) * CHILD_FACTOR;
  }

  function sanitiseCookingStyle(value) {
    return COOK_STYLES[value] ? value : "normal";
  }

  function sanitiseHeatingLevel(value) {
    if (value === "custom") return "custom";
    return HEATING_LEVELS[value] ? value : "off";
  }

  function sanitiseBoilerLevel(value) {
    if (value === "custom") return "custom";
    return BOILER_LEVELS[value] ? value : "normal";
  }

  function sanitiseSeason(value) {
    return SEASONS[value] ? value : "summer";
  }

  function sanitiseGasType(value) {
    return GAS_TYPES[value] ? value : "butane";
  }

  function bottlesForGas(gasType) {
    var type = sanitiseGasType(gasType);
    return BOTTLE_ORDER[type].map(function (id) {
      return BOTTLES[id];
    });
  }

  function closestBottleId(kg, gasType) {
    var type = sanitiseGasType(gasType);
    var ids = BOTTLE_ORDER[type];
    var best = DEFAULT_BOTTLE_ID[type];
    var bestDelta = Infinity;
    for (var i = 0; i < ids.length; i += 1) {
      var delta = Math.abs(BOTTLES[ids[i]].kg - kg);
      if (delta < bestDelta) {
        best = ids[i];
        bestDelta = delta;
      }
    }
    return best;
  }

  function sanitiseBottleId(value, gasType) {
    var type = sanitiseGasType(gasType);
    if (value === "custom") return "custom";
    if (BOTTLES[value] && BOTTLES[value].gasType === type) return value;
    if (BOTTLES[value]) return closestBottleId(BOTTLES[value].kg, type);
    return DEFAULT_BOTTLE_ID[type];
  }

  function matchHeatingLevel(hours) {
    var ids = Object.keys(HEATING_LEVELS);
    for (var i = 0; i < ids.length; i += 1) {
      var level = HEATING_LEVELS[ids[i]];
      if (Math.abs(level.hours - hours) < 0.05) return level.id;
    }
    return "custom";
  }

  function matchBoilerLevel(hours) {
    var ids = Object.keys(BOILER_LEVELS);
    for (var i = 0; i < ids.length; i += 1) {
      var level = BOILER_LEVELS[ids[i]];
      if (Math.abs(level.hours - hours) < 0.05) return level.id;
    }
    return "custom";
  }

  function matchBottleId(kg, gasType) {
    var type = sanitiseGasType(gasType);
    var ids = BOTTLE_ORDER[type];
    for (var i = 0; i < ids.length; i += 1) {
      if (Math.abs(BOTTLES[ids[i]].kg - kg) < 0.05) return ids[i];
    }
    return "custom";
  }

  function heatingHoursForSeason(season) {
    var spec = SEASONS[sanitiseSeason(season)];
    return HEATING_LEVELS[spec.heatingLevel].hours;
  }

  function gasTypeForSeason(season) {
    return SEASONS[sanitiseSeason(season)].gasType;
  }

  /**
   * Apply a season chip: typical heating hours, and the product gas lock
   * (winter → propane 13 kg; summer / mild stay on butane).
   */
  function applySeasonToUsage(raw, seasonId, waterUsage) {
    var season = SEASONS[sanitiseSeason(seasonId)];
    var source = raw && typeof raw === "object" ? raw : {};
    var nextType = season.gasType;
    var currentType = sanitiseGasType(source.gasType);
    var merged = {};
    Object.keys(source).forEach(function (key) {
      merged[key] = source[key];
    });
    merged.season = season.id;
    merged.heatingLevel = season.heatingLevel;
    merged.heatingHours = HEATING_LEVELS[season.heatingLevel].hours;
    merged.gasType = nextType;
    if (nextType === "propane") {
      merged.bottleId = DEFAULT_BOTTLE_ID.propane;
      merged.bottleKg = BOTTLES[merged.bottleId].kg;
    } else if (currentType !== "butane") {
      var currentKg = toNumber(source.bottleKg, BOTTLES[DEFAULT_BOTTLE_ID.butane].kg);
      merged.bottleId = closestBottleId(currentKg, "butane");
      merged.bottleKg = BOTTLES[merged.bottleId].kg;
    }
    return normaliseUsage(merged, waterUsage);
  }

  function normaliseUsage(raw, waterUsage) {
    var source = raw && typeof raw === "object" ? raw : {};
    var water = waterUsage && typeof waterUsage === "object" ? waterUsage : {};
    var hasOwnTrip = source.tripDays != null && source.tripDays !== "";
    var hasOwnAdults = source.adults != null && source.adults !== "";
    var hasOwnChildren = source.children != null && source.children !== "";

    var adults = clamp(
      roundPeople(hasOwnAdults ? source.adults : water.adults != null ? water.adults : 2),
      0,
      MAX_PEOPLE
    );
    var children = clamp(
      roundPeople(hasOwnChildren ? source.children : water.children != null ? water.children : 0),
      0,
      MAX_PEOPLE
    );
    var tripDays = clamp(
      toNumber(hasOwnTrip ? source.tripDays : water.tripDays != null ? water.tripDays : 2),
      MIN_TRIP_DAYS,
      MAX_TRIP_DAYS
    );

    var cookingStyle = sanitiseCookingStyle(source.cookingStyle);
    var heatingLevel = sanitiseHeatingLevel(source.heatingLevel);
    var heatingHours = clamp(toNumber(source.heatingHours, 0), 0, MAX_HEATING_HOURS);
    if (heatingLevel !== "custom" && HEATING_LEVELS[heatingLevel]) {
      heatingHours = HEATING_LEVELS[heatingLevel].hours;
    }

    var boilerLevel = sanitiseBoilerLevel(source.boilerLevel);
    var boilerHours = clamp(toNumber(source.boilerHours, 1.5), 0, MAX_BOILER_HOURS);
    if (boilerLevel !== "custom" && BOILER_LEVELS[boilerLevel]) {
      boilerHours = BOILER_LEVELS[boilerLevel].hours;
    }

    var legacy = LEGACY_BOTTLES[source.bottleId];
    var gasType = sanitiseGasType(
      source.gasType || (legacy && !source.gasType ? legacy.gasType : "butane")
    );
    var rawBottleId = source.bottleId;
    var rawBottleKg = source.bottleKg;
    if (legacy && !source.gasType) {
      rawBottleId = legacy.bottleId;
      if (rawBottleKg == null && legacy.bottleKg != null) rawBottleKg = legacy.bottleKg;
    }
    var bottleId = sanitiseBottleId(rawBottleId, gasType);
    var defaultKg = BOTTLES[DEFAULT_BOTTLE_ID[gasType]].kg;
    var bottleKg = clamp(toNumber(rawBottleKg, defaultKg), MIN_BOTTLE_KG, MAX_BOTTLE_KG);
    if (bottleId !== "custom" && BOTTLES[bottleId]) {
      bottleKg = BOTTLES[bottleId].kg;
    }

    var fridgeHoursDefault = source.fridgeGasEnabled ? 24 : 24;

    return {
      adults: adults,
      children: children,
      tripDays: tripDays,
      season: sanitiseSeason(source.season),
      mealsPerDay: clamp(toNumber(source.mealsPerDay, 2), 0, MAX_MEALS_PER_DAY),
      cookingStyle: cookingStyle,
      heatingLevel: heatingLevel,
      heatingHours: heatingHours,
      fridgeGasEnabled: !!source.fridgeGasEnabled,
      fridgeHoursPerDay: clamp(
        toNumber(source.fridgeHoursPerDay, fridgeHoursDefault),
        0,
        MAX_FRIDGE_HOURS
      ),
      boilerEnabled: !!source.boilerEnabled,
      boilerLevel: boilerLevel,
      boilerHours: boilerHours,
      gasType: gasType,
      bottleId: bottleId,
      bottleKg: bottleKg,
      activePreset: source.activePreset ? String(source.activePreset) : "",
    };
  }

  function calcGas(raw, waterUsage) {
    var usage = normaliseUsage(raw, waterUsage);
    var units = peopleUnits(usage.adults, usage.children);
    var cookRate = COOK_STYLES[usage.cookingStyle].kgPerPersonPerMeal;
    var cookDaily = units * usage.mealsPerDay * cookRate;
    var heatDaily = usage.heatingHours * HEATER_KG_PER_HOUR;
    var fridgeDaily = usage.fridgeGasEnabled
      ? usage.fridgeHoursPerDay * FRIDGE_KG_PER_HOUR
      : 0;
    var boilerDaily = usage.boilerEnabled ? usage.boilerHours * BOILER_KG_PER_HOUR : 0;

    var items = [
      { id: "cooking", name: "Cooking", kgPerDay: cookDaily },
      { id: "heating", name: "Heating", kgPerDay: heatDaily },
      { id: "fridge", name: "Fridge on gas", kgPerDay: fridgeDaily },
      { id: "boiler", name: "Hot water", kgPerDay: boilerDaily },
    ];

    var dailyKg = items.reduce(function (sum, item) {
      return sum + item.kgPerDay;
    }, 0);
    var tripKg = dailyKg * usage.tripDays;
    var hasBottle = usage.bottleKg > 0;
    var bottleDays = hasBottle && dailyKg > 0 ? usage.bottleKg / dailyKg : 0;
    var bottlesNeeded =
      hasBottle && tripKg > 0 ? Math.ceil(tripKg / usage.bottleKg - 1e-9) : 0;

    return {
      usage: usage,
      peopleUnits: units,
      items: items.map(function (item) {
        return {
          id: item.id,
          name: item.name,
          kgPerDay: item.kgPerDay,
          kgTrip: item.kgPerDay * usage.tripDays,
        };
      }),
      dailyKg: dailyKg,
      tripKg: tripKg,
      cookDaily: cookDaily,
      heatDaily: heatDaily,
      fridgeDaily: fridgeDaily,
      boilerDaily: boilerDaily,
      hasBottle: hasBottle,
      bottleDays: bottleDays,
      bottlesNeeded: bottlesNeeded,
      heaterKgPerHour: HEATER_KG_PER_HOUR,
      fridgeKgPerHour: FRIDGE_KG_PER_HOUR,
      boilerKgPerHour: BOILER_KG_PER_HOUR,
    };
  }

  /**
   * Gas URL prefill contract (Ask / share links).
   *
   * Recognised query params — unknown keys are ignored. A param only
   * overrides the existing gasUsage field when it is present and valid.
   * Apply the patch onto gasUsage after defaults, then normaliseUsage;
   * do not invent burn rates or wipe waterUsage.
   *
   *   adults            number
   *   children          number
   *   tripDays          number (optional)
   *   mealsPerDay       number
   *   cookingStyle      light | normal | heavy
   *   heatingLevel      off | low | medium | high
   *   heatingHours      number (used when heatingLevel is omitted;
   *                     matchHeatingLevel picks off/low/medium/high/custom)
   *   fridgeGasEnabled  0 | 1 | true | false
   *   boilerEnabled     0 | 1 | true | false
   *   boilerLevel       light | normal | heavy
   *   boilerHours       number (used when boilerLevel is omitted)
   *   gasType           butane | propane
   *   bottleId          butane45 | butane7 | butane15 |
   *                     propane39 | propane6 | propane13 | custom
   *   bottleKg          number (used when bottleId=custom, or to pick
   *                     the closest Calor size for the gas type)
   *
   * Parse with parseGasPrefillQuery(search).
   * Build with buildGasPrefillHref(usage) → "gas.html?...".
   */
  var GAS_PREFILL_KEYS = [
    "adults",
    "children",
    "tripDays",
    "mealsPerDay",
    "cookingStyle",
    "heatingLevel",
    "heatingHours",
    "fridgeGasEnabled",
    "boilerEnabled",
    "boilerLevel",
    "boilerHours",
    "gasType",
    "bottleId",
    "bottleKg",
  ];

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
        GAS_PREFILL_KEYS.forEach(function (key) {
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

  function parseQueryBool(value) {
    if (value == null) return undefined;
    var s = String(value).trim().toLowerCase();
    if (s === "1" || s === "true") return true;
    if (s === "0" || s === "false") return false;
    return undefined;
  }

  function parseQueryChoice(value, allowed) {
    if (value == null) return undefined;
    var id = String(value).trim();
    if (allowed[id]) return id;
    var lower = id.toLowerCase();
    if (allowed[lower]) return lower;
    return undefined;
  }

  function parseQueryBottleId(value) {
    if (value == null) return undefined;
    var id = String(value).trim();
    var lower = id.toLowerCase();
    if (lower === "custom") return "custom";
    if (BOTTLES[id]) return id;
    if (BOTTLES[lower]) return lower;
    return undefined;
  }

  function parseGasPrefillQuery(search) {
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
    if (hasOwnParam(params, "mealsPerDay")) {
      var mealsPerDay = parseQueryNumber(params.mealsPerDay);
      if (mealsPerDay != null) patch.mealsPerDay = mealsPerDay;
    }
    if (hasOwnParam(params, "cookingStyle")) {
      var cookingStyle = parseQueryChoice(params.cookingStyle, COOK_STYLES);
      if (cookingStyle) patch.cookingStyle = cookingStyle;
    }
    if (hasOwnParam(params, "heatingLevel")) {
      var heatingLevel = parseQueryChoice(params.heatingLevel, HEATING_LEVELS);
      if (heatingLevel) patch.heatingLevel = heatingLevel;
    }
    if (hasOwnParam(params, "heatingHours")) {
      var heatingHours = parseQueryNumber(params.heatingHours);
      if (heatingHours != null) patch.heatingHours = heatingHours;
    }
    if (hasOwnParam(params, "fridgeGasEnabled")) {
      var fridgeGasEnabled = parseQueryBool(params.fridgeGasEnabled);
      if (fridgeGasEnabled != null) patch.fridgeGasEnabled = fridgeGasEnabled;
    }
    if (hasOwnParam(params, "boilerEnabled")) {
      var boilerEnabled = parseQueryBool(params.boilerEnabled);
      if (boilerEnabled != null) patch.boilerEnabled = boilerEnabled;
    }
    if (hasOwnParam(params, "boilerLevel")) {
      var boilerLevel = parseQueryChoice(params.boilerLevel, BOILER_LEVELS);
      if (boilerLevel) patch.boilerLevel = boilerLevel;
    }
    if (hasOwnParam(params, "boilerHours")) {
      var boilerHours = parseQueryNumber(params.boilerHours);
      if (boilerHours != null) patch.boilerHours = boilerHours;
    }
    if (hasOwnParam(params, "gasType")) {
      var gasType = parseQueryChoice(params.gasType, GAS_TYPES);
      if (gasType) patch.gasType = gasType;
    }
    if (hasOwnParam(params, "bottleId")) {
      var bottleId = parseQueryBottleId(params.bottleId);
      if (bottleId) patch.bottleId = bottleId;
    }
    if (hasOwnParam(params, "bottleKg")) {
      var bottleKg = parseQueryNumber(params.bottleKg);
      if (bottleKg != null) patch.bottleKg = bottleKg;
    }

    return Object.keys(patch).length ? patch : null;
  }

  function copyUsage(raw) {
    var copy = {};
    var source = raw && typeof raw === "object" ? raw : {};
    Object.keys(source).forEach(function (key) {
      copy[key] = source[key];
    });
    return copy;
  }

  function applyGasPrefillToUsage(usage, search, waterUsage) {
    var patch = parseGasPrefillQuery(search);
    if (!patch) return null;

    var merged = copyUsage(usage);
    Object.keys(patch).forEach(function (key) {
      merged[key] = patch[key];
    });

    if (patch.bottleId && patch.bottleId !== "custom" && BOTTLES[patch.bottleId] && patch.gasType == null) {
      merged.gasType = BOTTLES[patch.bottleId].gasType;
    }
    if (patch.bottleKg != null && patch.bottleId == null) {
      merged.bottleId = closestBottleId(patch.bottleKg, patch.gasType || merged.gasType);
    }
    if (patch.heatingHours != null && patch.heatingLevel == null) {
      merged.heatingLevel = matchHeatingLevel(patch.heatingHours);
    }
    if (patch.boilerHours != null && patch.boilerLevel == null) {
      merged.boilerLevel = matchBoilerLevel(patch.boilerHours);
    }

    var next = normaliseUsage(merged, waterUsage);
    next.activePreset = "";
    return next;
  }

  function addPrefillParam(parts, key, value) {
    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
  }

  function buildGasPrefillQuery(usage) {
    var u = usage && typeof usage === "object" ? usage : {};
    var parts = [];

    if (parseQueryNumber(u.adults) != null) addPrefillParam(parts, "adults", roundPeople(u.adults));
    if (parseQueryNumber(u.children) != null) addPrefillParam(parts, "children", roundPeople(u.children));
    if (parseQueryNumber(u.tripDays) != null) addPrefillParam(parts, "tripDays", toNumber(u.tripDays, 0));
    if (parseQueryNumber(u.mealsPerDay) != null) {
      addPrefillParam(parts, "mealsPerDay", toNumber(u.mealsPerDay, 0));
    }
    if (COOK_STYLES[u.cookingStyle]) addPrefillParam(parts, "cookingStyle", u.cookingStyle);
    if (HEATING_LEVELS[u.heatingLevel]) {
      addPrefillParam(parts, "heatingLevel", u.heatingLevel);
    } else if (parseQueryNumber(u.heatingHours) != null) {
      addPrefillParam(parts, "heatingHours", toNumber(u.heatingHours, 0));
    }
    if (typeof u.fridgeGasEnabled === "boolean") {
      addPrefillParam(parts, "fridgeGasEnabled", u.fridgeGasEnabled ? "1" : "0");
    } else if (parseQueryBool(u.fridgeGasEnabled) != null) {
      addPrefillParam(parts, "fridgeGasEnabled", parseQueryBool(u.fridgeGasEnabled) ? "1" : "0");
    }
    if (typeof u.boilerEnabled === "boolean") {
      addPrefillParam(parts, "boilerEnabled", u.boilerEnabled ? "1" : "0");
    } else if (parseQueryBool(u.boilerEnabled) != null) {
      addPrefillParam(parts, "boilerEnabled", parseQueryBool(u.boilerEnabled) ? "1" : "0");
    }
    if (BOILER_LEVELS[u.boilerLevel]) {
      addPrefillParam(parts, "boilerLevel", u.boilerLevel);
    } else if (parseQueryNumber(u.boilerHours) != null) {
      addPrefillParam(parts, "boilerHours", toNumber(u.boilerHours, 0));
    }
    if (GAS_TYPES[u.gasType]) addPrefillParam(parts, "gasType", u.gasType);
    if (u.bottleId === "custom" || BOTTLES[u.bottleId]) {
      addPrefillParam(parts, "bottleId", u.bottleId);
    }
    if (u.bottleId === "custom" && parseQueryNumber(u.bottleKg) != null) {
      addPrefillParam(parts, "bottleKg", toNumber(u.bottleKg, 0));
    } else if (!u.bottleId && parseQueryNumber(u.bottleKg) != null) {
      addPrefillParam(parts, "bottleKg", toNumber(u.bottleKg, 0));
    }

    return parts.join("&");
  }

  function buildGasPrefillHref(usage, base) {
    var query = buildGasPrefillQuery(usage);
    var path = base == null || base === "" ? "gas.html" : String(base);
    return query ? path + "?" + query : path;
  }

  return {
    CHILD_FACTOR: CHILD_FACTOR,
    HEATER_KG_PER_HOUR: HEATER_KG_PER_HOUR,
    FRIDGE_KG_PER_HOUR: FRIDGE_KG_PER_HOUR,
    BOILER_KG_PER_HOUR: BOILER_KG_PER_HOUR,
    MAX_PEOPLE: MAX_PEOPLE,
    MIN_TRIP_DAYS: MIN_TRIP_DAYS,
    MAX_TRIP_DAYS: MAX_TRIP_DAYS,
    MAX_MEALS_PER_DAY: MAX_MEALS_PER_DAY,
    MAX_HEATING_HOURS: MAX_HEATING_HOURS,
    MAX_FRIDGE_HOURS: MAX_FRIDGE_HOURS,
    MAX_BOILER_HOURS: MAX_BOILER_HOURS,
    MIN_BOTTLE_KG: MIN_BOTTLE_KG,
    MAX_BOTTLE_KG: MAX_BOTTLE_KG,
    COOK_STYLES: COOK_STYLES,
    HEATING_LEVELS: HEATING_LEVELS,
    BOILER_LEVELS: BOILER_LEVELS,
    SEASONS: SEASONS,
    GAS_TYPES: GAS_TYPES,
    BOTTLES: BOTTLES,
    BOTTLE_ORDER: BOTTLE_ORDER,
    DEFAULT_BOTTLE_ID: DEFAULT_BOTTLE_ID,
    toNumber: toNumber,
    clamp: clamp,
    peopleUnits: peopleUnits,
    sanitiseCookingStyle: sanitiseCookingStyle,
    sanitiseHeatingLevel: sanitiseHeatingLevel,
    sanitiseBoilerLevel: sanitiseBoilerLevel,
    sanitiseSeason: sanitiseSeason,
    sanitiseGasType: sanitiseGasType,
    sanitiseBottleId: sanitiseBottleId,
    bottlesForGas: bottlesForGas,
    closestBottleId: closestBottleId,
    matchHeatingLevel: matchHeatingLevel,
    matchBoilerLevel: matchBoilerLevel,
    matchBottleId: matchBottleId,
    heatingHoursForSeason: heatingHoursForSeason,
    gasTypeForSeason: gasTypeForSeason,
    applySeasonToUsage: applySeasonToUsage,
    normaliseUsage: normaliseUsage,
    calcGas: calcGas,
    GAS_PREFILL_KEYS: GAS_PREFILL_KEYS,
    parseGasPrefillQuery: parseGasPrefillQuery,
    applyGasPrefillToUsage: applyGasPrefillToUsage,
    buildGasPrefillQuery: buildGasPrefillQuery,
    buildGasPrefillHref: buildGasPrefillHref,
  };
});
