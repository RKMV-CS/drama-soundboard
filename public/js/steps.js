// Stepwise cue list: rendering, editing, and running cues against the audio engine.
import { state, saveSteps, loadSteps } from "./store.js";
import {
  ACTIONS,
  DEFAULT_STEP,
  NAME_MAX,
  NOTE_MAX,
  describeStep,
  nextIndex,
  nextBandModel,
  moveStep,
  duplicateStep,
  indexAfterMove,
  indexAfterInsert,
} from "./cue-format.js";
import { icon } from "./icons.js";
import { findRow } from "./tracks.js";
import {
  toggleFX,
  playBGM,
  pauseBGM,
  resumeBGM,
  fadeInBGM,
  fadeOutBGM,
  stopFxByTarget,
  stopEffect,
  stopAll,
} from "./audio.js";

const SEP = ` ${String.fromCharCode(0xb7)} `; // middle dot between meta items

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

export function initSteps() {
  $("addStepBtn")?.addEventListener("click", () => addStep());
  $("resetBtn")?.addEventListener("click", () => resetSteps());
  $("nextBtn")?.addEventListener("click", () => nextStep());
  $("editToggle")?.addEventListener("click", () => setEditing(!isEditing()));
  loadSteps();
  renderSteps();
}

function isEditing() {
  return $("steps-list")?.classList.contains("is-editing") ?? false;
}

function setEditing(on) {
  $("steps-list")?.classList.toggle("is-editing", on);
  const toggle = $("editToggle");
  if (!toggle) return;
  toggle.setAttribute("aria-pressed", String(on));
  toggle.textContent = on ? "Done editing" : "Edit cues";
}

export function addStep() {
  state.steps.push({ ...DEFAULT_STEP });
  setEditing(true);
  renderSteps();
  saveSteps();
}

function removeStep(index) {
  state.steps.splice(index, 1);
  state.currentStepIndex = Math.min(state.currentStepIndex, state.steps.length - 1);
  renderSteps();
  saveSteps();
}

function updateStep(index, field, value) {
  state.steps[index][field] = value;
  saveSteps();
}

export function resetSteps() {
  state.currentStepIndex = -1;
  renderSteps();
}

// ---- rendering ----

function selectEl(options, selected) {
  const select = el("select", "select select--compact");
  for (const [value, text] of options) {
    const opt = el("option", "", text);
    opt.value = value;
    opt.selected = value === selected;
    select.append(opt);
  }
  return select;
}

function fieldBlock(id, text, control) {
  control.id = id;
  const wrap = el("div", "field");
  const label = el("label", "field__label", text);
  label.htmlFor = id;
  wrap.append(label, control);
  return wrap;
}

function typeField(step, index) {
  const options = Object.entries(ACTIONS).map(([value, def]) => [value, def.label]);
  const select = selectEl(options, step.type);
  select.addEventListener("change", () => {
    updateStep(index, "type", select.value);
    renderSteps();
  });
  return fieldBlock(`cue-${index}-type`, "Action", select);
}

function targetField(step, index, kind) {
  const library = state.library[kind === "bgm" ? "bgm" : "effects"];
  const none = step.type === "stop_fx" ? "-- All FX --" : "-- Select audio --";
  const options = [["", none], ...Object.keys(library).map((name) => [name, name])];
  const select = selectEl(options, step.target || "");
  select.addEventListener("change", () => updateStep(index, "target", select.value));
  return fieldBlock(`cue-${index}-target`, "Target", select);
}

function numberField(index, key, text, value) {
  const input = el("input", "input input--compact input--num");
  input.type = "number";
  input.min = "0";
  input.value = String(value);
  input.addEventListener("input", () => updateStep(index, key, parseInt(input.value, 10) || 0));
  return fieldBlock(`cue-${index}-${key}`, text, input);
}

function checkBox(index, key, text, checked) {
  const label = el("label", "check");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.addEventListener("change", () => updateStep(index, key, input.checked));
  label.append(input, document.createTextNode(` ${text}`));
  return label;
}

