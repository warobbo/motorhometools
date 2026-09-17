#!/usr/bin/env node
/**
 * Tiny static server for the Motorhome Tools front door, plus /api/ask
 * (unmatched capture and Payload-first co-pilot).
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const handleAsk = require("./api/ask");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;

try {
  const envFile = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  envFile.split("\n").forEach(function (line) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  });
} catch (err) {
  /* no .env file — Ask still logs to stdout */
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

const HIDDEN_PREFIXES = [
  "node_modules/",
  "lib/",
  "api/",
  "tests/",
  "scripts/",
  "data/"
];

const HIDDEN_FILES = new Set([
  "server.js",
  "package.json",
  "package-lock.json",
  "render.yaml",
  ".gitignore",
  ".env.example",
  ".node-version",
  "README.md",
  "COPILOT-ASK.md"
]);

function isHidden(relativePath) {
  if (HIDDEN_FILES.has(relativePath)) return true;
  return HIDDEN_PREFIXES.some(function (prefix) {
    return relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix);
  });
}

function resolvePublicFile(urlPath) {
  const requested = path.normalize(
    (urlPath === "/" ? "index.html" : urlPath).replace(/^\/+/, "")
  );
  if (requested === ".." || requested.startsWith(".." + path.sep)) return null;

  let filePath = path.join(ROOT, requested);
  if (!filePath.startsWith(ROOT)) return null;
  if (isHidden(requested)) return null;

  const baseName = path.basename(filePath);
  if (baseName.startsWith(".") && baseName !== ".") return null;

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch (err) {
    return filePath;
  }

  const relative = path.relative(ROOT, filePath);
  if (isHidden(relative)) return null;
  return filePath;
}

const server = http.createServer(function (req, res) {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

  if (urlPath === "/api/ask") {
    Promise.resolve(handleAsk(req, res)).catch(function (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        ok: false,
        error: "server",
        message: "Could not save that note."
      }));
      console.error("ask handler failed", err);
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
    return;
  }

  const filePath = resolvePublicFile(urlPath);
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream"
    };
    if (ext === ".txt" || ext === ".xml") {
      headers["Cache-Control"] = "public, max-age=300";
    } else if (ext === ".png" || ext === ".svg") {
      headers["Cache-Control"] = "public, max-age=86400";
    } else {
      headers["Cache-Control"] = "no-cache";
    }
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : data);
  });
});

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", function () {
    console.log("Motorhome Tools ready");
    console.log("  Local:  http://localhost:" + PORT + "/");
    console.log("  Ask:    http://localhost:" + PORT + "/ask/");
    console.log("  Ask API: POST /api/ask");
    console.log("  Notify: " + (process.env.ASK_NOTIFY_EMAIL ? "mailto fallback set" : "logs only"));
  });
}

module.exports = server;
module.exports.resolvePublicFile = resolvePublicFile;
