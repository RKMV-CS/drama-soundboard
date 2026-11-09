const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { resolveDataDir, userDataDir } = require("../utils/config");

test("userDataDir: per-platform locations", () => {
  assert.equal(userDataDir({ platform: "win32", env: { APPDATA: "C:\U\AppData\Roaming" }, home: "C:\U" }), path.join("C:\U\AppData\Roaming", "Drama Soundboard"));
  assert.equal(userDataDir({ platform: "win32", env: {}, home: "/h" }), path.join("/h", "AppData", "Roaming", "Drama Soundboard"));
  assert.equal(userDataDir({ platform: "darwin", env: {}, home: "/h" }), path.join("/h", "Library", "Application Support", "Drama Soundboard"));
  assert.equal(userDataDir({ platform: "linux", env: {}, home: "/h" }), path.join("/h", ".local", "share", "drama-soundboard"));
  assert.equal(userDataDir({ platform: "linux", env: { XDG_DATA_HOME: "/x" }, home: "/h" }), path.join("/x", "drama-soundboard"));
});

test("resolveDataDir: env override beats packaged, packaged beats repo root", () => {
  assert.equal(resolveDataDir({ env: { DRAMA_DATA_DIR: "/tmp/d" }, packaged: true }), path.resolve("/tmp/d"));
  assert.equal(resolveDataDir({ env: {}, packaged: true, platform: "linux", home: "/h" }), path.join("/h", ".local", "share", "drama-soundboard"));
  assert.equal(resolveDataDir({ env: {}, packaged: false }), path.join(__dirname, ".."));
});
