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

export const DEFAULT_STEP = {
  type: "play_fx",
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
  if (!def) return { label: UNKNOWN.label, kind: UNKNOWN.kind, target: "", meta: [] };
  return { label: def.label, kind: def.kind, target: targetText(step), meta: metaFor(step, def) };
}

// Label plus target, shown only when the action actually takes a target.
function cueText(step) {
  const def = actionFor(step.type);
  const label = def ? def.label : UNKNOWN.label;
  return step.target && def && def.target ? `${label} ${step.target}` : label;
}

export function nextIndex(currentIndex, length) {
  return currentIndex + 1;
}

export function nextBandModel(steps, currentIndex) {
  if (steps.length === 0) {
    return { state: "empty", num: "", what: "No cues yet", then: "Add a cue to build your show." };
  }
  const next = nextIndex(currentIndex, steps.length);
  if (next >= steps.length) {
    return { state: "end", num: "", what: "End of cues", then: "Press Next to start over." };
  }
  const following = next + 1;
  return {
    state: "cue",
    num: String(next + 1),
    what: cueText(steps[next]),
    then: following < steps.length ? `Then ${following + 1}: ${cueText(steps[following])}` : "Last cue",
  };
}
