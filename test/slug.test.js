const test = require("node:test");
const assert = require("node:assert/strict");
const { slugify, uniqueSlug } = require("../utils/slug");

test("slugify lowercases and dashes", () => {
  assert.equal(slugify("  Class 10 Drama! "), "class-10-drama");
});

test("slugify falls back to 'project' for empty or symbol-only names", () => {
  assert.equal(slugify("!!!"), "project");
  assert.equal(slugify(""), "project");
});

test("slugify caps length at 64", () => {
  assert.equal(slugify("a".repeat(100)).length, 64);
});

test("uniqueSlug appends the first free counter", async () => {
  const taken = new Set(["show", "show-1"]);
  assert.equal(await uniqueSlug("show", async (s) => taken.has(s)), "show-2");
  assert.equal(await uniqueSlug("free", async (s) => taken.has(s)), "free");
});
