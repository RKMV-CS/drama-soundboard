// Web Audio engine. DOM-free: the AudioContext, the fetcher and the <audio> factory are injected,
// so node tests drive it with fakes (test/fake-audio.js).
//
//   FX   decoded once into an AudioBuffer, started on a fresh BufferSource: no lag, many at once.
//   BGM  streamed through a MediaElementSource (long files are never decoded into memory).
//
//   fx voice  -> declick gain -> fx level(source)  -> fxMaster ------------------> destination
//   bgm track -> fade gain    -> bgm level(source) -> duck -> bgmMaster -> destination

const DUCK_LEVEL = 0.8;
const DUCK_DOWN_S = 0.3;
const DUCK_UP_S = 0.5;
const DECLICK_S = 0.03;
const LEVEL_S = 0.03;

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0));

export function createEngine({ ctx, fetchArrayBuffer, makeAudio, schedule = (fn, ms) => setTimeout(fn, ms) }) {
  const fxMaster = ctx.createGain();
  const bgmMaster = ctx.createGain();
  const duckGain = ctx.createGain();
  fxMaster.connect(ctx.destination);
  duckGain.connect(bgmMaster);
  bgmMaster.connect(ctx.destination);

  // Click-free move to a value. Reads the live value, so a new ramp can interrupt an old one.
  function rampTo(param, value, seconds) {
    const now = ctx.currentTime;
    const current = param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(current, now);
    param.linearRampToValueAtTime(value, now + Math.max(seconds, 0.001));
  }

  function unlock() {
    if (ctx.state === "suspended") ctx.resume();
  }

  // ---------- per-track level (the track's own volume, separate from fades) ----------
  const levels = new Map(); // "kind:source" -> 0..1
  const levelNodes = new Map(); // "kind:source" -> GainNode

  function levelNode(kind, source) {
    const key = `${kind}:${source}`;
    let node = levelNodes.get(key);
    if (!node) {
      node = ctx.createGain();
      node.gain.value = levels.get(key) ?? 1;
      node.connect(kind === "fx" ? fxMaster : duckGain);
      levelNodes.set(key, node);
    }
    return node;
  }

  function setTrackLevel(kind, source, value) {
    const key = `${kind}:${source}`;
    const level = clamp01(value);
    levels.set(key, level);
    const node = levelNodes.get(key);
    if (node) rampTo(node.gain, level, LEVEL_S);
  }

  const getTrackLevel = (kind, source) => levels.get(`${kind}:${source}`) ?? 1;

  // ---------- master levels ----------
  const setFxLevel = (v) => rampTo(fxMaster.gain, clamp01(v), LEVEL_S);
  const setBgmLevel = (v) => rampTo(bgmMaster.gain, clamp01(v), LEVEL_S);

  // ---------- ducking: BGM sits down while any FX plays ----------
  let ducked = false;
  function updateDuck() {
    const want = voices.size > 0;
    if (want === ducked) return;
    ducked = want;
    rampTo(duckGain.gain, want ? DUCK_LEVEL : 1, want ? DUCK_DOWN_S : DUCK_UP_S);
  }

  // ---------- FX ----------
  const buffers = new Map(); // source -> Promise<AudioBuffer>
  const voices = new Map(); // source -> voice

  function loadBuffer(source) {
    let pending = buffers.get(source);
    if (!pending) {
      pending = fetchArrayBuffer(source).then((data) => ctx.decodeAudioData(data));
      pending.catch(() => buffers.delete(source)); // let a later press retry
      buffers.set(source, pending);
    }
    return pending;
  }

  // Warm the cache so the first cue fires with no fetch or decode.
  function preloadFx(sources) {
    for (const source of sources) loadBuffer(source).catch(() => {});
  }

  // Removes the voice from the book-keeping. Idempotent; tells the caller exactly once.
  function release(voice, error) {
    if (voices.get(voice.source) !== voice) return;
    voices.delete(voice.source);
    voice.cancelled = true;
    updateDuck();
    voice.onEnd?.(error);
  }

  function startFx(source, { loop = false, onEnd } = {}) {
    if (voices.has(source)) return;
    unlock();
    const voice = { source, onEnd, cancelled: false, node: null, gain: null };
    voices.set(source, voice);
    updateDuck();
    loadBuffer(source).then(
      (buffer) => {
        if (voice.cancelled) return;
        const node = ctx.createBufferSource();
        const gain = ctx.createGain();
        node.buffer = buffer;
        node.loop = loop;
        node.connect(gain);
        gain.connect(levelNode("fx", source));
        node.onended = () => {
          node.disconnect();
          gain.disconnect();
          release(voice);
        };
        voice.node = node;
        voice.gain = gain;
        node.start(0);
      },
      (error) => release(voice, error || new Error("fx failed")),
    );
  }

  function stopFx(source) {
    const voice = voices.get(source);
    if (!voice) return;
    if (voice.node) {
      rampTo(voice.gain.gain, 0, DECLICK_S);
      voice.node.stop(ctx.currentTime + DECLICK_S);
    }
    release(voice);
  }

  function stopAllFx() {
    for (const source of [...voices.keys()]) stopFx(source);
  }

  const isFxActive = (source) => voices.has(source);

  // ---------- BGM ----------
  let bgm = null; // current track: { source, audio, node, gain, loop, paused, ended, onEnd }

  function dispose(track) {
    track.audio.pause();
    track.node.disconnect();
    track.gain.disconnect();
  }

  // The track is finished (ran out, or faded out). Frees it and tells the caller once.
  function finish(track) {
    if (track.ended) return;
    track.ended = true;
    if (bgm === track) bgm = null;
    dispose(track);
    track.onEnd?.();
  }

  // The track is being replaced: let it fade under the new one, then free it.
  function retire(track, fadeMs) {
    if (track.ended) return;
    track.ended = true;
    if (bgm === track) bgm = null;
    track.onEnd?.();
    const seconds = Math.max(fadeMs / 1000, DECLICK_S);
    rampTo(track.gain.gain, 0, seconds);
    schedule(() => dispose(track), seconds * 1000);
  }

  // A different source replaces the current one; with fadeMs > 0 they crossfade.
  function playBgm(source, { loop = true, fadeMs = 0, onEnd, onProgress, onError } = {}) {
    unlock();
    if (bgm) retire(bgm, fadeMs);

    const audio = makeAudio(source);
    audio.loop = loop;
    const node = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    gain.gain.value = fadeMs > 0 ? 0 : 1;
    node.connect(gain);
    gain.connect(levelNode("bgm", source));

    const track = { source, audio, node, gain, loop, paused: false, ended: false, onEnd };
    const report = () => {
      if (bgm === track) onProgress?.(audio.currentTime, audio.duration);
    };
    audio.addEventListener("timeupdate", report);
    audio.addEventListener("loadedmetadata", report);
    audio.addEventListener("ended", () => {
      if (!track.loop && bgm === track) finish(track);
    });
    bgm = track;
    if (fadeMs > 0) rampTo(gain.gain, 1, fadeMs / 1000);

    Promise.resolve(audio.play()).catch((error) => {
      if (bgm !== track) return;
      track.paused = true; // refused (autoplay policy, bad file): stay selected so the next press retries
      onError?.(error);
    });
  }

  // Same source already loaded: fade it back up. Otherwise start it (crossfading from any other).
  function fadeInBgm(source, ms, opts = {}) {
    if (bgm && bgm.source === source) {
      if (bgm.paused) resumeBgm();
      rampTo(bgm.gain.gain, 1, ms / 1000);
      return;
    }
    playBgm(source, { ...opts, fadeMs: ms });
  }

  function fadeOutBgm(ms) {
    const track = bgm;
    if (!track) return;
    rampTo(track.gain.gain, 0, ms / 1000);
    schedule(() => finish(track), ms);
  }

  function pauseBgm() {
    if (!bgm) return;
    bgm.paused = true;
    bgm.audio.pause();
  }

  function resumeBgm(onError) {
    if (!bgm) return;
    unlock();
    const track = bgm;
    track.paused = false;
    Promise.resolve(track.audio.play()).catch((error) => {
      if (bgm !== track) return;
      track.paused = true;
      onError?.(error);
    });
  }

  const bgmInfo = () => (bgm ? { source: bgm.source, paused: bgm.paused } : null);

  return {
    preloadFx,
    startFx,
    stopFx,
    stopAllFx,
    isFxActive,
    playBgm,
    fadeInBgm,
    fadeOutBgm,
    pauseBgm,
    resumeBgm,
    bgmInfo,
    setFxLevel,
    setBgmLevel,
    setTrackLevel,
    getTrackLevel,
  };
}
