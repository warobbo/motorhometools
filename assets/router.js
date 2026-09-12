"use strict";

/**
 * Keyword router for the Motorhome Tools front door.
 * Points at an existing hub. Never invents pressures, weights or legal advice.
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

  // More specific phrases first. Word boundaries so “camping” does not match amp.
  // Tyres keeps pressure / psi / bar. Heater is leisure-electrical, not tyre pressure.
  // Named Power tools (battery, solar, inverter, wire) beat generic appliance words.
  var RULES = [
    { id: "tyres", re: /\b(tyres?|tires?|pressure|psi)\b|\bbar\b/i },
    { id: "cassette", re: /\b(cassettes?|toilets?|loos?|chemical\s+toilets?|porta[\s-]?pott(?:y|ies)|portapott(?:y|ies))\b/i },
    { id: "tanks", re: /\btanks?\b/i },
    { id: "gas", re: /\b(gas|lpg|butane|propane)\b/i },
    { id: "wire", re: /\b(wiring|wires?|fuses?|mm2)\b|\b(?:electrical|power|dc|battery|leisure|inverter|solar|hook-?up)\s+cables?\b|\bcables?\s+(?:size|gauge|mm|amp|run|length|rating)\b|\b(?:12|24)\s*-?v\s+cables?\b/i },
    { id: "battery", re: /\b(batter(?:y|ies)|lifepo4|agms?)\b/i },
    { id: "solar", re: /\bsolar\b/i },
    { id: "inverter", re: /\binverters?\b/i },
    { id: "power", re: /\b(power|amps?|amp-?hours?|amp\s+draws?|alternators?|microwaves?|fridges?|freezers?|kettles?|toasters?|hair[\s-]?dryers?|heaters?|lights|lighting|leds?|usbs?|laptops?|tvs?|televisions?|induction|hobs?|coffee\s+(?:machines?|makers?)|blowers?|fans?|watt-?hours?|watts?|k?wh|12\s*-?v(?:olts?)?|24\s*-?v(?:olts?)?)\b|\d\s*k?wh\b/i },
    { id: "payload", re: /\b(payload|mam|gvw|mtplm|weighbridge|weigh(?:ed|ing)?)\b/i },
    { id: "water", re: /\bwaters?\b/i },
    { id: "payload", re: /\bweights?\b/i }
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
    routeAsk: routeAsk,
    normalise: normalise
  };
});
