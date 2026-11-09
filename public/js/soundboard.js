// Entry point (loaded as a module). Wires the feature modules together; no globals on window.
import { initThemeSwitch } from "./theme.js";
import { initVolume, stopEffect, stopBGM, stopAll } from "./audio.js";
import { initLibrary, addLibraryTrack } from "./library.js";
import { initSteps, renderSteps } from "./steps.js";
import { initKeys } from "./keys.js";
import { initShowMode } from "./show-mode.js";
import { openProject, audioUrl } from "./api.js";
import { initStepsSync, pullSteps } from "./steps-sync.js";
import { state, loadKeybinds, loadSteps } from "./store.js";
import { renderEmptyHints } from "./tracks.js";
import { showToast } from "./toast.js";

function wireButton(id, handler) {
  document.getElementById(id)?.addEventListener("click", handler);
}

function applyProjectMeta(project) {
  const title = document.getElementById("project-title");
  if (title && project?.name) title.textContent = project.name;
}

async function initProject() {
  const projectId = state.projectId;
  if (!projectId) return;
  try {
    const data = await openProject(projectId);
    applyProjectMeta(data.project);
    loadKeybinds(); // before rendering tracks so the saved binds show
    const categories = data.project?.categories || {};
    for (const filename of data.audios || []) {
      const type = categories[filename] === "bgm" ? "bgm" : "effects";
      addLibraryTrack(filename, audioUrl(projectId, filename), type);
    }
  } catch (err) {
    console.error("initProject failed:", err);
    showToast("Failed to load project", "error");
  }
}

function init() {
  state.projectId = new URLSearchParams(window.location.search).get("project");

  initThemeSwitch();
  initVolume();
  initLibrary();
  initSteps();
  initStepsSync();
  initKeys();
  initShowMode();
  renderEmptyHints();

  wireButton("stopFxBtn", () => stopEffect());
  wireButton("stopBgmBtn", () => stopBGM());
  wireButton("stopAllBtn", () => stopAll());

  initProject().then(() => {
    loadSteps();
    renderSteps();
    pullSteps(renderSteps);
  });
}

init();
