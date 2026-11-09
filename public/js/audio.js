// Playback facade: owns the Web Audio engine, maps tracks to UI rows, and wires the volume sliders.
// All sound logic lives in engine.js (DOM-free, unit-tested); this file only connects it to the page.
import { setPlaying, setProgress, clearProgress } from "./tracks.js";
import { loadVolume, saveVolume } from "./store.js";
import { createEngine } from "./engine.js";

const DEFAULT_FADE_MS = 1000;
const BGM_TOGGLE_LOCK_MS = 150;

let engine = null;
let bgmLevel = 0.6; // user's BGM slider level
let fxLevel = 1; // user's FX slider level
let bgmRow = null;
let bgmToggling = false;
const trackLevels = new Map(); // "kind:source" -> 0..1, replayed when the engine is created
const preloadQueue = [];

const $ = (id) => document.getElementById(id);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

async function fetchArrayBuffer(source) {
  const res = await fetch(source);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

// Created on first use: browsers only let an AudioContext start after a user gesture.
function getEngine() {
  if (!engine) {
    const Context = window.AudioContext || window.webkitAudioContext;
    engine = createEngine({ ctx: new Context(), fetchArrayBuffer, makeAudio: (src) => new Audio(src) });
    engine.setBgmLevel(bgmLevel);
    engine.setFxLevel(fxLevel);
    for (const [key, v] of trackLevels) engine.setTrackLevel(key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1), v);
    engine.preloadFx(preloadQueue.splice(0));
  }
  return engine;
}

// Effects are decoded ahead of time so a cue fires with no fetch. Held until the first gesture.
export function preloadFx(source) {
  if (engine) engine.preloadFx([source]);
  else preloadQueue.push(source);
}

for (const type of ["pointerdown", "keydown"]) {
  document.addEventListener(type, () => getEngine(), { once: true, capture: true });
}

export function setTrackLevel(kind, source, value) {
  trackLevels.set(`${kind}:${source}`, value);
  engine?.setTrackLevel(kind, source, value);
}

// ---------- FX ----------
export function toggleFX(source, row = null, loop = false) {
  const e = getEngine();
  if (e.isFxActive(source)) {
    e.stopFx(source);
    return;
  }
  setPlaying(row, true);
  e.startFx(source, { loop, onEnd: () => setPlaying(row, false) });
}

export function stopFxByTarget(source) {
  engine?.stopFx(source);
}

export function stopEffect() {
  engine?.stopAllFx();
}

// ---------- BGM ----------
function bgmCallbacks(row, loop) {
  return {
    loop,
    onProgress: (time, duration) => setProgress(row, time, duration),
    onEnd: () => {
      setPlaying(row, false);
      clearProgress(row);
    },
    onError: () => setPlaying(row, false),
  };
}

export function pauseBGM() {
  engine?.pauseBgm();
  setPlaying(bgmRow, false);
}

export function resumeBGM() {
  if (!engine?.bgmInfo()) return;
  setPlaying(bgmRow, true);
  engine.resumeBgm(() => setPlaying(bgmRow, false));
}

export function stopBGM() {
  pauseBGM();
  clearProgress(bgmRow);
}

// Same source toggles pause/resume; a different source replaces it (debounced against double presses).
export function playBGM(source, row = null, loop = true) {
  const e = getEngine();
  if (e.bgmInfo()?.source === source) {
    if (e.bgmInfo().paused) resumeBGM();
    else pauseBGM();
    return;
  }
  if (bgmToggling) return;
  bgmToggling = true;
  setTimeout(() => {
    bgmToggling = false;
  }, BGM_TOGGLE_LOCK_MS);

  bgmRow = row;
  setPlaying(row, true);
  e.playBgm(source, bgmCallbacks(row, loop));
}

// A new source crossfades in over the one playing; the loaded source just rises back to full.
export function fadeInBGM(source, row, duration) {
  const e = getEngine();
  const src = source || e.bgmInfo()?.source;
  if (!src) return;
  const ms = Number(duration) > 0 ? Number(duration) : DEFAULT_FADE_MS;
  if (source) bgmRow = row;
  setPlaying(bgmRow, true);
  e.fadeInBgm(src, ms, bgmCallbacks(bgmRow, true));
}

export function fadeOutBGM(duration) {
  engine?.fadeOutBgm(Number(duration) > 0 ? Number(duration) : DEFAULT_FADE_MS);
}

export function stopAll() {
  stopEffect();
  stopBGM();
}

// ---------- volume sliders ----------
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
    bgmLevel = v;
    engine?.setBgmLevel(v);
  }, "bgm");
  wireSlider("fxVol", "fxVolPercent", (v) => {
    fxLevel = v;
    engine?.setFxLevel(v);
  }, "fx");
  wireProMode();

  // Restore after wiring so the input handlers apply and persist the values.
  const saved = loadVolume();
  if (saved.bgm !== null) setSlider("bgmVol", saved.bgm);
  if (saved.fx !== null) setSlider("fxVol", saved.fx);
}
