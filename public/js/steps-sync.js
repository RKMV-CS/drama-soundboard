// Server copy of each project's cue list. localStorage stays the offline cache; the server is the durable copy.
import { getSteps, putSteps } from "./api.js";
import { state, saveSteps, onStepsSaved } from "./store.js";
import { showToast } from "./toast.js";

let applyingServer = false; // set while the server copy is written into the local cache, so it is not PUT back
let pulled = Promise.resolve(); // pushes wait for the first pull, so an early edit cannot overwrite the server copy
let warnedPull = false;
let toastedPush = false;
let timer = null;

async function syncDown(renderFn) {
  const projectId = state.projectId;
  try {
    const { steps = [] } = await getSteps(projectId);
    if (steps.length) {
      state.steps = steps;
      applyingServer = true;
      try {
        saveSteps();
      } finally {
        applyingServer = false;
      }
      renderFn();
    } else if (state.steps.length) {
      await putSteps(projectId, state.steps); // one-time migration of cues saved before the server copy existed
    }
  } catch (err) {
    if (!warnedPull) console.warn("Cue sync unavailable, using this browser's copy:", err);
    warnedPull = true;
  }
}

export async function pullSteps(renderFn) {
  if (!state.projectId) return;
  pulled = syncDown(renderFn);
  await pulled;
}

async function pushSteps() {
  await pulled;
  try {
    await putSteps(state.projectId, state.steps);
  } catch {
    if (toastedPush) return;
    toastedPush = true;
    showToast("Could not save cues to the server; kept in this browser.", "error");
  }
}

export function initStepsSync() {
  onStepsSaved(() => {
    if (applyingServer || !state.projectId) return;
    clearTimeout(timer);
    timer = setTimeout(pushSteps, 500);
  });
}
