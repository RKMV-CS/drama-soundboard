import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const frames = process.argv.slice(2).map(Number);
const entry = path.resolve("src/index.ts");
const serveUrl = await bundle({ entryPoint: entry });
const composition = await selectComposition({ serveUrl, id: "Explainer" });
fs.mkdirSync("stills", { recursive: true });
for (const frame of frames) {
  await renderStill({ composition, serveUrl, frame, output: `stills/f${String(frame).padStart(4, "0")}.png`, imageFormat: "jpeg", jpegQuality: 70 });
  console.log("done", frame);
}
