const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { staticAssets } = require("../utils/assets");

// A fake node:sea that holds assets in memory, like a packaged build does.
const files = {
  "public/index.html": "<h1>home</h1>",
  "public/css/app.css": "body{}",
  "public/js/a b.js": "export {}",
};
const fakeSea = {
  getAsset(key) {
    if (!(key in files)) throw new Error("no asset " + key);
    const buf = Buffer.from(files[key]);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  },
};

async function withServer(fn) {
  const app = express();
  app.use(staticAssets("/does/not/exist", fakeSea));
  app.use((_req, res) => res.status(404).send("fallthrough"));
  const server = app.listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

test("embedded assets: root serves index.html, types are right, spaces decode", async () => {
  await withServer(async (base) => {
    const home = await fetch(base + "/");
    assert.equal(await home.text(), "<h1>home</h1>");
    assert.match(home.headers.get("content-type"), /^text\/html/);
    const css = await fetch(base + "/css/app.css");
    assert.match(css.headers.get("content-type"), /^text\/css/);
    assert.equal(await (await fetch(base + "/js/a%20b.js")).text(), "export {}");
  });
});

test("embedded assets: unknown path and traversal fall through, non-GET is ignored", async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(base + "/nope.css")).status, 404);
    assert.equal(await (await fetch(base + "/nope.css")).text(), "fallthrough");
    const evil = await fetch(base + "/..%2f..%2fserver.js");
    assert.equal(await evil.text(), "fallthrough");
    const post = await fetch(base + "/index.html", { method: "POST" });
    assert.equal(await post.text(), "fallthrough");
    assert.equal((await fetch(base + "/%E0%A4%A")).status, 404, "malformed escape does not crash");
  });
});

test("without sea the middleware is plain express.static", async () => {
  const mw = staticAssets(__dirname, null);
  assert.equal(typeof mw, "function");
});
