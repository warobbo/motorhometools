"use strict";

/**
 * Keyword router for the Motorhome Tools front door.
 * Points at an existing hub. Never invents pressures, weights or legal advice.
 *
 * FONT OWNS ASK COVERAGE (Wayne lock, 15 Sep 2026).
 * Wayne must never discover missing synonyms by typing. When a hub adds a
 * starter item, update the matching seed list here in the same change.
 * See ASK-SYNONYMS.md.
 *
 * Sources (15 Sep 2026):
 * - Floor: live hub default lists (Power STARTER + inverter loads,
 *   mhwater gas/water/tanks/cassette, Payload weight terms)
 * - Layer 2: Google-style UK search / People-also-ask phrasing (free public
 *   language only — no paid Keyword Planner). Route the page; never invent
 *   a pressure, weight or legal number in copy.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MotorhomeToolsRouter = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var LINKS = {
    payload: {
      id: "payload",
      href: "https://motorhomepayload.co.uk/",
      label: "Payload",
      line: "Weigh your van / remaining payload"
    },
    tyres: {
      id: "tyres",
      href: "https://motorhomepayload.co.uk/tyres.html",
      label: "Tyres",
      line: "Different wheels or tyres to the originals"
    },
    power: {
      id: "power",
      href: "https://motorhomepower.co.uk/",
      label: "Power",
      line: "Daily power, battery, solar"
    },
    battery: {
      id: "battery",
      href: "https://motorhomepower.co.uk/battery.html",
      label: "Battery",
      line: "Leisure battery size"
    },
    solar: {
      id: "solar",
      href: "https://motorhomepower.co.uk/solar.html",
      label: "Solar",
      line: "Solar panel watts"
    },
    inverter: {
      id: "inverter",
      href: "https://motorhomepower.co.uk/inverter.html",
      label: "Inverter",
      line: "Inverter continuous watts"
    },
    wire: {
      id: "wire",
      href: "https://motorhomepower.co.uk/wire.html",
      label: "Wire & fuse",
      line: "Cable size and fuse"
    },
    water: {
      id: "water",
      href: "https://motorhomewater.co.uk/",
      label: "Water",
      line: "Water, gas, tanks, cassette"
    },
    gas: {
      id: "gas",
      href: "https://motorhomewater.co.uk/gas.html",
      label: "Gas",
      line: "Gas / LPG usage"
    },
    tanks: {
      id: "tanks",
      href: "https://motorhomewater.co.uk/tanks.html",
      label: "Tanks",
      line: "Fresh, grey and cassette tanks"
    },
    cassette: {
      id: "cassette",
      href: "https://motorhomewater.co.uk/cassette.html",
      label: "Cassette",
      line: "Cassette empty planner"
    }
  };

  /**
   * Live Power STARTER ids from defaults.js STARTER_IDS / starterSet().
   * Each `ask` is the name token a visitor would type. Tests walk this list.
   */
  var POWER_STARTER_ASKS = [
    { id: "fridge", ask: "fridge" },
    { id: "lights", ask: "lights" },
    { id: "pump", ask: "pump" },
    { id: "heater", ask: "heater" },
    { id: "phone", ask: "phone" },
    { id: "laptop", ask: "laptop" },
    { id: "fan", ask: "fan" },
    { id: "water-heater", ask: "water heater" },
    { id: "kettle", ask: "kettle" },
    { id: "induction-hob", ask: "induction" },
    { id: "tv", ask: "tv" },
    { id: "inverter-idle", ask: "inverter idle" }
  ];

  /**
   * Power inverterStarterSet() labels (defaults.js INVERTER_LOAD_IDS).
   * Bare oven → Daily Power. Electric grill stays Power; standalone grill is Gas.
   * Air fryer short forms (air fry / air-fry / airfry) stay Power with air fryer.
   */
  var POWER_INVERTER_ASKS = [
    { id: "power", ask: "microwave" },
    { id: "power", ask: "air fryer" },
    { id: "power", ask: "airfryer" },
    { id: "power", ask: "air fry" },
    { id: "power", ask: "air-fry" },
    { id: "power", ask: "airfry" },
    { id: "power", ask: "coffee machine" },
    { id: "power", ask: "nespresso" },
    { id: "power", ask: "wonder oven" },
    { id: "power", ask: "oven" },
    { id: "power", ask: "electric oven" },
    { id: "power", ask: "electric bbq" },
    { id: "power", ask: "electric grill" },
    { id: "power", ask: "hairdryer" },
    { id: "power", ask: "slow cooker" }
  ];

  /**
   * Layer 2: one UK search / PAA phrase per hub. Tests walk this list.
   * Hub defaults remain the floor; these catch “how much / motorhome X” wording.
   */
  var SEARCH_PHRASE_ASKS = [
    { id: "power", ask: "how much battery for a microwave" },
    { id: "gas", ask: "Calor bottle how long" },
    { id: "water", ask: "fresh water how much" },
    { id: "cassette", ask: "empty cassette" },
    { id: "tanks", ask: "holding tanks planner" },
    { id: "payload", ask: "Mass in Service" },
    { id: "tyres", ask: "tyre pressure motorhome" }
  ];

  /**
   * Ask-log / UK phrasing for a 12V camping cooler (not a Power STARTER id).
   * Treated like fridge: Daily Power, never Gas. Tests walk this list.
   */
  var POWER_COOLBOX_ASKS = [
    { id: "power", ask: "coolbox" },
    { id: "power", ask: "cool box" },
    { id: "power", ask: "cool-box" },
    { id: "power", ask: "12v coolbox" },
    { id: "power", ask: "camping coolbox" },
    { id: "power", ask: "portable coolbox" },
    { id: "power", ask: "fridge coolbox" }
  ];

  /**
   * 12 V / leisure-electric family people type (same bucket as lights, TV,
   * phone charge). Includes Power starter labels plus UK van electrics.
   * Diesel heater is a 12 V draw → Power, not Gas. Tests walk this list.
   */
  var POWER_UK_ASKS = [
    { id: "power", ask: "radio" },
    { id: "power", ask: "stereo" },
    { id: "power", ask: "bluetooth" },
    { id: "power", ask: "speaker" },
    { id: "power", ask: "charger" },
    { id: "power", ask: "phone charger" },
    { id: "power", ask: "usb charger" },
    { id: "power", ask: "usb" },
    { id: "power", ask: "tv" },
    { id: "power", ask: "television" },
    { id: "power", ask: "lights" },
    { id: "power", ask: "led" },
    { id: "power", ask: "fan" },
    { id: "power", ask: "heater fan" },
    { id: "power", ask: "diesel heater" },
    { id: "power", ask: "aircon" },
    { id: "power", ask: "air-con" },
    { id: "power", ask: "air conditioner" },
    { id: "power", ask: "portable aircon" },
    { id: "power", ask: "portable ac" },
    { id: "power", ask: "pump" },
    { id: "power", ask: "freezer" },
    { id: "power", ask: "hob" },
    { id: "power", ask: "toaster" }
  ];

  /**
   * Payload weight terms from the Payload calculator + Wave 1 guides.
   * Clear weight words only — not bare V5 or number plate.
   */
  var PAYLOAD_WEIGHT_ASKS = [
    { id: "payload", ask: "axle" },
    { id: "payload", ask: "axles" },
    { id: "payload", ask: "front axle" },
    { id: "payload", ask: "rear axle" },
    { id: "payload", ask: "weighbridge" },
    { id: "payload", ask: "MAM" },
    { id: "payload", ask: "MIRO" },
    { id: "payload", ask: "Mass in Service" },
    { id: "payload", ask: "payload" },
    { id: "payload", ask: "overweight" },
    { id: "payload", ask: "overload" }
  ];

  /**
   * Gas / BBQ / LPG / bottle terms from mhwater gas-defaults + gas-calc.
   * Standalone grill → Gas with BBQ. Electric grill is Power (above).
   */
  var GAS_HUB_ASKS = [
    { id: "gas", ask: "BBQ" },
    { id: "gas", ask: "barbecue" },
    { id: "gas", ask: "grill" },
    { id: "gas", ask: "Calor" },
    { id: "gas", ask: "LPG" },
    { id: "gas", ask: "gas bottle" },
    { id: "gas", ask: "propane" },
    { id: "gas", ask: "butane" }
  ];

  /**
   * Daily-power + inverter-load name tokens (regex fragments).
   * Seeded from power-tool defaults.js starterSet() + inverterStarterSet(),
   * plus UK PAA extras (oven, radio, stereo, bluetooth, speaker, charger,
   * coolbox, nespresso). Used for Daily Power and for “battery for X”.
   */
  var POWER_APPLIANCE_TOKENS = [
    "fridges?",
    "freezers?",
    "cool[\\s-]?box(?:es)?",
    "lights",
    "lighting",
    "leds?",
    "pumps?",
    "heaters?",
    "heater\\s+fans?",
    "diesel\\s+heaters?",
    "phones?",
    "phone\\s+charg(?:e|ers?)",
    "tablets?",
    "tablet\\s+charg(?:e|ers?)",
    "laptops?",
    "fans?",
    "maxxfans?",
    "maxx\\s+fans?",
    "roof\\s+fans?",
    "kettles?",
    "tvs?",
    "televisions?",
    "monitors?",
    "hobs?",
    "ovens?",
    "microwaves?",
    "toasters?",
    "hair[\\s-]?dryers?",
    "usbs?",
    "usb\\s+chargers?",
    "chargers?",
    "coffee(?:\\s+(?:machines?|makers?))?",
    "nespressos?",
    "air[\\s-]?fry(?:ers?)?",
    "wonder\\s+ovens?",
    "slow\\s+cookers?",
    "radios?",
    "stereos?",
    "bluetooth",
    "speakers?",
    "12\\s*-?v\\s+sockets?",
    "leisure\\s+sockets?",
    "blowers?",
    "air[\\s-]?cons?",
    "air[\\s-]?condition(?:ers?|ing)",
    "portable\\s+acs?"
  ];

  var POWER_LOAD = POWER_APPLIANCE_TOKENS.join("|");

  function words(list) {
    return "\\b(?:" + list.join("|") + ")\\b";
  }

  function compile(parts) {
    return new RegExp(parts.join("|"), "i");
  }

  // More specific phrases first. Word boundaries so “camping” does not match amp.
  // Tyres keeps pressure / psi / bar. Heater (Power starter) is not tyre pressure.
  // Bare fridge/freezer/oven → Power. Gas/absorption/3-way fridge → Gas.
  // Induction/hob stay Power — do not steal electrical cooking to Gas.
  // Standalone grill → Gas. Electric grill / Wonder Oven stay Power.
  // Named solar beats “how many watts” Power and Battery (leisure battery + solar).
  // Layer 2 search phrases sit with the hub they belong to.
  var RULES = [
    {
      id: "tyres",
      re: compile([
        words(["tyres?", "tires?", "pressure", "psi", "cp\\s+tyres?", "cp\\s+tires?"]),
        "\\bbar\\b"
      ])
    },
    {
      id: "cassette",
      re: compile([
        words([
          "cassettes?",
          "toilets?",
          "loos?",
          "chemical\\s+toilets?",
          "porta[\\s-]?pott(?:y|ies)",
          "portapott(?:y|ies)",
          "flushes?"
        ])
      ])
    },
    {
      id: "tanks",
      // tank-defaults.js: fresh / grey / black holding tanks
      re: compile([
        words([
          "tanks?",
          "holding\\s+tanks?",
          "fresh\\s+tanks?",
          "grey\\s+tanks?",
          "gray\\s+tanks?",
          "black\\s+tanks?",
          "waste\\s+tanks?",
          "black\\s+waters?"
        ])
      ])
    },
    {
      id: "gas",
      // fridgeGas only when the query names a gas / absorption / 3-way fridge
      re: compile([
        words([
          "gas\\s+(?:fridges?|freezers?|hobs?|cookers?|ovens?|heaters?|grills?|bbqs?)",
          "absorption\\s+(?:fridges?|freezers?)",
          "(?:3|three)[\\s-]?way\\s+(?:fridges?|freezers?)"
        ])
      ])
    },
    {
      id: "solar",
      // Named solar beats the early “how many watts / amp-hours” Power rule
      // and leisure-battery wording. Do not invent panel watts here.
      re: compile([
        words(["solar"]),
        "\\bwatts?\\s+of\\s+solar\\b",
        "\\bsolar[\\s\\S]{0,80}\\bwatts?\\b",
        "\\bwatts?[\\s\\S]{0,80}\\bsolar\\b",
        "\\bsolar\\s+panels?"
      ])
    },
    {
      id: "power",
      // Electrical phrases that must beat Gas (induction) or Water (pump / heater).
      // Layer 2: “battery for a microwave” is daily load, not the Battery tool.
      // “how many watts” stays Power only when the query does not name solar.
      re: compile([
        words([
          "induction(?:\\s+hobs?)?",
          "water\\s+pumps?",
          "water\\s+heaters?",
          "diesel\\s+heaters?",
          "inverter\\s+idles?",
          "phantom(?:\\s+loads?)?",
          "electric\\s+(?:bbqs?|barbecues?|barbeques?|grills?|ovens?)",
          "compressor\\s+fridges?",
          "(?:motorhomes?|campervans?|campers?)\\s+(?:" + POWER_LOAD + ")"
        ]),
        "\\bbatter(?:y|ies)\\b[\\s\\S]{0,80}\\b(?:" + POWER_LOAD + ")\\b",
        "\\b(?:" + POWER_LOAD + ")\\b[\\s\\S]{0,80}\\bbatter(?:y|ies)\\b",
        "^(?!.*\\bsolar\\b).*\\b(?:how\\s+much|how\\s+many)\\s+(?:daily\\s+)?(?:power|amp-?hours?|watts?)\\b"
      ])
    },
    {
      id: "gas",
      // gas-defaults.js / gas-calc.js: cooking, heating, boiler, Calor, LPG, bottles
      // BBQ / standalone grill → Gas. Do not list induction/hob here.
      re: compile([
        words([
          "gas",
          "lpg",
          "butane",
          "propane",
          "calors?",
          "camping\\s+gaz",
          "campingaz",
          "camping\\s+gas",
          "bbqs?",
          "barbecues?",
          "barbeques?",
          "grills?",
          "cooking",
          "heating",
          "boilers?",
          "bottles?",
          "cylinders?",
          "gaslow",
          "alugas",
          "trumas?",
          "external\\s+(?:bbqs?|barbecues?|barbeques?|grills?)(?:\\s+points?)?",
          "(?:bbqs?|barbecues?|barbeques?|grills?)\\s+(?:gas|points?)",
          "calor\\s+bottles?",
          "gas\\s+bottle\\s+days",
          "how\\s+long[\\s\\S]{0,40}(?:calor|gas)\\s+bottles?"
        ])
      ])
    },
    {
      id: "wire",
      re: compile([
        words(["wiring", "wires?", "fuses?", "mm2"]),
        "\\b(?:electrical|power|dc|battery|leisure|inverter|solar|hook-?up)\\s+cables?\\b",
        "\\bcables?\\s+(?:size|gauge|mm|amp|run|length|rating)\\b",
        "\\b(?:12|24)\\s*-?v\\s+cables?\\b"
      ])
    },
    {
      id: "battery",
      re: compile([words(["batter(?:y|ies)", "lifepo4", "agms?", "leisure\\s+batter(?:y|ies)"])])
    },
    {
      id: "inverter",
      re: compile([words(["inverters?"])])
    },
    {
      id: "power",
      // Daily Power default: STARTER + inverter-load extras + UK PAA + units
      re: compile([
        words(
          [
            "power",
            "amps?",
            "amp-?hours?",
            "amp\\s+draws?",
            "alternators?"
          ].concat(POWER_APPLIANCE_TOKENS).concat([
            "watt-?hours?",
            "watts?",
            "k?wh",
            "12\\s*-?v(?:olts?)?",
            "24\\s*-?v(?:olts?)?"
          ])
        ),
        "\\d\\s*k?wh\\b"
      ])
    },
    {
      id: "payload",
      re: compile([
        words([
          "payload",
          "mam",
          "gvw",
          "mtplm",
          "miros?",
          "mass\\s+in\\s+service",
          "mass\\s+in\\s+running\\s+order",
          "weighbridge",
          "weigh(?:ed|ing)?",
          "axles?",
          "front\\s+axles?",
          "rear\\s+axles?",
          "axle\\s+weights?",
          "payload\\s+left",
          "remaining\\s+payload",
          "overweights?",
          "overload(?:ed|s)?",
          "vin\\s+plates?",
          "plated\\s+(?:mam|weights?)",
          "weight\\s+plates?"
        ])
      ])
    },
    {
      id: "water",
      // water defaults.js: shower, wash-up, laundry, drink/cook, fresh tank litres
      re: compile([
        words([
          "waters?",
          "showers?",
          "fresh\\s+waters?",
          "grey\\s+waters?",
          "gray\\s+waters?",
          "waste\\s+waters?",
          "grey\\s+waste",
          "water\\s+fills?",
          "fill\\s+(?:up\\s+)?(?:the\\s+)?waters?",
          "wash-?ups?",
          "laundr(?:y|ies)",
          "drink\\s+waters?",
          "shower\\s+litres?",
          "litres?\\s+(?:per\\s+)?showers?",
          "fresh\\s+water\\s+how\\s+much",
          "how\\s+much\\s+fresh\\s+water"
        ])
      ])
    },
    {
      id: "payload",
      re: compile([words(["weights?"])])
    }
  ];

  function normalise(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^a-z0-9+./\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function routeAsk(text) {
    var query = normalise(text);
    if (!query) return null;
    for (var i = 0; i < RULES.length; i += 1) {
      if (RULES[i].re.test(query)) {
        return LINKS[RULES[i].id];
      }
    }
    return null;
  }

  return {
    LINKS: LINKS,
    POWER_STARTER_ASKS: POWER_STARTER_ASKS,
    POWER_INVERTER_ASKS: POWER_INVERTER_ASKS,
    POWER_COOLBOX_ASKS: POWER_COOLBOX_ASKS,
    POWER_UK_ASKS: POWER_UK_ASKS,
    POWER_APPLIANCE_TOKENS: POWER_APPLIANCE_TOKENS,
    PAYLOAD_WEIGHT_ASKS: PAYLOAD_WEIGHT_ASKS,
    GAS_HUB_ASKS: GAS_HUB_ASKS,
    SEARCH_PHRASE_ASKS: SEARCH_PHRASE_ASKS,
    routeAsk: routeAsk,
    normalise: normalise
  };
});
