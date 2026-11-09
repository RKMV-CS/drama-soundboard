// Track rows for the effects and BGM lists. Class names are styled by existing CSS: keep them exact.
import { icon } from "./icons.js";
import { showToast } from "./toast.js";
import { state, saveKeybinds } from "./store.js";
import { formatClock } from "./time-format.js";
import { loadLevel, saveLevel } from "./levels.js";

const LIST_IDS = { effects: "effects", bgm: "bgms" };
const FLAGS = { effects: "FX", bgm: "BGM" };
const EMPTY_TEXT = {
  effects: "No effects yet. Drop audio above.",
  bgm: "No background music yet. Drop audio above.",
};
const RESERVED_KEYS = ["w", "s", "2", "8", "enter"];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function decorative(node) {
  node.setAttribute("aria-hidden", "true");
  return node;
}

function listFor(type) {
  const id = LIST_IDS[type];
  return id ? document.getElementById(id) : null;
}

export function findRow(type, fileName) {
  const list = listFor(type);
  if (!list) return null;
  return [...list.querySelectorAll(".track")].find((row) => row.dataset.filename === fileName) || null;
}

function findKeyInput(fileName) {
  const row = findRow("effects", fileName);
  return row ? row.querySelector(".key-input") : null;
}

// Moves a bind that already uses `key` off its previous owner.
function moveBind(key, fileName) {
  const oldFile = Object.keys(state.keybinds).find((f) => f !== fileName && state.keybinds[f] === key);
  if (!oldFile) return;
  delete state.keybinds[oldFile];
  const oldInput = findKeyInput(oldFile);
  if (oldInput) oldInput.value = "";
  showToast(`Moved key ${key} from ${oldFile} to ${fileName}`, "info");
}

function onBindKeydown(e, fileName, input) {
  if (e.key === "Tab") return; // keep keyboard focus moving
  e.preventDefault();
  if (e.key === "Backspace" || e.key === "Delete") {
    delete state.keybinds[fileName];
    input.value = "";
    saveKeybinds();
    return;
  }
  const key = e.key === " " ? "Space" : e.key;
  if (RESERVED_KEYS.includes(key.toLowerCase())) {
    showToast(`"${key}" is reserved`, "error");
    return;
  }
  moveBind(key, fileName);
  state.keybinds[fileName] = key;
  input.value = key;
  saveKeybinds();
}

function buildKeyInput(fileName) {
  const input = el("input", "key-input");
  input.maxLength = 5;
  input.placeholder = "Key";
  input.title = "Press a key to bind";
  input.setAttribute("aria-label", `Key bind for ${fileName}`);
  input.value = state.keybinds[fileName] || "";
  input.addEventListener("keydown", (e) => onBindKeydown(e, fileName, input));
  return input;
}

function buildProgress() {
  const progress = el("div", "track__progress");
  progress.hidden = true;
  const bar = el("span", "track__bar");
  bar.append(el("span", "track__fill"));
  progress.append(bar, el("span", "track__time", "0:00 / 0:00"));
  return progress;
}

function buildLevel(fileName) {
  const level = el("input", "track__level");
  level.type = "range";
  level.min = "0";
  level.max = "1";
  level.step = "0.05";
  level.value = String(loadLevel(state.projectId, fileName));
  level.setAttribute("aria-label", `Volume for ${fileName}`);
  return level;
}

