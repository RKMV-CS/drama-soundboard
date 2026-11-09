---
version: 1
slug: "soundboard-html"
primary_target: "soundboard.html"
related_targets: ["index.html"]
---

# Surface brief: Drama Soundboard app (index.html, soundboard.html)

Mode: Operate. Audience: school/amateur and professional theatre sound operators, dim backstage, laptop or tablet. Task: hold a show's audio, fire effects from keys, step through a cue list live. Constraint: offline, no build step, plain CSS tokens + ES modules, 44px targets, text >= 12px, AA contrast, keyboard-first.

Decision: the user chose BOTH worlds as user-switchable themes: "Tape" (Spike Tape, default) and "Book" (Prompt Book). One component set and one set of semantic tokens; a theme only swaps token values (and a few type tokens). Choice persists per machine and is changed from the header.

## Direction contract

THESIS: A live cue screen where the one thing that happens next is unmistakable, and every sound carries its category the way a stagehand already marks the floor. It refuses the neon-on-black dashboard and the generic three-panel media player.

OWN-WORLD: Tape: stage-floor black (#0d0d0f), panel #1c1c20, matte tape colours as category marks (FX orange #ff6b2c, BGM ice blue #35c2ff), yellow #ffd400 reserved only for the NEXT cue and its button, Barlow Condensed numerals and headings over Barlow UI text. Book: charcoal page (#1a1b1e) with chalk text (#e8e4d8), lime highlighter (#d7f25c) for the current cue, pink (#ff7eb6) BGM flag, pencil grey notes, Courier Prime cue numbers and file names over Source Sans 3. Flat fills, hairline rules, no glows.

STORY: The operator sees what is playing and what fires next without reading; a first-timer sees labelled panels and a big NEXT; an expert never leaves the keyboard.

FIRST VIEWPORT: Header (back, project title, theme switch, Pro Mode) over three columns: Effects (left), Cue list with volume strip (centre, widest), BGM (right). Tape: the next cue is a monumental yellow band with a 56px numeral; Book: the next cue is a highlighter-striped typed row with a pencil note column. Primary action NEXT sits bottom of the cue column.

FORM: Spike Tape (assigned, position 3 of the grounded list) and Prompt Book (pick, position 1). seed: a556878c675909f9. Raises carried from challengers: yellow reserved for one thing (Terminal Wayfinding), a changed state holds until acknowledged (Gate Board), strict hairline module grid (Japanese high-density web).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved
- Theme switch placement and whether it follows the OS preference on first run.
- Show mode (fullscreen) design is a later phase.
