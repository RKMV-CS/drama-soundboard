// Shared app state and localStorage persistence. Root of the dependency graph (imports nothing).
// Storage keys match the old single-file page so saved data still loads.
const KEY_BGM_VOL = "sb_bgm_vol";
const KEY_FX_VOL = "sb_fx_vol";
const KEY_KEYBINDS = "sb_keybinds_";
const KEY_STEPS = "sb_steps";

export const state = {
  projectId: null,
  library: { effects: {}, bgm: {} }, // filename -> URL (or blob URL when no project)
  keybinds: {},
  steps: [],
  currentStepIndex: -1,
};

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked: keep working in memory */
  }
}

function readJSON(key, fallback) {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readNumber(key) {
  const raw = readRaw(key);
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const projectSuffix = () => state.projectId || "";

export function loadKeybinds() {
  const saved = readJSON(KEY_KEYBINDS + projectSuffix(), {});
  state.keybinds = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
}

export function saveKeybinds() {
  writeRaw(KEY_KEYBINDS + projectSuffix(), JSON.stringify(state.keybinds));
}

export function loadSteps() {
  const saved = readJSON(KEY_STEPS + projectSuffix(), []);
  state.steps = Array.isArray(saved) ? saved : [];
}

export function saveSteps() {
  writeRaw(KEY_STEPS + projectSuffix(), JSON.stringify(state.steps));
}

export function loadVolume() {
  return { bgm: readNumber(KEY_BGM_VOL), fx: readNumber(KEY_FX_VOL) };
}

export function saveVolume(kind, value) {
  writeRaw(kind === "bgm" ? KEY_BGM_VOL : KEY_FX_VOL, String(value));
}