function buildRow(fileName, type) {
  const row = el("li", "track");
  row.dataset.filename = fileName;
  row.dataset.type = type;

  const play = el("button", "icon-btn track__play");
  play.type = "button";
  play.setAttribute("aria-label", `Play ${fileName}`);
  play.setAttribute("aria-pressed", "false");
  play.append(icon("play"));

  const name = el("span", "track__name");
  // <wbr> after _ and - so long names wrap at word breaks and keep ".mp3" together
  fileName.split(/(?<=[_-])/).forEach((part, i) => {
    if (i) name.append(document.createElement("wbr"));
    name.append(part);
  });
  name.title = fileName;

  const line = el("div", "track__line");
  line.append(name, el("span", "track__state", "Playing"));
  const main = el("div", "track__main");
  main.append(line, buildLevel(fileName));
  if (type === "bgm") main.append(buildProgress());

  row.append(
    decorative(el("span", "tape")),
    decorative(el("span", "flag", FLAGS[type])),
    play,
    main,
  );
  if (type === "effects") row.append(buildKeyInput(fileName));

  const remove = el("button", "icon-btn icon-btn--quiet track__remove");
  remove.type = "button";
  remove.setAttribute("aria-label", `Remove ${fileName}`);
  remove.append(icon("x"));
  row.append(remove);
  return row;
}

function syncEmpty(type) {
  const list = listFor(type);
  if (!list) return;
  const hint = list.querySelector(".empty");
  if (list.querySelector(".track")) {
    hint?.remove();
    return;
  }
  if (!hint) list.appendChild(el("li", "empty", EMPTY_TEXT[type]));
}

// Renders (or re-renders, replacing any row with the same name) one track.
// onPlay(source, row, btn) and onRemove(fileName, type, row) are supplied by the caller.
export function renderTrack(fileName, source, type, { onPlay, onRemove, onLevel } = {}) {
  const list = listFor(type);
  if (!list) return null;
  findRow(type, fileName)?.remove();

  const row = buildRow(fileName, type);
  const play = row.querySelector(".track__play");
  play.addEventListener("click", () => onPlay?.(source, row, play));
  row.querySelector(".track__remove").addEventListener("click", () => onRemove?.(fileName, type, row));

  const level = row.querySelector(".track__level");
  const initial = Number(level.value); // read back: the range input snaps to its step
  level.addEventListener("input", () => {
    const value = Number(level.value);
    onLevel?.(value);
    saveLevel(state.projectId, fileName, value);
  });
  if (initial !== 1) onLevel?.(initial);

  list.appendChild(row);
  syncEmpty(type);
  return row;
}

export function setPlaying(row, on) {
  if (!row) return;
  const playing = Boolean(on);
  row.classList.toggle("is-playing", playing);
  renderNowPlaying();
  const btn = row.querySelector(".track__play");
  if (!btn) return;
  btn.setAttribute("aria-pressed", String(playing));
  btn.replaceChildren(icon(playing ? "pause" : "play"));
}

// Names every sounding track; the line stays hidden while nothing plays.
function renderNowPlaying() {
  const line = document.getElementById("now-playing");
  if (!line) return;
  const names = [...document.querySelectorAll(".track.is-playing")].map((r) => r.dataset.filename);
  line.hidden = names.length === 0;
  line.textContent = names.length ? `Playing: ${names.join(", ")}` : "";
}

// Shows BGM progress on a row. Duration is NaN or Infinity until metadata loads, so the ratio falls back to 0.
export function setProgress(row, currentSeconds, durationSeconds) {
  const progress = row?.querySelector(".track__progress");
  if (!progress) return;
  const ratio = durationSeconds > 0 && Number.isFinite(currentSeconds) ? currentSeconds / durationSeconds : 0;
  progress.hidden = false;
  progress.querySelector(".track__fill").style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
  progress.querySelector(".track__time").textContent = `${formatClock(currentSeconds)} / ${formatClock(durationSeconds)}`;
}

export function clearProgress(row) {
  const progress = row?.querySelector(".track__progress");
  if (!progress) return;
  progress.hidden = true;
  progress.querySelector(".track__fill").style.width = "0%";
}

export function removeRow(row) {
  if (!row) return;
  const type = row.dataset.type;
  row.remove();
  syncEmpty(type);
  renderNowPlaying();
}

export function renderEmptyHints() {
  syncEmpty("effects");
  syncEmpty("bgm");
}
