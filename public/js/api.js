// Thin fetch wrappers for the project API. Transport only: callers decide what to show.

export async function openProject(id) {
  const res = await fetch(`/projects/${id}/open`, { method: "POST" });
  if (!res.ok) throw new Error("Project not found");
  return res.json();
}

export async function uploadAudio(id, file, type) {
  const form = new FormData();
  form.append("file", file);
  form.append("type", type);
  const res = await fetch(`/projects/${id}/audios/upload`, { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Upload failed");
  return json;
}

export async function deleteAudio(id, filename) {
  const res = await fetch(audioUrl(id, filename), { method: "DELETE" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Delete failed");
  return json;
}

export async function getSteps(id) {
  const res = await fetch(`/projects/${id}/steps`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Could not load cues");
  return json;
}

export async function putSteps(id, steps) {
  const res = await fetch(`/projects/${id}/steps`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ steps }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Could not save cues");
  return json;
}

export function audioUrl(id, filename) {
  return `/projects/${id}/audios/${encodeURIComponent(filename)}`;
}
