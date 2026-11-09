const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const AdmZip = require("adm-zip");
const zip = require("../utils/zip");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "drama-zip-"));

test("isAudioFile accepts known extensions case-insensitively", () => {
  assert.ok(zip.isAudioFile("a.MP3"));
  assert.ok(zip.isAudioFile("b.flac"));
  assert.ok(!zip.isAudioFile("c.txt"));
  assert.ok(!zip.isAudioFile("noext"));
});

test("extractArchive keeps only top-level audio, flattens paths, skips dotfiles", async () => {
  const dir = tmp();
  const archive = path.join(dir, "a.zip");
  const z = new AdmZip();
  z.addFile("beep.wav", Buffer.from("x"));
  z.addFile("sub/dir/bgm.mp3", Buffer.from("y"));
  z.addFile("notes.txt", Buffer.from("z"));
  z.addFile(".hidden.mp3", Buffer.from("h"));
  z.writeZip(archive);

  const out = path.join(dir, "audios");
  const files = await zip.extractArchive(archive, out);
  assert.deepEqual(files, ["bgm.mp3", "beep.wav"].sort((a, b) => a.localeCompare(b)));
});

test("extractArchive cannot write outside the target (zip-slip)", async () => {
  const dir = tmp();
  const archive = path.join(dir, "evil.zip");
  const z = new AdmZip();
  z.addFile("../../escaped.mp3", Buffer.from("x"));
  z.writeZip(archive);

  const out = path.join(dir, "a", "b", "audios");
  await zip.extractArchive(archive, out);
  assert.ok(!fs.existsSync(path.join(dir, "escaped.mp3")));
  assert.ok(fs.existsSync(path.join(out, "escaped.mp3")));
});

test("extractArchive clears previous contents", async () => {
  const dir = tmp();
  const out = path.join(dir, "audios");
  fs.mkdirSync(out);
  fs.writeFileSync(path.join(out, "old.mp3"), "old");
  const archive = path.join(dir, "n.zip");
  const z = new AdmZip();
  z.addFile("new.mp3", Buffer.from("n"));
  z.writeZip(archive);
  assert.deepEqual(await zip.extractArchive(archive, out), ["new.mp3"]);
});

test("listAudioFiles returns [] for a missing dir", async () => {
  assert.deepEqual(await zip.listAudioFiles(path.join(tmp(), "nope")), []);
});
