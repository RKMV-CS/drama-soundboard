// Theme switch: wires the "Theme" radio group (name="theme") in the header.
const KEY = "sb_theme";
const THEMES = ["tape", "book"];

export function initThemeSwitch() {
  const radios = document.querySelectorAll('input[name="theme"]');
  const current = document.documentElement.dataset.theme;
  radios.forEach((r) => {
    r.checked = r.value === current;
    r.addEventListener("change", () => {
      if (!THEMES.includes(r.value)) return;
      document.documentElement.dataset.theme = r.value;
      try { localStorage.setItem(KEY, r.value); } catch { /* storage blocked */ }
    });
  });
}
