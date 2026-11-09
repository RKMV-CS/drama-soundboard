import { initThemeSwitch } from "./theme.js";

initThemeSwitch();

const projectList = document.getElementById("project-list");
const newProjectBtn = document.getElementById("newProjectBtn");
const projectDialog = document.getElementById("projectDialog");
const projectForm = document.getElementById("projectForm");
const nameInput = document.getElementById("name");
const descriptionInput = document.getElementById("description");
const formError = document.getElementById("form-error");
const cancelBtn = document.getElementById("cancelBtn");
const createBtn = document.getElementById("createBtn");

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
  li.append(info, meta, open);
  return li;
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

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = !msg;
}

// Runs on every close (Cancel, Escape, or success) so a reopened dialog starts clean.
projectDialog.addEventListener("close", () => {
  projectForm.reset();
  showError("");
});

newProjectBtn.addEventListener("click", () => {
  projectForm.reset();
  showError("");
  projectDialog.showModal();
  nameInput.focus();
});

cancelBtn.addEventListener("click", () => projectDialog.close());

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) {
    showError("Enter a show name.");
    nameInput.focus();
    return;
  }

  showError("");
  createBtn.disabled = true;
  createBtn.textContent = "Creating";
  try {
    const res = await fetch("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: descriptionInput.value }),
    });
    if (res.ok) {
      projectDialog.close();
      await loadProjects();
    } else {
      const body = await res.json().catch(() => ({}));
      showError(body.error || "Could not create the project.");
    }
  } catch {
    showError("Could not reach the server.");
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = "Create project";
  }
});

loadProjects();
