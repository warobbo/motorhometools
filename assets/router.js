"use strict";

/**
 * Keyword router for the Motorhome Tools front door.
 * Points at an existing hub. Never invents pressures, weights or legal advice.
 *
 * Topic synonyms are seeded from the live hub default lists — not a guessed
 * short list. When a hub adds a starter appliance, Font updates the matching
 * list here in the same change. Seen twice in Ask logs → add a synonym.
 *
 * Sources (12 Sep 2026):
 * - Power STARTER: motorhomepower.co.uk/assets/defaults.js
 * - Power inverter loads: same file inverterStarterSet()
 * - Gas: mhwater assets/gas-defaults.js + gas-calc.js (cooking, heating,
 *   boiler, Calor bottles, fridgeGas)
 * - Water / tanks / cassette: mhwater defaults.js, tank-defaults.js,
 *   cassette-defaults.js
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

  function words(list) {
    return "\\b(?:" + list.join("|") + ")\\b";
  }

  function compile(parts) {
    return new RegExp(parts.join("|"), "i");
  }

  // More specific phrases first. Word boundaries so “camping” does not match amp.
  // Tyres keeps pressure / psi / bar. Heater (Power starter) is not tyre pressure.
  // Bare fridge/freezer → Power. Gas/absorption/3-way fridge → Gas.
  // Induction/hob stay Power — do not steal electrical cooking to Gas.
  var RULES = [
    {
      id: "tyres",
      re: compile([
        words(["tyres?", "tires?", "pressure", "psi"]),
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
          "black\\s+tanks?"
        ])
      ])
    },
    {
      id: "gas",
      // fridgeGas only when the query names a gas / absorption / 3-way fridge
      re: compile([
        words([
          "gas\\s+(?:fridges?|freezers?|hobs?|cookers?|ovens?|heaters?)",
          "absorption\\s+(?:fridges?|freezers?)",
          "(?:3|three)[\\s-]?way\\s+(?:fridges?|freezers?)"
        ])
      ])
    },
    {
      id: "power",
      // Electrical phrases that must beat Gas (induction) or Water (pump / heater)
      re: compile([
        words([
          "induction(?:\\s+hobs?)?",
          "water\\s+pumps?",
          "water\\s+heaters?",
          "diesel\\s+heaters?",
          "inverter\\s+idles?",
          "phantom(?:\\s+loads?)?",
          "electric\\s+(?:bbqs?|barbecues?|barbeques?)",
          "compressor\\s+fridges?"
        ])
      ])
    },
    {
      id: "gas",
      // gas-defaults.js / gas-calc.js: cooking, heating, boiler, Calor, LPG, bottles
      // BBQ → Gas. Do not list induction/hob here.
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
          "cooking",
          "heating",
          "boilers?",
          "bottles?",
          "cylinders?",
          "gaslow",
          "alugas"
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
      re: compile([words(["batter(?:y|ies)", "lifepo4", "agms?"])])
    },
    {
      id: "solar",
      re: compile([words(["solar"])])
    },
    {
      id: "inverter",
      re: compile([words(["inverters?"])])
    },
    {
      id: "power",
      // Daily Power default: STARTER name tokens + inverter-load extras + units
      re: compile([
        words([
          "power",
          "amps?",
          "amp-?hours?",
          "amp\\s+draws?",
          "alternators?",
          "fridges?",
          "freezers?",
          "lights",
          "lighting",
          "leds?",
          "pumps?",
          "heaters?",
          "phones?",
          "tablets?",
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
          "microwaves?",
          "toasters?",
          "hair[\\s-]?dryers?",
          "usbs?",
          "coffee(?:\\s+(?:machines?|makers?))?",
          "air[\\s-]?fryers?",
          "wonder\\s+ovens?",
          "blowers?",
          "watt-?hours?",
          "watts?",
          "k?wh",
          "12\\s*-?v(?:olts?)?",
          "24\\s*-?v(?:olts?)?"
        ]),
        "\\d\\s*k?wh\\b"
      ])
    },
    {
      id: "payload",
      re: compile([
        words(["payload", "mam", "gvw", "mtplm", "weighbridge", "weigh(?:ed|ing)?", "axle\\s+weights?"])
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
          "wash-?ups?",
          "laundr(?:y|ies)",
          "drink\\s+waters?"
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
    routeAsk: routeAsk,
    normalise: normalise
  };
});
