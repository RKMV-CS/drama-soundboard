const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

// The browser modules only need localStorage, document and fetch: stub them.
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.document = { getElementById: () => null };

const load = (f) => import(pathToFileURL(path.join(__dirname, "..", "public", "js", f)).href);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });

async function setup(handler) {
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || "GET", body: opts.body ? JSON.parse(opts.body) : null });
    return handler(url, opts);
  };
  const store = await load("store.js");
  const sync = await load("steps-sync.js");
  store.state.projectId = "p1";
  return { calls, store, sync };
}

test("pull: the server copy replaces the local cues and is not pushed back", async () => {
  const { calls, store, sync } = await setup(async () => reply(200, { steps: [{ type: "stop_all" }] }));
  store.state.steps = [{ type: "play_fx" }];
  sync.initStepsSync();
  let rendered = 0;
  await sync.pullSteps(() => rendered++);
  assert.deepEqual(store.state.steps, [{ type: "stop_all" }]);
  assert.equal(rendered, 1);
  await wait(700);
  assert.deepEqual(calls.map((c) => c.method), ["GET"], "no PUT echo");
});

test("pull: empty server copy uploads the cues this browser already has (one-time migration)", async () => {
  const { calls, store, sync } = await setup(async () => reply(200, { steps: [] }));
  store.state.steps = [{ type: "play_fx", target: "a.wav" }];
  await sync.pullSteps(() => assert.fail("nothing to render"));
  const put = calls.find((c) => c.method === "PUT");
  assert.deepEqual(put.body, { steps: [{ type: "play_fx", target: "a.wav" }] });
});

test("pull: server failure keeps the local cues and does not throw", async () => {
  const { store, sync } = await setup(async () => reply(500, { error: "down" }));
  store.state.steps = [{ type: "play_fx" }];
  await sync.pullSteps(() => assert.fail("must not render"));
  assert.deepEqual(store.state.steps, [{ type: "play_fx" }]);
});

test("edits are pushed once, after a short delay, and only after the first pull", async () => {
  const { calls, store, sync } = await setup(async () => reply(200, { steps: [{ type: "stop_all" }] }));
  await sync.pullSteps(() => {});
  calls.length = 0;
  store.state.steps = [{ type: "stop_all" }, { type: "fade_out_bgm" }];
  store.saveSteps();
  store.saveSteps(); // a burst collapses into one request
  assert.equal(calls.length, 0, "debounced");
  await wait(700);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body.steps.length, 2);
});
