// Pure cue model: no DOM and no imports, so it can be unit-tested in node.

export const ACTIONS = {
  play_fx: { label: "Play FX", kind: "fx", target: "fx", needsDuration: false, loopable: true },
  play_bgm: { label: "Play BGM", kind: "bgm", target: "bgm", needsDuration: false, loopable: true },
  pause_bgm: { label: "Pause BGM", kind: "bgm", target: null, needsDuration: false, loopable: false },
  resume_bgm: { label: "Resume BGM", kind: "bgm", target: null, needsDuration: false, loopable: false },
  fade_in_bgm: { label: "Fade in BGM", kind: "bgm", target: "bgm", needsDuration: true, loopable: false },
  fade_out_bgm: { label: "Fade out BGM", kind: "bgm", target: null, needsDuration: true, loopable: false },
  stop_fx: { label: "Stop FX", kind: "fx", target: "fx", needsDuration: false, loopable: false },
  stop_all: { label: "Stop all", kind: "none", target: null, needsDuration: false, loopable: false },
  wait: { label: "Wait", kind: "none", target: null, needsDuration: true, loopable: false },
};

export const NAME_MAX = 60;
export const NOTE_MAX = 280;

export const DEFAULT_STEP = {
  type: "play_fx",
  name: "",
  note: "",
  target: "",
  duration: 1000,
  loop: false,
  delay: 0,
  autoNext: false,
};

const UNKNOWN = { label: "Unknown action", kind: "none", target: null, needsDuration: false, loopable: false };

function actionFor(type) {
  return Object.prototype.hasOwnProperty.call(ACTIONS, type) ? ACTIONS[type] : null;
}

function targetText(step) {
  if (step.target) return step.target;
  return step.type === "stop_fx" ? "all FX" : "";
}

function metaFor(step, def) {
  const meta = [];
  if (def.needsDuration && step.duration > 0) meta.push(`${step.duration} ms`);
  if (def.loopable && step.loop) meta.push("loop");
  if (step.delay > 0) meta.push(`delay ${step.delay} ms`);
  if (step.autoNext) meta.push("auto-next");
  return meta;
}

export function describeStep(step) {
  const def = actionFor(step.type);
  const name = cleanText(step.name);
  const note = cleanText(step.note);
  if (!def) return { label: UNKNOWN.label, kind: UNKNOWN.kind, target: "", meta: [], name, note };
  return { label: def.label, kind: def.kind, target: targetText(step), meta: metaFor(step, def), name, note };
}

// Label plus target, shown only when the action actually takes a target.
function cueText(step) {
  const def = actionFor(step.type);
  const label = def ? def.label : UNKNOWN.label;
  return step.target && def && def.target ? `${label} ${step.target}` : label;
}

const cleanText = (v) => (typeof v === "string" ? v.trim() : "");
const cueTitle = (step) => cleanText(step.name) || cueText(step);

// Returns a new list with the step moved; out-of-range positions are clamped.
export function moveStep(steps, from, to) {
  if (from < 0 || from >= steps.length) return steps.slice();
  const target = Math.min(steps.length - 1, Math.max(0, to));
  const next = steps.slice();
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

// Returns a new list with a copy of the step right after it.
export function duplicateStep(steps, index) {
  if (index < 0 || index >= steps.length) return steps.slice();
  const next = steps.slice();
  next.splice(index + 1, 0, { ...steps[index] });
  return next;
}

// The "current cue" pointer must keep pointing at the same cue after the list is edited.
export function indexAfterMove(current, from, to) {
  if (current === from) return to;
  if (from < current && to >= current) return current - 1;
  if (from > current && to <= current) return current + 1;
  return current;
}

export function indexAfterInsert(current, at) {
  return at <= current ? current + 1 : current;
}

export function nextIndex(currentIndex, length) {
  return currentIndex + 1;
}

export function nextBandModel(steps, currentIndex) {
  if (steps.length === 0) {
    return { state: "empty", num: "", what: "No cues yet", detail: "", note: "", then: "Add a cue to build your show." };
  }
  const next = nextIndex(currentIndex, steps.length);
  if (next >= steps.length) {
    return { state: "end", num: "", what: "End of cues", detail: "", note: "", then: "Press Next to start over." };
  }
  const following = next + 1;
  const name = cleanText(steps[next].name);
  const note = cleanText(steps[next].note);
  return {
    state: "cue",
    num: String(next + 1),
    // A named cue reads as its name in the band; the action moves to the detail line.
    what: name || cueText(steps[next]),
    detail: name ? cueText(steps[next]) : "",
    note,
    then: following < steps.length ? `Then ${following + 1}: ${cueTitle(steps[following])}` : "Last cue",
  };
}
