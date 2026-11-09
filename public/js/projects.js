import { initThemeSwitch } from "./theme.js";
import { showToast } from "./toast.js";
import { importProject } from "./api.js";

initThemeSwitch();

const projectList = document.getElementById("project-list");
const newProjectBtn = document.getElementById("newProjectBtn");
const projectDialog = document.getElementById("projectDialog");
const projectForm = document.getElementById("projectForm");
const dialogTitle = document.getElementById("dialogTitle");
const nameInput = document.getElementById("name");
const descriptionInput = document.getElementById("description");
const formError = document.getElementById("form-error");
const cancelBtn = document.getElementById("cancelBtn");
const createBtn = document.getElementById("createBtn");
const confirmDialog = document.getElementById("confirmDialog");
const confirmText = document.getElementById("confirmText");
const confirmError = document.getElementById("confirm-error");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const importBtn = document.getElementById("importProjectBtn");
const importFile = document.getElementById("importFile");

let editing = null; // { project, row } while renaming, null when creating
let pendingDelete = null; // { project, row } while the confirm dialog is open
let returnFocus = null; // the button that opened the open dialog

// textContent only: project names come from users and must never be parsed as HTML.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderProject(project) {
  const li = el("li", "project");
  const info = el("div");
  info.append(
    el("h3", "project__name", project.name),
    el("p", "project__desc", project.description || "No description.")
  );
  const meta = el("span", "project__meta", "Updated " + new Date(project.updatedAt).toLocaleDateString());
  const open = el("a", "btn", "Open");
  open.href = "soundboard.html?project=" + encodeURIComponent(project.id);
  const exportBtn = el("button", "btn btn--sm btn--ghost", "Export");
  exportBtn.type = "button";
  exportBtn.setAttribute("aria-label", `Export ${project.name}`);
  exportBtn.addEventListener("click", () => downloadExport(project));
  const rename = el("button", "btn btn--sm btn--ghost", "Rename");
  rename.type = "button";
  rename.addEventListener("click", () => openRename(project, li, rename));
  const remove = el("button", "btn btn--sm btn--ghost btn--danger", "Delete");
  remove.type = "button";
  remove.addEventListener("click", () => openDelete(project, li, remove));
  const actions = el("div", "project__actions");
  actions.append(open, exportBtn, rename, remove);
  li.append(info, meta, actions);
  return li;
}

// A temporary link click lets the browser handle the zip download natively.
function downloadExport(project) {
  const link = document.createElement("a");
  link.href = `/projects/${encodeURIComponent(project.id)}/export`;
  link.download = "";
  document.body.append(link);
  link.click();
  link.remove();
}

function renderEmpty() {
  const li = el("li", "empty-state");
  li.append(
    el("h2", null, "No projects yet"),
    el("p", null, "Create a project for your show, then add effects and music.")
  );
  projectList.replaceChildren(li);
}

function renderLoadError() {
  const li = el("li", "empty-state");
  const retry = el("button", "btn", "Try again");
  retry.type = "button";
  retry.addEventListener("click", loadProjects);
  li.append(el("h2", null, "Could not load projects"), retry);
  projectList.replaceChildren(li);
}

async function loadProjects() {
  try {
    const res = await fetch("/projects");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const { projects = [] } = await res.json();
    if (projects.length === 0) {
      renderEmpty();
      return;
    }
    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    projectList.replaceChildren(...projects.map(renderProject));
  } catch (err) {
    console.error(err);
    renderLoadError();
  }
}

function showError(msg, target = formError) {
  target.textContent = msg;
  target.hidden = !msg;
}

// Focus goes back to the button that opened the dialog, or to New project if that row is gone.
function restoreFocus() {
  (returnFocus?.isConnected ? returnFocus : newProjectBtn).focus();
}

// Runs on every close (Cancel, Escape, or success) so a reopened dialog starts clean.
projectDialog.addEventListener("close", () => {
  projectForm.reset();
  showError("");
  editing = null;
  restoreFocus();
});

confirmDialog.addEventListener("close", () => {
  showError("", confirmError);
  pendingDelete = null;
  restoreFocus();
});

newProjectBtn.addEventListener("click", () => {
  editing = null;
  returnFocus = newProjectBtn;
  dialogTitle.textContent = "New project";
  createBtn.textContent = "Create project";
  projectForm.reset();
  showError("");
  projectDialog.showModal();
  nameInput.focus();
});

function openRename(project, row, trigger) {
  editing = { project, row };
  returnFocus = trigger;
  dialogTitle.textContent = "Rename project";
  createBtn.textContent = "Save changes";
  nameInput.value = project.name;
  descriptionInput.value = project.description || "";
  showError("");
  projectDialog.showModal();
  nameInput.focus();
}

function openDelete(project, row, trigger) {
  pendingDelete = { project, row };
  returnFocus = trigger;
  confirmText.textContent = `Delete ${project.name}? Its audio files are removed from this computer. This cannot be undone.`;
  showError("", confirmError);
  confirmDialog.showModal();
  confirmCancelBtn.focus();
}

cancelBtn.addEventListener("click", () => projectDialog.close());
confirmCancelBtn.addEventListener("click", () => confirmDialog.close());

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) {
    showError("Enter a show name.");
    nameInput.focus();
    return;
  }

  const target = editing;
  showError("");
  createBtn.disabled = true;
  createBtn.textContent = target ? "Saving" : "Creating";
  try {
    const res = target
      ? await fetch(`/projects/${encodeURIComponent(target.project.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description: descriptionInput.value }),
        })
      : await fetch("/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description: descriptionInput.value }),
        });
    if (res.ok && target) {
      const { project } = await res.json();
      const row = renderProject(project);
      target.row.replaceWith(row);
      returnFocus = row.querySelector("button");
      projectDialog.close();
    } else if (res.ok) {
      projectDialog.close();
      await loadProjects();
    } else {
      const body = await res.json().catch(() => ({}));
      showError(body.error || (target ? "Could not rename the project." : "Could not create the project."));
    }
  } catch {
    showError("Could not reach the server.");
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = target ? "Save changes" : "Create project";
  }
});

confirmDeleteBtn.addEventListener("click", async () => {
  const target = pendingDelete;
  if (!target) return;
  showError("", confirmError);
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = "Deleting";
  try {
    const res = await fetch(`/projects/${encodeURIComponent(target.project.id)}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showError(body.error || "Could not delete the project.", confirmError);
      return;
    }
    target.row.remove();
    confirmDialog.close();
    if (!projectList.querySelector(".project")) renderEmpty();
    showToast(`Deleted ${target.project.name}`, "success");
  } catch {
    showError("Could not reach the server.", confirmError);
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Delete project";
  }
});

importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  if (!file) return;
  importBtn.disabled = true;
  try {
    const project = await importProject(file);
    await loadProjects();
    showToast(`Imported ${project.name}`, "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    importFile.value = "";
    importBtn.disabled = false;
  }
});

loadProjects();
