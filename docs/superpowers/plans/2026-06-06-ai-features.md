# AI Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Script→Steps generator and Smart Upload Categorizer to the drama soundboard, both powered by Gemini 1.5 Flash (server proxy) with Chrome built-in AI as offline fallback.

**Architecture:** Two new Express routes (`POST /api/ai/categorize`, `POST /api/ai/script-to-steps`) proxy to Gemini API using a key from `.env`. The soundboard frontend gains an AI master toggle in the header, a collapsible Script→Steps panel in the middle column, and a post-upload toast that shows AI classification with an Undo option. If the server routes fail, the browser falls back to `window.LanguageModel` (Chrome Gemini Nano).

**Tech Stack:** Node 18 built-in `fetch`, `dotenv` npm package, Gemini 1.5 Flash REST API, Chrome built-in AI (`window.LanguageModel` / `window.ai.languageModel`), vanilla JS, localStorage.

---

## File Map

| File | Change |
|------|--------|
| `server.js` | Add `require('dotenv').config()`, add 2 AI routes |
| `soundboard.html` | AI toggle, AI collapsible panel, modified `uploadAudioFile()`, AI toast, Chrome Nano fallback |
| `package.json` | Add `dotenv` to dependencies |
| `.env` | New — `GEMINI_API_KEY=your_key_here` |
| `.gitignore` | Add `.env` |

---

## Task 1: Install dotenv, create .env, update .gitignore

**Files:**
- Modify: `package.json`
- Create: `.env`
- Modify: `.gitignore` (or create if absent)
- Modify: `server.js:1`

- [ ] **Step 1: Install dotenv**

```bash
npm install dotenv
```

Expected output: `added 1 package`

- [ ] **Step 2: Create .env file**

Create `.env` in the project root with this content (fill in your real key):

```
GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 3: Add .env to .gitignore**

Check if `.gitignore` exists. If not, create it. Either way add:

```
.env
```

- [ ] **Step 4: Load dotenv at top of server.js**

Add this as the very first line of `server.js` (before any other require):

```js
require('dotenv').config();
```

- [ ] **Step 5: Verify env loads**

```bash
node -e "require('dotenv').config(); console.log('key set:', !!process.env.GEMINI_API_KEY)"
```

Expected: `key set: true`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore server.js
git commit -m "feat: add dotenv for Gemini API key management"
```

---

## Task 2: Server route — POST /api/ai/categorize

**Files:**
- Modify: `server.js` (add route before the error handler at line 207)

- [ ] **Step 1: Add the categorize route to server.js**

Insert this block immediately before the error handler (`app.use((err, ...`) at the bottom of `server.js`:

```js
app.post(
  "/api/ai/categorize",
  asyncHandler(async (req, res) => {
    const { filename } = req.body || {};
    if (!filename || typeof filename !== "string") {
      return res.status(400).json({ error: "filename is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
    }

    const prompt = `Classify this audio filename for a theater soundboard.\nReply with ONLY one word: "bgm" (background music, ambient, loops) or "effects" (sound effects, stingers, one-shots).\nFilename: ${filename}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 10 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return res.status(502).json({ error: "Gemini API error", detail: err });
    }

    const data = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase().trim() || "";
    const category = raw.includes("bgm") ? "bgm" : "effects";
    res.json({ category });
  })
);
```

- [ ] **Step 2: Restart the server**

```bash
npm run dev
```

- [ ] **Step 3: Test with curl**

```bash
curl -s -X POST http://localhost:3000/api/ai/categorize \
  -H "Content-Type: application/json" \
  -d "{\"filename\": \"thunder_crack.mp3\"}" | node -e "process.stdin.resume();process.stdin.on('data',d=>console.log(JSON.parse(d)))"
```

Expected: `{ category: 'effects' }`

```bash
curl -s -X POST http://localhost:3000/api/ai/categorize \
  -H "Content-Type: application/json" \
  -d "{\"filename\": \"soft_piano_ambient.mp3\"}" | node -e "process.stdin.resume();process.stdin.on('data',d=>console.log(JSON.parse(d)))"
