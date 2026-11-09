const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const PUBLIC = path.join(__dirname, "..", "public");
const read = (rel) => fs.readFileSync(path.join(PUBLIC, rel), "utf8");
const manifest = () => JSON.parse(read("manifest.webmanifest"));

test("manifest parses and has the required keys", () => {
  const m = manifest();
  for (const key of ["name", "short_name", "start_url", "scope", "display", "background_color", "theme_color", "icons"]) {
    assert.ok(key in m, `missing ${key}`);
  }
  assert.ok(m.icons.length > 0);
});

test("non-PNG manifest icons exist under public/", () => {
  for (const icon of manifest().icons) {
    if (icon.src.endsWith(".png")) continue; // PNG icons are added separately
    assert.ok(fs.existsSync(path.join(PUBLIC, icon.src.replace(/^\//, ""))), `missing ${icon.src}`);
  }
});

test("sw.js precache list names only files that exist", () => {
  const match = read("sw.js").match(/const SHELL = \[([\s\S]*?)\];/);
  assert.ok(match, "SHELL array literal not found");
  const paths = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(paths.length > 0);
  for (const p of paths) {
    const rel = p === "/" ? "index.html" : p.slice(1);
    assert.ok(fs.existsSync(path.join(PUBLIC, rel)), `precache entry missing on disk: ${p}`);
  }
});

test("both pages link the manifest and register the PWA script", () => {
  for (const page of ["index.html", "soundboard.html"]) {
    const html = read(page);
    assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/, page);
    assert.match(html, /<script type="module" src="js\/pwa\.js"><\/script>/, page);
  }
});

test("every css, js, font and img file is precached, so no feature breaks offline", () => {
  const match = read("sw.js").match(/const SHELL = \[([\s\S]*?)\];/);
  const cached = new Set([...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  for (const dir of ["css", "js", "fonts", "img"]) {
    for (const file of fs.readdirSync(path.join(PUBLIC, dir))) {
      if (file.endsWith(".txt") || file === "package.json") continue; // documentation and Node module metadata
      assert.ok(cached.has(`/${dir}/${file}`), `not precached: /${dir}/${file}`);
    }
  }
});

test("service worker leaves project exports alone", () => {
  assert.ok(read("sw.js").includes('pathname.endsWith("/export")) return;'));
});
