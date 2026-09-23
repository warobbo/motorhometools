#!/usr/bin/env node
/**
 * Minify browser scripts into dist/ without bundling.
 * Source files stay readable for tests. The server prefers dist/ when present.
 * Source maps stay off.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist");
const CLIENT_DIRS = ["assets", path.join("power", "assets"), path.join("water", "assets")];

function clientScripts() {
  const files = [];
  CLIENT_DIRS.forEach(function (rel) {
    const dir = path.join(ROOT, rel);
    fs.readdirSync(dir).forEach(function (name) {
      if (name.endsWith(".js")) files.push(path.join(dir, name));
    });
  });
  return files;
}

function build() {
  const files = clientScripts();
  let srcBytes = 0;
  let outBytes = 0;
  files.forEach(function (file) {
    const source = fs.readFileSync(file, "utf8");
    srcBytes += Buffer.byteLength(source);
    const result = esbuild.transformSync(source, {
      minify: true,
      legalComments: "none",
      sourcemap: false,
      target: "es2018",
      charset: "utf8"
    });
    const dest = path.join(OUT, path.relative(ROOT, file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, result.code);
    outBytes += Buffer.byteLength(result.code);
  });
  return { files: files.length, srcBytes: srcBytes, outBytes: outBytes };
}

if (require.main === module) {
  const stats = build();
  console.log(
    "Minified " + stats.files + " client scripts: " +
    stats.srcBytes + " → " + stats.outBytes + " bytes (" +
    path.relative(ROOT, OUT) + "/)"
  );
}

module.exports = { build: build };