// Text fields save on each keystroke but re-render only on change, so focus stays put while typing.
function nameField(step, index) {
  const input = el("input", "input input--compact");
  input.type = "text";
  input.maxLength = NAME_MAX;
  input.placeholder = "Optional, e.g. Thunder crack";
  input.value = step.name || "";
  input.addEventListener("input", () => updateStep(index, "name", input.value));
  input.addEventListener("change", () => refreshCue(index));
  const block = fieldBlock(`cue-${index}-name`, "Name", input);
  block.classList.add("cue__field--name");
  return block;
}

function noteField(step, index) {
  const input = el("textarea", "input");
  input.maxLength = NOTE_MAX;
  input.placeholder = "Optional, e.g. after 'the storm breaks'";
  input.value = step.note || "";
  input.addEventListener("input", () => updateStep(index, "note", input.value));
  input.addEventListener("change", () => refreshCue(index));
  const block = fieldBlock(`cue-${index}-note`, "Note", input);
  block.classList.add("cue__field--note");
  return block;
}

function toolButton(index, action, label, iconName, onClick) {
  const btn = el("button", "icon-btn");
  btn.type = "button";
  btn.dataset.action = action;
  btn.setAttribute("aria-label", label);
  btn.append(icon(iconName));
  btn.addEventListener("click", () => onClick(index));
  return btn;
}

function cueTools(index) {
  const group = el("div", "cue__tools");
  const up = toolButton(index, "move-up", `Move cue ${index + 1} up`, "arrow-up", (i) => moveCue(i, i - 1));
  const down = toolButton(index, "move-down", `Move cue ${index + 1} down`, "arrow-down", (i) => moveCue(i, i + 1));
  const copy = toolButton(index, "duplicate", `Duplicate cue ${index + 1}`, "copy", duplicateCue);
  up.disabled = index === 0;
  down.disabled = index === state.steps.length - 1;
  group.append(up, down, copy);
  return group;
}

function buildEditor(step, index) {
  const def = Object.prototype.hasOwnProperty.call(ACTIONS, step.type) ? ACTIONS[step.type] : {};
  const editor = el("div", "cue__editor");
  editor.append(nameField(step, index), noteField(step, index), typeField(step, index));
  if (def.target) editor.append(targetField(step, index, def.target));
  if (def.needsDuration) editor.append(numberField(index, "duration", "Duration (ms)", step.duration || 1000));
  if (step.type !== "wait") editor.append(numberField(index, "delay", "Delay (ms)", step.delay || 0));
  if (def.loopable) editor.append(checkBox(index, "loop", "Loop", step.loop));
  if (step.type !== "wait") editor.append(checkBox(index, "autoNext", "Auto-next", step.autoNext));
  editor.append(cueTools(index));
  return editor;
}

function buildSummary(info, index) {
  const summary = el("div", "cue__summary");
  if (info.name) summary.append(el("span", "cue__name", info.name));
  summary.append(el("span", "cue__action", info.label));
  if (info.target) summary.append(el("span", "cue__target", info.target));
  if (info.meta.length) summary.append(el("span", "cue__meta", info.meta.join(SEP)));
  if (index <= state.currentStepIndex) {
    const done = el("span", "cue__done");
    done.append(icon("check"), el("span", "visually-hidden", "Done"));
    summary.append(done);
  }
  if (info.note) summary.append(el("span", "cue__note", info.note));
  return summary;
}

// Re-draws one cue's summary and the next band without touching the editor, so focus is kept.
function refreshCue(index) {
  const summary = document.querySelector(`#steps-list .cue[data-index="${index}"] .cue__summary`);
  summary?.replaceWith(buildSummary(describeStep(state.steps[index]), index));
  renderNextBand(nextBandModel(state.steps, state.currentStepIndex));
}

function moveCue(index, to) {
  state.steps = moveStep(state.steps, index, to);
  state.currentStepIndex = indexAfterMove(state.currentStepIndex, index, to);
  renderSteps();
  saveSteps();
  focusCueAction(to, to < index ? "move-up" : "move-down");
}

function duplicateCue(index) {
  state.steps = duplicateStep(state.steps, index);
  state.currentStepIndex = indexAfterInsert(state.currentStepIndex, index + 1);
  renderSteps();
  saveSteps();
  focusCueAction(index, "duplicate");
}

