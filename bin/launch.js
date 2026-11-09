// Starts the API server on a free port and opens the UI in a chromeless app window.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");

const { isPackaged } = require("../utils/config");

// A packaged build is one executable: it runs itself again with --server instead of "node server.js".
const SERVER_ARGS = isPackaged() ? ["--server"] : [path.join(__dirname, "..", "server.js")];
// Dedicated profile so the window opens on its own and does not join an open browser.
const PROFILE_DIR = path.join(os.tmpdir(), "drama-soundboard-profile");

function browserCandidates(platform, env) {
  if (platform === "win32") {
    const local = env.LOCALAPPDATA ? [`${env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`] : [];
    return [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      ...local,
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
  }
  if (platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
  }
  // Linux: look each name up on PATH.
  const dirs = (env.PATH || "").split(":").filter(Boolean);
  const names = ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"];
  return names.flatMap((n) => dirs.map((d) => `${d}/${n}`));
}

function findBrowser(platform, env = process.env, exists = fs.existsSync) {
  return browserCandidates(platform, env).find((p) => exists(p)) || null;
}

function buildArgs(url, profileDir) {
  return [`--app=${url}`, `--user-data-dir=${profileDir}`, "--window-size=1280,800"];
}

// Binds the same way server.js does (all interfaces), so a free result here is really free.
function probePort(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, () => srv.close(() => resolve(true)));
  });
}

async function pickPort(start, isFree = probePort) {
  for (let port = start; port < start + 20; port++) {
    if (await isFree(port)) return port;
  }
  throw new Error(`no free port in ${start}-${start + 19}`);
}

async function waitForHealth(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url + "health", { signal: AbortSignal.timeout(1000) });
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`server did not answer ${url}health within ${timeoutMs / 1000} s`);
}

function prefixLines(stream, out) {
  readline.createInterface({ input: stream }).on("line", (l) => out.write(`[server] ${l}\n`));
}

async function main() {
  const port = await pickPort(Number(process.env.PORT) || 3000);
  const url = `http://127.0.0.1:${port}/`;

  const server = spawn(process.execPath, SERVER_ARGS, {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  prefixLines(server.stdout, process.stdout);
  prefixLines(server.stderr, process.stderr);
  process.on("exit", () => server.kill());

  let stopping = false;
  const stop = (code, msg) => {
    stopping = true;
    if (msg) console.error(msg);
    server.kill();
    process.exit(code);
  };
  server.on("exit", (code) => {
    if (!stopping) stop(code || 1, `[server] exited with code ${code}`);
  });
  process.on("SIGINT", () => stop(0));
  process.on("SIGTERM", () => stop(0));

  try {
    await waitForHealth(url);
  } catch (err) {
    stop(1, err.message);
  }

  const exe = findBrowser(process.platform);
  const noBrowser = () =>
    console.log(`No Chrome or Edge found. Open ${url} in a browser. Press Ctrl+C to stop the server.`);
  if (!exe) return noBrowser();

  const startedAt = Date.now();
  const browser = spawn(exe, buildArgs(url, PROFILE_DIR), { stdio: "ignore" });
  browser.on("error", (err) => {
    console.error(`[launch] could not start browser: ${err.message}`);
    noBrowser();
  });
  browser.on("exit", (code) => {
    if (Date.now() - startedAt < 2000 && code === 0) {
      console.log("Window handed to an already-running browser. Server stays up until Ctrl+C.");
      return;
    }
    stop(0); // window closed
  });
  console.log(`Opened ${url}`);
}

module.exports = { main, pickPort, findBrowser, buildArgs };

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
