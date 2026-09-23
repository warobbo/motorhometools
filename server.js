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
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
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

// Calculators and Ask do not use camera, microphone, location, payment,
// USB or motion sensors. An empty allowlist disables the feature for every
// origin, including this one. Forms, fetch and ordinary browsing stay allowed.
const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "ambient-light-sensor=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()"
].join(", ");

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Permissions-Policy": PERMISSIONS_POLICY
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
  "data/",
  "dist/"
];

// CSS, JS, images, icons, fonts and SVG are fingerprinted with a ?v= query
// in the HTML (ASSET_VERSION). Browsers cache the full URL, including that
// query, so a year-long immutable cache is safe: bump ?v= when the file
// changes. The query is stripped before the file is read. HTML stays
// no-cache with an ETag so a page is revalidated instead of kept for a year.
const LONG_CACHE_EXTENSIONS = new Set([
  ".css",
  ".js",
  ".mjs",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
  ".avif",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot"
]);

const LONG_CACHE = "public, max-age=31536000, immutable";
const HTML_CACHE = "no-cache";
const SHORT_CACHE = "public, max-age=300";

function cacheControlFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (LONG_CACHE_EXTENSIONS.has(ext)) return LONG_CACHE;
  if (ext === ".txt" || ext === ".xml" || ext === ".json") return SHORT_CACHE;
  return HTML_CACHE;
}

function etagFor(stat) {
  return "W/\"" + stat.size.toString(16) + "-" + Math.floor(stat.mtimeMs).toString(16) + "\"";
}

function isNotModified(req, etag) {
  const header = req.headers["if-none-match"];
  if (!header) return false;
  if (header.trim() === "*") return true;
  return header.split(",").some(function (part) {
    return part.trim() === etag;
  });
}

function preferMinifiedJs(filePath) {
  if (path.extname(filePath).toLowerCase() !== ".js") return filePath;
  const relative = path.relative(ROOT, filePath);
  if (!relative || relative.startsWith("..")) return filePath;
  const built = path.join(ROOT, "dist", relative);
  try {
    if (fs.statSync(built).isFile()) return built;
  } catch (err) {
    /* dist/ is written by npm run build and by production startup */
  }
  return filePath;
}

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
  return preferMinifiedJs(filePath);
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

  fs.stat(filePath, function (statErr, stat) {
    if (statErr || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const etag = etagFor(stat);
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": cacheControlFor(filePath),
      "ETag": etag
    };

    if (isNotModified(req, etag)) {
      res.writeHead(304, headers);
      res.end();
      return;
    }

    fs.readFile(filePath, function (err, data) {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      res.writeHead(200, headers);
      res.end(req.method === "HEAD" ? undefined : data);
    });
  });
});

if (require.main === module) {
  if (process.env.NODE_ENV === "production") {
    require("./scripts/minify-client-js").build();
  }
  server.listen(PORT, "0.0.0.0", function () {
    console.log("Motorhome Tools ready");
    console.log("  Local:  http://localhost:" + PORT + "/");
    console.log("  Power:  http://localhost:" + PORT + "/power/");
    console.log("  Water:  http://localhost:" + PORT + "/water/");
    console.log("  Ask:    http://localhost:" + PORT + "/ask/");
    console.log("  About:  http://localhost:" + PORT + "/about/");
    console.log("  Ask API: POST /api/ask");
    console.log("  Notify: " + (process.env.ASK_NOTIFY_EMAIL ? "mailto fallback set" : "logs only"));
  });
}

module.exports = server;
module.exports.resolvePublicFile = resolvePublicFile;
module.exports.SECURITY_HEADERS = SECURITY_HEADERS;
module.exports.cacheControlFor = cacheControlFor;
module.exports.LONG_CACHE = LONG_CACHE;
module.exports.HTML_CACHE = HTML_CACHE;
