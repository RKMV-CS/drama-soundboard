const fs = require("fs/promises");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");
const { slugify, uniqueSlug } = require("./slug");
const zip = require("./zip");
const AdmZip = require("adm-zip");

const { DATA_DIR } = require("./config");

const REPO_ROOT = DATA_DIR;
const PROJECTS_ROOT = path.join(DATA_DIR, "projects");

function projectRoot(slug) {
  return path.join(PROJECTS_ROOT, slug);
}

function projectPaths(slug) {
  const root = projectRoot(slug);
  return {
    root,
    metaPath: path.join(root, "project.json"),
    audiosDir: path.join(root, "audios"),
    archivePath: path.join(root, "archive.zip"),
  };
}

const stepsPath = (slug) => path.join(projectRoot(slug), "steps.json");

async function loadProjectJson(slug) {
  const { metaPath } = projectPaths(slug);
  try {
    const raw = await fs.readFile(metaPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { name: slug, description: "", audioFiles: [], categories: {}, archiveUpdatedAt: null, extractedAt: null };
  }
}

async function saveProjectJson(slug, meta) {
  const { metaPath } = projectPaths(slug);
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
}

async function ensureProjectDirs(slug) {
  const { audiosDir } = projectPaths(slug);
  await fs.mkdir(audiosDir, { recursive: true });
}

function slugFromDbRecord(record) {
  return path.basename(record.path.replace(/\\/g, "/"));
}

async function createProject({ name, description = "" }) {
  const baseSlug = slugify(name);
  const slug = await uniqueSlug(baseSlug, async (candidate) => {
    try {
      await fs.access(projectRoot(candidate));
      return true;
    } catch {
      return false;
    }
  });

  await ensureProjectDirs(slug);

  const now = new Date().toISOString();
  const meta = {
    name,
    description,
    audioFiles: [],
    categories: {},
    archiveUpdatedAt: null,
    extractedAt: null,
  };
  await saveProjectJson(slug, meta);

  const id = uuidv4();
  const relativePath = `./projects/${slug}`;
  const entry = {
    id,
    name,
    description,
    path: relativePath,
    createdAt: now,
    updatedAt: now,
  };
  await db.addProject(entry);

  console.log(`[project] created id=${id} slug=${slug} name="${name}"`);
  return { ...entry, slug };
}

async function resolveProject(id) {
  const record = await db.findProjectById(id);
  if (!record) return null;
  const slug = slugFromDbRecord(record);
  const paths = projectPaths(slug);
  try {
    await fs.access(paths.metaPath);
  } catch {
    return null;
  }
  return { record, slug, paths };
}

/**
 * Open project: extract archive.zip into audios/ when needed.
 * Extraction runs when:
 * - archive exists AND (no extractedAt, audios empty, or archive newer than extractedAt)
 * Frontend should call POST /projects/:id/open when user selects a project.
 */
async function openProject(id) {
  const resolved = await resolveProject(id);
  if (!resolved) return null;

  const { record, slug, paths } = resolved;
  const meta = await loadProjectJson(slug);
  let extracted = false;
  let audioFiles = meta.audioFiles ?? [];

  const hasArchive = await zip.archiveExists(paths.archivePath);
  if (hasArchive) {
    const archiveStat = await fs.stat(paths.archivePath);
    const archiveMtime = archiveStat.mtime.toISOString();
    const onDisk = await zip.listAudioFiles(paths.audiosDir);
    const needsExtract =
      !meta.extractedAt ||
      onDisk.length === 0 ||
      (meta.archiveUpdatedAt && meta.archiveUpdatedAt > meta.extractedAt);

    if (needsExtract) {
      console.log(`[extract] project id=${id} slug=${slug} from archive.zip`);
      audioFiles = await zip.extractArchive(paths.archivePath, paths.audiosDir);
      meta.audioFiles = audioFiles;
      meta.extractedAt = new Date().toISOString();
      meta.archiveUpdatedAt = meta.archiveUpdatedAt || archiveMtime;
      await saveProjectJson(slug, meta);
      extracted = true;
      console.log(`[extract] done id=${id} files=${audioFiles.length}`);
    } else {
      audioFiles = onDisk.length ? onDisk : audioFiles;
      if (JSON.stringify(meta.audioFiles) !== JSON.stringify(audioFiles)) {
        meta.audioFiles = audioFiles;
        await saveProjectJson(slug, meta);
      }
    }
  } else {
    audioFiles = await zip.listAudioFiles(paths.audiosDir);
    meta.audioFiles = audioFiles;
    await saveProjectJson(slug, meta);
  }

  await db.touchProject(id);
  const updated = await db.findProjectById(id);

  return {
    project: { ...updated, slug, ...meta },
    audios: audioFiles,
    extracted,
  };
}

async function uploadArchive(id, filePath) {
  const resolved = await resolveProject(id);
  if (!resolved) return null;

  const { slug, paths } = resolved;
  await ensureProjectDirs(slug);
  await fs.copyFile(filePath, paths.archivePath);
  const now = new Date().toISOString();

  let audioFiles = [];
  try {
    audioFiles = await zip.extractArchive(paths.archivePath, paths.audiosDir);
  } catch (err) {
    console.error(`[upload] extraction failed id=${id}:`, err.message);
    await fs.unlink(paths.archivePath).catch(() => {});
    throw err;
  }

  const meta = await loadProjectJson(slug);
  meta.audioFiles = audioFiles;
  meta.archiveUpdatedAt = now;
  meta.extractedAt = now;
  await saveProjectJson(slug, meta);
  await db.touchProject(id);

  console.log(`[upload] extracted id=${id} files=${audioFiles.length}`);
  return { audioFiles, archiveUpdatedAt: now };
}

async function addAudioFile(id, tempPath, originalName, type) {
  const resolved = await resolveProject(id);
  if (!resolved) return null;

  const { slug, paths } = resolved;
  await ensureProjectDirs(slug);

  const filename = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!filename || filename.startsWith('.') || !zip.isAudioFile(filename)) {
    throw new Error('Invalid audio filename');
  }
  const dest = path.join(paths.audiosDir, filename);
  await fs.copyFile(tempPath, dest);

  const meta = await loadProjectJson(slug);
  if (!meta.audioFiles.includes(filename)) meta.audioFiles.push(filename);
  if (!meta.categories) meta.categories = {};
  meta.categories[filename] = type;
  await saveProjectJson(slug, meta);
  await db.touchProject(id);

  return { filename };
}

