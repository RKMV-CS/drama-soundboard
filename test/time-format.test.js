const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const load = () => import(pathToFileURL(path.join(__dirname, "..", "public", "js", "time-format.js")).href);

test("formatClock formats minutes and seconds", async () => {
  const { formatClock } = await load();
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(65), "1:05");
  assert.equal(formatClock(72.9), "1:12");
  assert.equal(formatClock(3600), "60:00");
});

test("formatClock is safe for bad input", async () => {
  const { formatClock } = await load();
  for (const bad of [NaN, Infinity, -5, undefined, null]) {
    assert.equal(formatClock(bad), "0:00");
  }
});
