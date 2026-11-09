const fs = require("fs/promises");
const path = require("path");
const { DATA_DIR } = require("./config");

const DB_PATH = path.join(DATA_DIR, "db.json");

async function readDb() {
  try {
    return JSON.parse(await fs.readFile(DB_PATH, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return { projects: [] };
    throw err;
  }
}

// Atomic replace: a crash mid-write can never leave a truncated db.json.
async function writeDb(data) {
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

// Serialize read-modify-write so concurrent requests cannot lose updates.
let queue = Promise.resolve();
function mutate(fn) {
  const run = queue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

async function listProjects() {
  return (await readDb()).projects;
}

async function findProjectById(id) {
  return (await readDb()).projects.find((p) => p.id === id) ?? null;
}

function addProject(entry) {
  return mutate((db) => {
    db.projects.push(entry);
    return entry;
  });
}

function touchProject(id) {
  return mutate((db) => {
    const project = db.projects.find((p) => p.id === id);
    if (!project) return null;
    project.updatedAt = new Date().toISOString();
    return project;
  });
}

function updateProject(id, fields) {
  return mutate((db) => {
    const project = db.projects.find((p) => p.id === id);
    if (!project) return null;
    Object.assign(project, fields, { updatedAt: new Date().toISOString() });
    return project;
  });
}

function removeProject(id) {
  return mutate((db) => {
    const i = db.projects.findIndex((p) => p.id === id);
    if (i === -1) return null;
    return db.projects.splice(i, 1)[0];
  });
}

module.exports = {
  readDb,
  writeDb,
  listProjects,
  findProjectById,
  addProject,
  touchProject,
  updateProject,
  removeProject,
};
