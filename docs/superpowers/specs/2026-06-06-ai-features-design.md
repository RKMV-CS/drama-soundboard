# AI Features Design — Drama Soundboard

**Date:** 2026-06-06  
**Status:** Approved

## Context

Add two AI-powered features to the drama soundboard for school theater productions. The app runs locally in Chrome and already has a Node/Express backend. Features use Gemini 1.5 Flash (via server proxy) as primary AI with Chrome built-in Gemini Nano as offline fallback.

---

## Features

### 1. Script → Steps Generator

User pastes a theater script (or scene description) into a collapsible panel in the middle section. AI reads the script + the project's available audio files, then generates a step sequence that gets appended to the stepwise flow.

**UI:** Collapsible section at the top of the stepwise flow panel, toggled by an "✦ AI Generate ▾" button in the steps header. Expanded state shows a textarea + "⚡ Generate Steps" button. Generated steps are tagged with a small "AI" badge so user can distinguish them from manually created steps.

**Behavior:**
- Sends script text + list of available audio filenames to `POST /api/ai/script-to-steps`
- Server calls Gemini with a structured prompt asking for a JSON array of step objects matching the existing step schema `{type, target, duration, delay, autoNext, loop}`
- Steps appended (not replace) to existing flow
- If server call fails → client falls back to `window.LanguageModel` (Chrome Nano)

### 2. Smart Upload Categorizer

When a user uploads an audio file (via the existing drag-drop zones), after the upload completes the filename is sent to AI for classification as `bgm` or `effects`. The category is applied automatically and a toast notification confirms the decision with an undo option.

**UI:** Toast appears bottom-center after upload. Shows "AI classified 'filename.mp3' as FX — correct?" with an Undo button and a 5-second auto-dismiss progress bar. Tracks get a small "AI" badge. Undo re-assigns to opposite category and saves.

**Behavior:**
- Hooks into existing upload success handler in `soundboard.html`
- Sends filename to `POST /api/ai/categorize`
- Server calls Gemini with a minimal prompt: classify as "bgm" or "effects"
- If server fails → falls back to `window.LanguageModel`

---

## AI Master Toggle

Pill toggle in the soundboard header bar, positioned next to the existing "Pro Mode" toggle. Label: **✦ AI ON** / **AI OFF**. State persisted in `localStorage` keyed per project.

When OFF:
- AI Generate collapsible is hidden
- Upload categorizer does not trigger
- No requests sent to `/api/ai/*`

---

## Architecture

### New Server Routes

```
POST /api/ai/script-to-steps
  Body: { script: string, availableAudio: string[] }
  Response: { steps: StepObject[] }

POST /api/ai/categorize
  Body: { filename: string }
  Response: { category: "bgm" | "effects" }
```

Both routes:
- Read `GEMINI_API_KEY` from `process.env`
- Call `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- Return 500 on failure so client can fall back to Chrome Nano

### Environment

```
# .env (never committed)
GEMINI_API_KEY=your_key_here
```

`dotenv` loaded at top of `server.js`. `.env` added to `.gitignore`.

### Chrome Built-in Fallback

Client-side fallback using `window.LanguageModel` (Chrome 127+ built-in AI origin trial — may be `window.ai.languageModel` in older builds; code checks both). Same prompt, same expected output format. Activated only when `/api/ai/*` returns non-2xx.

---

## Files Changed

| File | Change |
|------|--------|
| `server.js` | Add `dotenv`, add 2 AI routes |
| `soundboard.html` | AI collapsible panel, header toggle, upload hook, toast, fallback logic |
| `package.json` | Add `dotenv` dependency |
| `.env` | New — user fills in `GEMINI_API_KEY` |
| `.gitignore` | Add `.env` |

---

## Verification

1. `npm install` → `dotenv` present
2. Add real key to `.env`
3. Open soundboard → header shows "✦ AI ON" toggle
4. Upload an audio file → toast appears with AI classification
5. Click Undo → track moves to opposite panel
6. Toggle AI OFF → toast no longer appears on upload
7. Open AI Generate panel → paste script → click Generate → steps appear with "AI" badge
8. Toggle AI OFF → AI panel hidden
9. Kill server → upload + generate still work via Chrome Nano fallback (requires Chrome 127+ with Prompt API flag enabled: `chrome://flags/#prompt-api-for-gemini-nano`)