async function deleteAudioFile(id, filename) {
  const resolved = await resolveProject(id);
  if (!resolved) return null;

  const { slug, paths } = resolved;
  const filePath = path.join(paths.audiosDir, filename);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') return null;
    // file already gone — still clean up stale metadata below
  }

  const meta = await loadProjectJson(slug);
  meta.audioFiles = meta.audioFiles.filter(f => f !== filename);
  if (meta.categories) delete meta.categories[filename];
  await saveProjectJson(slug, meta);
  await db.touchProject(id);
  return true;
}

// Renames only: the slug and folder never change.
async function updateProject(id, fields) {
  const resolved = await resolveProject(id);
  if (!resolved) return null;

  const { slug } = resolved;
  const meta = await loadProjectJson(slug);
  Object.assign(meta, fields);
  await saveProjectJson(slug, meta);
  const record = await db.updateProject(id, fields);
  return { ...record, slug, ...meta };
}

async function deleteProject(id) {
  const record = await db.findProjectById(id);
  if (!record) return null;

  const slug = slugFromDbRecord(record);
  const root = path.resolve(projectRoot(slug));
  if (!root.startsWith(path.resolve(PROJECTS_ROOT) + path.sep)) {
    throw new Error("Refusing to delete a folder outside the projects root");
  }
  await fs.rm(root, { recursive: true, force: true });
  await db.removeProject(id);
  return true;
}

