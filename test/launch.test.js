const test = require("node:test");
const assert = require("node:assert/strict");
const { pickPort, findBrowser, buildArgs } = require("../bin/launch.js");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_X86 = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

test("findBrowser on win32 prefers Chrome over Edge", () => {
  assert.equal(findBrowser("win32", {}, () => true), CHROME);
});

test("findBrowser on win32 falls back to Edge", () => {
  assert.equal(findBrowser("win32", {}, (p) => p === EDGE_X86), EDGE_X86);
});

test("findBrowser returns null when nothing exists", () => {
  assert.equal(findBrowser("win32", {}, () => false), null);
  assert.equal(findBrowser("linux", { PATH: "/usr/bin" }, () => false), null);
});

test("findBrowser on darwin finds the app bundle", () => {
  const edge = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
  assert.equal(findBrowser("darwin", {}, (p) => p === edge), edge);
});

test("findBrowser on linux resolves names through PATH", () => {
  const env = { PATH: "/opt/bin:/usr/bin" };
  assert.equal(findBrowser("linux", env, (p) => p === "/usr/bin/chromium"), "/usr/bin/chromium");
});

test("buildArgs sets app URL, dedicated profile and window size", () => {
  const args = buildArgs("http://127.0.0.1:3000/", "/tmp/prof");
  assert.ok(args.includes("--app=http://127.0.0.1:3000/"));
  assert.ok(args.includes("--user-data-dir=/tmp/prof"));
  assert.ok(args.includes("--window-size=1280,800"));
});

test("pickPort skips busy ports", async () => {
  const busy = new Set([3000, 3001]);
  assert.equal(await pickPort(3000, async (p) => !busy.has(p)), 3002);
});

test("pickPort throws after probing 20 ports", async () => {
  let probes = 0;
  await assert.rejects(
    pickPort(3000, async () => {
      probes++;
      return false;
    }),
    /no free port/
  );
  assert.equal(probes, 20);
});
