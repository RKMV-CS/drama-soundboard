const fs = require("fs/promises");
const path = require("path");
const AdmZip = require("adm-zip");

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".aac",
  ".flac",
  ".webm",
]);

function isAudioFile(filename) {
  return AUDIO_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

async function clearDirectory(dir) {
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map((entry) =>
      fs.rm(path.join(dir, entry.name), { recursive: true, force: true })
    )
  );
}

/**
 * Extract archive.zip into audios/. Clears audios/ first (safe overwrite).
 * Returns sorted list of extracted audio filenames (top-level only).
 */
async function extractArchive(archivePath, audiosDir) {
  await clearDirectory(audiosDir);

  const zip = new AdmZip(archivePath);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);

  for (const entry of entries) {
    const baseName = path.basename(entry.entryName);
    if (!baseName || baseName.startsWith(".") || !isAudioFile(baseName)) {
      continue;
    }
    const target = path.join(audiosDir, baseName);
    await fs.writeFile(target, entry.getData());
  }

  return listAudioFiles(audiosDir);
}

async function listAudioFiles(audiosDir) {
  try {
    const names = await fs.readdir(audiosDir);
    return names.filter(isAudioFile).sort((a, b) => a.localeCompare(b));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function archiveExists(archivePath) {
  try {
    await fs.access(archivePath);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  extractArchive,
  listAudioFiles,
  clearDirectory,
  archiveExists,
  isAudioFile,
};
