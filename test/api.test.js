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
  assert.deepEqual(await (await fetch(base + "/health")).json(), { ok: true, version: require("../package.json").version });
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

const fs = require("node:fs");
const path = require("node:path");

test("rename updates the index and project.json and keeps the slug", async () => {
  const p = await newProject("Rename Me");
  const res = await json("PATCH", `/projects/${p.id}`, { name: "  New Name  ", description: " d " });
  assert.equal(res.status, 200);
  const { project } = await res.json();
  assert.equal(project.name, "New Name");
  assert.equal(project.slug, p.slug);
  const list = await (await fetch(base + "/projects")).json();
  assert.equal(list.projects.find((x) => x.id === p.id).name, "New Name");
  const got = await (await fetch(`${base}/projects/${p.id}`)).json();
  assert.equal(got.project.name, "New Name");
  assert.equal(got.project.description, "d");
});

test("rename rejects empty and 81-char names; unknown project is 404", async () => {
  const p = await newProject("Strict");
  assert.equal((await json("PATCH", `/projects/${p.id}`, { name: "   " })).status, 400);
  assert.equal((await json("PATCH", `/projects/${p.id}`, { name: "x".repeat(81) })).status, 400);
  assert.equal((await json("PATCH", `/projects/nope`, { name: "Ok" })).status, 404);
});

