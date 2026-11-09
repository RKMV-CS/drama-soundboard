# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: Node/Express backend, plain HTML/CSS/JS frontend, no build step. Frontend moves to `public/` with plain CSS tokens and ES modules. Desktop install is planned as a PWA plus a launcher, not Electron.

## Users

Sound operators running cues live from a laptop or tablet, usually in a dim backstage. Two audiences with equal weight: school and amateur drama groups, where the operator may be a first-timer under show pressure, and professional or community theatre operators who expect speed, precision and reliability.

## Product Purpose

Run the sound of a theatre show: hold a show's effects and background music, fire effects from bound keys, and step through a cue list during performance. Success is a show with no missed or wrong cues and an operator who never has to look for a control.

## Positioning

Local-first and offline: it runs on the operator's own machine with no internet needed at the venue. Keyboard-first live cueing: Enter advances the cue list, bound keys fire effects, volume changes without the mouse. Each show is its own project (audio, cue list, keybinds) that can be imported and exported as a zip.

## Operating Context

Dim or dark backstage, laptop or tablet, often with headphones, running a whole performance. A mistake is heard by the audience. The same screen is used by a beginner on a first show and by an expert on opening night.

## Capabilities and Constraints

- Per-project audio library: drag and drop or zip upload; effects and background music (BGM) panels.
- Per-effect keybinds. Reserved keys: W/S (BGM volume), 8/2 (FX volume), Enter (next cue).
- Cue steps: play FX, play/pause/resume BGM, fade in/out BGM, stop FX, stop all, wait; per-step delay and auto-next.
- BGM ducks under effects.
- AI features were removed from the app on purpose. Script-to-cues will return later as a separate MCP server, outside this app.
- Undecided: pricing, licensing model, hosted version.

## Brand Commitments

Name stays "Drama Soundboard". The user is open to a new visual identity; the current black, white and blue-purple look is evidence, not a commitment.

## Evidence on Hand

A sample script in `examples/Script.txt` and two local test projects. No testimonials, customers or usage numbers exist; none may be invented.

## Product Principles

1. Nothing may get in the way of the next cue: the live screen shows what is playing and what is next, and nothing else competes.
2. Usable in the dark and under pressure: legible at a glance, large targets, no surprises.
3. Offline first: no feature may require the internet to run a show.
4. Fast for experts, forgiving for beginners: keyboard shortcuts everywhere, clear labels and recoverable mistakes.
5. A show is a portable file set: projects move between machines intact.

## Accessibility & Inclusion

Dark-room legibility is a core requirement. Meet WCAG AA contrast, 44px minimum touch targets, visible keyboard focus, and operation fully by keyboard. Never rely on colour alone for playing/stopped state.