```

Expected: `{ category: 'bgm' }`

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add /api/ai/categorize route via Gemini 1.5 Flash"
```

---

## Task 3: Server route — POST /api/ai/script-to-steps

**Files:**
- Modify: `server.js` (add route before error handler)

- [ ] **Step 1: Add the script-to-steps route**

Insert immediately after the `/api/ai/categorize` route (still before the error handler):

```js
app.post(
  "/api/ai/script-to-steps",
  asyncHandler(async (req, res) => {
    const { script, availableAudio } = req.body || {};
    if (!script || typeof script !== "string" || !script.trim()) {
      return res.status(400).json({ error: "script is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
    }

    const audioList = Array.isArray(availableAudio) && availableAudio.length
      ? availableAudio.join(", ")
      : "(none uploaded yet)";

    const prompt = `You are a theater soundboard assistant. Analyze the script below and generate sound cue steps.

Available audio files: ${audioList}

Rules:
- Use ONLY filenames from the available audio list for "target". If no match exists, use an empty string.
- Return ONLY a raw JSON array, no markdown, no explanation.
- Each element must have exactly these fields:
  type (one of: play_fx, play_bgm, pause_bgm, resume_bgm, fade_in_bgm, fade_out_bgm, stop_fx, stop_all, wait),
  target (filename string or ""),
  duration (number: 0 for non-fade/non-wait types, 1000-3000 for fades, milliseconds for wait),
  loop (boolean: true only for ambient bgm),
  delay (number: always 0),
  autoNext (boolean: always false)

Script:
${script.trim()}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return res.status(502).json({ error: "Gemini API error", detail: err });
    }

    const data = await geminiRes.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";

    // Strip markdown code fences if Gemini wrapped the JSON
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let steps;
    try {
      steps = JSON.parse(raw);
      if (!Array.isArray(steps)) throw new Error("not an array");
    } catch {
      return res.status(502).json({ error: "Could not parse Gemini response as JSON", raw });
    }

    // Sanitize each step to match the expected schema
    const validTypes = ["play_fx","play_bgm","pause_bgm","resume_bgm","fade_in_bgm","fade_out_bgm","stop_fx","stop_all","wait"];
    steps = steps.map(s => ({
      type: validTypes.includes(s.type) ? s.type : "wait",
      target: typeof s.target === "string" ? s.target : "",
      duration: typeof s.duration === "number" ? s.duration : 0,
      loop: !!s.loop,
      delay: 0,
      autoNext: false,
      aiGenerated: true,
    }));

    res.json({ steps });
  })
);
```

- [ ] **Step 2: Restart the server**

```bash
npm run dev
```

- [ ] **Step 3: Test with curl**

```bash
curl -s -X POST http://localhost:3000/api/ai/script-to-steps \
  -H "Content-Type: application/json" \
  -d "{\"script\": \"Thunder rumbles. Elena enters in the rain. Soft music begins.\", \"availableAudio\": [\"thunder.mp3\", \"rain_ambient.mp3\", \"soft_piano.mp3\"]}" | node -e "process.stdin.resume();process.stdin.on('data',d=>{ const r=JSON.parse(d); console.log(JSON.stringify(r.steps,null,2)); })"
```

Expected: a JSON array of step objects with `type`, `target`, `duration`, `loop`, `delay`, `autoNext`, `aiGenerated: true`.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add /api/ai/script-to-steps route via Gemini 1.5 Flash"
```

---

## Task 4: AI master toggle in soundboard header

**Files:**
- Modify: `soundboard.html` (HTML section ~line 378, script section)

- [ ] **Step 1: Add AI toggle HTML next to Pro Mode**

Find this block in `soundboard.html` (around line 378):

