const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

// public/js is native ESM and DOM-free here, so Node can import it directly.
const load = () => import(pathToFileURL(path.join(__dirname, "..", "public", "js", "cue-format.js")).href);

test("describeStep: FX with loop, delay and auto-next", async () => {
  const { describeStep } = await load();
  const d = describeStep({ type: "play_fx", target: "thunder.mp3", loop: true, delay: 500, autoNext: true, duration: 1000 });
  assert.equal(d.label, "Play FX");
  assert.equal(d.kind, "fx");
  assert.equal(d.target, "thunder.mp3");
  assert.deepEqual(d.meta, ["loop", "delay 500 ms", "auto-next"]);
});

test("describeStep: fades and waits show their duration", async () => {
  const { describeStep } = await load();
  assert.deepEqual(describeStep({ type: "fade_in_bgm", target: "a.mp3", duration: 2000 }).meta, ["2000 ms"]);
  const wait = describeStep({ type: "wait", duration: 1500 });
  assert.equal(wait.kind, "none");
  assert.deepEqual(wait.meta, ["1500 ms"]);
});

test("describeStep: stop_fx with no target means all FX; unknown types are safe", async () => {
  const { describeStep } = await load();
  assert.equal(describeStep({ type: "stop_fx", target: "" }).target, "all FX");
  const u = describeStep({ type: "nope" });
  assert.equal(u.label, "Unknown action");
  assert.equal(u.kind, "none");
});

test("nextBandModel: empty list", async () => {
  const { nextBandModel } = await load();
  const m = nextBandModel([], -1);
  assert.equal(m.state, "empty");
  assert.equal(m.what, "No cues yet");
});

test("nextBandModel: next cue and the cue after it", async () => {
  const { nextBandModel } = await load();
  const steps = [
    { type: "play_bgm", target: "a.mp3" },
    { type: "play_fx", target: "thunder.mp3" },
    { type: "stop_all" },
  ];
  const m = nextBandModel(steps, 0);
  assert.equal(m.state, "cue");
  assert.equal(m.num, "2");
  assert.equal(m.what, "Play FX thunder.mp3");
  assert.equal(m.then, "Then 3: Stop all");
});

test("nextBandModel: last cue, then end of list", async () => {
  const { nextBandModel } = await load();
  const steps = [{ type: "play_fx", target: "a.mp3" }, { type: "stop_all" }];
  assert.equal(nextBandModel(steps, 0).then, "Last cue");
  const end = nextBandModel(steps, 1);
  assert.equal(end.state, "end");
  assert.equal(end.then, "Press Next to start over.");
});

test("nextIndex and DEFAULT_STEP", async () => {
  const { nextIndex, DEFAULT_STEP } = await load();
  assert.equal(nextIndex(-1, 5), 0);
  assert.equal(nextIndex(3, 5), 4);
  assert.equal(DEFAULT_STEP.type, "play_fx");
  assert.equal(DEFAULT_STEP.autoNext, false);
});
