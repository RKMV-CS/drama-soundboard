const fs = require("fs");
const os = require("os");
const path = require("path");

// Isolated data dir per test process. Must be required BEFORE any app module,
// because utils/config.js reads DRAMA_DATA_DIR at load time.
function useTempDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drama-test-"));
  process.env.DRAMA_DATA_DIR = dir;
  return dir;
}

module.exports = { useTempDataDir };