```html
<div class="mode-toggle">
<a href="index.html" style="color: var(--muted); text-decoration: none; margin-right: 20px;">← Back to Projects</a>
<label for="proMode" style="margin: 0;">Pro Mode</label>
<input type="checkbox" id="proMode">
</div>
```

Replace it with:

```html
<div class="mode-toggle">
<a href="index.html" style="color: var(--muted); text-decoration: none; margin-right: 20px;">← Back to Projects</a>
<label for="proMode" style="margin: 0;">Pro Mode</label>
<input type="checkbox" id="proMode">
<span style="width:1px;height:14px;background:#333;margin:0 4px;display:inline-block"></span>
<button id="aiToggleBtn" onclick="toggleAI()" style="background:#7c6af722;border:1px solid #7c6af766;color:#7c6af7;padding:3px 10px;border-radius:10px;font-size:11px;cursor:pointer;">✦ AI ON</button>
</div>
```

- [ ] **Step 2: Add AI toggle CSS**

Find the `.mode-toggle` CSS block (around line 267) and add this after it:

```css
#aiToggleBtn.off {
    background: #111;
    border-color: #333;
    color: #555;
}
```

- [ ] **Step 3: Add AI toggle JS**

Find the storage keys section at the top of the `<script>` block (line ~440) and add:

```js
const STORAGE_AI_ENABLED = "sb_ai_enabled";
let aiEnabled = localStorage.getItem(STORAGE_AI_ENABLED) !== "false";
```

Then add the `toggleAI` function after the `loadKeybinds` function (around line 593):

```js
function toggleAI() {
    aiEnabled = !aiEnabled;
    localStorage.setItem(STORAGE_AI_ENABLED, aiEnabled);
    applyAIState();
}

function applyAIState() {
    const btn = document.getElementById('aiToggleBtn');
    const panel = document.getElementById('ai-panel');
    if (!btn) return;
    if (aiEnabled) {
        btn.textContent = '✦ AI ON';
        btn.classList.remove('off');
        if (panel) panel.style.display = '';
    } else {
        btn.textContent = 'AI OFF';
        btn.classList.add('off');
        if (panel) panel.style.display = 'none';
    }
}
```

- [ ] **Step 4: Call applyAIState on load**

Find the `initProject().then(() => {` call at the bottom of the script (line ~1077) and change it to:

```js
initProject().then(() => {
    loadSteps();
    applyAIState();
});
```

- [ ] **Step 5: Verify in browser**

Open `http://localhost:3000/soundboard.html`. Header should show "✦ AI ON" purple pill next to Pro Mode. Click it → turns grey "AI OFF". Reload → state persists.

- [ ] **Step 6: Commit**

```bash
git add soundboard.html
git commit -m "feat: add AI master toggle to soundboard header"
```

---

## Task 5: Smart Upload Categorizer with toast + undo

**Files:**
- Modify: `soundboard.html` (JS section — `uploadAudioFile` function and helpers)

- [ ] **Step 1: Add Chrome Nano fallback helper**

Add this helper function after `applyAIState` in the script:

```js
async function callChromeNanoCategorize(filename) {
    const LM = window.LanguageModel || window.ai?.languageModel;
    if (!LM) throw new Error('Chrome Nano not available');
    const avail = await LM.availability?.() || await LM.capabilities?.().then(c => c.available) || 'no';
    if (avail === 'no') throw new Error('Chrome Nano not available');
    const session = await LM.create({
        systemPrompt: 'You classify audio filenames for a theater soundboard. Reply with ONLY one word: bgm or effects.'
    });
    const result = await session.prompt(`Filename: ${filename}`);
    session.destroy();
    return result.toLowerCase().includes('bgm') ? 'bgm' : 'effects';
}

async function callChromeNanoScriptToSteps(script, availableAudio) {
    const LM = window.LanguageModel || window.ai?.languageModel;
    if (!LM) throw new Error('Chrome Nano not available');
    const avail = await LM.availability?.() || await LM.capabilities?.().then(c => c.available) || 'no';
    if (avail === 'no') throw new Error('Chrome Nano not available');
    const session = await LM.create({
        systemPrompt: 'You generate theater soundboard step sequences as JSON arrays.'
    });
    const prompt = `Available audio: ${availableAudio.join(', ')}\n\nScript: ${script}\n\nReturn ONLY a JSON array of steps, each with: type (play_fx/play_bgm/fade_in_bgm/fade_out_bgm/stop_all/wait), target (filename or ""), duration (number), loop (boolean), delay (0), autoNext (false).`;
    const result = await session.prompt(prompt);
    session.destroy();
    const clean = result.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const steps = JSON.parse(clean);
    return Array.isArray(steps) ? steps.map(s => ({ ...s, delay: 0, autoNext: false, aiGenerated: true })) : [];
}
```

