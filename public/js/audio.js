// HTMLAudioElement playback engine: BGM and FX, ducking, fades and volume wiring.
// Self-contained on purpose: Phase 3 replaces the engine, keep the exported surface stable.
import { setPlaying, setProgress, clearProgress } from "./tracks.js";
import { loadVolume, saveVolume } from "./store.js";

const DUCK_LEVEL = 0.8;
const DUCK_STEP = 0.02;
const DUCK_TICK_MS = 30;
const FADE_STEPS = 20;
const DEFAULT_FADE_MS = 1000;
const BGM_TOGGLE_LOCK_MS = 150;

const activeAudios = new Map(); // source -> { audio, row }
let bgm = new Audio();
let bgmBase = 0.6; // user's BGM slider level (ducking is relative to this)
let fxBase = 1; // user's FX slider level, applied to new FX
let duckTimer = null;
let bgmToggling = false;
let currentBGMSrc = null;
let currentBGMRow = null;

const $ = (id) => document.getElementById(id);
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Calls revert if playback is refused (autoplay policy, empty source, interrupted play).
function playOrRevert(audio, revert) {
  Promise.resolve(audio.play()).catch(revert);
}

function duck(down = true) {
  clearInterval(duckTimer);
  const target = clamp01(bgmBase * (down ? DUCK_LEVEL : 1));
  duckTimer = setInterval(() => {
    if (down && bgm.volume > target) bgm.volume = Math.max(target, bgm.volume - DUCK_STEP);
    else if (!down && bgm.volume < target) bgm.volume = Math.min(target, bgm.volume + DUCK_STEP);
    else clearInterval(duckTimer);
  }, DUCK_TICK_MS);
}

export function fadeAudio(audio, target, duration, cb) {
  const to = Number(target);
  const ms = Number(duration) > 0 ? Number(duration) : DEFAULT_FADE_MS;
  const from = audio.volume;
  const perTick = (to - from) / FADE_STEPS;
  let tick = 0;
  const timer = setInterval(() => {
    tick++;
    if (tick >= FADE_STEPS) {
      clearInterval(timer);
      audio.volume = to;
      cb?.();
      return;
    }
    audio.volume = clamp01(from + perTick * tick);
  }, ms / FADE_STEPS);
}

// Stops one FX voice, updates its row, and releases ducking when none are left.
function releaseFx(source, audio) {
  const data = activeAudios.get(source);
  if (!data || (audio && data.audio !== audio)) return;
  data.audio.pause();
  activeAudios.delete(source);
  setPlaying(data.row, false);
  if (activeAudios.size === 0) duck(false);
}

export function toggleFX(source, row = null, loop = false) {
  if (activeAudios.has(source)) {
    releaseFx(source);
    return;
  }
  const audio = new Audio(source);
  audio.loop = loop;
  audio.volume = fxBase;
  activeAudios.set(source, { audio, row });
  setPlaying(row, true);
  duck(true);
  audio.addEventListener("ended", () => {
    if (!audio.loop) releaseFx(source, audio);
  });
  playOrRevert(audio, () => releaseFx(source, audio));
}

export function stopFxByTarget(source) {
  if (activeAudios.has(source)) releaseFx(source);
}

export function stopEffect() {
  activeAudios.forEach(({ audio, row }) => {
    audio.pause();
    setPlaying(row, false);
  });
  activeAudios.clear();
  duck(false);
}

export function pauseBGM() {
  bgm.pause();
  setPlaying(currentBGMRow, false);
}

export function resumeBGM() {
  setPlaying(currentBGMRow, true);
  playOrRevert(bgm, () => setPlaying(currentBGMRow, false));
}

export function stopBGM() {
  pauseBGM();
  clearProgress(currentBGMRow);
}

