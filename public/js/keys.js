// Global keyboard handling: Enter advances cues, W/S and 8/2 nudge volume, bound keys play effects.
import { state } from "./store.js";
import { findRow } from "./tracks.js";
import { toggleFX } from "./audio.js";
import { nextStep } from "./steps.js";

const NUDGE = 0.025;
const VOLUME_KEYS = {
  w: ["bgmVol", NUDGE],
  s: ["bgmVol", -NUDGE],
  "8": ["fxVol", NUDGE],
  "2": ["fxVol", -NUDGE],
};

function nudge(sliderId, delta) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;
  const min = Number(slider.min);
  const max = Number(slider.max);
  slider.value = String(Math.min(max, Math.max(min, Number(slider.value) + delta)));
  slider.dispatchEvent(new Event("input"));
}

function isTypingTarget(target) {
  return target instanceof Element && (target.matches("textarea, input, select") || target.isContentEditable);
}

function playBoundEffects(key) {
  for (const [fileName, bind] of Object.entries(state.keybinds)) {
    if (bind !== key) continue;
    const source = state.library.effects[fileName];
    if (source) toggleFX(source, findRow("effects", fileName));
  }
}

function onKeydown(e) {
  if (isTypingTarget(e.target)) return;
  const key = e.key ?? "";

  if (key === "Enter") {
    // A focused button handles Enter natively (the Next button's click already advances).
    if (e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    nextStep();
    return;
  }

  const volume = VOLUME_KEYS[key.toLowerCase()];
  if (volume) nudge(...volume);
  playBoundEffects(key === " " ? "Space" : key);
}

export function initKeys() {
  document.addEventListener("keydown", onKeydown);
}