- [ ] **Step 2: Add AI categorizer toast function**

Add this after `showToast`:

```js
function showAICategorizerToast(filename, aiCategory, originalType) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast info';
    toast.style.cssText = 'min-width:260px;padding:10px 14px;';

    const label = document.createElement('div');
    label.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;';
    label.innerHTML = `
        <div>
            <div style="font-size:10px;color:#7c6af7;text-transform:uppercase;margin-bottom:2px">✦ AI Classified</div>
            <div style="font-size:12px;font-weight:600">${filename.length > 20 ? filename.substring(0,20)+'…' : filename} → ${aiCategory === 'bgm' ? 'BGM' : 'FX'}</div>
        </div>
        <span class="toast-close" style="cursor:pointer;color:#555;font-size:16px;line-height:1;padding-left:8px;">×</span>`;

    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'display:flex;gap:8px;align-items:center;';

    let undoClicked = false;
    if (aiCategory !== originalType) {
        const undoBtn = document.createElement('button');
        undoBtn.textContent = 'Undo';
        undoBtn.style.cssText = 'background:#222;border:1px solid #444;color:#ccc;padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;flex-shrink:0;';
        undoBtn.onclick = () => {
            undoClicked = true;
            reclassifyTrack(filename, aiCategory, originalType);
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        };
        barWrap.appendChild(undoBtn);
    }

    const progressWrap = document.createElement('div');
    progressWrap.style.cssText = 'flex:1;background:#333;border-radius:4px;height:3px;overflow:hidden;';
    const bar = document.createElement('div');
    bar.style.cssText = 'background:#7c6af7;height:100%;width:100%;transition:width 5s linear;';
    progressWrap.appendChild(bar);
    barWrap.appendChild(progressWrap);

    toast.appendChild(label);
    toast.appendChild(barWrap);
    container.appendChild(toast);

    toast.querySelector('.toast-close').onclick = () => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    };

    requestAnimationFrame(() => { bar.style.width = '0%'; });

    const timer = setTimeout(() => {
        if (!undoClicked) {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);

    toast.addEventListener('mouseenter', () => clearTimeout(timer));
}
```

- [ ] **Step 3: Add reclassifyTrack helper**

Add after `showAICategorizerToast`:

```js
function reclassifyTrack(filename, fromType, toType) {
    const url = audioFileStore[fromType][filename];
    if (!url) return;
    delete audioFileStore[fromType][filename];
    audioFileStore[toType][filename] = url;

    const fromContainer = document.getElementById(fromType === 'bgm' ? 'bgms' : 'effects');
    const existing = fromContainer?.querySelector(`[data-filename="${CSS.escape(filename)}"]`);
    if (existing) existing.remove();

    renderTrack(filename, url, toType);
    showToast(`Moved '${filename}' to ${toType === 'bgm' ? 'BGM' : 'FX'}`, 'info');
}
```

- [ ] **Step 4: Modify uploadAudioFile to call AI categorizer**

Find the existing `uploadAudioFile` function (line ~595). Replace it entirely:

