const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");
const { FakeAudioContext, FakeAudioElement } = require("./fake-audio");

const load = () => import(pathToFileURL(path.join(__dirname, "..", "public", "js", "engine.js")).href);
const tick = () => new Promise((resolve) => setImmediate(resolve));

// Gains are created in a fixed order: fxMaster, bgmMaster, duckGain.
const FX_MASTER = 0;
const DUCK = 2;

async function setup(ctxOptions) {
  const { createEngine } = await load();
  const ctx = new FakeAudioContext(ctxOptions);
  const timers = [];
  const fetched = [];
  const audios = [];
  const engine = createEngine({
    ctx,
    fetchArrayBuffer: async (src) => {
      fetched.push(src);
      if (src.includes("missing")) throw new Error("HTTP 404");
      return new ArrayBuffer(2000);
    },
    makeAudio: (src) => {
      const a = new FakeAudioElement(src);
      audios.push(a);
      return a;
    },
    schedule: (fn, ms) => timers.push({ fn, ms }),
  });
  const flush = () => timers.splice(0).forEach((t) => t.fn());
  return { engine, ctx, timers, fetched, audios, flush };
}

// ---------- FX ----------

test("fx: decodes once, plays on a fresh source, reports the natural end once", async () => {
  const { engine, ctx, fetched } = await setup();
  let ended = 0;
  engine.startFx("a.mp3", { onEnd: () => ended++ });
  await tick();
  assert.equal(ctx.sources.length, 1);
  assert.equal(ctx.sources[0].started, true);
  assert.equal(engine.isFxActive("a.mp3"), true);

  ctx.sources[0].fireEnded();
  assert.equal(ended, 1);
  assert.equal(engine.isFxActive("a.mp3"), false);

  engine.startFx("a.mp3");
  await tick();
  assert.equal(ctx.sources.length, 2);
  assert.equal(fetched.length, 1, "second play reuses the decoded buffer");
});

test("fx: loop flag reaches the source, and the same source cannot double-start", async () => {
  const { engine, ctx } = await setup();
  engine.startFx("a.mp3", { loop: true });
  engine.startFx("a.mp3", { loop: true });
  await tick();
  assert.equal(ctx.sources.length, 1);
  assert.equal(ctx.sources[0].loop, true);
});

test("fx: stop declicks, ends once, and releases the duck", async () => {
  const { engine, ctx } = await setup();
  let ended = 0;
  engine.startFx("a.mp3", { onEnd: () => ended++ });
  await tick();
  const src = ctx.sources[0];
  engine.stopFx("a.mp3");
  assert.equal(ended, 1);
  assert.ok(src.stopped && src.stoppedAt > 0 && src.stoppedAt <= 0.05, "stop is scheduled, not instant");
  src.fireEnded();
  assert.equal(ended, 1, "late onended does not report twice");
  assert.equal(engine.isFxActive("a.mp3"), false);
});

test("fx: stop before the buffer is ready never starts a source", async () => {
  const { engine, ctx } = await setup();
  let ended = 0;
  engine.startFx("a.mp3", { onEnd: () => ended++ });
  engine.stopFx("a.mp3");
  await tick();
  assert.equal(ctx.sources.length, 0);
  assert.equal(ended, 1);
});

test("fx: load failure reports the error, then a later press retries", async () => {
  const { engine, fetched } = await setup();
  let error = null;
  engine.startFx("missing.mp3", { onEnd: (e) => (error = e) });
  await tick();
  assert.match(error.message, /404/);
  engine.startFx("missing.mp3");
  await tick();
  assert.equal(fetched.length, 2, "failed load is not cached");
});

test("fx: any voice ducks the BGM bus down and its end brings it back", async () => {
  const { engine, ctx } = await setup();
  const duck = ctx.gains[DUCK].gain;
  engine.startFx("a.mp3");
  engine.startFx("b.mp3");
  await tick();
  ctx.advance(1);
  assert.ok(Math.abs(duck.now() - 0.8) < 1e-9);

  engine.stopFx("a.mp3");
  ctx.advance(1);
  assert.ok(Math.abs(duck.now() - 0.8) < 1e-9, "still ducked while b plays");

  engine.stopFx("b.mp3");
  ctx.advance(1);
  assert.ok(Math.abs(duck.now() - 1) < 1e-9);
});