function focusCueAction(index, action) {
  const cue = document.querySelector(`#steps-list .cue[data-index="${index}"]`);
  const btn = cue?.querySelector(`[data-action="${action}"]`);
  // A disabled end-of-list button cannot take focus, so fall back to Duplicate.
  const target = btn && !btn.disabled ? btn : cue?.querySelector('[data-action="duplicate"]');
  target?.focus();
}

function cueFlag(kind) {
  if (kind === "none") return decorative(el("span", "flag flag--none"));
  return decorative(el("span", "flag", kind === "bgm" ? "BGM" : "FX"));
}

function buildCue(step, index, next) {
  const info = describeStep(step);
  const cue = el("li", "cue");
  cue.dataset.index = String(index);
  cue.dataset.kind = info.kind;
  cue.classList.toggle("is-done", index <= state.currentStepIndex);
  cue.classList.toggle("is-next", index === next);

  const removeBtn = el("button", "icon-btn icon-btn--quiet cue__remove");
  removeBtn.type = "button";
  removeBtn.setAttribute("aria-label", `Remove cue ${index + 1}`);
  removeBtn.append(icon("x"));
  removeBtn.addEventListener("click", () => removeStep(index));

  const summary = buildSummary(info, index);

  cue.append(
    el("span", "cue__num", String(index + 1)),
    decorative(el("span", "tape")),
    cueFlag(info.kind),
    summary,
    removeBtn,
    buildEditor(step, index),
  );
  return cue;
}

function renderCounter() {
  const counter = $("step-counter");
  if (counter) counter.textContent = `Cue ${state.currentStepIndex + 1} of ${state.steps.length}`;
}

function renderNextBand(model) {
  const band = $("next-band");
  if (!band) return;
  band.className = model.state === "cue" ? "next-band" : "next-band is-empty";

  const children = [];
  if (model.num) {
    const num = el("span", "next-band__num");
    num.append(el("span", "visually-hidden", "Next cue "), document.createTextNode(model.num));
    children.push(num);
  }
  const what = el("span", "next-band__what");
  what.append(el("mark", "", model.what));
  children.push(what);
  if (model.detail) children.push(el("span", "next-band__detail", model.detail));
  if (model.note) children.push(el("span", "next-band__note", model.note));
  children.push(el("span", "next-band__then", model.then));
  band.replaceChildren(...children);
}

export function renderSteps() {
  const list = $("steps-list");
  if (list) {
    const next = nextIndex(state.currentStepIndex, state.steps.length);
    list.replaceChildren(...state.steps.map((step, i) => buildCue(step, i, next)));
  }
  renderCounter();
  renderNextBand(nextBandModel(state.steps, state.currentStepIndex));
}

// ---- execution ----

async function executeStep(step) {
  if (step.delay > 0) await sleep(step.delay);

  const bgmSource = state.library.bgm[step.target];
  const fxSource = state.library.effects[step.target];

  switch (step.type) {
    case "play_fx":
      if (fxSource) toggleFX(fxSource, findRow("effects", step.target), step.loop);
      break;
    case "play_bgm":
      if (bgmSource) playBGM(bgmSource, findRow("bgm", step.target), step.loop);
      break;
    case "pause_bgm":
      pauseBGM();
      break;
    case "resume_bgm":
      resumeBGM();
      break;
    case "fade_in_bgm":
      fadeInBGM(bgmSource, findRow("bgm", step.target), step.duration);
      break;
    case "fade_out_bgm":
      fadeOutBGM(step.duration);
      break;
    case "stop_fx":
      if (step.target) stopFxByTarget(fxSource);
      else stopEffect();
      break;
    case "stop_all":
      stopAll();
      break;
    case "wait":
      await sleep(step.duration || 1000);
      break;
  }
}

function scrollNextIntoView() {
  document.querySelector("#steps-list .cue.is-next")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

export async function nextStep() {
  if (state.steps.length === 0) return;
  state.currentStepIndex = nextIndex(state.currentStepIndex, state.steps.length);
  if (state.currentStepIndex >= state.steps.length) {
    state.currentStepIndex = -1;
    renderSteps();
    return;
  }

  const step = state.steps[state.currentStepIndex];
  renderSteps();
  scrollNextIntoView();
  await executeStep(step);
  if (step.autoNext) nextStep();
}
