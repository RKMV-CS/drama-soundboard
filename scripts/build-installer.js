// Wraps dist/drama-soundboard-<version>-win32.exe in a per-user NSIS installer.
// Usage: node scripts/build-installer.js   (run `npm run build:sea` first)
// Output: dist/Drama-Soundboard-Setup-<version>.exe
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const NSI = path.join(__dirname, "installer.nsi");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (process.platform !== "win32") fail("The installer is Windows-only (NSIS). Run this on Windows.");

const { version } = require(path.join(ROOT, "package.json"));
const sourceExe = path.join(DIST, `drama-soundboard-${version}-win32.exe`);
if (!fs.existsSync(sourceExe)) fail(`${sourceExe} not found. Run npm run build:sea first.`);

const probe = spawnSync("makensis", ["-VERSION"], { encoding: "utf8" });
if (probe.error) fail("makensis not found on PATH. Install NSIS 3.x and add it to PATH.");

const outFile = path.join(DIST, `Drama-Soundboard-Setup-${version}.exe`);
const run = spawnSync(
  "makensis",
  [`/DVERSION=${version}`, `/DSOURCE_EXE=${sourceExe}`, `/DOUTFILE=${outFile}`, NSI],
  { stdio: "inherit" },
);
if (run.error) fail(`Failed to run makensis: ${run.error.message}`);
if (run.status !== 0) fail(`makensis failed with exit code ${run.status}.`);

const mb = fs.statSync(outFile).size / (1024 * 1024);
console.log(`Installer: ${outFile} (${mb.toFixed(1)} MB)`);
