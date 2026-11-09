# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The project is pre-1.0: version 0.9.0 is the first release as a product.

## [0.9.0] - 2026-11-09

### Added

- Web Audio engine. Effects are decoded once and fire with no lag, background music (BGM) is streamed,
  BGM ducks under effects, and a new BGM track crossfades from the one playing. Fade in and fade out are supported.
- Per-track volume sliders, saved per project.
- Cue lists saved on the server per project. The browser copy is kept as a cache, and cues already stored in
  the browser migrate once.
- Cue names, notes, move up and move down, and duplicate.
- Project rename and delete, with a confirm dialog.
- Project export and import as a `.dramashow.zip` file (audio, categories and cues).
- Show mode: fullscreen, screen wake lock, a large next-cue band, edit controls hidden. Escape exits.
- Installable progressive web app (manifest, service worker, offline shell).
- Desktop launcher, `npm run app`, which opens the app in its own Chrome or Edge window.
- Single-file executable build, `npm run build:sea`, with the UI embedded.
- Per-user data folder for packaged builds. Override it with `DRAMA_DATA_DIR`.
- Two themes, Tape and Book.
- `GET /health` now reports the version.
- Continuous integration and an automated test suite.

### Changed

- The frontend is split into ES modules under `public/`, with shared design tokens.
- The server serves only `public/` as static files.

### Fixed

- Project names containing HTML were rendered unescaped (cross-site scripting).
- Keybinding lookup by filename.
- A duck interval that was never cleared.
- Fade targets were passed as strings.

### Removed

- The built-in AI features. They are planned to return as a separate MCP server.

### Security

- Path traversal checks on audio routes and on project delete.
- Zip extraction and import ignore paths and non-audio files.
- Import is capped at 500 audio files and 1 GiB.
- JSON request bodies are limited to 1 MB.
