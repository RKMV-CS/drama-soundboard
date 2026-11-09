import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, display, ui } from "./theme";

// A label with a pulsing marker. (x, y) is the marker position in px of the 1920x1080 frame.
export const Callout: React.FC<{
  x: number;
  y: number;
  title: string;
  body?: string;
  at: number; // frame it appears (relative to the scene)
  side?: "right" | "left";
  color?: string;
}> = ({ x, y, title, body, at, side = "right", color = C.next }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - at, fps, config: { damping: 200 } });
  const pulse = interpolate((frame - at) % 45, [0, 45], [1, 2.4]);
  const pulseOpacity = interpolate((frame - at) % 45, [0, 45], [0.6, 0]);
  const dir = side === "right" ? 1 : -1;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: enter }}>
      <div
        style={{
          position: "absolute",
          left: -14,
          top: -14,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: color,
          boxShadow: `0 0 24px ${color}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -14,
          top: -14,
          width: 28,
          height: 28,
          borderRadius: 14,
          border: `3px solid ${color}`,
          scale: String(pulse),
          opacity: pulseOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -2,
          [side === "right" ? "left" : "right"]: 14,
          width: 70 * enter,
          height: 4,
          backgroundColor: color,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -34,
          [side === "right" ? "left" : "right"]: 14 + 70 + 8,
          translate: `${dir * (1 - enter) * -20}px 0`,
          width: 520,
          textAlign: side === "right" ? "left" : "right",
          whiteSpace: "normal",
        }}
      >
        <div style={{ fontFamily: display, fontWeight: 700, fontSize: 56, letterSpacing: 1.5, color: C.text, textTransform: "uppercase", lineHeight: 1 }}>
          {title}
        </div>
        {body ? <div style={{ fontFamily: ui, fontWeight: 500, fontSize: 32, color: C.muted, marginTop: 8, lineHeight: 1.25 }}>{body}</div> : null}
      </div>
    </div>
  );
};
