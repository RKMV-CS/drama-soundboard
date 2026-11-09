import { loadFont as loadDisplay } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadUi } from "@remotion/google-fonts/Barlow";

// Same tokens as the app's Tape theme (public/css/tokens.css).
export const C = {
  bg: "#0d0d0f",
  surface: "#1c1c20",
  surface2: "#26262c",
  rule: "#34343b",
  text: "#f2efe6",
  muted: "#a8a59b",
  fx: "#ff6b2c",
  bgm: "#35c2ff",
  next: "#ffd400",
  onNext: "#0d0d0f",
  danger: "#ff6a6a",
} as const;

export const display = loadDisplay("normal", { weights: ["600", "700"] }).fontFamily;
export const ui = loadUi("normal", { weights: ["400", "500", "600"] }).fontFamily;

export const FPS = 30;
export const W = 1920;
export const H = 1080;
