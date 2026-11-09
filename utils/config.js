const path = require("path");

// Where db.json, projects/ and uploads/ live. Defaults to the repo root;
// tests and packaged builds point it elsewhere via DRAMA_DATA_DIR.
const DATA_DIR = process.env.DRAMA_DATA_DIR
  ? path.resolve(process.env.DRAMA_DATA_DIR)
  : path.join(__dirname, "..");

module.exports = { DATA_DIR };
