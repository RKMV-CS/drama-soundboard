const fs = require("fs");
const path = require("path");
const http = require("http");
const AdmZip = require("adm-zip");

const BASE = "http://127.0.0.1:3000";

function request(method, urlPath, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: headers || {},
    };
    if (body && !opts.headers["Content-Length"]) {
      opts.headers["Content-Length"] = Buffer.byteLength(body);
    }
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          /* not json */
        }
        resolve({ status: res.statusCode, json, text });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function multipartUpload(urlPath, filePath, fieldName = "archive") {
  const boundary = "----smoke" + Date.now();
  const fileName = path.basename(filePath);
  const fileData = fs.readFileSync(filePath);
  const head =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n` +
    `Content-Type: application/zip\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(head), fileData, Buffer.from(tail)]);

  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const req = http.request(
      {
        method: "POST",
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({ status: res.statusCode, json: JSON.parse(Buffer.concat(chunks).toString()) });
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const health = await request("GET", "/health");
  if (health.status !== 200) throw new Error("health failed");

  const created = await request("POST", "/projects", {
    body: JSON.stringify({ name: "Smoke Test Drama", description: "API smoke test" }),
    headers: { "Content-Type": "application/json" },
  });
  if (created.status !== 201) throw new Error("create failed: " + created.text);
  const id = created.json.project.id;

  const tmpDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "drama-smoke-"));
  const wavPath = path.join(tmpDir, "beep.wav");
  fs.writeFileSync(wavPath, Buffer.from("RIFF    WAVEfmt ", "ascii"));

  const zipPath = path.join(tmpDir, "test.zip");
  const zipFile = new AdmZip();
  zipFile.addLocalFile(wavPath);
  zipFile.writeZip(zipPath);

  const upload = await multipartUpload(`/projects/${id}/upload`, zipPath);
  if (upload.status !== 200) throw new Error("upload failed: " + JSON.stringify(upload));

  const opened = await request("POST", `/projects/${id}/open`);
  if (opened.status !== 200 || !opened.json.audios?.length) {
    throw new Error("open failed: " + opened.text);
  }

  const audios = await request("GET", `/projects/${id}/audios`);
  if (audios.status !== 200 || audios.json.audios.length < 1) {
    throw new Error("audios list failed");
  }

  const list = await request("GET", "/projects");
  if (list.status !== 200 || !list.json.projects.some((p) => p.id === id)) {
    throw new Error("list failed");
  }

  console.log("smoke test passed", { id, audios: audios.json.audios });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
