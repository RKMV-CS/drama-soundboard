// Per-track volume levels, remembered per project in localStorage. DOM-free.
const KEY = (projectId) => `sb_levels_${projectId || ""}`;

function readAll(projectId) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY(projectId)));
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    return {}; // storage blocked or corrupt JSON
  }
}

const clamp01 = (n) => Math.min(1, Math.max(0, n));

export function loadLevel(projectId, name) {
  const value = readAll(projectId)[name];
  return typeof value === "number" && Number.isFinite(value) ? clamp01(value) : 1;
}

export function saveLevel(projectId, name, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  try {
    const all = readAll(projectId);
    all[name] = clamp01(value);
    localStorage.setItem(KEY(projectId), JSON.stringify(all));
  } catch {
    // storage blocked or full: the level still applies for this session
  }
}