```js
async function uploadAudioFile(file, type) {
    if (!projectId) {
        const url = URL.createObjectURL(file);
        audioFileStore[type][file.name] = url;
        renderTrack(file.name, url, type);
        if (aiEnabled) runAICategorizerOnTrack(file.name, type);
        return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    try {
        const res = await fetch('/projects/' + projectId + '/audios/upload', {
            method: 'POST',
            body: form
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Upload failed');
        }
        const data = await res.json();
        const url = '/projects/' + projectId + '/audios/' + encodeURIComponent(data.filename);
        audioFileStore[type][data.filename] = url;
        renderTrack(data.filename, url, type);
        showToast('Saved: ' + data.filename, 'success');
        if (aiEnabled) runAICategorizerOnTrack(data.filename, type);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function runAICategorizerOnTrack(filename, originalType) {
    let aiCategory;
    try {
        const res = await fetch('/api/ai/categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        if (!res.ok) throw new Error('server error');
        const data = await res.json();
        aiCategory = data.category;
    } catch {
        try {
            aiCategory = await callChromeNanoCategorize(filename);
        } catch {
            return; // Both failed silently
        }
    }

    if (aiCategory !== originalType) {
        reclassifyTrack(filename, originalType, aiCategory);
    }
    showAICategorizerToast(filename, aiCategory, originalType);
}
```

- [ ] **Step 5: Inject AI badge after classification**

In `runAICategorizerOnTrack`, after `showAICategorizerToast(filename, aiCategory, originalType);` add:

```js
    const finalType = aiCategory;
    const container = document.getElementById(finalType === 'bgm' ? 'bgms' : 'effects');
    const trackEl = container?.querySelector(`[data-filename="${CSS.escape(filename)}"]`);
    if (trackEl && !trackEl.querySelector('.ai-badge')) {
        const badge = document.createElement('span');
        badge.className = 'ai-badge';
        badge.textContent = 'AI';
        badge.title = 'Classified by AI';
        const nameEl = trackEl.querySelector('span[data-filename], span[style]');
        if (nameEl) nameEl.after(badge);
    }
```

- [ ] **Step 6: Add AI badge CSS**

Add to the `<style>` block (before `</style>`):

```css
.ai-badge {
    background: #7c6af722;
    border: 1px solid #7c6af755;
    color: #7c6af7;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 9px;
    flex-shrink: 0;
}
```

- [ ] **Step 7: Verify in browser**

1. Open `http://localhost:3000/soundboard.html?project=<your-project-id>`
2. Upload a file like `thunder.mp3` to the Effects panel
3. Wait ~2s → toast should appear "✦ AI Classified: thunder.mp3 → FX" with 5s progress bar
4. Upload `soft_piano.mp3` to Effects → AI should reclassify to BGM + show undo toast
5. Click Undo → track moves back to Effects
6. Toggle AI OFF in header → upload another file → no toast appears

- [ ] **Step 8: Commit**

```bash
git add soundboard.html
git commit -m "feat: AI upload categorizer with toast and undo"
```

---

## Task 6: Script→Steps collapsible panel

**Files:**
- Modify: `soundboard.html` (HTML around line 386, JS section)

- [ ] **Step 1: Add the AI panel HTML inside .stepwise-container**

Find this block in the HTML (line ~386):

```html
<div class="stepwise-container">
    <div class="steps-header">
        <label>STEPWISE FLOW</label>
        <span id="step-counter" style="font-size: 11px; color: var(--muted);">Step 0 of 0</span>
    </div>
```

Replace it with:

