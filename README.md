# Drama Soundboard

A local-first soundboard for live theatre and drama sound cues. Load a project with its sound effects (FX) and background music (BGM), fire cues from the keyboard, or step through a scripted cue list with Next during a show.

It runs on your own machine, offline. No cloud service is involved.

## Features

- Per-project audio library: drag and drop mp3, wav, ogg, m4a, aac, flac or webm files (up to 50 MB each), or upload a zip archive (up to 200 MB).
- Two panels, FX and BGM. Effects are decoded ahead of time and fire without lag. BGM ducks under effects, and a Fade in cue on a new track crossfades from the one playing.
- Cue list: play, pause or fade BGM; play or stop FX; wait; auto-next.
- Per-track key bindings for effects.
- Two switchable themes, Tape and Book.

## Quick start

Requires Node.js 18 or newer.

```bash
npm ci
npm start
```

Open http://localhost:3000 in a browser. Create a project from the list page, upload your audio, then open the soundboard. For auto-restart during development, run `npm run dev`.

## Configuration

Set as environment variables before starting the server.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port. |
| `DRAMA_DATA_DIR` | repo root | Where project data is stored (see `utils/config.js`). |

## Project layout

```
server.js          Express server and API routes
utils/             backend helpers: config, db, projects, slug, zip
public/            the whole web UI, served as static files
  index.html       project list
  soundboard.html  soundboard for one project
  css/             tokens, base, components, fonts, app
  js/              ES modules, no build step
  fonts/           self-hosted woff2 fonts
  img/             icon sprite (icons.svg)
test/              node:test suites
examples/          Script.txt, an example cue script
```

## Data layout

Project data lives outside `public/`, under the data directory (the repo root by default):

```
db.json                      project index
projects/<slug>/
  project.json               project metadata
  audios/                    uploaded audio files
  archive.zip                uploaded archive, if any
uploads/                     temporary upload area
```

`projects/` and `uploads/` are git-ignored.

## Themes

**Tape** (default) and **Book** are chosen with the Theme switch in the header and remembered in the browser (localStorage key `sb_theme`). Design rules are in `DESIGN.md`; product context is in `PRODUCT.md`.

## Keyboard

- `Enter` advances to the next cue. When a button has focus, Enter is left to that button.
- `W` / `S` raise and lower BGM volume. `8` / `2` raise and lower FX volume.
- Each track has a key field: click it and press a key. A key already used by another track moves to the new one. `Backspace` or `Delete` clears it. Space is stored as `Space`.
- Reserved, not bindable to tracks: `W`, `S`, `2`, `8`, `Enter`.
- Bindings are saved per project in the browser.

## Testing

```bash
npm test
```

Runs the `node:test` suites in `test/`. No browser is needed. CI (`.github/workflows/ci.yml`) runs `npm ci` and `npm test` on Node 18, 20 and 22.

## Roadmap

- Per-track volume.
- Show mode.
- PWA and desktop launcher.
- MCP server for script-to-cues, planned as a separate server.

## License

MIT. See [LICENSE](LICENSE).
