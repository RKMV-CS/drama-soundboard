require('dotenv').config();
const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const db = require("./utils/db");
const projects = require("./utils/projects");
const zip = require("./utils/zip");

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: { fileSize: 200 * 1024 * 1024 },
});

const uploadAudio = multer({
  dest: path.join(__dirname, "uploads"),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, zip.isAudioFile(file.originalname));
  },
});

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get(
  "/projects",
  asyncHandler(async (_req, res) => {
    const list = await db.listProjects();
    res.json({ projects: list });
  })
);

app.post(
  "/projects",
  asyncHandler(async (req, res) => {
    const { name, description } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const created = await projects.createProject({
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
    });
    res.status(201).json({ project: created });
  })
);

app.get(
  "/projects/:id",
  asyncHandler(async (req, res) => {
    const resolved = await projects.resolveProject(req.params.id);
    if (!resolved) {
      return res.status(404).json({ error: "Project not found" });
    }
    const meta = await projects.loadProjectJson(resolved.slug);
    res.json({
      project: { ...resolved.record, slug: resolved.slug, ...meta },
    });
  })
);

/**
 * Open project (frontend: call when user selects a project).
 * Extracts archive.zip into audios/ when archive exists and extraction is stale.
 * Does not re-extract if audios are already up to date with the archive.
 */
app.post(
  "/projects/:id/open",
  asyncHandler(async (req, res) => {
    const result = await projects.openProject(req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(result);
  })
);

app.post(
  "/projects/:id/upload",
  upload.single("archive"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "archive zip file is required (field: archive)" });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== ".zip") {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: "Only .zip archives are accepted" });
    }

    try {
      const result = await projects.uploadArchive(req.params.id, req.file.path);
      if (!result) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json({
        message: "Archive uploaded and extracted",
        audioFiles: result.audioFiles,
        archiveUpdatedAt: result.archiveUpdatedAt,
      });
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  })
);

app.post(
  "/projects/:id/audios/upload",
  uploadAudio.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "audio file is required (field: file)" });
    }
    const type = req.body.type === "bgm" ? "bgm" : "effects";
    try {
      const result = await projects.addAudioFile(req.params.id, req.file.path, req.file.originalname, type);
      if (!result) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(201).json({ filename: result.filename, type });
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  })
);

app.get(
  "/projects/:id/audios",
  asyncHandler(async (req, res) => {
    const resolved = await projects.resolveProject(req.params.id);
    if (!resolved) {
      return res.status(404).json({ error: "Project not found" });
    }
    const files = await zip.listAudioFiles(resolved.paths.audiosDir);
    const baseUrl = `/projects/${req.params.id}/audios`;
    res.json({
      audios: files.map((filename) => ({
        filename,
        url: `${baseUrl}/${encodeURIComponent(filename)}`,
      })),
    });
  })
);

app.get(
  "/projects/:id/audios/:filename",
  asyncHandler(async (req, res) => {
    const resolved = await projects.resolveProject(req.params.id);
    if (!resolved) {
      return res.status(404).json({ error: "Project not found" });
    }
    const filename = path.basename(req.params.filename);
    if (!zip.isAudioFile(filename)) {
      return res.status(400).json({ error: "Invalid audio file" });
    }
    const filePath = path.join(resolved.paths.audiosDir, filename);
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: "Audio file not found" });
    }
    res.sendFile(filePath);
  })
);

app.delete(
  "/projects/:id/audios/:filename",
  asyncHandler(async (req, res) => {
    const filename = path.basename(req.params.filename);
    if (!zip.isAudioFile(filename)) {
      return res.status(400).json({ error: "Invalid audio file" });
    }
    const deleted = await projects.deleteAudioFile(req.params.id, filename);
    if (!deleted) {
      return res.status(404).json({ error: "Project or file not found" });
    }
    res.json({ deleted: filename });
  })
);

app.get(
  "/projects/:id/download",
  asyncHandler(async (req, res) => {
    const resolved = await projects.resolveProject(req.params.id);
    if (!resolved) {
      return res.status(404).json({ error: "Project not found" });
    }
    const exists = await zip.archiveExists(resolved.paths.archivePath);
    if (!exists) {
      return res.status(404).json({ error: "No archive.zip for this project" });
    }
    res.download(resolved.paths.archivePath, "archive.zip");
  })
);

app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

async function start() {
  await fs.mkdir(path.join(__dirname, "uploads"), { recursive: true });
  await fs.mkdir(projects.PROJECTS_ROOT, { recursive: true });
  app.listen(PORT, () => {
    console.log(`Drama soundboard API listening on http://localhost:${PORT}`);
  });
}

start();
