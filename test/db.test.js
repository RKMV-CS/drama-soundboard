const test = require("node:test");
const assert = require("node:assert/strict");
require("./helpers").useTempDataDir();
const db = require("../utils/db");

test("fresh data dir reads as empty instead of throwing", async () => {
  assert.deepEqual(await db.listProjects(), []);
});

test("addProject / findProjectById / touchProject", async () => {
  await db.addProject({ id: "1", name: "A", path: "./projects/a", createdAt: "t", updatedAt: "t" });
  assert.equal((await db.findProjectById("1")).name, "A");
  assert.equal(await db.findProjectById("missing"), null);

  const touched = await db.touchProject("1");
  assert.notEqual(touched.updatedAt, "t");
  assert.equal(await db.touchProject("missing"), null);
});

test("concurrent writes do not lose projects", async () => {
  await Promise.all(
    Array.from({ length: 20 }, (_, i) => db.addProject({ id: `c${i}`, name: `c${i}` }))
  );
  const ids = (await db.listProjects()).map((p) => p.id);
  for (let i = 0; i < 20; i++) assert.ok(ids.includes(`c${i}`), `lost c${i}`);
});
