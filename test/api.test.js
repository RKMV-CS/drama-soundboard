const test = require("node:test");
const assert = require("node:assert/strict");
const AdmZip = require("adm-zip");
require("./helpers").useTempDataDir();
const { app, init } = require("../server");

let server;
let base;

test.before(async () => {
  await init();
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const json = (method, path, body) =>
  fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const audioForm = (name, type) => {
  const f = new FormData();
  f.append("file", new Blob([Buffer.from("RIFFxxxxWAVE")]), name);
  if (type) f.append("type", type);
  return f;
};

async function newProject(name = "Show") {
  const res = await json("POST", "/projects", { name });
  assert.equal(res.status, 201);
  return (await res.json()).project;
}

test("health", async () => {
  assert.deepEqual(await (await fetch(base + "/health")).json(), { ok: true });
});

test("create validates name, trims, and lists", async () => {
  assert.equal((await json("POST", "/projects", {})).status, 400);
  assert.equal((await json("POST", "/projects", { name: "   " })).status, 400);
  const p = await newProject("  My Show  ");
  assert.equal(p.name, "My Show");
  const list = await (await fetch(base + "/projects")).json();
  assert.ok(list.projects.some((x) => x.id === p.id));
});

test("duplicate names get unique slugs", async () => {
  const a = await newProject("Same");
  const b = await newProject("Same");
  assert.notEqual(a.slug, b.slug);
});

test("unknown project is 404 on every route", async () => {
  for (const [m, p] of [
    ["GET", "/projects/nope"],
    ["POST", "/projects/nope/open"],
    ["GET", "/projects/nope/audios"],
    ["GET", "/projects/nope/audios/a.mp3"],
    ["DELETE", "/projects/nope/audios/a.mp3"],
    ["GET", "/projects/nope/download"],
  ]) {
    assert.equal((await json(m, p)).status, 404, `${m} ${p}`);
  }
});

test("audio upload: stored, categorized, listed, served, deleted", async () => {
  const p = await newProject("Audio");
  const up = await fetch(`${base}/projects/${p.id}/audios/upload`, {
    method: "POST",
    body: audioForm("door slam.wav", "effects"),
  });
  assert.equal(up.status, 201);
  const { filename } = await up.json();
  assert.equal(filename, "door_slam.wav");

  await fetch(`${base}/projects/${p.id}/audios/upload`, {
    method: "POST",
    body: audioForm("theme.mp3", "bgm"),
  });

  const opened = await (await json("POST", `/projects/${p.id}/open`)).json();
  assert.deepEqual(opened.audios.sort(), ["door_slam.wav", "theme.mp3"]);
  assert.equal(opened.project.categories["theme.mp3"], "bgm");
  assert.equal(opened.project.categories["door_slam.wav"], "effects");

  const served = await fetch(`${base}/projects/${p.id}/audios/${filename}`);
  assert.equal(served.status, 200);

  assert.equal((await json("DELETE", `/projects/${p.id}/audios/${filename}`)).status, 200);
  assert.equal((await fetch(`${base}/projects/${p.id}/audios/${filename}`)).status, 404);
});

test("audio upload rejects non-audio files", async () => {
  const p = await newProject("Reject");
  const res = await fetch(`${base}/projects/${p.id}/audios/upload`, {
    method: "POST",
    body: audioForm("evil.exe", "effects"),
  });
  assert.equal(res.status, 400);
});

test("audio routes cannot traverse out of the project", async () => {
  const p = await newProject("Trav");
  const res = await fetch(`${base}/projects/${p.id}/audios/..%2F..%2Fdb.json`);
  assert.ok([400, 404].includes(res.status));
  const del = await json("DELETE", `/projects/${p.id}/audios/..%2F..%2Fdb.json`);
  assert.ok([400, 404].includes(del.status));
});

test("zip upload extracts, then download serves the archive", async () => {
  const p = await newProject("Zip");
  const z = new AdmZip();
  z.addFile("beep.wav", Buffer.from("RIFFxxxxWAVE"));
  const f = new FormData();
  f.append("archive", new Blob([z.toBuffer()]), "pack.zip");
  const up = await fetch(`${base}/projects/${p.id}/upload`, { method: "POST", body: f });
  assert.equal(up.status, 200);
  assert.deepEqual((await up.json()).audioFiles, ["beep.wav"]);
  assert.equal((await fetch(`${base}/projects/${p.id}/download`)).status, 200);
});

test("zip upload rejects non-zip", async () => {
  const p = await newProject("NotZip");
  const f = new FormData();
  f.append("archive", new Blob(["hi"]), "pack.txt");
  const up = await fetch(`${base}/projects/${p.id}/upload`, { method: "POST", body: f });
  assert.equal(up.status, 400);
});

test("static server exposes only public/", async () => {
  for (const p of ["/db.json", "/server.js", "/package.json", "/utils/db.js", "/test/api.test.js"]) {
    assert.equal((await fetch(base + p)).status, 404, p);
  }
  assert.equal((await fetch(base + "/index.html")).status, 200);
  assert.equal((await fetch(base + "/soundboard.html")).status, 200);
});
