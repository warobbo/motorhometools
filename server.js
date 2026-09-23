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

// Served by this Node process (Render origin). Cloudflare proxies the response
// and does not add these itself. HSTS has no `preload` — the host is not on
// the preload list. Framing is CSP frame-ancestors 'self', plus the classic
// X-Frame-Options: SAMEORIGIN so older scanners (Screaming Frog) still see it.
// Scripts, images and fonts are same-origin files (system font stack, no
// Google Fonts, no inline scripts). Ask posts to /api/ask on this host.
// Calculator breakdown bars set width with a style attribute, so attributes
// allow unsafe-inline. Stylesheets stay same-origin only.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "upgrade-insecure-requests"
].join("; ");

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": CONTENT_SECURITY_POLICY
};

function applySecurityHeaders(res) {
  Object.keys(SECURITY_HEADERS).forEach(function (name) {
    res.setHeader(name, SECURITY_HEADERS[name]);
  });
}

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

const DIRECTORY_REDIRECTS = {
  "/power": "/power/",
  "/water": "/water/",
  "/power/index.html": "/power/",
  "/water/index.html": "/water/"
};

const server = http.createServer(function (req, res) {
  applySecurityHeaders(res);

  const rawUrl = req.url || "/";
  const queryIndex = rawUrl.indexOf("?");
  const urlPath = decodeURIComponent(queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex));
  const query = queryIndex === -1 ? "" : rawUrl.slice(queryIndex);

  if (DIRECTORY_REDIRECTS[urlPath] && (req.method === "GET" || req.method === "HEAD")) {
    res.writeHead(301, {
      Location: DIRECTORY_REDIRECTS[urlPath] + query,
      "Cache-Control": "public, max-age=300"
    });
    res.end();
    return;
  }

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
    console.log("  Power:  http://localhost:" + PORT + "/power/");
    console.log("  Water:  http://localhost:" + PORT + "/water/");
    console.log("  Ask:    http://localhost:" + PORT + "/ask/");
    console.log("  Ask API: POST /api/ask");
    console.log("  Notify: " + (process.env.ASK_NOTIFY_EMAIL ? "mailto fallback set" : "logs only"));
  });
}

module.exports = server;
module.exports.resolvePublicFile = resolvePublicFile;
module.exports.SECURITY_HEADERS = SECURITY_HEADERS;
