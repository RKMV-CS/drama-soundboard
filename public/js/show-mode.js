// Show mode: a distraction-free cue screen for a live show. Toggles body.show-mode; the look lives in css/show.css.
const BODY_CLASS = "show-mode";
const FIELD_SELECTOR = "input, textarea, select";

let wakeLock = null;
let fullscreenEntered = false;

const inShowMode = () => document.body.classList.contains(BODY_CLASS);

// Called from the click handler, so requestFullscreen runs inside the user gesture. Refusal is fine: show mode still works.
async function enterFullscreen() {
  try {
    await document.documentElement.requestFullscreen();
    fullscreenEntered = inShowMode();
  } catch {
    fullscreenEntered = false;
  }
}

function leaveFullscreen() {
  fullscreenEntered = false;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

async function acquireWakeLock() {
  if (!navigator.wakeLock) return;
  try {
    const lock = await navigator.wakeLock.request("screen");
    if (inShowMode()) wakeLock = lock;
    else lock.release().catch(() => {});
  } catch {
    // Refused or unsupported: the screen may sleep during the show.
  }
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

export function initShowMode() {
  const btn = document.getElementById("showModeBtn");
  if (!btn) return;

  function setShowMode(on) {
    document.body.classList.toggle(BODY_CLASS, on);
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = on ? "Exit show mode" : "Show mode";
    if (on) {
      enterFullscreen();
      acquireWakeLock();
    } else {
      leaveFullscreen();
      releaseWakeLock();
    }
  }

  btn.addEventListener("click", () => setShowMode(!inShowMode()));

  // The browser drops the wake lock when the page is hidden, so take it again on return.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && inShowMode()) acquireWakeLock();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented || !inShowMode()) return;
    if (e.target.matches?.(FIELD_SELECTOR) || document.querySelector("dialog[open]")) return;
    setShowMode(false);
  });

  // Leaving fullscreen through the browser also leaves show mode, but only if we entered fullscreen ourselves.
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && fullscreenEntered && inShowMode()) setShowMode(false);
  });
}
