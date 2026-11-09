const path = require("path");
const os = require("os");

const APP_DIR = "Drama Soundboard";

// Per-user data folder for installed builds, so shows survive an app update and never sit next to the exe.
function userDataDir({ platform = process.platform, env = process.env, home = os.homedir() } = {}) {
  if (platform === "win32") return path.join(env.APPDATA || path.join(home, "AppData", "Roaming"), APP_DIR);
  if (platform === "darwin") return path.join(home, "Library", "Application Support", APP_DIR);
  return path.join(env.XDG_DATA_HOME || path.join(home, ".local", "share"), "drama-soundboard");
}

function isPackaged() {
  try {
    return require("node:sea").isSea();
  } catch {
    return false; // node:sea is missing before Node 20.12
  }
}

// DRAMA_DATA_DIR wins. A packaged build uses the per-user folder. A source checkout keeps its data in the repo root.
function resolveDataDir({ env = process.env, packaged = isPackaged(), platform, home } = {}) {
  if (env.DRAMA_DATA_DIR) return path.resolve(env.DRAMA_DATA_DIR);
  if (packaged) return userDataDir({ platform, env, home });
  return path.join(__dirname, "..");
}

const DATA_DIR = resolveDataDir();

module.exports = { DATA_DIR, resolveDataDir, userDataDir, isPackaged };