test("fx: stopAllFx stops every voice", async () => {
  const { engine, ctx } = await setup();
  engine.startFx("a.mp3");
  engine.startFx("b.mp3");
  await tick();
  engine.stopAllFx();
  assert.equal(engine.isFxActive("a.mp3"), false);
  assert.equal(engine.isFxActive("b.mp3"), false);
  assert.ok(ctx.sources.every((s) => s.stopped));
});

test("fx: starting resumes a suspended context", async () => {
  const { engine, ctx } = await setup({ state: "suspended" });
  engine.startFx("a.mp3");
  assert.equal(ctx.state, "running");
});

// ---------- levels ----------

test("level: set before the track exists is applied when it starts, and ramps after", async () => {
  const { engine, ctx } = await setup();
  engine.setTrackLevel("fx", "a.mp3", 0.4);
  engine.startFx("a.mp3");
  await tick();
  // fxMaster(0) bgmMaster(1) duck(2), voice declick(3), then this track's level node(4)
  const level = ctx.gains[4].gain;
  assert.equal(level.value, 0.4);

  engine.setTrackLevel("fx", "a.mp3", 0.9);
  ctx.advance(1);
  assert.ok(Math.abs(level.now() - 0.9) < 1e-9);
  assert.equal(engine.getTrackLevel("fx", "a.mp3"), 0.9);
  assert.equal(engine.getTrackLevel("fx", "other.mp3"), 1);
});

test("level: values are clamped to 0..1", async () => {
  const { engine } = await setup();
  engine.setTrackLevel("fx", "a.mp3", 7);
  assert.equal(engine.getTrackLevel("fx", "a.mp3"), 1);
  engine.setTrackLevel("fx", "a.mp3", -2);
  assert.equal(engine.getTrackLevel("fx", "a.mp3"), 0);
});

test("level: master FX level ramps the FX bus", async () => {
  const { engine, ctx } = await setup();
  engine.setFxLevel(0.25);
  ctx.advance(1);
  assert.ok(Math.abs(ctx.gains[FX_MASTER].gain.now() - 0.25) < 1e-9);
});

// ---------- BGM ----------

test("bgm: plays through a media element source and forwards progress only while current", async () => {
  const { engine, audios } = await setup();
  const seen = [];
  engine.playBgm("m.mp3", { onProgress: (t, d) => seen.push([t, d]) });
  const audio = audios[0];
  assert.equal(audio.paused, false);
  assert.equal(audio.loop, true);
  audio.currentTime = 12;
  audio.duration = 90;
  audio.dispatch("timeupdate");
  assert.deepEqual(seen, [[12, 90]]);

  engine.playBgm("n.mp3");
  audio.dispatch("timeupdate");
  assert.equal(seen.length, 1, "replaced track no longer reports");
});

test("bgm: a non-looping track that ends is freed and reported once", async () => {
  const { engine, audios } = await setup();
  let ended = 0;
  engine.playBgm("m.mp3", { loop: false, onEnd: () => ended++ });
  audios[0].fireEnded();
  assert.equal(ended, 1);
  assert.equal(engine.bgmInfo(), null);
});

test("bgm: a looping track ignores ended", async () => {
  const { engine, audios } = await setup();
  let ended = 0;
  engine.playBgm("m.mp3", { loop: true, onEnd: () => ended++ });
  audios[0].dispatch("ended");
  assert.equal(ended, 0);
  assert.equal(engine.bgmInfo().source, "m.mp3");
});

test("bgm: pause and resume track the paused flag", async () => {
  const { engine, audios } = await setup();
  engine.playBgm("m.mp3");
  engine.pauseBgm();
  assert.equal(audios[0].paused, true);
  assert.deepEqual(engine.bgmInfo(), { source: "m.mp3", paused: true });
  engine.resumeBgm();
  await tick();
  assert.equal(audios[0].paused, false);
  assert.equal(engine.bgmInfo().paused, false);
});

