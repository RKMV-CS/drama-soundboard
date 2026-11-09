import { icon } from "./icons.js";

const ICONS = { success: "check", error: "alert", info: "info" };

export function showToast(msg, type = "info", duration = 2500) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const kind = Object.prototype.hasOwnProperty.call(ICONS, type) ? type : "info";
  const toast = document.createElement("div");
  toast.className = `toast toast--${kind}`;
  const text = document.createElement("span");
  text.textContent = msg;
  toast.append(icon(ICONS[kind]), text);
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
