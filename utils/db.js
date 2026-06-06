const fs = require("fs/promises");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "db.json");

async function readDb() {
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeDb(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function listProjects() {
  const db = await readDb();
  return db.projects;
}

async function findProjectById(id) {
  const db = await readDb();
  return db.projects.find((p) => p.id === id) ?? null;
}

async function addProject(entry) {
  const db = await readDb();
  db.projects.push(entry);
  await writeDb(db);
  return entry;
}

async function touchProject(id) {
  const db = await readDb();
  const project = db.projects.find((p) => p.id === id);
  if (!project) return null;
  project.updatedAt = new Date().toISOString();
  await writeDb(db);
  return project;
}

module.exports = {
  readDb,
  writeDb,
  listProjects,
  findProjectById,
  addProject,
  touchProject,
};
