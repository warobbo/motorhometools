#!/usr/bin/env node
"use strict";

/**
 * Read-only check: is this Motorhome Tools instance worth driving?
 *
 *   node .cursor/skills/verify-motorhometools/scripts/doctor.js \
 *     --base http://127.0.0.1:4173 \
 *     --pid-file /tmp/motorhometools-verify-run/$RUN_ID/server.pid \
 *     --log /tmp/motorhometools-verify-run/$RUN_ID/server.log \
 *     --pages
 *
 * --pages also GETs every user-facing route. It does not click calculators.
 * Never prints environment variables or .env contents.
 */

const fs = require("fs");
const { PAGES, REDIRECTS } = require("./routes");

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
}

function hasFlag(name) {
  return process.argv.indexOf(name) !== -1;
}

function fail(message) {
  console.error("doctor fail: " + message);
  process.exitCode = 1;
}

async function request(base, path, redirect) {
  const response = await fetch(base.replace(/\/$/, "") + path, { redirect: redirect || "manual" });
  const text = await response.text();
  return { response: response, text: text };
}

async function main() {
  const base = arg("--base", "http://127.0.0.1:4173");
  const pidFile = arg("--pid-file", "");
  const logPath = arg("--log", "");
  const pages = hasFlag("--pages");
  let ok = true;

  function bad(message) {
    ok = false;
    fail(message);
  }

  if (pidFile) {
    let pid = "";
    try {
      pid = fs.readFileSync(pidFile, "utf8").trim();
    } catch (err) {
      bad("cannot read pid file " + pidFile);
    }
    if (pid) {
      const cmdlinePath = "/proc/" + pid + "/cmdline";
      try {
        const cmdline = fs.readFileSync(cmdlinePath, "utf8").replace(/\0/g, " ");
        if (!/server\.js/.test(cmdline)) {
          bad("pid " + pid + " is not server.js (" + cmdline.trim() + ")");
        } else {
          console.log("doctor pid " + pid + " is server.js");
        }
      } catch (err) {
        bad("pid " + pid + " is not running");
      }
    }
  }

  if (logPath) {
    try {
      const log = fs.readFileSync(logPath, "utf8");
      if (!log.includes("Motorhome Tools ready")) {
        bad("server log has no 'Motorhome Tools ready' line");
      } else {
        console.log("doctor log contains Motorhome Tools ready");
      }
    } catch (err) {
      bad("cannot read server log " + logPath);
    }
  }

  let home;
  try {
    home = await request(base, "/", "follow");
  } catch (err) {
    bad("cannot reach " + base + "/ (" + err.message + ")");
    console.error("doctor: instance is not worth driving");
    process.exit(1);
  }

  if (home.response.status !== 200) bad("GET / returned " + home.response.status);
  if (!home.text.includes("Stop guessing your van")) bad("GET / is missing the home heading");
  if (home.response.headers.get("x-content-type-options") !== "nosniff") {
    bad("GET / is missing X-Content-Type-Options: nosniff");
  }
  if (home.response.status === 200 && home.text.includes("Stop guessing your van")) {
    console.log("doctor home 200 " + base + "/");
  }

  let ask;
  try {
    ask = await request(base, "/api/ask", "follow");
  } catch (err) {
    bad("cannot reach /api/ask (" + err.message + ")");
    ask = null;
  }
  if (ask) {
    let body = null;
    try {
      body = JSON.parse(ask.text);
    } catch (err) {
      bad("/api/ask did not return JSON");
    }
    if (ask.response.status !== 200 || !body || body.ok !== true || body.capture !== true) {
      bad("GET /api/ask expected {ok:true, capture:true}, got " + ask.response.status + " " + ask.text.slice(0, 180));
    } else {
      console.log("doctor GET /api/ask ok capture=true mailto=" + (body.mailto ? "set" : "unset"));
    }
  }

  const hiddenPaths = [
    "/.cursor/skills/verify-motorhometools/SKILL.md",
    "/.gitignore",
    "/.git/config"
  ];
  for (const hiddenPath of hiddenPaths) {
    try {
      const result = await request(base, hiddenPath, "manual");
      if (result.response.status !== 404) {
        bad(hiddenPath + " expected 404, got " + result.response.status);
      } else if (!result.text.includes("<h1>Page not found</h1>")) {
        bad(hiddenPath + " 404 is not the branded page");
      } else if ((result.response.headers.get("content-type") || "") !== "text/html; charset=utf-8") {
        bad(hiddenPath + " 404 is not HTML");
      } else {
        console.log("doctor hidden 404 " + hiddenPath);
      }
    } catch (err) {
      bad(hiddenPath + " " + err.message);
    }
  }

  try {
    const missing = await request(base, "/no-such-page", "manual");
    const type = missing.response.headers.get("content-type") || "";
    if (missing.response.status !== 404 || !missing.text.includes("<h1>Page not found</h1>") || type !== "text/html; charset=utf-8") {
      bad("/no-such-page expected 404 HTML containing the Page not found heading, got " + missing.response.status);
    } else {
      console.log("doctor missing 404 /no-such-page");
    }
  } catch (err) {
    bad("/no-such-page " + err.message);
  }

  if (pages) {
    for (const page of PAGES) {
      if (page.path === "/") continue;
      try {
        const result = await request(base, page.path, "follow");
        if (result.response.status !== 200 || !result.text.includes(page.expect)) {
          bad(page.path + " expected 200 containing " + JSON.stringify(page.expect) + ", got " + result.response.status);
        } else {
          console.log("doctor page 200 " + page.path);
        }
      } catch (err) {
        bad(page.path + " " + err.message);
      }
    }
    for (const redirect of REDIRECTS) {
      try {
        const result = await request(base, redirect.path, "manual");
        const location = result.response.headers.get("location") || "";
        if (result.response.status !== 301 || !location.startsWith(redirect.location)) {
          bad(redirect.path + " expected 301 " + redirect.location + ", got " + result.response.status + " " + location);
        } else {
          console.log("doctor redirect 301 " + redirect.path + " -> " + location);
        }
      } catch (err) {
        bad(redirect.path + " " + err.message);
      }
    }
  }

  if (!ok) {
    console.error("doctor: instance is not worth driving");
    process.exit(1);
  }
  console.log("doctor ok " + base);
}

main().catch(function (err) {
  console.error("doctor fail: " + err.message);
  process.exit(1);
});