```html
<div class="stepwise-container">
    <div class="steps-header">
        <label>STEPWISE FLOW</label>
        <div style="display:flex;align-items:center;gap:8px;">
            <span id="step-counter" style="font-size: 11px; color: var(--muted);">Step 0 of 0</span>
            <button id="ai-panel-toggle" onclick="toggleAIPanel()" style="background:#7c6af714;border:1px solid #7c6af744;color:#7c6af7;padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer;">✦ AI ▾</button>
        </div>
    </div>

    <div id="ai-panel" style="display:none;background:#0d0d1a;border:1px solid #7c6af733;border-radius:6px;padding:10px;margin-bottom:8px;">
        <div style="color:#7c6af7;font-size:10px;text-transform:uppercase;margin-bottom:6px;">Script → Steps</div>
        <textarea id="ai-script-input" placeholder="Paste your theater script or describe a scene..." style="width:100%;height:80px;background:#000;color:#fff;border:1px solid #333;border-radius:4px;padding:6px;font-size:11px;resize:vertical;font-family:inherit;"></textarea>
        <div style="display:flex;gap:8px;margin-top:6px;align-items:center;">
            <button id="ai-generate-btn" onclick="generateStepsFromScript()" style="background:#7c6af7;color:#fff;border:none;padding:5px 14px;border-radius:4px;font-size:11px;cursor:pointer;flex:1;">⚡ Generate Steps</button>
            <span id="ai-gen-status" style="font-size:10px;color:var(--muted);"></span>
        </div>
    </div>
```

- [ ] **Step 2: Add toggleAIPanel JS function**

Add after `applyAIState`:

```js
let aiPanelOpen = false;

function toggleAIPanel() {
    aiPanelOpen = !aiPanelOpen;
    const panel = document.getElementById('ai-panel');
    const btn = document.getElementById('ai-panel-toggle');
    if (panel) panel.style.display = aiPanelOpen ? 'block' : 'none';
    if (btn) btn.textContent = aiPanelOpen ? '✦ AI ▲' : '✦ AI ▾';
}
```

- [ ] **Step 3: Add generateStepsFromScript JS function**

Add after `toggleAIPanel`:

```js
async function generateStepsFromScript() {
    if (!aiEnabled) return;

    const scriptText = document.getElementById('ai-script-input')?.value?.trim();
    if (!scriptText) { showToast('Paste a script first', 'error'); return; }

    const statusEl = document.getElementById('ai-gen-status');
    const btn = document.getElementById('ai-generate-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Generating…';
    if (statusEl) statusEl.textContent = '';

    const availableAudio = [
        ...Object.keys(audioFileStore.effects),
        ...Object.keys(audioFileStore.bgm)
    ];

    let newSteps;
    try {
        const res = await fetch('/api/ai/script-to-steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script: scriptText, availableAudio })
        });
        if (!res.ok) throw new Error('server error');
        const data = await res.json();
        newSteps = data.steps;
    } catch {
        try {
            newSteps = await callChromeNanoScriptToSteps(scriptText, availableAudio);
        } catch {
            showToast('AI unavailable — check server and API key', 'error');
            btn.disabled = false;
            btn.textContent = '⚡ Generate Steps';
            return;
        }
    }

    if (!newSteps || !newSteps.length) {
        showToast('AI returned no steps', 'error');
        btn.disabled = false;
        btn.textContent = '⚡ Generate Steps';
        return;
    }

    const defaultStep = { type:'play_fx', target:'', duration:0, loop:false, delay:0, autoNext:false, aiGenerated:true };
    newSteps = newSteps.map(s => ({ ...defaultStep, ...s, delay:0, autoNext:false, aiGenerated:true }));

    steps.push(...newSteps);
    renderSteps();
    saveSteps();

    if (statusEl) statusEl.textContent = `+${newSteps.length} steps`;
    showToast(`✦ Added ${newSteps.length} AI steps`, 'success');
    btn.disabled = false;
    btn.textContent = '⚡ Generate Steps';
}
```

- [ ] **Step 4: Update renderSteps to show AI badge on aiGenerated steps**

Find in `renderSteps` the line that creates `indexSpan` (around line 720):

```js
        const indexSpan = document.createElement('span');
        indexSpan.className = 'index';
        indexSpan.textContent = i + 1;
```

Replace with:

