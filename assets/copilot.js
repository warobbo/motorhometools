/**
 * Payload-first co-pilot Ask.
 *
 * Parse is deterministic (optional LLM hook is off by default and may
 * only refine slots). Maths is the Payload calculator — never invented.
 *
 * Source of truth: warobbo/motorhome-payload-calculator
 * commit 611d2207d6e91d4a48fb3dc2c66d957092c59a59
 *   app.js compute(), lib/custom-kit.js, lib/driver-payload.js,
 *   lib/fuel-payload.js
 *
 * Phase A: Payload estimates. Phase Gas: cooking-line bottle-days from
 * mhwater gas-calc.js (no invented outdoor BBQ kg/h). Phase Cassette:
 * empty-days from mhwater cassette-calc.js labelled defaults (no invented
 * flush or tank rates). Phase Wave 3: portable air-con at EcoFlow UK
 * rated cooling 640 W DC only — hours are never defaulted. Other Power
 * / Water stay later stubs. Tyres is HOLD — caution message only, no
 * pressures.
 *
 * Labelled Payload defaults (bike 14 kg, rack 12 kg, water 1 kg/L, gas
 * full-bottle) are applied when the visitor does not type a kg. Answer
 * first, caveats second. Never invent plated MAM/MIRO, tyre PSI/bar,
 * or legal limits.
 */
