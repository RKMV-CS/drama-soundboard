// Upload, drop and delete handling for the effects and BGM libraries.
import { state, saveKeybinds } from "./store.js";
import { uploadAudio, deleteAudio, audioUrl } from "./api.js";
import { renderTrack, removeRow } from "./tracks.js";
import { playBGM, toggleFX } from "./audio.js";
import { showToast } from "./toast.js";

const DROP_ZONES = [
  ["fileDropEffect", "effects"],
  ["fileDropBGM", "bgm"],
];
const UPLOAD_INPUTS = [
  ["effectUpload", "effects"],
  ["bgmUpload", "bgm"],
];

function handlersFor(type) {
  return {
    onPlay: type === "bgm" ? (source, row) => playBGM(source, row, true) : (source, row) => toggleFX(source, row),
    onRemove: (fileName, t, row) => deleteTrack(fileName, t, row),
  };
}

// Registers a file in the library and renders its row (used for server files and fresh uploads).
export function addLibraryTrack(name, url, type) {
  state.library[type][name] = url;
  return renderTrack(name, url, type, handlersFor(type));
}

export async function uploadAudioFile(file, type) {
  if (!state.projectId) {
    addLibraryTrack(file.name, URL.createObjectURL(file), type);
    return;
  }
  try {
    const data = await uploadAudio(state.projectId, file, type);
    addLibraryTrack(data.filename, audioUrl(state.projectId, data.filename), type);
    showToast(`Saved: ${data.filename}`, "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function forget(fileName, type) {
  delete state.library[type][fileName];
  delete state.keybinds[fileName];
  saveKeybinds();
}

export async function deleteTrack(fileName, type, row) {
  if (!state.projectId) {
    const src = state.library[type][fileName];
    if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
    forget(fileName, type);
    removeRow(row);
    return;
  }
  try {
    await deleteAudio(state.projectId, fileName);
    forget(fileName, type);
    removeRow(row);
    showToast(`Removed: ${fileName}`, "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function uploadDropped(files, type) {
  const audio = [...(files || [])].filter((f) => f.type.startsWith("audio/"));
  if (audio.length === 0) {
    showToast("Drop audio files only", "error");
    return;
  }
  for (const file of audio) await uploadAudioFile(file, type);
}

function wireDropZone(id, type) {
  const zone = document.getElementById(id);
  if (!zone) return;
  const over = (e) => {
    e.preventDefault();
    zone.classList.add("is-over");
  };
  zone.addEventListener("dragenter", over);
  zone.addEventListener("dragover", over);
  zone.addEventListener("dragleave", (e) => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove("is-over");
  });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("is-over");
    uploadDropped(e.dataTransfer?.files, type);
  });
}

function wireUploadInput(id, type) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("change", async () => {
    const files = [...input.files];
    input.value = "";
    for (const file of files) await uploadAudioFile(file, type);
  });
}

export function initLibrary() {
  for (const [id, type] of DROP_ZONES) wireDropZone(id, type);
  for (const [id, type] of UPLOAD_INPUTS) wireUploadInput(id, type);
}