test("bgm: refused play stays selected, marked paused, and reports the error", async () => {
  const { engine, audios } = await setup();
  const original = FakeAudioElement.prototype.play;
  FakeAudioElement.prototype.play = function () {
    return Promise.reject(new Error("NotAllowedError"));
  };
  try {
    let error = null;
    engine.playBgm("m.mp3", { onError: (e) => (error = e) });
    await tick();
    assert.equal(error.message, "NotAllowedError");
    assert.deepEqual(engine.bgmInfo(), { source: "m.mp3", paused: true });
  } finally {
    FakeAudioElement.prototype.play = original;
  }
  assert.equal(audios.length, 1);
});

test("bgm: a different source crossfades, old track reported ended at once and freed after the fade", async () => {
  const { engine, ctx, audios, flush, timers } = await setup();
  let oldEnded = 0;
  engine.playBgm("a.mp3", { onEnd: () => oldEnded++ });
  engine.playBgm("b.mp3", { fadeMs: 2000 });
  assert.equal(oldEnded, 1);
  assert.equal(engine.bgmInfo().source, "b.mp3");

  // after fxMaster(0) bgmMaster(1) duck(2): a fade(3) a level(4), b fade(5) b level(6)
  const aFade = ctx.gains[3];
  const bFade = ctx.gains[5];
  assert.equal(bFade.gain.valueAt(0), 0, "new track starts silent");
  ctx.advance(1);
  assert.ok(Math.abs(bFade.gain.now() - 0.5) < 1e-9, "new track halfway up at 1s");
  assert.ok(Math.abs(aFade.gain.now() - 0.5) < 1e-9, "old track halfway down at 1s");

  assert.equal(audios[0].paused, false, "old keeps playing during the fade");
  assert.equal(timers[0].ms, 2000);
  flush();
  assert.equal(audios[0].paused, true, "old freed after the fade");
});

test("bgm: fadeOut ramps to silence, then frees the track and reports the end", async () => {
  const { engine, ctx, audios, flush } = await setup();
  let ended = 0;
  engine.playBgm("a.mp3", { onEnd: () => ended++ });
  const fade = ctx.gains[3]; // first BGM fade gain
  engine.fadeOutBgm(1000);
  ctx.advance(1);
  assert.ok(Math.abs(fade.gain.now()) < 1e-9);
  assert.equal(ended, 0);
  flush();
  assert.equal(ended, 1);
  assert.equal(audios[0].paused, true);
  assert.equal(engine.bgmInfo(), null);
});

test("bgm: fadeOut then a stale timer cannot kill a newer track", async () => {
  const { engine, audios, flush } = await setup();
  engine.playBgm("a.mp3");
  engine.fadeOutBgm(1000);
  engine.playBgm("b.mp3");
  flush();
  assert.equal(engine.bgmInfo().source, "b.mp3");
  assert.equal(audios[1].paused, false);
});

test("bgm: fadeIn on the loaded source raises it again and resumes if paused", async () => {
  const { engine, ctx, audios } = await setup();
  engine.playBgm("a.mp3");
  const fade = ctx.gains[3]; // first BGM fade gain
  engine.fadeOutBgm(1000);
  ctx.advance(1);
  engine.pauseBgm();
  engine.fadeInBgm("a.mp3", 1000);
  await tick();
  assert.equal(audios.length, 1, "no second element for the same source");
  assert.equal(audios[0].paused, false);
  ctx.advance(1);
  assert.ok(Math.abs(fade.gain.now() - 1) < 1e-9);
});

test("bgm: fadeIn with a new source starts it silent and ramps up", async () => {
  const { engine, ctx } = await setup();
  engine.fadeInBgm("a.mp3", 1000);
  const fade = ctx.gains[3]; // first BGM fade gain
  assert.equal(fade.gain.valueAt(0), 0);
  ctx.advance(1);
  assert.ok(Math.abs(fade.gain.now() - 1) < 1e-9);
});