"use strict";

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MotorhomeToolsCopilot = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var PAYLOAD_HREF = "https://motorhomepayload.co.uk/";
  var TYRES_HREF = "https://motorhomepayload.co.uk/tyres.html";
  var POWER_HREF = "https://motorhomepower.co.uk/";
  var BATTERY_HREF = "https://motorhomepower.co.uk/battery.html";
  var SOLAR_HREF = "https://motorhomepower.co.uk/solar.html";
  var INVERTER_HREF = "https://motorhomepower.co.uk/inverter.html";
  var WIRE_HREF = "https://motorhomepower.co.uk/wire.html";
  var WATER_HREF = "https://motorhomewater.co.uk/";
  var GAS_HREF = "https://motorhomewater.co.uk/gas.html";
  var TANKS_HREF = "https://motorhomewater.co.uk/tanks.html";
  var CASSETTE_HREF = "https://motorhomewater.co.uk/cassette.html";

  /**
   * Full-bottle defaults from Payload DEFAULTS (gas only + steel cylinder).
   * Stamped 6 / 9 / 13 kg is the gas; full weights are 13 / 18.5 / 28 kg.
   */
  var GAS_FULL_KG = { 6: 13, 9: 18.5, 13: 28 };
  var WATER_KG_PER_L = 1;
  var BIKE_DEFAULT_KG = 14;
  var RACK_DEFAULT_KG = 12;
  var ASSUMED_DRIVER_KG = 75;
  var FUEL_DENSITY = 0.84;
  var CTA_NOTE = "Ask is a quick guide. The calculator is where you enter accurate data.";
  var GAS_CTA_LABEL = "Open Gas to fine-tune";
  var GAS_FOLLOW_UP = "Tell me bottle kg / minutes and I’ll recalculate.";
  var GAS_BBQ_PROXY_NOTE =
    "Treating each BBQ use as a Gas-calculator heavy cook meal (oven/grill/long simmer rate) — not a separate outdoor BBQ kg/h.";
  var CASSETTE_CTA_LABEL = "Open Cassette to fine-tune";
  var CASSETTE_FOLLOW_UP = "Tell me cassette litres / flushes and I’ll recalculate.";
  var POWER_CTA_LABEL = "Open Power to fine-tune";
  var POWER_HOURS_CTA_LABEL = "Open Power to set hours";
  var POWER_FOLLOW_UP = "Tell me hours a day and I’ll recalculate.";
  /** Locked EcoFlow UK Wave 3 rated cooling DC. Never invent watts. */
  var WAVE3_WATTS = 640;
  var WAVE3_VOLTAGE_12 = 12;
  var WAVE3_VOLTAGE_24 = 24;
  var WAVE3_MAX_HOURS = 24;

  /**
   * Cooking-line constants from warobbo/mhwater assets/gas-calc.js.
   * Do not drift. Ask uses this cooking line only — no invented BBQ kg/h.
   */
  var GAS_CHILD_FACTOR = 0.7;
  var GAS_MAX_PEOPLE = 20;
  var GAS_MAX_MEALS_PER_DAY = 6;
  var GAS_MIN_BOTTLE_KG = 1;
  var GAS_MAX_BOTTLE_KG = 47;
  var GAS_COOK_STYLES = {
    light: { id: "light", label: "Light", kgPerPersonPerMeal: 0.025 },
    normal: { id: "normal", label: "Normal", kgPerPersonPerMeal: 0.04 },
    heavy: { id: "heavy", label: "Heavy", kgPerPersonPerMeal: 0.07 }
  };
  var GAS_BOTTLES = {
    butane45: { id: "butane45", gasType: "butane", kg: 4.5, label: "4.5 kg Calor butane" },
    butane7: { id: "butane7", gasType: "butane", kg: 7, label: "7 kg Calor butane" },
    butane15: { id: "butane15", gasType: "butane", kg: 15, label: "15 kg Calor butane" },
    propane39: { id: "propane39", gasType: "propane", kg: 3.9, label: "3.9 kg Calor propane" },
    propane6: { id: "propane6", gasType: "propane", kg: 6, label: "6 kg Calor propane" },
    propane13: { id: "propane13", gasType: "propane", kg: 13, label: "13 kg Calor propane" }
  };
  var GAS_DEFAULT_BOTTLE = GAS_BOTTLES.butane7;
  var TIMES_WORDS = {
    once: 1,
    twice: 2,
    thrice: 3
  };

  var PAYLOAD_SOURCE = {
    repo: "warobbo/motorhome-payload-calculator",
    commit: "611d2207d6e91d4a48fb3dc2c66d957092c59a59",
    waterKgPerLitre: WATER_KG_PER_L,
    gasFullKg: GAS_FULL_KG,
    bikeDefaultKg: BIKE_DEFAULT_KG,
    rackDefaultKg: RACK_DEFAULT_KG,
    note: "Ask applies labelled Payload defaults when kg is omitted (pedal bike 14 kg, rack 12 kg if bikes > 0, water 1 kg/L, gas full-bottle). It does not copy first-paint kit defaults (passengers, spare gas, toolbox, 90 L tank)."
  };

  var GAS_SOURCE = {
    repo: "warobbo/mhwater",
    file: "assets/gas-calc.js",
    cookKgPerPersonPerMeal: { light: 0.025, normal: 0.04, heavy: 0.07 },
    childFactor: GAS_CHILD_FACTOR,
    defaultBottle: { id: "butane7", gasType: "butane", kg: 7 },
    note: "Ask uses the Gas-calculator cooking line only. Heating, fridge-on-gas and boiler stay off for BBQ / outdoor-cook longevity unless the visitor said otherwise. No invented outdoor BBQ kg/h."
  };

  /**
   * Cassette empty-days constants from warobbo/mhwater
   * assets/cassette-defaults.js / cassette-calc.js labelled defaults.
   * Do not drift. Ask does not invent flush rates or tank litres.
   */
  var CASSETTE_DEFAULT_LITRES = 18;
  var CASSETTE_DEFAULT_FLUSHES = 5;
  var CASSETTE_DEFAULT_LITRES_PER_FLUSH = 0.25;
  var CASSETTE_DEFAULT_START_PERCENT = 0;
  /**
   * blackKind contract from mhwater cassette-calc.js (PR #19).
   * Aliases normalise to cassette | fixed.
   */
  var CASSETTE_BLACK_KIND_ALIASES = {
    cassette: "cassette",
    fixed: "fixed",
    fixedblack: "fixed",
    "fixed-black": "fixed",
    fixed_black: "fixed"
  };
  var CASSETTE_SOURCE = {
    repo: "warobbo/mhwater",
    file: "assets/cassette-calc.js",
    defaults: {
      adults: 2,
      children: 0,
      blackKind: "cassette",
      blackTankLitres: CASSETTE_DEFAULT_LITRES,
      flushesPerPersonPerDay: CASSETTE_DEFAULT_FLUSHES,
      litresPerFlush: CASSETTE_DEFAULT_LITRES_PER_FLUSH,
      startPercent: CASSETTE_DEFAULT_START_PERCENT
    },
    note: "Ask uses Cassette-calculator labelled defaults only. A 2nd / spare cassette keeps blackTankLitres as one cassette and sends cassetteCount=2 (mhwater#19 multiplies into blackTankLitres on the page)."
  };

  var WAVE3_SOURCE = {
    product: "EcoFlow Wave 3 portable air conditioner",
    wattsDc: WAVE3_WATTS,
    source: "EcoFlow UK rated cooling DC (640 W). Not 6100 BTU / 1800 W cooling capacity.",
    note: "Hours are never defaulted. If the visitor does not say hours / hours a day, Ask cites the per-hour figure and asks, or soft-opens Power. No 4 h / 8 h invention."
  };

  var TYRES_HOLD_MESSAGE =
    "Tyres is on hold. We will not invent a tyre pressure, PSI, bar, or load figure. The Tyres page is a caution only — it still refuses a number if the size is not in a published table.";

  var NUMBER_WORDS = {
    a: 1,
    an: 1,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12
  };

  function num(value) {
    var n = parseFloat(value);
    return isFinite(n) ? n : 0;
  }

  function clip(value, max) {
    var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > max ? text.slice(0, max) : text;
  }

  function normalise(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[—–]/g, "-")
      .replace(/[^a-z0-9+./\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseQty(token) {
    if (token == null || token === "") return null;
    if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, token)) {
      return NUMBER_WORDS[token];
    }
    var n = parseFloat(token);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function fmtKg(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "—";
    var rounded = Math.round(n * 10) / 10;
    var digits = Math.abs(rounded % 1) < 0.05 ? 0 : 1;
    return rounded.toLocaleString("en-GB", { maximumFractionDigits: digits });
  }

  /** Gas kg display: whole bottles as 7 / 13; cooking rates keep two decimals (0.28). */
  function formatGasKg(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n - Math.round(n)) < 1e-9) {
      return Math.round(n).toLocaleString("en-GB");
    }
    var digits = n >= 100 ? 0 : n >= 10 ? 1 : 2;
    return n.toLocaleString("en-GB", {
      maximumFractionDigits: digits,
      minimumFractionDigits: n < 1 ? 2 : 0
    });
  }

  function formatGasDays(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "—";
    var digits = n >= 10 ? 0 : 1;
    return n.toLocaleString("en-GB", { maximumFractionDigits: digits });
  }

  function formatPowerWh(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "—";
    var rounded = Math.round(n);
    return rounded.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  }

  function formatPowerAh(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return Math.round(n).toLocaleString("en-GB", { maximumFractionDigits: 0 });
  }

  function formatPowerHours(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n - Math.round(n)) < 1e-9) {
      return String(Math.round(n));
    }
    return n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
  }

  function formatCassetteLitres(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n - Math.round(n)) < 1e-9) {
      return Math.round(n).toLocaleString("en-GB");
    }
    return n.toLocaleString("en-GB", {
      maximumFractionDigits: 2,
      minimumFractionDigits: n < 1 ? 2 : 0
    });
  }

  function clampGas(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseTimesQty(token) {
    if (token == null || token === "") return null;
    if (Object.prototype.hasOwnProperty.call(TIMES_WORDS, token)) {
      return TIMES_WORDS[token];
    }
    return parseQty(token);
  }

  /* ----- Payload maths (sibling compute / custom-kit / driver / fuel) ----- */

  function customKitItemKg(item) {
    if (!item) return 0;
    var kg = num(item.kg);
    var qty = num(item.qty);
    if (kg <= 0 || qty <= 0) return 0;
    return kg * qty;
  }

  function customKitTotalKg(list) {
    if (!Array.isArray(list)) return 0;
    return list.reduce(function (sum, item) {
      return sum + customKitItemKg(item);
    }, 0);
  }

  function driverPayloadKg(opts) {
    var kg = Number(opts && opts.driverKg);
    var actual = Number.isFinite(kg) && kg > 0 ? kg : 0;
    if (Number(opts && opts.actualEmpty) > 0) return actual;
    var extra = actual - ASSUMED_DRIVER_KG;
    return extra > 0 ? extra : 0;
  }

  function fuelActualKg(opts) {
    var cap = Number(opts && opts.fuelCap);
    var fillPct = Number(opts && opts.fuelFill);
    var density = Number(opts && opts.fuelDensity);
    var actual = cap * fillPct / 100 * density;
    return Number.isFinite(actual) && actual > 0 ? actual : 0;
  }

  function fuelPayloadKg(opts) {
    var actual = fuelActualKg(opts);
    if (Number(opts && opts.actualEmpty) > 0) return actual;
    var cap = Number(opts && opts.fuelCap) || 0;
    var density = Number(opts && opts.fuelDensity) || 0;
    var extra = actual - cap * 0.9 * density;
    return extra > 0 ? extra : 0;
  }

  function emptyPayloadState() {
    return {
      mam: 0,
      miro: 0,
      actualEmpty: 0,
      driverKg: 0,
      extraAdults: 0,
      adultKg: 0,
      children: 0,
      childKg: 0,
      pets: 0,
      petKg: 0,
      freshCap: 0,
      freshFill: 0,
      greyCap: 0,
      greyFill: 0,
      blackCap: 0,
      blackFill: 0,
      fuelCap: 0,
      fuelFill: 0,
      fuelDensity: FUEL_DENSITY,
      gas6: 0,
      gas6Full: GAS_FULL_KG[6],
      gas9: 0,
      gas9Full: GAS_FULL_KG[9],
      gas13: 0,
      gas13Full: GAS_FULL_KG[13],
      battKg: 0,
      solarKg: 0,
      inverterKg: 0,
      elecExtrasKg: 0,
      bikes: 0,
      bikeKg: 0,
      rackKg: 0,
      foodPeople: 0,
      foodKgEach: 0,
      miscKg: 0,
      awning: false,
      awningKg: 0,
      ramps: false,
      rampsKg: 0,
      furniture: false,
      furnitureKg: 0,
      generator: false,
      generatorKg: 0,
      toolbox: false,
      toolboxKg: 0,
      customItems: []
    };
  }

  /**
   * Same remaining-payload path as Payload app.js compute().
   * Electrical presets (LiFePO4 / solar types) are not used in Phase A;
   * pass explicit kg on inverterKg / elecExtrasKg / battKg / solarKg instead.
   */
  function computePayload(state) {
    var s = Object.assign(emptyPayloadState(), state || {});
    var mam = num(s.mam);
    var miro = num(s.miro);
    var base = num(s.actualEmpty) > 0 ? num(s.actualEmpty) : miro;

    var driver = driverPayloadKg({
      driverKg: s.driverKg,
      actualEmpty: s.actualEmpty
    });
    var people = driver + num(s.extraAdults) * num(s.adultKg) +
      num(s.children) * num(s.childKg) + num(s.pets) * num(s.petKg);

    var fresh = num(s.freshCap) * num(s.freshFill) / 100;
    var grey = num(s.greyCap) * num(s.greyFill) / 100;
    var black = num(s.blackCap) * num(s.blackFill) / 100;
    var fuelOpts = {
      fuelCap: s.fuelCap,
      fuelFill: s.fuelFill,
      fuelDensity: s.fuelDensity || FUEL_DENSITY,
      actualEmpty: s.actualEmpty
    };
    var fuel = fuelPayloadKg(fuelOpts);
    var water = fresh + grey + black;
    var gas = num(s.gas6) * num(s.gas6Full) + num(s.gas9) * num(s.gas9Full) +
      num(s.gas13) * num(s.gas13Full);
    var electrical = num(s.battKg) + num(s.solarKg) + num(s.inverterKg) + num(s.elecExtrasKg);
    var bikes = num(s.bikes) * num(s.bikeKg) + (num(s.bikes) > 0 ? num(s.rackKg) : 0);
    var food = num(s.foodPeople) * num(s.foodKgEach);
    var gear = bikes + food + num(s.miscKg);
    if (s.awning) gear += num(s.awningKg);
    if (s.ramps) gear += num(s.rampsKg);
    if (s.furniture) gear += num(s.furnitureKg);
    if (s.generator) gear += num(s.generatorKg);
    if (s.toolbox) gear += num(s.toolboxKg);
    gear += customKitTotalKg(s.customItems);

    var added = people + water + fuel + gas + electrical + gear;
    var total = base + added;
    var remaining = mam - total;
    var plated = mam - miro;
    var available = mam - base;
    var usedPct = available > 0 ? (added / available) * 100 : 0;

    return {
      mam: mam,
      miro: miro,
      base: base,
      people: people,
      fresh: fresh,
      grey: grey,
      black: black,
      water: water,
      fuel: fuel,
      gas: gas,
      electrical: electrical,
      gear: gear,
      bikes: bikes,
      added: added,
      total: total,
      remaining: remaining,
      plated: plated,
      usedPct: usedPct,
      driver: driver
    };
  }

  function payloadPrefillHref(state, opts) {
    var s = state || {};
    var params = new URLSearchParams();
    var includeVanLimits = opts && opts.includeVanLimits;
    var remainingKg = opts && opts.remainingPayloadKg;
    // Remaining-payload questions encode the visitor's kg as mam with miro=0
    // (same internal trick Ask already uses for maths: remaining treated as
    // available with an empty base). Payload prefill needs miro=0 explicitly
    // so it does not invent Mass in Service. Do not invent plated MAM/MIRO.
    if (remainingKg != null && num(remainingKg) > 0) {
      params.set("mam", String(remainingKg));
      params.set("miro", "0");
    } else if (includeVanLimits) {
      ["mam", "miro", "actualEmpty"].forEach(function (key) {
        if (num(s[key]) > 0) params.set(key, String(s[key]));
      });
    }
    if (num(s.freshCap) > 0) {
      params.set("freshCap", String(s.freshCap));
      params.set("freshFill", String(s.freshFill || 100));
    }
    [
      ["gas6", "gas6Full"],
      ["gas9", "gas9Full"],
      ["gas13", "gas13Full"]
    ].forEach(function (pair) {
      if (num(s[pair[0]]) > 0) {
        params.set(pair[0], String(s[pair[0]]));
        if (num(s[pair[1]]) > 0) params.set(pair[1], String(s[pair[1]]));
      }
    });
    if (num(s.bikes) > 0) {
      params.set("bikes", String(s.bikes));
      if (num(s.bikeKg) > 0) params.set("bikeKg", String(s.bikeKg));
      if (num(s.rackKg) > 0) params.set("rackKg", String(s.rackKg));
    }
    var qs = params.toString();
    return PAYLOAD_HREF + (qs ? "?" + qs : "");
  }

  /* ----- Gas cooking-line maths (mhwater gas-calc.js calcGas cook row) ----- */

  function emptyGasUsage() {
    return {
      adults: 2,
      children: 0,
      tripDays: null,
      mealsPerDay: 2,
      cookingStyle: "normal",
      heatingLevel: "off",
      heatingHours: 0,
      fridgeGasEnabled: 0,
      boilerEnabled: 0,
      boilerLevel: null,
      boilerHours: null,
      gasType: GAS_DEFAULT_BOTTLE.gasType,
      bottleId: GAS_DEFAULT_BOTTLE.id,
      bottleKg: GAS_DEFAULT_BOTTLE.kg,
      isBbq: false,
      bottleNamed: false,
      peopleNamed: false,
      childrenNamed: false
    };
  }

  function sanitiseCookingStyle(value) {
    return GAS_COOK_STYLES[value] ? value : "normal";
  }

  function matchNamedBottle(kg, typeHint) {
    var type = typeHint === "propane" || typeHint === "butane" ? typeHint : null;
    var ids = Object.keys(GAS_BOTTLES);
    var i;
    for (i = 0; i < ids.length; i += 1) {
      var bottle = GAS_BOTTLES[ids[i]];
      if (Math.abs(bottle.kg - kg) < 0.05 && (!type || bottle.gasType === type)) {
        return { bottleId: bottle.id, gasType: bottle.gasType, bottleKg: bottle.kg };
      }
    }
    return {
      bottleId: "custom",
      gasType: type || "butane",
      bottleKg: clampGas(kg, GAS_MIN_BOTTLE_KG, GAS_MAX_BOTTLE_KG)
    };
  }

  /**
   * Cooking line only: peopleUnits × mealsPerDay × cook rate.
   * Heating / fridge / boiler stay 0 — same as calcGas with those off.
   */
  function calcGasCooking(raw) {
    var source = raw && typeof raw === "object" ? raw : {};
    var adults = clampGas(Math.round(num(source.adults) || 0), 0, GAS_MAX_PEOPLE);
    var children = clampGas(Math.round(num(source.children) || 0), 0, GAS_MAX_PEOPLE);
    var mealsPerDay = clampGas(num(source.mealsPerDay), 0, GAS_MAX_MEALS_PER_DAY);
    var cookingStyle = sanitiseCookingStyle(source.cookingStyle);
    var rate = GAS_COOK_STYLES[cookingStyle].kgPerPersonPerMeal;
    var peopleUnits = adults + children * GAS_CHILD_FACTOR;
    var dailyKg = peopleUnits * mealsPerDay * rate;
    var bottleKg = clampGas(num(source.bottleKg) || GAS_DEFAULT_BOTTLE.kg, GAS_MIN_BOTTLE_KG, GAS_MAX_BOTTLE_KG);
    var bottleId = source.bottleId || GAS_DEFAULT_BOTTLE.id;
    var gasType = source.gasType === "propane" ? "propane" : "butane";
    if (GAS_BOTTLES[bottleId] && Math.abs(GAS_BOTTLES[bottleId].kg - bottleKg) >= 0.05) {
      bottleId = "custom";
    }
    return {
      adults: adults,
      children: children,
      tripDays: source.tripDays != null && source.tripDays !== "" ? num(source.tripDays) : null,
      peopleUnits: peopleUnits,
      mealsPerDay: mealsPerDay,
      cookingStyle: cookingStyle,
      cookRate: rate,
      dailyKg: dailyKg,
      bottleKg: bottleKg,
      bottleId: bottleId,
      gasType: gasType,
      bottleDays: dailyKg > 0 ? bottleKg / dailyKg : 0,
      heatingLevel: "off",
      heatingHours: 0,
      fridgeGasEnabled: 0,
      boilerEnabled: 0,
      boilerLevel: null,
      boilerHours: null
    };
  }

  /**
   * Mirrored from warobbo/mhwater GasCalc.buildGasPrefillQuery / Href
   * (PR #18, now on main). Unknown keys stay off the URL. bottleKg is
   * only sent for custom bottles; heatingHours only when heatingLevel
   * is omitted; boilerHours only when boilerLevel is omitted.
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
    "bottleKg"
  ];
  var GAS_HEATING_LEVELS = { off: 1, low: 1, medium: 1, high: 1 };
  var GAS_BOILER_LEVELS = { light: 1, normal: 1, heavy: 1 };
  var GAS_TYPES = { butane: 1, propane: 1 };

  function parsePrefillNumber(value) {
    if (value == null) return undefined;
    var trimmed = String(value).trim();
    if (trimmed === "") return undefined;
    var n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  }

  function parsePrefillBool(value) {
    if (value == null) return undefined;
    if (typeof value === "boolean") return value;
    var s = String(value).trim().toLowerCase();
    if (s === "1" || s === "true") return true;
    if (s === "0" || s === "false") return false;
    return undefined;
  }

  function addPrefillParam(parts, key, value) {
    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
  }

  function buildGasPrefillQuery(usage) {
    var u = usage && typeof usage === "object" ? usage : {};
    var parts = [];

    if (parsePrefillNumber(u.adults) != null) {
      addPrefillParam(parts, "adults", Math.round(parsePrefillNumber(u.adults)));
    }
    if (parsePrefillNumber(u.children) != null) {
      addPrefillParam(parts, "children", Math.round(parsePrefillNumber(u.children)));
    }
    if (parsePrefillNumber(u.tripDays) != null) {
      addPrefillParam(parts, "tripDays", parsePrefillNumber(u.tripDays));
    }
    if (parsePrefillNumber(u.mealsPerDay) != null) {
      addPrefillParam(parts, "mealsPerDay", parsePrefillNumber(u.mealsPerDay));
    }
    if (GAS_COOK_STYLES[u.cookingStyle]) addPrefillParam(parts, "cookingStyle", u.cookingStyle);
    if (GAS_HEATING_LEVELS[u.heatingLevel]) {
      addPrefillParam(parts, "heatingLevel", u.heatingLevel);
    } else if (parsePrefillNumber(u.heatingHours) != null) {
      addPrefillParam(parts, "heatingHours", parsePrefillNumber(u.heatingHours));
    }
    if (parsePrefillBool(u.fridgeGasEnabled) != null) {
      addPrefillParam(parts, "fridgeGasEnabled", parsePrefillBool(u.fridgeGasEnabled) ? "1" : "0");
    }
    if (parsePrefillBool(u.boilerEnabled) != null) {
      addPrefillParam(parts, "boilerEnabled", parsePrefillBool(u.boilerEnabled) ? "1" : "0");
    }
    if (GAS_BOILER_LEVELS[u.boilerLevel]) {
      addPrefillParam(parts, "boilerLevel", u.boilerLevel);
    } else if (parsePrefillNumber(u.boilerHours) != null) {
      addPrefillParam(parts, "boilerHours", parsePrefillNumber(u.boilerHours));
    }
    if (GAS_TYPES[u.gasType]) addPrefillParam(parts, "gasType", u.gasType);
    if (u.bottleId === "custom" || GAS_BOTTLES[u.bottleId]) {
      addPrefillParam(parts, "bottleId", u.bottleId);
    }
    if (u.bottleId === "custom" && parsePrefillNumber(u.bottleKg) != null) {
      addPrefillParam(parts, "bottleKg", parsePrefillNumber(u.bottleKg));
    } else if (!u.bottleId && parsePrefillNumber(u.bottleKg) != null) {
      addPrefillParam(parts, "bottleKg", parsePrefillNumber(u.bottleKg));
    }

    return parts.join("&");
  }

  function buildGasPrefillHref(usage, base) {
    var query = buildGasPrefillQuery(usage);
    var path = base == null || base === "" ? "gas.html" : String(base);
    return query ? path + "?" + query : path;
  }

  function gasPrefillHref(usage) {
    var computed = calcGasCooking(usage);
    var prefill = {
      adults: computed.adults,
      children: computed.children,
      mealsPerDay: computed.mealsPerDay,
      cookingStyle: computed.cookingStyle,
      heatingLevel: "off",
      fridgeGasEnabled: 0,
      boilerEnabled: 0,
      gasType: computed.gasType,
      bottleId: computed.bottleId
    };
    if (computed.tripDays != null && computed.tripDays > 0) {
      prefill.tripDays = computed.tripDays;
    }
    if (computed.bottleId === "custom") {
      prefill.bottleKg = computed.bottleKg;
    }
    return buildGasPrefillHref(prefill, GAS_HREF);
  }

  /**
   * Cassette empty-days from mhwater cassette-calc.js:
   * wasteDaily = heads × flushes × litresPerFlush
   * daysOne = usable / wasteDaily
   * usable = blackTankLitres × (1 − startPercent/100)
   * A 2nd cassette doubles usable litres; extraDays = daysTwo − daysOne.
   */
  function emptyCassetteUsage() {
    return {
      adults: 2,
      children: 0,
      tripDays: null,
      blackKind: "cassette",
      blackTankLitres: CASSETTE_DEFAULT_LITRES,
      flushesPerPersonPerDay: CASSETTE_DEFAULT_FLUSHES,
      litresPerFlush: CASSETTE_DEFAULT_LITRES_PER_FLUSH,
      startPercent: CASSETTE_DEFAULT_START_PERCENT,
      cassetteCount: 1,
      hasSpare: false,
      peopleNamed: false,
      childrenNamed: false,
      sizeNamed: false
    };
  }

  function sanitiseCassetteBlackKind(value) {
    if (value == null) return undefined;
    var id = String(value).trim();
    if (!id) return undefined;
    return CASSETTE_BLACK_KIND_ALIASES[id] || CASSETTE_BLACK_KIND_ALIASES[id.toLowerCase()] || undefined;
  }

  function sanitiseCassetteCount(value) {
    var n = parsePrefillNumber(value);
    if (n == null || n < 1 || Math.round(n) !== n) return undefined;
    return n;
  }

  function calcCassetteDays(raw) {
    var source = raw && typeof raw === "object" ? raw : {};
    var adults = clampGas(Math.round(num(source.adults) || 0), 0, GAS_MAX_PEOPLE);
    var children = clampGas(Math.round(num(source.children) || 0), 0, GAS_MAX_PEOPLE);
    var flushes = source.flushesPerPersonPerDay == null || source.flushesPerPersonPerDay === ""
      ? CASSETTE_DEFAULT_FLUSHES
      : num(source.flushesPerPersonPerDay);
    var litresPerFlush = source.litresPerFlush == null || source.litresPerFlush === ""
      ? CASSETTE_DEFAULT_LITRES_PER_FLUSH
      : num(source.litresPerFlush);
    var blackTankLitres = source.blackTankLitres == null || source.blackTankLitres === ""
      ? CASSETTE_DEFAULT_LITRES
      : num(source.blackTankLitres);
    var startPercent = source.startPercent == null || source.startPercent === ""
      ? CASSETTE_DEFAULT_START_PERCENT
      : clampGas(num(source.startPercent), 0, 100);
    var heads = adults + children;
    var wasteDaily = heads * flushes * litresPerFlush;
    var usableLitres = blackTankLitres * (1 - startPercent / 100);
    var daysOne = wasteDaily > 0 && usableLitres > 0 ? usableLitres / wasteDaily : 0;
    var daysTwo = wasteDaily > 0 && usableLitres > 0 ? (2 * usableLitres) / wasteDaily : 0;
    return {
      adults: adults,
      children: children,
      heads: heads,
      tripDays: source.tripDays != null && source.tripDays !== "" ? num(source.tripDays) : null,
      blackKind: sanitiseCassetteBlackKind(source.blackKind) || "cassette",
      blackTankLitres: blackTankLitres,
      flushesPerPersonPerDay: flushes,
      litresPerFlush: litresPerFlush,
      startPercent: startPercent,
      wasteDaily: wasteDaily,
      usableLitres: usableLitres,
      daysOne: daysOne,
      daysTwo: daysTwo,
      extraDays: daysTwo - daysOne,
      hasSpare: !!source.hasSpare,
      cassetteCount: sanitiseCassetteCount(source.cassetteCount) || (source.hasSpare ? 2 : 1)
    };
  }

  /**
   * Ask→Cassette query keys — mhwater cassette-calc.js PR #19 contract.
   * cassetteCount is an Ask convenience: the page multiplies it into
   * blackTankLitres. Ask keeps blackTankLitres as one cassette.
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
    "startPercent"
  ];

  function buildCassettePrefillQuery(usage) {
    var u = usage && typeof usage === "object" ? usage : {};
    var parts = [];

    if (parsePrefillNumber(u.adults) != null) {
      addPrefillParam(parts, "adults", Math.round(parsePrefillNumber(u.adults)));
    }
    if (parsePrefillNumber(u.children) != null) {
      addPrefillParam(parts, "children", Math.round(parsePrefillNumber(u.children)));
    }
    if (parsePrefillNumber(u.tripDays) != null) {
      addPrefillParam(parts, "tripDays", parsePrefillNumber(u.tripDays));
    }
    var blackKind = sanitiseCassetteBlackKind(u.blackKind);
    if (blackKind) addPrefillParam(parts, "blackKind", blackKind);
    if (parsePrefillNumber(u.blackTankLitres) != null) {
      addPrefillParam(parts, "blackTankLitres", parsePrefillNumber(u.blackTankLitres));
    }
    var cassetteCount = sanitiseCassetteCount(u.cassetteCount);
    if (cassetteCount != null && cassetteCount > 1) {
      addPrefillParam(parts, "cassetteCount", cassetteCount);
    }
    if (parsePrefillNumber(u.flushesPerPersonPerDay) != null) {
      addPrefillParam(parts, "flushesPerPersonPerDay", parsePrefillNumber(u.flushesPerPersonPerDay));
    }
    if (parsePrefillNumber(u.litresPerFlush) != null) {
      addPrefillParam(parts, "litresPerFlush", parsePrefillNumber(u.litresPerFlush));
    }
    if (parsePrefillNumber(u.startPercent) != null) {
      addPrefillParam(parts, "startPercent", parsePrefillNumber(u.startPercent));
    }

    return parts.join("&");
  }

  function buildCassettePrefillHref(usage, base) {
    var query = buildCassettePrefillQuery(usage);
    var path = base == null || base === "" ? "cassette.html" : String(base);
    return query ? path + "?" + query : path;
  }

  function cassettePrefillHref(usage) {
    var computed = calcCassetteDays(usage);
    var prefill = {
      adults: computed.adults,
      children: computed.children,
      blackKind: computed.blackKind,
      blackTankLitres: computed.blackTankLitres,
      flushesPerPersonPerDay: computed.flushesPerPersonPerDay,
      litresPerFlush: computed.litresPerFlush,
      startPercent: computed.startPercent
    };
    if (computed.tripDays != null && computed.tripDays > 0) {
      prefill.tripDays = computed.tripDays;
    }
    if (computed.cassetteCount != null && computed.cassetteCount > 1) {
      prefill.cassetteCount = computed.cassetteCount;
    }
    return buildCassettePrefillHref(prefill, CASSETTE_HREF);
  }

  /**
   * Wave 3 portable air-con: 640 W DC × hours. Hours are never invented.
   * Ah = Wh / voltage (same as PowerCalc, no Peukert).
   */
  function emptyWave3Usage() {
    return {
      hours: null,
      hoursNamed: false,
      watts: WAVE3_WATTS
    };
  }

  function calcWave3(raw) {
    var source = raw && typeof raw === "object" ? raw : {};
    var named = source.hours != null && source.hours !== "" && Number.isFinite(num(source.hours)) && num(source.hours) > 0;
    var hours = named ? Math.min(WAVE3_MAX_HOURS, Math.max(0.05, num(source.hours))) : null;
    var dailyWh = hours != null ? WAVE3_WATTS * hours : null;
    return {
      watts: WAVE3_WATTS,
      hours: hours,
      hoursNamed: named,
      dailyWh: dailyWh,
      ah12: dailyWh != null ? dailyWh / WAVE3_VOLTAGE_12 : null,
      ah24: dailyWh != null ? dailyWh / WAVE3_VOLTAGE_24 : null,
      whPerHour: WAVE3_WATTS,
      ah12PerHour: WAVE3_WATTS / WAVE3_VOLTAGE_12,
      ah24PerHour: WAVE3_WATTS / WAVE3_VOLTAGE_24
    };
  }

  /**
   * Ask→Power Wave 3 query keys — warobbo/power-tool PR #26 contract,
   * plus #wave3 so Power can scroll to the air-con row on handoff.
   * wave3=1 enables the starter. hours only when the visitor named them
   * (page keeps 0 if omitted). watts only if Ask overrides; missing watts
   * keeps the page’s 640 W DC. Unknown keys stay off the URL.
   */
  var POWER_PREFILL_KEYS = ["wave3", "hours", "hours-wave3", "watts", "watts-wave3"];
  var POWER_WAVE3_HASH = "#wave3";

  function buildPowerPrefillQuery(usage) {
    var u = usage && typeof usage === "object" ? usage : {};
    var parts = [];
    var enabled = parsePrefillBool(u.wave3);
    if (enabled === false) {
      addPrefillParam(parts, "wave3", "0");
    } else {
      addPrefillParam(parts, "wave3", "1");
    }
    if (parsePrefillNumber(u["hours-wave3"]) != null) {
      addPrefillParam(parts, "hours-wave3", parsePrefillNumber(u["hours-wave3"]));
    } else if (parsePrefillNumber(u.hours) != null && parsePrefillNumber(u.hours) > 0) {
      addPrefillParam(parts, "hours", parsePrefillNumber(u.hours));
    }
    if (parsePrefillNumber(u["watts-wave3"]) != null) {
      addPrefillParam(parts, "watts-wave3", parsePrefillNumber(u["watts-wave3"]));
    } else if (u.watts != null && parsePrefillNumber(u.watts) != null) {
      addPrefillParam(parts, "watts", parsePrefillNumber(u.watts));
    }
    return parts.join("&");
  }

  function buildPowerPrefillHref(usage, base) {
    var query = buildPowerPrefillQuery(usage);
    var path = base == null || base === "" ? POWER_HREF : String(base);
    var hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      path = path.slice(0, hashIndex);
    }
    var href = query ? path + (path.indexOf("?") >= 0 ? "&" : "?") + query : path;
    return href + POWER_WAVE3_HASH;
  }

  function wave3PrefillHref(usage) {
    var computed = calcWave3(usage);
    var prefill = { wave3: 1 };
    if (computed.hoursNamed && computed.hours != null) {
      prefill.hours = computed.hours;
    }
    return buildPowerPrefillHref(prefill, POWER_HREF);
  }

  /* ----- Deterministic NL parse (LLM may only refine slots) ----- */

  function blankIntent() {
    return {
      domain: "unknown",
      calculable: false,
      remainingPayloadKg: null,
      mamKg: null,
      miroKg: null,
      items: [],
      wantsFit: false,
      wantsRemaining: false,
      wantsUsage: false,
      fullTank: false,
      tyresHold: false,
      needsClarify: null
    };
  }

  function isTyresHold(query) {
    return /\b(?:tyres?|tires?|pressure|psi|cp\s+tyres?|cp\s+tires?)\b|\bbar\b/.test(query);
  }

  function isPowerLater(query) {
    if (/\bpayload|mam|miro|weighbridge|kg\s+payload\b/.test(query)) return false;
    return /\b(?:batter(?:y|ies)|off-grid|diesel\s+heater|solar|inverter|amp-?hours?|k?wh|cool[-\s]?box(?:es)?|air[-\s]?cons?|air[-\s]?condition(?:er|ing)|portable\s+acs?|wave\s*3|ecoflow)\b/.test(query);
  }

  function isAirconTopic(query) {
    if (/\bpayload|mam|miro|weighbridge|kg\s+payload\b/.test(query)) return false;
    return /\b(?:air[-\s]?cons?|air[-\s]?condition(?:er|ing)|portable\s+acs?|wave\s*3|ecoflow\s+wave)\b/.test(query);
  }

  /**
   * Hours only when the visitor typed them. Never default 4 h / 8 h /
   * overnight. “overnight 8h” counts because 8 is named.
   */
  function parseAirconHours(query) {
    var match = query.match(/\bovernight\s+(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?\b/) ||
      query.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+(?:a|per)\s+day\b/) ||
      query.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/) ||
      query.match(/\b(\d+(?:\.\d+)?)\s*h\b/) ||
      query.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+hours?\b/);
    if (!match) return null;
    var hours = Object.prototype.hasOwnProperty.call(NUMBER_WORDS, match[1])
      ? NUMBER_WORDS[match[1]]
      : num(match[1]);
    if (!(hours > 0)) return null;
    return Math.min(WAVE3_MAX_HOURS, hours);
  }

  function parseWave3Usage(query) {
    var usage = emptyWave3Usage();
    var hours = parseAirconHours(query);
    if (hours != null) {
      usage.hours = hours;
      usage.hoursNamed = true;
    }
    return usage;
  }

  function isGasLater(query) {
    if (/\bpayload|mam|miro|weighbridge\b/.test(query)) return false;
    return /\b(?:gas|lpg|calor|propane|butane|bbqs?|barbecues?|barbeques?)\b/.test(query);
  }

  function isBbqQuery(query) {
    return /\b(?:bbqs?|barbecues?|barbeques?)\b/.test(query);
  }

  /**
   * BBQ / outdoor-cook / bottle-days questions can use the Gas cooking line.
   * Heating, winter, boiler, or fridge-on-gas as the topic stay on the later stub.
   */
  function isGasEstimate(query) {
    var bbq = isBbqQuery(query);
    var longevity = /\b(?:how\s+long|last(?:s|ing)?|days?\s+(?:left|will)|bottle\s+days)\b/.test(query);
    var cooking = /\b(?:cook(?:ing|s|er)?|meals?)\b/.test(query);
    var heatingFocus = /\b(?:heating|space\s+heat|winter|boiler|hot\s+water)\b/.test(query);
    var fridgeFocus = /\b(?:gas\s+fridge|absorption|3-way\s+fridge|three[\s-]?way\s+fridge)\b/.test(query);
    if ((heatingFocus || fridgeFocus) && !bbq && !cooking) return false;
    return bbq || longevity || cooking;
  }

  function parseGasUsage(query) {
    var usage = emptyGasUsage();
    usage.isBbq = isBbqQuery(query);

    var adults = query.match(/\b(\d+|one|two|three|four|five|six)\s+adults?\b/);
    var people = query.match(/\b(\d+|one|two|three|four|five|six)\s+(?:people|persons?)\b/);
    var justMe = /\b(?:just me|on my own|myself|alone)\b/.test(query);
    if (adults) {
      usage.adults = parseQty(adults[1]) || 2;
      usage.peopleNamed = true;
    } else if (people) {
      usage.adults = parseQty(people[1]) || 2;
      usage.peopleNamed = true;
    } else if (justMe) {
      usage.adults = 1;
      usage.peopleNamed = true;
    }

    var children = query.match(/\b(\d+|a|an|one|two|three|four|five|six)\s+child(?:ren)?\b/) ||
      query.match(/\b(\d+|a|an|one|two|three|four|five|six)\s+kids?\b/);
    if (children) {
      usage.children = parseQty(children[1]) || 1;
      usage.childrenNamed = true;
    } else if (/\b(?:kids?|children)\b/.test(query)) {
      usage.children = 1;
      usage.childrenNamed = true;
    }

    var times = query.match(/\b(once|twice|thrice)\s+(?:a|per)\s+day\b/) ||
      query.match(/\b(\d+|one|two|three|four|five|six)\s+times?\s+(?:a|per)\s+day\b/) ||
      query.match(/\b(\d+|one|two|three|four|five|six)\s+meals?\s+(?:a|per)\s+day\b/);
    if (times) {
      var meals = parseTimesQty(times[1]);
      if (meals != null) usage.mealsPerDay = meals;
    } else if (usage.isBbq) {
      usage.mealsPerDay = 2;
    }

    if (usage.isBbq) {
      usage.cookingStyle = "heavy";
    } else if (/\bheavy\b/.test(query) || /\b(?:oven|grill|long simmer)\b/.test(query)) {
      usage.cookingStyle = "heavy";
    } else if (/\blight\b/.test(query)) {
      usage.cookingStyle = "light";
    } else if (/\bnormal\b/.test(query)) {
      usage.cookingStyle = "normal";
    }

    var typed = query.match(/\b(\d+(?:\.\d+)?)\s*kg\s+(propane|butane)\b/) ||
      query.match(/\b(propane|butane)\s+(\d+(?:\.\d+)?)\s*kg\b/) ||
      query.match(/\bcalor\s+(\d+(?:\.\d+)?)\s*kg\b/) ||
      query.match(/\b(\d+(?:\.\d+)?)\s*kg\s+(?:calor\s+)?(?:gas\s+)?bottles?\b/) ||
      query.match(/\b(\d+(?:\.\d+)?)\s*kg\s+(?:bottle|cylinder)\b/);
    if (typed) {
      var kg;
      var typeHint = null;
      if (typed[2] === "propane" || typed[2] === "butane") {
        kg = num(typed[1]);
        typeHint = typed[2];
      } else if (typed[1] === "propane" || typed[1] === "butane") {
        kg = num(typed[2]);
        typeHint = typed[1];
      } else {
        kg = num(typed[1]);
        if (/\bpropane\b/.test(query)) typeHint = "propane";
        else if (/\bbutane\b/.test(query)) typeHint = "butane";
      }
      if (kg > 0) {
        var matched = matchNamedBottle(kg, typeHint);
        usage.bottleId = matched.bottleId;
        usage.gasType = matched.gasType;
        usage.bottleKg = matched.bottleKg;
        usage.bottleNamed = true;
      }
    } else if (/\bpropane\b/.test(query)) {
      var propaneAtDefaultKg = matchNamedBottle(GAS_DEFAULT_BOTTLE.kg, "propane");
      usage.gasType = propaneAtDefaultKg.gasType;
      usage.bottleId = propaneAtDefaultKg.bottleId;
      usage.bottleKg = propaneAtDefaultKg.bottleKg;
    } else if (/\bbutane\b/.test(query)) {
      usage.gasType = "butane";
    }

    return usage;
  }

  function isCassetteTopic(query) {
    if (/\bpayload|mam|miro|weighbridge|\bkg\b/.test(query)) return false;
    if (isGasLater(query)) return false;
    return /\b(?:cassettes?|toilets?|loos?|chemical\s+toilets?|porta[-\s]?pott(?:y|ies)|portapott(?:y|ies))\b/.test(query);
  }

  /**
   * Cassette empties / days / 2nd-cassette questions can use Cassette defaults.
   * Bare “cassette” / “toilet” / “open cassette” stay on the later soft CTA.
   */
  function isCassetteEstimate(query) {
    if (!isCassetteTopic(query)) return false;
    var longevity = /\b(?:how\s+(?:long|many|often)|days?|last(?:s|ing)?)\b/.test(query);
    var empties = /\bempties\b/.test(query);
    var spare = /\b(?:2nd|second|spare|extra)\s+(?:toilet\s+)?cassettes?\b/.test(query) ||
      /\b(?:2nd|second|spare|extra)\s+toilet\b/.test(query);
    return longevity || empties || spare;
  }

  function parseCassetteUsage(query) {
    var usage = emptyCassetteUsage();
    usage.hasSpare = /\b(?:2nd|second|spare|extra)\s+(?:toilet\s+)?cassettes?\b/.test(query) ||
      /\b(?:2nd|second|spare|extra)\s+toilet\b/.test(query) ||
      /\bextra\s+days\b/.test(query);
    if (usage.hasSpare) usage.cassetteCount = 2;
    if (/\bfixed[\s_-]*black\b/.test(query)) usage.blackKind = "fixed";

    var adults = query.match(/\b(\d+|one|two|three|four|five|six)\s+adults?\b/);
    var people = query.match(/\b(\d+|one|two|three|four|five|six)\s+(?:people|persons?)\b/);
    var forN = query.match(/\bfor\s+(\d+|one|two|three|four|five|six)\b/);
    var justMe = /\b(?:just me|on my own|myself|alone|solo)\b/.test(query);
    var couple = /\b(?:couple|two of us)\b/.test(query);
    if (adults) {
      usage.adults = parseQty(adults[1]) || 2;
      usage.peopleNamed = true;
    } else if (people) {
      usage.adults = parseQty(people[1]) || 2;
      usage.peopleNamed = true;
    } else if (forN) {
      usage.adults = parseQty(forN[1]) || 2;
      usage.peopleNamed = true;
    } else if (justMe) {
      usage.adults = 1;
      usage.peopleNamed = true;
    } else if (couple) {
      usage.adults = 2;
      usage.peopleNamed = true;
    }

    var children = query.match(/\b(\d+|a|an|one|two|three|four|five|six)\s+child(?:ren)?\b/) ||
      query.match(/\b(\d+|a|an|one|two|three|four|five|six)\s+kids?\b/);
    if (children) {
      usage.children = parseQty(children[1]) || 1;
      usage.childrenNamed = true;
    } else if (/\b(?:kids?|children)\b/.test(query)) {
      usage.children = 1;
      usage.childrenNamed = true;
    }

    var size = query.match(/\b(\d+(?:\.\d+)?)\s*l(?:itres?|iters?)?\s+cassettes?\b/) ||
      query.match(/\bcassettes?\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*l(?:itres?|iters?)?\b/);
    if (size) {
      var litres = num(size[1]);
      if (litres > 0) {
        usage.blackTankLitres = litres;
        usage.sizeNamed = true;
      }
    }

    return usage;
  }

  function isWaterLater(query) {
    if (/\bpayload|mam|\bkg\b/.test(query)) return false;
    if (isGasLater(query)) return false;
    if (isCassetteTopic(query)) return false;
    return /\b(?:shower|grey\s+water|days?\s+of\s+water)\b/.test(query) ||
      /\bhow\s+(?:long|much)\b[\s\S]{0,40}\bwaters?\b/.test(query);
  }

  function extractLimit(query, intent) {
    var remaining = query.match(
      /(?:got|have|with|of)\s+(\d+(?:\.\d+)?)\s*kg\s+(?:of\s+)?(?:remaining\s+)?payload/
    ) || query.match(
      /(?:remaining\s+)?payload(?:\s+(?:of|left|remaining|is))?\s+(\d+(?:\.\d+)?)\s*kg/
    ) || query.match(
      /(\d+(?:\.\d+)?)\s*kg\s+(?:of\s+)?(?:remaining\s+)?payload/
    ) || query.match(
      /(\d+(?:\.\d+)?)\s*kg\s+left\b/
    );
    if (remaining) intent.remainingPayloadKg = num(remaining[1]);

    var mam = query.match(/(\d+(?:\.\d+)?)\s*kg\s+mam\b/) ||
      query.match(/\bmam\s+(?:of\s+|is\s+)?(\d+(?:\.\d+)?)/);
    if (mam) intent.mamKg = num(mam[1]);

    var miro = query.match(/\b(?:miro|mass\s+in\s+service)\s+(?:of\s+|is\s+)?(\d+(?:\.\d+)?)/) ||
      query.match(/(\d+(?:\.\d+)?)\s*kg\s+(?:miro|mass\s+in\s+service)/);
    if (miro) intent.miroKg = num(miro[1]);
  }

  function extractItems(query, intent) {
    var used = [];

    function take(re, builder) {
      var flags = re.flags.indexOf("g") >= 0 ? re.flags : re.flags + "g";
      var global = new RegExp(re.source, flags);
      var match;
      while ((match = global.exec(query))) {
        var item = builder(match);
        if (item) {
          intent.items.push(item);
          used.push(match[0]);
        }
      }
    }

    take(
      /(\d+|a|an|one|two|three|four|five|six)\s+e(?:-|\s+)?b(?:i(?:k(?:es?)?)?)?(?:\s+(?:at|of|weighing)\s+(\d+(?:\.\d+)?)\s*kg(?:\s+each)?)?(?=\s|$)/g,
      function (match) {
        var qty = parseQty(match[1]);
        if (!qty) return null;
        return {
          type: "ebike",
          qty: qty,
          kgEach: match[2] ? num(match[2]) : null
        };
      }
    );

    take(
      /(\d+|a|an|one|two|three|four|five|six)\s+(\d+(?:\.\d+)?)\s*kg\s+e-?bikes?/g,
      function (match) {
        var qty = parseQty(match[1]);
        if (!qty) return null;
        return { type: "ebike", qty: qty, kgEach: num(match[2]) };
      }
    );

    take(
      /(\d+|a|an|one|two|three|four|five|six)\s+b(?:i(?:k(?:es?)?)?)?(?:\s+(?:at|of|weighing)\s+(\d+(?:\.\d+)?)\s*kg(?:\s+each)?)?(?=\s|$)/g,
      function (match) {
        if (/e-?b/.test(match[0]) || /\be(?:-|\s+)b/.test(match[0])) return null;
        var qty = parseQty(match[1]);
        if (!qty) return null;
        return {
          type: "bike",
          qty: qty,
          kgEach: match[2] ? num(match[2]) : null
        };
      }
    );

    take(
      /(\d+(?:\.\d+)?)\s*kg\s+(?:bike\s+)?rack/g,
      function (match) {
        return { type: "rack", kg: num(match[1]) };
      }
    );

    take(
      /(?:bike\s+)?rack(?:\s+(?:at|of|weighing)\s+(\d+(?:\.\d+)?)\s*kg)/g,
      function (match) {
        return { type: "rack", kg: num(match[1]) };
      }
    );

    // l / litre(s) / liter(s) / ltr / ltrs — UK shorthand “100ltrs” must not be dropped.
    take(
      /(\d+(?:\.\d+)?)\s*l(?:itres?|iters?|trs?)?\b\s+(?:of\s+)?(?:fresh\s+)?water/g,
      function (match) {
        return { type: "water", litres: num(match[1]), fillPct: 100 };
      }
    );

    take(
      /(?:fresh\s+)?water\s+(\d+(?:\.\d+)?)\s*l(?:itres?|iters?|trs?)?\b/g,
      function (match) {
        return { type: "water", litres: num(match[1]), fillPct: 100 };
      }
    );

    take(
      /(\d+(?:\.\d+)?)\s*l(?:itres?|iters?|trs?)?\b\s+(?:full\s+)?(?:fresh\s+)?tank/g,
      function (match) {
        return { type: "water", litres: num(match[1]), fillPct: 100 };
      }
    );

    var hasWater = intent.items.some(function (item) { return item.type === "water"; });
    if (!hasWater) {
      take(
        /(\d+(?:\.\d+)?)\s*(?:litres?|liters?|ltrs?)\b/g,
        function (match) {
          return { type: "water", litres: num(match[1]), fillPct: 100 };
        }
      );
      hasWater = intent.items.some(function (item) { return item.type === "water"; });
    }

    take(
      /(\d+|a|an|one|two|three|four|five|six)\s*(?:x\s*)?(6|9|13)\s*kg\s+(?:gas\s+)?bottles?/g,
      function (match) {
        var qty = parseQty(match[1]);
        if (!qty) return null;
        return { type: "gas", qty: qty, sizeKg: num(match[2]), fullKg: null };
      }
    );

    take(
      /(\d+|a|an|one|two|three|four|five|six)\s+gas bottles?(?:\s+(?:at|of|weighing)\s+(\d+(?:\.\d+)?)\s*kg(?:\s+each)?)?/g,
      function (match) {
        var qty = parseQty(match[1]);
        if (!qty) return null;
        return {
          type: "gas",
          qty: qty,
          sizeKg: null,
          fullKg: match[2] ? num(match[2]) : null
        };
      }
    );

    if (/\bfull\s+(?:fresh\s+)?(?:water\s+)?tank\b/.test(query)) {
      intent.fullTank = true;
      if (!hasWater) {
        intent.items.push({ type: "water", litres: null, fillPct: 100 });
        hasWater = true;
      }
    }

    if (!hasWater && mentionsFreshWater(query)) {
      intent.items.push({ type: "water", litres: null, fillPct: 100 });
    }
  }

  function mentionsFreshWater(query) {
    var cleaned = String(query || "")
      .replace(/\b(?:grey|gray|waste|black|dirty)\s+waters?\b/g, " ")
      .replace(/\bwaters?\s+(?:pump|heater|tap|hose|filter)s?\b/g, " ")
      .replace(/\b(?:pump|heater)\s+waters?\b/g, " ");
    return /\b(?:fresh\s+)?waters?\b/.test(cleaned);
  }

  function extractDanglingQty(query, intent) {
    if (intent.items.some(function (item) {
      return item.type === "bike" || item.type === "ebike" || item.type === "gas" || item.type === "water";
    })) {
      return;
    }
    var match = query.match(
      /(?:take|add|with|fit|bring)\s+(\d+|a|an|one|two|three|four|five|six)(?:\s+([a-z]{1,4}))?\s*$/
    );
    if (!match) return;
    var qty = parseQty(match[1]);
    if (!qty) return;
    var stub = match[2] || "";
    if (!stub || /^(?:b|bi|bik|bike|bikes)$/.test(stub)) {
      if (stub && /^(?:b|bi|bik|bike|bikes)$/.test(stub)) {
        intent.items.push({ type: "bike", qty: qty, kgEach: null });
        return;
      }
      intent.needsClarify = {
        qty: qty,
        question: "Did you mean " + qty + " bikes? Say that (and the kg if you know it) and I’ll work out what’s left."
      };
    }
  }

  function parseDeterministic(text) {
    var intent = blankIntent();
    var query = normalise(text);
    if (!query) return intent;

    if (isTyresHold(query)) {
      intent.domain = "tyres";
      intent.tyresHold = true;
      intent.calculable = false;
      return intent;
    }

    extractLimit(query, intent);
    extractItems(query, intent);
    extractDanglingQty(query, intent);

    intent.wantsFit = /\b(?:can i take|will (?:it|they|this) fit|enough payload|overweight|too heavy|do i have enough|fit in)\b/.test(query);
    intent.wantsUsage = /\b(?:how much (?:of )?(?:my )?(?:remaining )?payload|how much (?:weight|payload)|does that use|use of my)\b/.test(query);
    intent.wantsRemaining = /\b(?:what(?:'s| is) (?:my )?remaining payload|payload left|what(?:'s| is) left|how much (?:have i )?left)\b/.test(query) &&
      !intent.wantsUsage;

    var payloadWord = /\b(?:payload|mam|miro|mass in service|overweight|overload|weigh(?:bridge)?)\b/.test(query);
    var hasItems = intent.items.length > 0;
    var hasLimit = intent.remainingPayloadKg != null || intent.mamKg != null;

    if (
      hasItems && (payloadWord || hasLimit || intent.wantsFit || intent.wantsRemaining || intent.wantsUsage || intent.fullTank)
    ) {
      intent.domain = "payload";
      intent.calculable = true;
      return intent;
    }

    if (hasLimit && (intent.wantsFit || intent.wantsRemaining) && !hasItems) {
      intent.domain = "payload";
      intent.calculable = true;
      return intent;
    }

    if (isPowerLater(query)) {
      intent.domain = "power";
      return intent;
    }
    if (isGasLater(query)) {
      intent.domain = "gas";
      return intent;
    }
    if (isCassetteTopic(query)) {
      intent.domain = "cassette";
      return intent;
    }
    if (isWaterLater(query)) {
      intent.domain = "water";
      return intent;
    }
    if (payloadWord) {
      intent.domain = "payload";
      intent.calculable = false;
    }
    return intent;
  }

  function mergeParse(base, extra) {
    if (!extra || typeof extra !== "object") return base;
    var out = Object.assign({}, base, extra);
    if (!Array.isArray(extra.items)) out.items = base.items;
    return out;
  }

  function parseIntent(text, opts) {
    var parsed = parseDeterministic(text);
    if (opts && typeof opts.llmParse === "function") {
      return mergeParse(parsed, opts.llmParse(text, parsed));
    }
    return parsed;
  }

  /* ----- Domain handlers ----- */

  function payloadCta(state, opts) {
    return {
      href: payloadPrefillHref(state, opts),
      hrefLabel: "Open Payload to fine-tune with your real figures",
      ctaNote: CTA_NOTE
    };
  }

  function handleTyresHold() {
    return {
      handled: true,
      domain: "tyres",
      kind: "hold",
      answer: TYRES_HOLD_MESSAGE,
      assumptions: [],
      gaps: [],
      followUps: [],
      items: [],
      href: TYRES_HREF,
      hrefLabel: "Open Tyres (caution / hold only)",
      ctaNote: "Tyres stays on hold — we will not invent a pressure.",
      usedKg: null,
      remainingKg: null
    };
  }

  function laterGuide(id) {
    var guides = {
      payload: {
        phase: "A",
        href: PAYLOAD_HREF,
        hrefLabel: "Open Payload to enter your figures",
        answer: "I need a remaining-payload figure, or named items with kg / litres, before I can estimate. Open Payload and enter the plate / V5 figures — I do not invent plated weights."
      },
      tyres: {
        phase: null,
        href: TYRES_HREF,
        hrefLabel: "Open Tyres (caution / hold only)",
        answer: TYRES_HOLD_MESSAGE
      },
      power: {
        phase: "B",
        href: POWER_HREF,
        hrefLabel: "Open Power to enter your figures",
        answer: "I don’t calculate battery life or coolbox draw in Ask yet — that would mean inventing amp-hours or watts. Open Power and enter your kit there."
      },
      battery: {
        phase: "B",
        href: BATTERY_HREF,
        hrefLabel: "Open Battery to enter your figures",
        answer: "I don’t calculate battery size or run-time in Ask yet — I will not invent amp-hours. Open Battery and enter your figures there."
      },
      solar: {
        phase: "B",
        href: SOLAR_HREF,
        hrefLabel: "Open Solar to enter your figures",
        answer: "I don’t calculate solar watts in Ask yet — I will not invent a panel size. Open Solar and enter your figures there."
      },
      inverter: {
        phase: "B",
        href: INVERTER_HREF,
        hrefLabel: "Open Inverter to enter your figures",
        answer: "I don’t calculate inverter watts in Ask yet — I will not invent a continuous-watt figure. Open Inverter and enter your kit there."
      },
      wire: {
        phase: "B",
        href: WIRE_HREF,
        hrefLabel: "Open Wire & fuse to enter your figures",
        answer: "I don’t calculate cable or fuse size in Ask yet — I will not invent a rating. Open Wire & fuse and enter your run there."
      },
      water: {
        phase: "C",
        href: WATER_HREF,
        hrefLabel: "Open Water to enter your figures",
        answer: "I don’t calculate days of water in Ask yet. Open Water and enter your use there — I will not invent a tank size or litres per day."
      },
      gas: {
        phase: "C",
        href: GAS_HREF,
        hrefLabel: "Open Gas to enter your figures",
        answer: "I don’t calculate how long a gas bottle will last in Ask — I will not invent a burn rate or bottle-days. Open Gas and enter your bottle and how you use it."
      },
      tanks: {
        phase: "C",
        href: TANKS_HREF,
        hrefLabel: "Open Tanks to enter your figures",
        answer: "I don’t plan tank fills in Ask yet. Open Tanks and enter your figures there — I will not invent a capacity."
      },
      cassette: {
        phase: "C",
        href: CASSETTE_HREF,
        hrefLabel: "Open Cassette to enter your figures",
        answer: "I don’t plan cassette empties in Ask yet. Open Cassette and enter your figures there."
      }
    };
    var guide = guides[id] || guides.power;
    return {
      handled: true,
      domain: id,
      phase: guide.phase,
      kind: id === "tyres" ? "hold" : "later",
      answer: guide.answer,
      assumptions: [],
      gaps: [],
      followUps: [],
      items: [],
      href: guide.href,
      hrefLabel: guide.hrefLabel,
      ctaNote: CTA_NOTE,
      usedKg: null,
      remainingKg: null,
      dailyKg: null,
      bottleDays: null,
      wasteDaily: null,
      daysOne: null,
      daysTwo: null,
      extraDays: null
    };
  }

  function handleLaterDomain(domain, phase) {
    var result = laterGuide(domain);
    if (phase) result.phase = phase;
    return result;
  }

  function gasCta(usage) {
    return {
      href: gasPrefillHref(usage),
      hrefLabel: GAS_CTA_LABEL,
      ctaNote: CTA_NOTE
    };
  }

  function peoplePhrase(computed) {
    var bits = [];
    bits.push(computed.adults + (computed.adults === 1 ? " adult" : " adults"));
    if (computed.children > 0) {
      bits.push(
        computed.children +
        (computed.children === 1 ? " child" : " children") +
        " (× " + GAS_CHILD_FACTOR + ")"
      );
    }
    return bits.join(" + ");
  }

  function buildGasAnswer(computed, usage) {
    var daily = formatGasKg(computed.dailyKg);
    var days = formatGasDays(computed.bottleDays);
    var rate = String(computed.cookRate);
    var meals = computed.mealsPerDay;
    var bottle = formatGasKg(computed.bottleKg);
    return peoplePhrase(computed) +
      " × " + meals + (meals === 1 ? " meal" : " meals") +
      " × " + rate + " kg = " + daily + " kg/day. A " +
      bottle + " kg " + computed.gasType +
      " bottle lasts about " + days + " days (planning estimate).";
  }

  function handleGas(intent, text) {
    var query = normalise(text);
    if (!isGasEstimate(query)) {
      return laterGuide("gas");
    }

    var usage = parseGasUsage(query);
    var computed = calcGasCooking(usage);
    var assumptions = [];
    var followUps = [GAS_FOLLOW_UP];

    if (usage.isBbq) {
      assumptions.push(GAS_BBQ_PROXY_NOTE);
    } else {
      assumptions.push(
        "Cooking style is Gas-calculator " + computed.cookingStyle +
        " (" + computed.cookRate + " kg per person-unit per meal)."
      );
    }

    if (!usage.peopleNamed) {
      assumptions.push("2 adults — Gas-calculator default, used because you didn’t say how many people.");
    }
    if (usage.childrenNamed) {
      assumptions.push(
        "Children count as " + GAS_CHILD_FACTOR +
        " of an adult (Gas-calculator child factor)."
      );
    }
    if (!usage.bottleNamed) {
      assumptions.push(
        formatGasKg(computed.bottleKg) + " kg " + computed.gasType +
        " bottle (Gas-calculator default 7 kg butane unless you named a bottle kg / Calor size)."
      );
    } else {
      assumptions.push(
        formatGasKg(computed.bottleKg) + " kg " + computed.gasType +
        " bottle, as typed."
      );
    }
    assumptions.push("Heating off, fridge on gas off, and boiler off — outdoor-cook / BBQ longevity unless you said otherwise.");
    assumptions.push("Planning estimate from the Gas calculator cooking line only. Not a manufacturer rating.");

    var cta = gasCta(Object.assign({}, usage, computed));

    return {
      handled: true,
      domain: "gas",
      phase: "Gas",
      kind: "answer",
      answer: buildGasAnswer(computed, usage),
      assumptions: unique(assumptions),
      gaps: [],
      followUps: unique(followUps),
      items: [],
      href: cta.href,
      hrefLabel: cta.hrefLabel,
      ctaNote: cta.ctaNote,
      usedKg: null,
      remainingKg: null,
      dailyKg: computed.dailyKg,
      bottleDays: computed.bottleDays,
      gasUsage: usage,
      computed: computed
    };
  }

  function cassetteCta(usage) {
    return {
      href: cassettePrefillHref(usage),
      hrefLabel: CASSETTE_CTA_LABEL,
      ctaNote: CTA_NOTE
    };
  }

  function cassettePeoplePhrase(computed) {
    var bits = [];
    bits.push(computed.adults + (computed.adults === 1 ? " adult" : " adults"));
    if (computed.children > 0) {
      bits.push(computed.children + (computed.children === 1 ? " child" : " children"));
    }
    return bits.join(" + ");
  }

  function buildCassetteAnswer(computed, usage) {
    var waste = formatCassetteLitres(computed.wasteDaily);
    var daysOne = formatGasDays(computed.daysOne);
    var litres = formatCassetteLitres(computed.blackTankLitres);
    var flushes = formatCassetteLitres(computed.flushesPerPersonPerDay);
    var perFlush = formatCassetteLitres(computed.litresPerFlush);
    var lead = cassettePeoplePhrase(computed) +
      " × " + flushes + " flushes × " + perFlush + " L = " + waste +
      " L/day. An empty " + litres + " L cassette lasts about " + daysOne +
      " days (planning estimate).";
    if (!usage.hasSpare) return lead;
    var extra = formatGasDays(computed.extraDays);
    var total = formatGasDays(computed.daysTwo);
    return cassettePeoplePhrase(computed) +
      " × " + flushes + " flushes × " + perFlush + " L = " + waste +
      " L/day. One empty " + litres + " L cassette lasts about " + daysOne +
      " days. A 2nd cassette adds about " + extra +
      " extra days (about " + total + " days total). Planning estimate.";
  }

  function handleCassette(intent, text) {
    var query = normalise(text);
    if (!isCassetteEstimate(query)) {
      return laterGuide("cassette");
    }

    var usage = parseCassetteUsage(query);
    var computed = calcCassetteDays(usage);
    var assumptions = [];
    var followUps = [CASSETTE_FOLLOW_UP];

    if (!usage.peopleNamed) {
      assumptions.push("2 adults — Cassette-calculator default, used because you didn’t say how many people.");
    }
    if (usage.childrenNamed) {
      assumptions.push(
        computed.children +
        (computed.children === 1 ? " child" : " children") +
        " counted as a full person on Cassette (flush litres, no child factor)."
      );
    }
    if (!usage.sizeNamed) {
      assumptions.push(
        formatCassetteLitres(computed.blackTankLitres) +
        " L cassette — Cassette-calculator labelled default."
      );
    } else {
      assumptions.push(
        formatCassetteLitres(computed.blackTankLitres) +
        " L cassette, as typed."
      );
    }
    assumptions.push(
      formatCassetteLitres(computed.flushesPerPersonPerDay) +
      " flushes per person per day × " +
      formatCassetteLitres(computed.litresPerFlush) +
      " L per flush — Cassette-calculator labelled defaults."
    );
    assumptions.push(
      "Starting empty (" +
      formatCassetteLitres(computed.startPercent) +
      "%) — Cassette-calculator labelled default."
    );
    if (usage.hasSpare) {
      assumptions.push(
        "A 2nd / spare cassette is another empty " +
        formatCassetteLitres(computed.blackTankLitres) +
        " L tank. Open Cassette sends cassetteCount=2 so the page multiplies that into the tank size."
      );
    }
    assumptions.push("Planning estimate from Cassette flush litres only. Not a waste test or a venue list.");

    var cta = cassetteCta(Object.assign({}, usage, computed));

    return {
      handled: true,
      domain: "cassette",
      phase: "Cassette",
      kind: "answer",
      answer: buildCassetteAnswer(computed, usage),
      assumptions: unique(assumptions),
      gaps: [],
      followUps: unique(followUps),
      items: [],
      href: cta.href,
      hrefLabel: cta.hrefLabel,
      ctaNote: cta.ctaNote,
      usedKg: null,
      remainingKg: null,
      dailyKg: null,
      bottleDays: null,
      wasteDaily: computed.wasteDaily,
      daysOne: computed.daysOne,
      daysTwo: computed.daysTwo,
      extraDays: computed.extraDays,
      cassetteUsage: usage,
      computed: computed
    };
  }

  function powerCta(usage) {
    var computed = calcWave3(usage);
    return {
      href: wave3PrefillHref(usage),
      hrefLabel: computed.hoursNamed ? POWER_CTA_LABEL : POWER_HOURS_CTA_LABEL,
      ctaNote: CTA_NOTE
    };
  }

  function buildWave3Answer(computed) {
    if (!computed.hoursNamed || computed.hours == null) {
      return "An EcoFlow Wave 3 portable air-con is 640 W DC (EcoFlow UK rated cooling). Each hour is about " +
        formatPowerWh(computed.whPerHour) + " Wh (~" +
        formatPowerAh(computed.ah12PerHour) +
        " Ah at 12 V). How many hours a day will it run? Or open Power and set the hours there.";
    }
    return "EcoFlow Wave 3 at 640 W DC × " +
      formatPowerHours(computed.hours) +
      (computed.hours === 1 ? " hour" : " hours") +
      " = " + formatPowerWh(computed.dailyWh) +
      " Wh/day (~" + formatPowerAh(computed.ah12) +
      " Ah at 12 V, ~" + formatPowerAh(computed.ah24) +
      " Ah at 24 V). Planning estimate.";
  }

  function handlePower(intent, text) {
    var query = normalise(text);
    if (!isAirconTopic(query)) {
      return laterGuide("power");
    }

    var usage = parseWave3Usage(query);
    var computed = calcWave3(usage);
    var assumptions = [];
    var followUps = [POWER_FOLLOW_UP];
    var gaps = [];

    assumptions.push(
      "Wave 3 rated cooling 640 W DC from EcoFlow UK. Not cooling-capacity watts."
    );
    if (computed.hoursNamed) {
      assumptions.push(
        formatPowerHours(computed.hours) +
        (computed.hours === 1 ? " hour" : " hours") +
        " — from the question. Planning estimate only."
      );
    } else {
      assumptions.push("Hours are not assumed. Ask does not pick 4 h or 8 h for you.");
      gaps.push("Hours a day the Wave 3 will run. I will not invent a daily Wh total without that.");
    }
    assumptions.push("Planning estimate only. Other kit (coolbox, fridge, lights) is not included on this Wave 3 line.");

    var cta = powerCta(Object.assign({}, usage, computed));

    return {
      handled: true,
      domain: "power",
      phase: "Wave3",
      kind: "answer",
      answer: buildWave3Answer(computed),
      assumptions: unique(assumptions),
      gaps: unique(gaps),
      followUps: unique(followUps),
      items: [],
      href: cta.href,
      hrefLabel: cta.hrefLabel,
      ctaNote: cta.ctaNote,
      usedKg: null,
      remainingKg: null,
      dailyKg: null,
      bottleDays: null,
      dailyWh: computed.dailyWh,
      hours: computed.hours,
      ah12: computed.ah12,
      ah24: computed.ah24,
      watts: computed.watts,
      wave3Usage: usage,
      computed: computed
    };
  }

  function hasPrefillQuery(href) {
    return typeof href === "string" && href.indexOf("?") >= 0;
  }

  function applyRouteHref(result, match) {
    if (!result || !match) return result;
    // Keep a prefilled calculator href (bikes, remaining mam+miro=0, water, gas, cassette, Wave 3).
    // The synonym router only knows the bare hub URL.
    if (hasPrefillQuery(result.href)) return result;
    if (result.kind === "later") {
      var guided = laterGuide(match.id);
      return Object.assign({}, guided, {
        intent: result.intent,
        href: match.href || guided.href,
        hrefLabel: "Open " + match.label + " to enter your figures"
      });
    }
    return Object.assign({}, result, {
      href: match.href || result.href,
      hrefLabel: result.hrefLabel || ("Open " + match.label + " to enter your figures")
    });
  }

  function resolveAsk(text, opts) {
    var routeAsk = opts && typeof opts.routeAsk === "function" ? opts.routeAsk : null;
    var result = handleAsk(text, opts);
    var match = routeAsk ? routeAsk(text) : null;

    if (result && result.handled) {
      if (match && (result.kind === "later" || !result.href)) {
        result = applyRouteHref(result, match);
      }
      return { view: publicResult(result), navigate: false, unmatched: false };
    }

    if (match) {
      return {
        view: publicResult(applyRouteHref(laterGuide(match.id), match)),
        navigate: false,
        unmatched: false
      };
    }

    return {
      view: publicResult(result),
      navigate: false,
      unmatched: true
    };
  }

  function applyItems(intent) {
    var state = emptyPayloadState();
    var assumptions = [];
    var gaps = [];
    var lines = [];
    var followUps = [];
    var bikeQty = 0;
    var bikeKgTyped = null;
    var rackKgTyped = null;

    if (intent.remainingPayloadKg != null) {
      state.mam = intent.remainingPayloadKg;
      state.miro = 0;
      assumptions.push(
        "Your “" + fmtKg(intent.remainingPayloadKg) +
        " kg payload” is treated as remaining / available payload, not plated MAM."
      );
    } else if (intent.mamKg != null) {
      state.mam = intent.mamKg;
      state.miro = intent.miroKg != null ? intent.miroKg : 0;
      if (intent.miroKg != null) {
        assumptions.push(
          "Base weight is Mass in Service " + fmtKg(intent.miroKg) +
          " kg (V5 empty-van figure). Remaining = MAM − base − named items."
        );
      }
    }

    intent.items.forEach(function (item) {
      if (item.type === "water") {
        if (item.litres == null || !(item.litres > 0)) {
          gaps.push("Fresh-tank capacity in litres. I don’t invent a tank size — tell me the litres and I’ll add 1 kg per litre.");
          return;
        }
        state.freshCap += item.litres;
        state.freshFill = item.fillPct != null ? item.fillPct : 100;
        var waterKg = item.litres * (state.freshFill / 100) * WATER_KG_PER_L;
        lines.push({
          label: fmtKg(item.litres) + " L fresh water",
          kg: waterKg
        });
        assumptions.push("Water is " + WATER_KG_PER_L + " kg per litre (Payload calculator).");
        return;
      }

      if (item.type === "gas") {
        var qty = item.qty || 0;
        var fullKg = item.fullKg;
        var sizeKg = item.sizeKg;
        if (fullKg == null && sizeKg == null) {
          sizeKg = 6;
          fullKg = GAS_FULL_KG[6];
          assumptions.push(
            qty + (qty === 1 ? " gas bottle" : " gas bottles") +
            " treated as Payload 6 kg labelled bottles at " +
            fmtKg(fullKg) + " kg full each (gas + steel cylinder). The stamped 6 kg is the gas only."
          );
        } else if (fullKg == null && GAS_FULL_KG[sizeKg] != null) {
          fullKg = GAS_FULL_KG[sizeKg];
          assumptions.push(
            qty + " × " + sizeKg + " kg labelled bottle(s) at " +
            fmtKg(fullKg) + " kg full each (Payload default, gas + cylinder)."
          );
        } else if (fullKg != null) {
          assumptions.push(
            qty + (qty === 1 ? " gas bottle" : " gas bottles") +
            " at " + fmtKg(fullKg) + " kg full each, as typed."
          );
        }
        if (sizeKg === 9) {
          state.gas9 += qty;
          state.gas9Full = fullKg;
        } else if (sizeKg === 13) {
          state.gas13 += qty;
          state.gas13Full = fullKg;
        } else {
          state.gas6 += qty;
          state.gas6Full = fullKg;
        }
        lines.push({
          label: qty + " gas bottle" + (qty === 1 ? "" : "s"),
          kg: qty * fullKg
        });
        return;
      }

      if (item.type === "rack") {
        if (item.kg != null && item.kg > 0) rackKgTyped = item.kg;
        return;
      }

      if (item.type === "bike") {
        bikeQty += item.qty || 0;
        if (item.kgEach != null && item.kgEach > 0) bikeKgTyped = item.kgEach;
        return;
      }

      if (item.type === "ebike") {
        if (item.kgEach == null || !(item.kgEach > 0)) {
          gaps.push(
            "Weight of each e-bike in kg. E-bikes vary a lot, so I will not guess — tell me the kg and I’ll include them."
          );
          return;
        }
        state.customItems.push({
          id: "e-bike-" + state.customItems.length,
          name: "e-bike",
          kg: item.kgEach,
          qty: item.qty
        });
        lines.push({
          label: item.qty + " e-bike" + (item.qty === 1 ? "" : "s") +
            " at " + fmtKg(item.kgEach) + " kg each",
          kg: item.qty * item.kgEach
        });
        assumptions.push(
          item.qty + " e-bike" + (item.qty === 1 ? "" : "s") +
          " at " + fmtKg(item.kgEach) + " kg each, as typed. No bike rack added (not mentioned)."
        );
      }
    });

    if (bikeQty > 0) {
      var kgEach = bikeKgTyped != null ? bikeKgTyped : BIKE_DEFAULT_KG;
      var rackKg = rackKgTyped != null ? rackKgTyped : RACK_DEFAULT_KG;
      state.bikes = bikeQty;
      state.bikeKg = kgEach;
      state.rackKg = rackKg;
      lines.push({
        label: bikeQty + " bike" + (bikeQty === 1 ? "" : "s") +
          " at " + fmtKg(kgEach) + " kg each",
        kg: bikeQty * kgEach
      });
      lines.push({
        label: "bike rack at " + fmtKg(rackKg) + " kg",
        kg: rackKg
      });
      if (bikeKgTyped == null) {
        assumptions.push(
          bikeQty + " bike" + (bikeQty === 1 ? "" : "s") +
          " at " + fmtKg(BIKE_DEFAULT_KG) +
          " kg each — Payload pedal-bike default, used as a labelled assumption."
        );
        followUps.push("If your bikes differ, tell me the kg and I’ll recalculate.");
      } else {
        assumptions.push(
          bikeQty + " bike" + (bikeQty === 1 ? "" : "s") +
          " at " + fmtKg(kgEach) + " kg each, as typed."
        );
      }
      if (rackKgTyped == null) {
        assumptions.push(
          "Bike rack at " + fmtKg(RACK_DEFAULT_KG) +
          " kg — Payload default, applied because you have bikes and didn’t specify a rack."
        );
      } else {
        assumptions.push("Bike rack at " + fmtKg(rackKg) + " kg, as typed.");
      }
    }

    return {
      state: state,
      assumptions: unique(assumptions),
      gaps: unique(gaps),
      followUps: unique(followUps),
      lines: lines
    };
  }

  function unique(list) {
    var seen = {};
    return list.filter(function (item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function payloadCtaOpts(intent) {
    return {
      includeVanLimits: intent.mamKg != null || intent.remainingPayloadKg != null,
      remainingPayloadKg: intent.remainingPayloadKg
    };
  }

  function handlePayload(intent) {
    var cta = payloadCta(emptyPayloadState(), payloadCtaOpts(intent));

    if (intent.needsClarify && (!intent.items || !intent.items.length)) {
      return {
        handled: true,
        domain: "payload",
        kind: "clarify",
        answer: intent.needsClarify.question,
        assumptions: [],
        gaps: [],
        followUps: [],
        items: [],
        usedKg: null,
        remainingKg: intent.remainingPayloadKg,
        href: cta.href,
        hrefLabel: cta.hrefLabel,
        ctaNote: cta.ctaNote
      };
    }

    var built = applyItems(intent);
    var gaps = built.gaps.slice();
    var assumptions = built.assumptions.slice();
    var followUps = (built.followUps || []).slice();
    var hasAvailable = intent.remainingPayloadKg != null;
    var hasMam = intent.mamKg != null;
    var hasMiro = intent.miroKg != null;
    var needsVanLimit = intent.wantsFit || (intent.wantsRemaining && !intent.wantsUsage);

    if (needsVanLimit && !hasAvailable && !hasMam) {
      gaps.unshift("Plated MAM, or your remaining payload in kg. We do not invent plated weights.");
    } else if (needsVanLimit && hasMam && !hasMiro && !hasAvailable) {
      gaps.unshift("Mass in Service or an empty weighbridge total, or remaining payload in kg. We do not invent the empty-van figure.");
    }

    var computed = computePayload(built.state);
    var knownKg = computed.added;
    var remainingKg = (hasAvailable || (hasMam && hasMiro) || (hasMam && hasAvailable))
      ? computed.remaining
      : null;
    if (hasAvailable) remainingKg = computed.remaining;
    if (hasMam && hasMiro) remainingKg = computed.remaining;
    if (hasMam && !hasMiro && !hasAvailable) remainingKg = null;

    var missingLimit = needsVanLimit && remainingKg == null;
    var kind = "answer";
    if (missingLimit || gaps.length) kind = "gap";
    if (missingLimit && !hasAvailable && !hasMam && !intent.wantsUsage) {
      kind = "refuse";
    }

    var answer = buildPayloadAnswer({
      intent: intent,
      kind: kind,
      knownKg: knownKg,
      remainingKg: remainingKg,
      lines: built.lines,
      gaps: gaps,
      missingLimit: missingLimit
    });

    assumptions.push("Planning estimate only. Weigh the van. We do not invent plated weights or legal limits.");
    cta = payloadCta(built.state, payloadCtaOpts(intent));

    return {
      handled: true,
      domain: "payload",
      kind: kind,
      answer: answer,
      assumptions: unique(assumptions),
      gaps: unique(gaps),
      followUps: unique(followUps),
      items: built.lines,
      usedKg: knownKg,
      remainingKg: remainingKg,
      payloadState: built.state,
      computed: computed,
      href: cta.href,
      hrefLabel: cta.hrefLabel,
      ctaNote: cta.ctaNote
    };
  }

  function itemBreakdown(lines) {
    if (!lines || !lines.length) return "";
    return " (" + lines.map(function (line) {
      return line.label;
    }).join(", ") + ")";
  }

  function buildPayloadAnswer(opts) {
    var gaps = opts.gaps || [];
    var known = fmtKg(opts.knownKg);
    var left = opts.remainingKg != null ? fmtKg(opts.remainingKg) : null;
    var limit = opts.intent.remainingPayloadKg != null
      ? fmtKg(opts.intent.remainingPayloadKg)
      : null;
    var bits = itemBreakdown(opts.lines);
    var gapNote = gaps.length ? " " + gaps[0] : "";

    if (opts.kind === "refuse") {
      return "I need your remaining payload in kg, or plated MAM and Mass in Service, before I can say what is left. I do not invent plated weights. Open Payload and enter the plate / V5 figures — that is the accurate place to do this.";
    }

    if (opts.missingLimit && opts.knownKg > 0) {
      return "Those items use " + known + " kg" + bits +
        ". To say what is left I still need plated MAM and Mass in Service, or your remaining payload in kg. I do not invent those figures.";
    }

    if (opts.intent.wantsUsage && (opts.remainingKg == null) && opts.knownKg > 0 && !opts.intent.wantsFit) {
      return "That uses " + known + " kg of payload" +
        (opts.lines.length ? bits + "." : ".") +
        " Add remaining payload if you want what would be left — I do not invent that figure.";
    }

    if (opts.remainingKg != null && limit) {
      if (opts.knownKg === 0 && gaps.length) {
        return "Your " + limit + " kg remaining payload is unused so far." + gapNote;
      }
      if (opts.remainingKg < 0) {
        return "Those items use " + known + " kg" + bits + " — " +
          fmtKg(Math.abs(opts.remainingKg)) +
          " kg over the " + limit + " kg remaining payload you gave. Planning estimate only; weigh the van." +
          (gaps.length ? gapNote : "");
      }
      return "Those items use " + known + " kg of your " + limit +
        " kg remaining payload, leaving " + left + " kg" + bits +
        ". Planning estimate only; weigh the van." +
        (gaps.length ? gapNote : "");
    }

    if (opts.remainingKg != null && opts.intent.mamKg != null) {
      if (opts.remainingKg < 0) {
        return "Named items plus the empty-van base come to " +
          fmtKg(opts.knownKg + (opts.intent.miroKg || 0)) +
          " kg against MAM " + fmtKg(opts.intent.mamKg) +
          " kg — " + fmtKg(Math.abs(opts.remainingKg)) +
          " kg over. Planning estimate only; weigh the van.";
      }
      return "Remaining payload is " + left + " kg after the named items (MAM " +
        fmtKg(opts.intent.mamKg) + " kg). Planning estimate only; weigh the van.";
    }

    if (opts.knownKg > 0) {
      return "Those named items use " + known + " kg" + bits +
        ". Add remaining payload or MAM + Mass in Service if you want what would be left.";
    }

    if (gaps.length) {
      return gaps[0];
    }

    return "Tell me the items and a remaining-payload figure — I’ll use labelled Payload defaults where we have them, and I will not invent plated weights.";
  }

  var DOMAINS = {
    payload: handlePayload,
    tyres: handleTyresHold,
    power: handlePower,
    gas: handleGas,
    cassette: handleCassette,
    water: function () { return handleLaterDomain("water", "C"); }
  };

  function handleAsk(text, opts) {
    var question = clip(text, 280);
    var intent = parseIntent(question, opts);

    if (intent.tyresHold || intent.domain === "tyres") {
      return Object.assign(handleTyresHold(), { intent: intent });
    }

    if (intent.domain === "payload" && intent.calculable) {
      return Object.assign(handlePayload(intent), { intent: intent });
    }

    if (intent.domain === "power") {
      return Object.assign(handlePower(intent, question), { intent: intent });
    }
    if (intent.domain === "gas") {
      return Object.assign(handleGas(intent, question), { intent: intent });
    }
    if (intent.domain === "cassette") {
      return Object.assign(handleCassette(intent, question), { intent: intent });
    }
    if (intent.domain === "water") {
      return Object.assign(DOMAINS.water(), { intent: intent });
    }
    if (intent.domain === "payload") {
      return Object.assign(laterGuide("payload"), { intent: intent });
    }

    return {
      handled: false,
      domain: intent.domain || "unknown",
      kind: "unmatched",
      intent: intent,
      answer: "",
      assumptions: [],
      gaps: []
    };
  }

  function publicResult(result) {
    if (!result) return null;
    return {
      handled: !!result.handled,
      domain: result.domain || "unknown",
      kind: result.kind || "unmatched",
      answer: result.answer || "",
      assumptions: result.assumptions || [],
      gaps: result.gaps || [],
      items: result.items || [],
      usedKg: result.usedKg == null ? null : result.usedKg,
      remainingKg: result.remainingKg == null ? null : result.remainingKg,
      href: result.href || null,
      hrefLabel: result.hrefLabel || null,
      ctaNote: result.ctaNote || null,
      followUps: result.followUps || [],
      phase: result.phase || null,
      dailyKg: result.dailyKg == null ? null : result.dailyKg,
      bottleDays: result.bottleDays == null ? null : result.bottleDays,
      wasteDaily: result.wasteDaily == null ? null : result.wasteDaily,
      daysOne: result.daysOne == null ? null : result.daysOne,
      daysTwo: result.daysTwo == null ? null : result.daysTwo,
      extraDays: result.extraDays == null ? null : result.extraDays,
      dailyWh: result.dailyWh == null ? null : result.dailyWh,
      hours: result.hours == null ? null : result.hours,
      ah12: result.ah12 == null ? null : result.ah12,
      ah24: result.ah24 == null ? null : result.ah24
    };
  }

  return {
    PAYLOAD_SOURCE: PAYLOAD_SOURCE,
    PAYLOAD_HREF: PAYLOAD_HREF,
    TYRES_HREF: TYRES_HREF,
    TYRES_HOLD_MESSAGE: TYRES_HOLD_MESSAGE,
    GAS_HREF: GAS_HREF,
    GAS_SOURCE: GAS_SOURCE,
    GAS_FULL_KG: GAS_FULL_KG,
    GAS_COOK_STYLES: GAS_COOK_STYLES,
    GAS_CHILD_FACTOR: GAS_CHILD_FACTOR,
    GAS_DEFAULT_BOTTLE: GAS_DEFAULT_BOTTLE,
    GAS_BBQ_PROXY_NOTE: GAS_BBQ_PROXY_NOTE,
    GAS_CTA_LABEL: GAS_CTA_LABEL,
    GAS_FOLLOW_UP: GAS_FOLLOW_UP,
    CASSETTE_HREF: CASSETTE_HREF,
    CASSETTE_SOURCE: CASSETTE_SOURCE,
    CASSETTE_DEFAULT_LITRES: CASSETTE_DEFAULT_LITRES,
    CASSETTE_DEFAULT_FLUSHES: CASSETTE_DEFAULT_FLUSHES,
    CASSETTE_DEFAULT_LITRES_PER_FLUSH: CASSETTE_DEFAULT_LITRES_PER_FLUSH,
    CASSETTE_DEFAULT_START_PERCENT: CASSETTE_DEFAULT_START_PERCENT,
    CASSETTE_CTA_LABEL: CASSETTE_CTA_LABEL,
    CASSETTE_FOLLOW_UP: CASSETTE_FOLLOW_UP,
    POWER_HREF: POWER_HREF,
    POWER_CTA_LABEL: POWER_CTA_LABEL,
    POWER_HOURS_CTA_LABEL: POWER_HOURS_CTA_LABEL,
    POWER_FOLLOW_UP: POWER_FOLLOW_UP,
    WAVE3_WATTS: WAVE3_WATTS,
    WAVE3_SOURCE: WAVE3_SOURCE,
    WATER_KG_PER_L: WATER_KG_PER_L,
    BIKE_DEFAULT_KG: BIKE_DEFAULT_KG,
    RACK_DEFAULT_KG: RACK_DEFAULT_KG,
    CTA_NOTE: CTA_NOTE,
    DOMAINS: Object.keys(DOMAINS),
    num: num,
    normalise: normalise,
    emptyPayloadState: emptyPayloadState,
    computePayload: computePayload,
    customKitTotalKg: customKitTotalKg,
    customKitItemKg: customKitItemKg,
    driverPayloadKg: driverPayloadKg,
    fuelPayloadKg: fuelPayloadKg,
    payloadPrefillHref: payloadPrefillHref,
    emptyGasUsage: emptyGasUsage,
    calcGasCooking: calcGasCooking,
    GAS_PREFILL_KEYS: GAS_PREFILL_KEYS,
    buildGasPrefillQuery: buildGasPrefillQuery,
    buildGasPrefillHref: buildGasPrefillHref,
    gasPrefillHref: gasPrefillHref,
    parseGasUsage: parseGasUsage,
    emptyCassetteUsage: emptyCassetteUsage,
    calcCassetteDays: calcCassetteDays,
    CASSETTE_PREFILL_KEYS: CASSETTE_PREFILL_KEYS,
    buildCassettePrefillQuery: buildCassettePrefillQuery,
    buildCassettePrefillHref: buildCassettePrefillHref,
    cassettePrefillHref: cassettePrefillHref,
    parseCassetteUsage: parseCassetteUsage,
    isCassetteEstimate: isCassetteEstimate,
    emptyWave3Usage: emptyWave3Usage,
    calcWave3: calcWave3,
    POWER_PREFILL_KEYS: POWER_PREFILL_KEYS,
    POWER_WAVE3_HASH: POWER_WAVE3_HASH,
    buildPowerPrefillQuery: buildPowerPrefillQuery,
    buildPowerPrefillHref: buildPowerPrefillHref,
    wave3PrefillHref: wave3PrefillHref,
    parseWave3Usage: parseWave3Usage,
    isAirconTopic: isAirconTopic,
    parseIntent: parseIntent,
    handleAsk: handleAsk,
    resolveAsk: resolveAsk,
    laterGuide: laterGuide,
    publicResult: publicResult
  };
});