```js
        const indexSpan = document.createElement('span');
        indexSpan.className = 'index';
        indexSpan.textContent = i + 1;

        if (step.aiGenerated) {
            const aiBadge = document.createElement('span');
            aiBadge.className = 'ai-badge';
            aiBadge.textContent = 'AI';
            aiBadge.title = 'Generated by AI';
            item.appendChild(aiBadge);
        }
```

Wait — `item.appendChild` here runs before `indexSpan` is appended to `item`. The badge needs to be inserted after `indexSpan`. Instead, add it right after `item.appendChild(indexSpan)` at the bottom of the step construction:

Leave the `indexSpan` creation unchanged. Find at the bottom of `renderSteps` where items are appended (around line 812):

```js
        item.appendChild(indexSpan);
        item.appendChild(typeSelect);
```

Replace with:

```js
        item.appendChild(indexSpan);
        if (step.aiGenerated) {
            const aiBadge = document.createElement('span');
            aiBadge.className = 'ai-badge';
            aiBadge.textContent = 'AI';
            aiBadge.title = 'Generated by AI';
            item.appendChild(aiBadge);
        }
        item.appendChild(typeSelect);
```

- [ ] **Step 5: Update applyAIState to also hide the AI panel toggle button**

Replace the existing `applyAIState` function with:

```js
function applyAIState() {
    const btn = document.getElementById('aiToggleBtn');
    const panel = document.getElementById('ai-panel');
    const panelToggle = document.getElementById('ai-panel-toggle');
    if (!btn) return;
    if (aiEnabled) {
        btn.textContent = '✦ AI ON';
        btn.classList.remove('off');
        if (panelToggle) panelToggle.style.display = '';
    } else {
        btn.textContent = 'AI OFF';
        btn.classList.add('off');
        if (panel) { panel.style.display = 'none'; aiPanelOpen = false; }
        if (panelToggle) panelToggle.style.display = 'none';
    }
}
```

- [ ] **Step 6: Verify in browser**

1. Open soundboard with a project loaded
2. Header shows "✦ AI ▾" button next to step counter
3. Click it → panel expands showing textarea + Generate button
4. Paste: `Thunder rumbles. Elena enters. Soft piano plays.`
5. Click ⚡ Generate Steps → wait → new steps appear with "AI" badges
6. Steps are appended (existing steps remain)
7. Toggle AI OFF in header → AI panel toggle disappears

- [ ] **Step 7: Commit**

```bash
git add soundboard.html
git commit -m "feat: Script-to-Steps AI panel with Chrome Nano fallback"
```

---

## Task 7: Final wiring and cleanup

**Files:**
- Modify: `soundboard.html` (one fix: `addStep` should default `aiGenerated: false`)

- [ ] **Step 1: Ensure addStep sets aiGenerated: false**

Find `addStep` (line ~686):

```js
function addStep() {
    steps.push({
        type: 'play_fx',
        target: '',
        duration: 1000,
        volume: 1.0,
        loop: false,
        delay: 0,
        autoNext: false
    });
```

Replace with:

```js
function addStep() {
    steps.push({
        type: 'play_fx',
        target: '',
        duration: 1000,
        volume: 1.0,
        loop: false,
        delay: 0,
        autoNext: false,
        aiGenerated: false
    });
```

- [ ] **Step 2: Smoke test full flow**

1. Start server: `npm run dev`
2. Open `http://localhost:3000/soundboard.html?project=<id>`
3. Toggle AI OFF → AI panel toggle hidden, uploads produce no AI toast
4. Toggle AI ON → AI panel toggle visible
5. Upload `thunder.mp3` to FX → AI toast appears, badge on track
6. Open AI panel → paste script → generate → steps with AI badges appear
7. Kill server (`Ctrl+C`) → upload another file → fallback to Chrome Nano (requires Chrome 127+ with Prompt API flag)
8. Reload page → AI ON/OFF state persists

- [ ] **Step 3: Final commit**

```bash
git add soundboard.html server.js package.json package-lock.json .gitignore
git commit -m "feat: complete AI features — categorizer, script-to-steps, master toggle"
```
