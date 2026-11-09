# Packaging spike: Go vs Node

Measured on Windows 10, Node v24.10.0, Bun 1.4.3, the server as of the Phase 4 commit
(Express, multer, adm-zip, about 700 lines). Cold start is process start until `/health` answers,
median of two runs after the first (the first run of a fresh unsigned exe is slow from the virus scan).

| Build | Size | Cold start | Notes |
|---|---|---|---|
| `node entry.js` (needs Node installed) | 0 + node_modules 4.9 MB | about 650 ms | the current dev path |
| Node SEA (single executable) | 87 MB | about 340-420 ms | official, bundles to one 1.2 MB script first |
| `bun build --compile` | 93 MB | about 360 ms | needed a separate entry file (see below) |
| Go rewrite | about 10-15 MB | not measured | Go is not installed here; a rewrite of ~700 lines plus zip handling and the API tests |
| Node + installer only | n/a | n/a | not measured; a wrapper around one of the above |

## Findings

- Both Node routes land near 90 MB because they embed the whole runtime. Cold start is under half a second either way.
- `bun build --compile` treats a CommonJS entry that exports `{ app, init }` as a server config and crashes
  (`Bun.serve() needs either routes ...`). Fix: a tiny entry file that requires `server.js` and calls `listen`.
- A compiled build resolves `__dirname` to the build-time path, so `express.static(public/)` silently serves from the
  build machine's folder. Shipping a single file means embedding `public/` (Node SEA `assets` plus `sea.getAsset`, or
  Bun's embedded files) and replacing `express.static` with a handler that reads from them. Not built in the spike.
- Node SEA output is unsigned; Windows SmartScreen will warn until it is code-signed.

## Recommendation

Stay on Node. The 75 MB saved by Go does not justify rewriting and re-testing the backend, and the planned MCP server
(script to cues) is a natural Node/TypeScript fit. Ship Node SEA, with `public/` embedded, behind the existing
launcher (`bin/launch.js`), or a plain installer that carries Node. Revisit Go only if download size or
memory use becomes a real complaint after the first users.

Open before shipping: embed `public/` in the SEA build, sign the exe, decide where project data lives
(`DRAMA_DATA_DIR`, per-user app-data folder instead of next to the exe).
