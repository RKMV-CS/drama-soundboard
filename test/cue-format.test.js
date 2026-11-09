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

test("describeStep carries name and note, trimmed; missing means empty", async () => {
  const { describeStep } = await load();
  const d = describeStep({ type: "play_fx", target: "a.mp3", name: "  Thunder  ", note: "on the line 'storm'" });
  assert.equal(d.name, "Thunder");
  assert.equal(d.note, "on the line 'storm'");
  const bare = describeStep({ type: "stop_all" });
  assert.equal(bare.name, "");
  assert.equal(bare.note, "");
});

test("nextBandModel: a named cue shows its name, with the action as detail and its note", async () => {
  const { nextBandModel } = await load();
  const steps = [
    { type: "play_bgm", target: "a.mp3" },
    { type: "play_fx", target: "thunder.mp3", name: "Thunder crack", note: "after 'the storm breaks'" },
    { type: "play_fx", target: "rain.mp3", name: "Rain" },
  ];
  const m = nextBandModel(steps, 0);
  assert.equal(m.what, "Thunder crack");
  assert.equal(m.detail, "Play FX thunder.mp3");
  assert.equal(m.note, "after 'the storm breaks'");
  assert.equal(m.then, "Then 3: Rain");
  const plain = nextBandModel(steps, -1);
  assert.equal(plain.what, "Play BGM a.mp3");
  assert.equal(plain.detail, "");
});

test("moveStep: returns a new list, clamps, ignores bad index", async () => {
  const { moveStep } = await load();
  const a = [{ type: "a" }, { type: "b" }, { type: "c" }];
  assert.deepEqual(moveStep(a, 0, 2).map((s) => s.type), ["b", "c", "a"]);
  assert.deepEqual(moveStep(a, 2, 0).map((s) => s.type), ["c", "a", "b"]);
  assert.deepEqual(moveStep(a, 1, 99).map((s) => s.type), ["a", "c", "b"]);
  assert.deepEqual(moveStep(a, 9, 0).map((s) => s.type), ["a", "b", "c"]);
  assert.deepEqual(a.map((s) => s.type), ["a", "b", "c"], "input untouched");
});

test("duplicateStep: inserts an independent copy right after", async () => {
  const { duplicateStep } = await load();
  const a = [{ type: "a", name: "x" }, { type: "b" }];
  const b = duplicateStep(a, 0);
  assert.deepEqual(b.map((s) => s.type), ["a", "a", "b"]);
  b[1].name = "changed";
  assert.equal(b[0].name, "x");
  assert.equal(a.length, 2);
  assert.deepEqual(duplicateStep(a, 5), a);
});

test("indexAfterMove and indexAfterInsert keep the current-cue pointer on the same cue", async () => {
  const { indexAfterMove, indexAfterInsert } = await load();
  assert.equal(indexAfterMove(2, 2, 0), 0, "moving the current cue carries the pointer");
  assert.equal(indexAfterMove(2, 0, 3), 1, "a cue moved from before to after the pointer shifts it down");
  assert.equal(indexAfterMove(2, 4, 1), 3, "a cue moved from after to before shifts it up");
  assert.equal(indexAfterMove(2, 0, 1), 2, "moves on one side do nothing");
  assert.equal(indexAfterMove(-1, 0, 2), -1, "before the first cue stays put");
  assert.equal(indexAfterInsert(2, 3), 2);
  assert.equal(indexAfterInsert(2, 1), 3);
  assert.equal(indexAfterInsert(-1, 0), -1, "inserting at the top before the first cue leaves the pointer before it");
});
