const fs = require("fs/promises");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");
const { slugify, uniqueSlug } = require("./slug");
const zip = require("./zip");

const REPO_ROOT = path.join(__dirname, "..");
const PROJECTS_ROOT = path.join(REPO_ROOT, "projects");

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

module.exports = {
  REPO_ROOT,
  PROJECTS_ROOT,
  projectPaths,
  createProject,
  resolveProject,
  openProject,
  uploadArchive,
  addAudioFile,
  deleteAudioFile,
  loadProjectJson,
  slugFromDbRecord,
};