async function getSteps(id) {
  const resolved = await resolveProject(id);
  if (!resolved) return null;
  try {
    return JSON.parse(await fs.readFile(stepsPath(resolved.slug), "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// Atomic replace, same tmp-then-rename pattern as db.json.
async function setSteps(id, steps) {
  const resolved = await resolveProject(id);
  if (!resolved) return null;
  const file = stepsPath(resolved.slug);
  const tmp = `${file}.${uuidv4()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(steps, null, 2), "utf8");
  await fs.rename(tmp, file);
  return steps;
}

const EXPORT_FORMAT = "drama-soundboard-project";
const MAX_IMPORT_AUDIOS = 500;
const MAX_IMPORT_BYTES = 1024 * 1024 * 1024;

function isValidSteps(steps) {
  return (
    Array.isArray(steps) &&
    steps.length <= 500 &&
    steps.every(
      (s) => s && typeof s === "object" && !Array.isArray(s) && typeof s.type === "string" && s.type.length <= 40
    )
  );
}

async function exportProject(id) {
  const resolved = await resolveProject(id);
  if (!resolved) return null;
  const { slug, paths } = resolved;
  const meta = await loadProjectJson(slug);

  const archive = new AdmZip();
  const manifest = {
    format: EXPORT_FORMAT,
    version: 1,
    name: meta.name,
    description: meta.description ?? "",
    exportedAt: new Date().toISOString(),
  };
  archive.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
  archive.addFile("project.json", Buffer.from(JSON.stringify(meta, null, 2)));
  const steps = await getSteps(id);
  if (steps && steps.length) {
    archive.addFile("steps.json", Buffer.from(JSON.stringify(steps, null, 2)));
  }
  for (const filename of await zip.listAudioFiles(paths.audiosDir)) {
    archive.addLocalFile(path.join(paths.audiosDir, filename), "audios/");
  }
  return { slug, buffer: archive.toBuffer() };
}

// Validates the whole zip before creating anything, so bad input leaves no project behind.
async function importProject(zipPath) {
  const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

  let archive;
  try {
    archive = new AdmZip(zipPath);
  } catch {
    throw badRequest("Not a valid zip file");
  }

  const readJson = (entryName) => {
    const entry = archive.getEntry(entryName);
    if (!entry) return undefined;
    try {
      return JSON.parse(entry.getData().toString("utf8"));
    } catch {
      return undefined;
    }
  };

  const manifest = readJson("manifest.json");
  if (!manifest || manifest.format !== EXPORT_FORMAT || manifest.version !== 1) {
    throw badRequest("manifest.json missing or not a drama-soundboard project export (version 1)");
  }

  const audioByName = new Map();
  for (const entry of archive.getEntries()) {
    if (entry.isDirectory || !entry.entryName.startsWith("audios/")) continue;
    const filename = path.basename(entry.entryName);
    if (filename.startsWith(".") || !zip.isAudioFile(filename) || audioByName.has(filename)) continue;
    audioByName.set(filename, entry);
  }
  if (audioByName.size > MAX_IMPORT_AUDIOS) {
    throw badRequest(`Too many audio files (max ${MAX_IMPORT_AUDIOS})`);
  }
  const totalBytes = [...audioByName.values()].reduce((sum, e) => sum + e.header.size, 0);
  if (totalBytes > MAX_IMPORT_BYTES) {
    throw badRequest("Audio files exceed the 1 GiB import limit");
  }

  const projectMeta = readJson("project.json") ?? {};
  const steps = readJson("steps.json");
  const trimmedName = typeof manifest.name === "string" ? manifest.name.trim() : "";
  const name = trimmedName.length >= 1 && trimmedName.length <= 100 ? trimmedName : "Imported show";
  const description = typeof manifest.description === "string" ? manifest.description.trim().slice(0, 1000) : "";

  const created = await createProject({ name, description });
  try {
    const { audiosDir } = projectPaths(created.slug);
    for (const [filename, entry] of audioByName) {
      await fs.writeFile(path.join(audiosDir, filename), entry.getData());
    }

    const meta = await loadProjectJson(created.slug);
    meta.audioFiles = [...audioByName.keys()].sort((a, b) => a.localeCompare(b));
    const categories = projectMeta.categories && typeof projectMeta.categories === "object" ? projectMeta.categories : {};
    meta.categories = Object.fromEntries(
      Object.entries(categories).filter(([f, type]) => audioByName.has(f) && typeof type === "string")
    );
    await saveProjectJson(created.slug, meta);

    if (isValidSteps(steps)) await setSteps(created.id, steps);
    return created;
  } catch (err) {
    await deleteProject(created.id).catch(() => {});
    throw err;
  }
}

module.exports = {
  REPO_ROOT,
  exportProject,
  importProject,
  isValidSteps,
  PROJECTS_ROOT,
  projectPaths,
  createProject,
  resolveProject,
  openProject,
  uploadArchive,
  addAudioFile,
  deleteAudioFile,
  updateProject,
  deleteProject,
  getSteps,
  setSteps,
  loadProjectJson,
  slugFromDbRecord,
};
