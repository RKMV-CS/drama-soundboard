// Builds one self-contained executable: node.exe + the bundled server + public/ embedded as assets.
// Usage: npm run build:sea   ->   dist/drama-soundboard-<version>-<platform>[.exe]
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const esbuild = require("esbuild");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PUBLIC = path.join(ROOT, "public");
const FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

// "public/css/app.css" -> absolute path, with forward slashes in the key on every OS.
function assetMap() {
  const assets = {};
  for (const file of walk(PUBLIC)) assets["public/" + path.relative(PUBLIC, file).split(path.sep).join("/")] = file;
  return assets;
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT });
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} failed (exit ${r.status})`);
}

async function main() {
  const { version } = require("../package.json");
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const bundle = path.join(DIST, "bundle.cjs");
  await esbuild.build({
    entryPoints: [path.join(ROOT, "bin", "sea-entry.js")],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    outfile: bundle,
    logLevel: "warning",
  });

  const blob = path.join(DIST, "sea-prep.blob");
  const config = path.join(DIST, "sea-config.json");
  fs.writeFileSync(
    config,
    JSON.stringify({ main: bundle, output: blob, disableExperimentalSEAWarning: true, assets: assetMap() }, null, 2),
  );
  run(process.execPath, ["--experimental-sea-config", config]);

  const win = process.platform === "win32";
  const exe = path.join(DIST, `drama-soundboard-${version}-${process.platform}${win ? ".exe" : ""}`);
  fs.copyFileSync(process.execPath, exe);
  const postject = path.join(ROOT, "node_modules", "postject", "dist", "cli.js");
  const args = [postject, exe, "NODE_SEA_BLOB", blob, "--sentinel-fuse", FUSE];
  if (process.platform === "darwin") args.push("--macho-segment-name", "NODE_SEA");
  run(process.execPath, args);

  const mb = (fs.statSync(exe).size / 1048576).toFixed(0);
  console.log(`built ${path.relative(ROOT, exe)} (${mb} MB, ${Object.keys(assetMap()).length} embedded files)`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { assetMap };