test("delete removes folder and index entry; later calls are 404", async () => {
  const p = await newProject("Doomed");
  const dir = path.join(process.env.DRAMA_DATA_DIR, "projects", p.slug);
  assert.ok(fs.existsSync(dir));
  const res = await json("DELETE", `/projects/${p.id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.ok(!fs.existsSync(dir));
  const list = await (await fetch(base + "/projects")).json();
  assert.ok(!list.projects.some((x) => x.id === p.id));
  assert.equal((await fetch(`${base}/projects/${p.id}`)).status, 404);
  assert.equal((await json("DELETE", `/projects/${p.id}`)).status, 404);
});

test("delete with a traversal id is rejected and removes nothing outside the data dir", async () => {
  const dataDir = process.env.DRAMA_DATA_DIR;
  const sentinel = path.join(dataDir, "sentinel.txt");
  fs.writeFileSync(sentinel, "keep");
  const res = await json("DELETE", `/projects/${encodeURIComponent("../..")}`);
  assert.ok([400, 404].includes(res.status));
  assert.ok(fs.existsSync(sentinel));
  assert.ok(fs.existsSync(path.join(dataDir, "db.json")));
  fs.rmSync(sentinel);
});

test("steps: default empty, round-trip, and validation", async () => {
  const p = await newProject("Steps");
  const url = `${base}/projects/${p.id}/steps`;
  assert.deepEqual(await (await fetch(url)).json(), { steps: [] });
  const steps = [{ type: "fade", at: 1 }, { type: "duck" }];
  assert.equal((await json("PUT", `/projects/${p.id}/steps`, { steps })).status, 200);
  assert.deepEqual((await (await fetch(url)).json()).steps, steps);
  assert.equal((await json("PUT", `/projects/${p.id}/steps`, { steps: "nope" })).status, 400);
  assert.equal((await json("PUT", `/projects/${p.id}/steps`, { steps: [{ at: 1 }] })).status, 400);
  assert.equal((await json("PUT", `/projects/${p.id}/steps`, { steps: [{ type: "x".repeat(41) }] })).status, 400);
  assert.deepEqual((await (await fetch(url)).json()).steps, steps, "rejected PUT must not overwrite");
  assert.equal((await fetch(`${base}/projects/nope/steps`)).status, 404);
  assert.equal((await json("PUT", `/projects/nope/steps`, { steps: [] })).status, 404);
});

// ---------- export / import ----------

const zipForm = (buffer, name = "show.zip") => {
  const f = new FormData();
  f.append("file", new Blob([buffer]), name);
  return f;
};

const exportZip = async (id) => {
  const res = await fetch(`${base}/projects/${id}/export`);
  assert.equal(res.status, 200);
  return { res, zip: new AdmZip(Buffer.from(await res.arrayBuffer())) };
};

test("export: unknown project is 404", async () => {
  const res = await fetch(`${base}/projects/nope/export`);
  assert.equal(res.status, 404);
});

test("export then import: the copy has the audio, categories and cues", async () => {
  const p = await newProject("Round Trip");
  assert.equal((await fetch(`${base}/projects/${p.id}/audios/upload`, { method: "POST", body: audioForm("door.wav", "effects") })).status, 201);
  assert.equal((await fetch(`${base}/projects/${p.id}/audios/upload`, { method: "POST", body: audioForm("theme.wav", "music") })).status, 201);
  const steps = [{ type: "play_fx", target: "door.wav", name: "Door" }, { type: "stop_all" }];
  assert.equal((await json("PUT", `/projects/${p.id}/steps`, { steps })).status, 200);

  const { res, zip } = await exportZip(p.id);
  assert.equal(res.headers.get("content-type"), "application/zip");
  assert.match(res.headers.get("content-disposition"), /^attachment; filename="[^"]+\.dramashow\.zip"$/);
  const names = zip.getEntries().map((e) => e.entryName).sort();
  assert.deepEqual(names, ["audios/door.wav", "audios/theme.wav", "manifest.json", "project.json", "steps.json"]);

  const imported = await fetch(`${base}/projects/import`, { method: "POST", body: zipForm(zip.toBuffer()) });
  assert.equal(imported.status, 201);
  const copy = (await imported.json()).project;
  assert.notEqual(copy.id, p.id);
  assert.equal(copy.name, "Round Trip");

  const list = await (await fetch(`${base}/projects/${copy.id}/audios`)).json();
  const files = list.audios.map((a) => a.filename);
  assert.deepEqual(files.sort(), ["door.wav", "theme.wav"]);
  const copySteps = await (await fetch(`${base}/projects/${copy.id}/steps`)).json();
  assert.deepEqual(copySteps.steps, steps);
});

test("import: rejects garbage, a wrong-format zip, and a missing file; creates no project", async () => {
  const before = (await (await fetch(`${base}/projects`)).json()).projects.length;

  const notZip = await fetch(`${base}/projects/import`, { method: "POST", body: zipForm(Buffer.from("not a zip")) });
  assert.equal(notZip.status, 400);

  const wrong = new AdmZip();
  wrong.addFile("manifest.json", Buffer.from(JSON.stringify({ format: "something-else", version: 1 })));
  const wrongRes = await fetch(`${base}/projects/import`, { method: "POST", body: zipForm(wrong.toBuffer()) });
  assert.equal(wrongRes.status, 400);

  const empty = await fetch(`${base}/projects/import`, { method: "POST", body: new FormData() });
  assert.equal(empty.status, 400);

  const after = (await (await fetch(`${base}/projects`)).json()).projects.length;
  assert.equal(after, before);
});

test("import: path traversal names, non-audio files and bad steps are dropped", async () => {
  const z = new AdmZip();
  z.addFile("manifest.json", Buffer.from(JSON.stringify({ format: "drama-soundboard-project", version: 1, name: "  Hostile  " })));
  z.addFile("audios/../../evil.wav", Buffer.from("RIFFxxxxWAVE"));
  z.addFile("audios/notes.txt", Buffer.from("x"));
  z.addFile("audios/ok.wav", Buffer.from("RIFFxxxxWAVE"));
  z.addFile("project.json", Buffer.from(JSON.stringify({ categories: { "ok.wav": "music", "ghost.wav": "effects" } })));
  z.addFile("steps.json", Buffer.from(JSON.stringify([{ nope: 1 }])));

  const res = await fetch(`${base}/projects/import`, { method: "POST", body: zipForm(z.toBuffer()) });
  assert.equal(res.status, 201);
  const copy = (await res.json()).project;
  assert.equal(copy.name, "Hostile");

  const { zip } = await exportZip(copy.id);
  const audios = zip.getEntries().map((e) => e.entryName).filter((n) => n.startsWith("audios/"));
  assert.ok(audios.includes("audios/ok.wav"));
  assert.ok(!audios.includes("audios/notes.txt"), "non-audio dropped");
  assert.ok(audios.every((n) => n.split("/").length === 2), "no nested or traversal paths");
  const meta = JSON.parse(zip.getEntry("project.json").getData().toString("utf8"));
  assert.deepEqual(meta.categories, { "ok.wav": "music" });
  assert.equal(zip.getEntry("steps.json"), null, "invalid steps are not imported");
});
