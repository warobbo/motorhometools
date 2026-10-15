"use strict";

/**
 * Every user-facing URL this Node server serves.
 * Feature files in ../features/ are the maintained map. If you add or
 * remove a page, update this list and the feature map in the same change.
 * Payload and Tyres are not here: they live on motorhomepayload.co.uk.
 */
const PAGES = [
  { path: "/", expect: "Stop guessing your van", feature: "home" },
  { path: "/about/", expect: "About Motorhome Tools", feature: "about-legal" },
  { path: "/ask/", expect: "Not sure? Ask in plain English", feature: "ask" },
  { path: "/power/", expect: "Daily power consumption calculator", feature: "power-daily" },
  { path: "/power/battery.html", expect: "Battery size calculator", feature: "power-battery" },
  { path: "/power/solar.html", expect: "Solar panel size calculator", feature: "power-solar" },
  { path: "/power/inverter.html", expect: "Inverter size calculator", feature: "power-inverter" },
  { path: "/power/wire.html", expect: "fuse size calculator", feature: "power-wire" },
  { path: "/water/", expect: "Fresh water usage calculator", feature: "water" },
  { path: "/water/gas.html", expect: "Gas / LPG usage calculator", feature: "gas" },
  { path: "/water/tanks.html", expect: "Holding tank fill / empty planner", feature: "tanks" },
  { path: "/water/cassette.html", expect: "Cassette / toilet empty planner", feature: "cassette" },
  { path: "/water/hotwater.html", expect: "Coming soon", feature: "coming-soon" },
  { path: "/water/bottles.html", expect: "Coming soon", feature: "coming-soon" },
  { path: "/water/winterising.html", expect: "Coming soon", feature: "coming-soon" },
  { path: "/water/topup.html", expect: "Coming soon", feature: "coming-soon" },
  { path: "/guides/", expect: "Motorhome guides", feature: "guides" },
  { path: "/guides/weighbridge-how-to.html", expect: "How to weigh a motorhome at a UK weighbridge", feature: "guides" },
  { path: "/guides/axle-weights-explained.html", expect: "Motorhome axle weights", feature: "guides" },
  { path: "/guides/where-you-put-it.html", expect: "where you put it", feature: "guides" },
  { path: "/guides/mam-mass-in-service-payload.html", expect: "Mass in Service", feature: "guides" },
  { path: "/guides/daily-power-budget.html", expect: "daily power budget", feature: "guides" },
  { path: "/guides/battery-size-plain-english.html", expect: "Leisure battery size in plain English", feature: "guides" },
  { path: "/guides/solar-reality-check.html", expect: "solar panel sizing", feature: "guides" },
  { path: "/guides/fresh-waste-tanks.html", expect: "Fresh and waste tanks", feature: "guides" },
  { path: "/guides/gas-lpg-basics.html", expect: "gas / LPG", feature: "guides" },
  { path: "/guides/cassette-toilet-empty.html", expect: "cassette toilet", feature: "guides" },
  { path: "/privacy.html", expect: "<h1>Privacy</h1>", feature: "about-legal" },
  { path: "/cookies.html", expect: "<h1>Cookies</h1>", feature: "about-legal" },
  { path: "/disclaimer.html", expect: "<h1>Disclaimer</h1>", feature: "about-legal" },
  { path: "/terms.html", expect: "<h1>Terms of use</h1>", feature: "about-legal" },
  { path: "/contact.html", expect: "<h1>Contact</h1>", feature: "about-legal" },
  { path: "/accessibility.html", expect: "<h1>Accessibility</h1>", feature: "about-legal" }
];

const REDIRECTS = [
  { path: "/power", location: "/power/" },
  { path: "/water", location: "/water/" },
  { path: "/power/index.html", location: "/power/" },
  { path: "/water/index.html", location: "/water/" }
];

module.exports = { PAGES, REDIRECTS };