// Same source toggles pause/resume; a different source starts a new track (debounced).
export function playBGM(source, row = null, loop = true) {
  if (currentBGMSrc === source) {
    if (bgm.paused) resumeBGM();
    else pauseBGM();
    return;
  }
  if (bgmToggling) return;
  bgmToggling = true;
  setTimeout(() => {
    bgmToggling = false;
  }, BGM_TOGGLE_LOCK_MS);

  bgm.pause();
  setPlaying(currentBGMRow, false);
  clearProgress(currentBGMRow);
  const audio = new Audio(source);
  audio.loop = loop;
  audio.volume = bgmBase;
  const onTime = () => {
    if (bgm === audio) setProgress(currentBGMRow, audio.currentTime, audio.duration);
  };
  audio.addEventListener("timeupdate", onTime);
  audio.addEventListener("loadedmetadata", onTime);
  audio.addEventListener("ended", () => {
    if (audio.loop || bgm !== audio) return;
    setPlaying(currentBGMRow, false);
    clearProgress(currentBGMRow);
  });
  bgm = audio;
  currentBGMSrc = source;
  currentBGMRow = row;
  setPlaying(row, true);
  playOrRevert(audio, () => {
    if (bgm === audio) setPlaying(row, false);
  });
}

export function fadeInBGM(source, row, duration) {
  if (source && currentBGMSrc !== source) {
    playBGM(source, row, true);
    bgm.volume = 0;
  }
  fadeAudio(bgm, bgmBase, duration);
}

export function fadeOutBGM(duration) {
  const audio = bgm;
  fadeAudio(audio, 0, duration, () => {
    audio.pause();
    if (audio === bgm) {
      setPlaying(currentBGMRow, false);
      clearProgress(currentBGMRow);
    }
  });
}

export function stopAll() {
  stopEffect();
  stopBGM();
}

export function getBGM() {
  return bgm;
}

export function getCurrentBGMSrc() {
  return currentBGMSrc;
}

export function bgmVolume() {
  return bgmBase;
}

// Wires one slider (and its percent field), applies its level once, and keeps --val painted.
function wireSlider(sliderId, percentId, apply, kind) {
  const slider = $(sliderId);
  if (!slider) return;
  const percent = $(percentId);
  const paint = () => {
    const pct = ((Number(slider.value) - Number(slider.min)) / (Number(slider.max) - Number(slider.min))) * 100;
    slider.style.setProperty("--val", `${pct}%`);
  };
  slider.addEventListener("input", () => {
    const v = Number(slider.value);
    apply(v);
    if (percent) percent.value = String(Math.round(v * 100));
    saveVolume(kind, v);
    paint();
  });
  percent?.addEventListener("input", () => {
    if (percent.value.trim() === "") return;
    const n = clamp(parseInt(percent.value, 10) || 0, 0, 100);
    slider.value = String(n / 100);
    slider.dispatchEvent(new Event("input"));
  });
  apply(Number(slider.value));
  paint();
}

function setSlider(id, value) {
  const slider = $(id);
  if (!slider) return;
  slider.value = String(value);
  slider.dispatchEvent(new Event("input"));
}

function wireProMode() {
  const pro = $("proMode");
  pro?.addEventListener("change", () => {
    for (const id of ["bgmVolDisplay", "fxVolDisplay"]) $(id)?.classList.toggle("show", pro.checked);
  });
}

export function initVolume() {
  wireSlider("bgmVol", "bgmVolPercent", (v) => {
    bgmBase = v;
    bgm.volume = v;
  }, "bgm");
  wireSlider("fxVol", "fxVolPercent", (v) => {
    fxBase = v;
    activeAudios.forEach(({ audio }) => {
      audio.volume = v;
    });
  }, "fx");
  wireProMode();

  // Restore after wiring so the input handlers apply and persist the values.
  const saved = loadVolume();
  if (saved.bgm !== null) setSlider("bgmVol", saved.bgm);
  if (saved.fx !== null) setSlider("fxVol", saved.fx);
}
