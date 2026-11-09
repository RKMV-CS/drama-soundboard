# Drama Soundboard

A soundboard for theatre and drama productions. Load a project with its sound effects and background music, then fire cues from the keyboard or step through a scripted cue list during a live show.

## Features

- Per-project audio library: drag and drop files (mp3, wav, ogg, m4a, aac, flac, webm; up to 50 MB each), or upload a zip archive (up to 200 MB).
- Two panels: sound effects (FX) and background music (BGM).
- Per-effect key bindings.
- Stepwise cue flow: play, pause or fade BGM; play or stop FX; wait; auto-next.
- Keyboard control: BGM volume `W`/`S`, FX volume `8`/`2`, `Enter` to advance to the next step.
- BGM ducks automatically under effects.

## Quick start

```bash
npm install
npm start
```

Open http://localhost:3000. Create a project from the list page, upload your audio, then open the soundboard.

For development with auto-restart on changes: `npm run dev`.

## Configuration

Set these in a `.env` file in the repo root or in the environment.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port for the server. |
| `DRAMA_DATA_DIR` | repo root | Directory where project data is stored. |

## Project data layout

Everything under the data directory:

```
db.json                      project index
projects/<slug>/
  project.json               project metadata
  audios/                    uploaded audio files
  archive.zip                uploaded archive, if any
uploads/                     temporary upload area
```

`projects/` and `uploads/` are git-ignored.

## Pages

- `index.html`: list and create projects.
- `soundboard.html?project=<id>`: the soundboard for one project.

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Health check. |
| GET | `/projects` | List projects. |
| POST | `/projects` | Create a project. |
| GET | `/projects/:id` | Get a project. |
| POST | `/projects/:id/open` | Open a project. |
| POST | `/projects/:id/upload` | Upload a zip archive (field `archive`). |
| GET | `/projects/:id/audios` | List audio files. |
| POST | `/projects/:id/audios/upload` | Upload one audio file (field `file`, optional `type`: `bgm` or `effects`). |
| GET | `/projects/:id/audios/:filename` | Download an audio file. |
| DELETE | `/projects/:id/audios/:filename` | Delete an audio file. |
| GET | `/projects/:id/download` | Download the project's uploaded `archive.zip`. |

## Testing

```bash
npm test
```

Runs the `node:test` suites in `test/`.

## Status

Being turned into a product; an installable app is planned.

## License

MIT. See [LICENSE](LICENSE).
