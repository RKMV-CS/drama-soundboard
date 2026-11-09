const path = require("path");
const express = require("express");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};

function seaModule() {
  try {
    const sea = require("node:sea");
    return sea.isSea() ? sea : null;
  } catch {
    return null; // node:sea is missing before Node 20.12
  }
}

// Serves public/. From disk in development; from assets embedded in the executable when packaged
// (a compiled build's __dirname points at the build machine, so the folder cannot be read at runtime).
function staticAssets(publicDir, sea = seaModule()) {
  if (!sea) return express.static(publicDir);
  return (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    let rel;
    try {
      rel = path.posix.normalize("/" + decodeURIComponent(req.path)).slice(1);
    } catch {
      return next();
    }
    if (rel === "" || rel.endsWith("/")) rel += "index.html";
    let body;
    try {
      body = Buffer.from(sea.getAsset(`public/${rel}`));
    } catch {
      return next(); // not embedded
    }
    res.set("Content-Type", TYPES[path.extname(rel).toLowerCase()] || "application/octet-stream");
    res.set("Cache-Control", "no-cache");
    res.send(body);
  };
}

module.exports = { staticAssets };
