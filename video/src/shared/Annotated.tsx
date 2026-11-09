import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, display, ui } from "./theme";

export type Marker = {
  x: number; // position in the 1920x1080 screenshot
  y: number;
  title: string;
  body?: string;
  at: number; // frame it appears, relative to the scene part
};

const LEFT = 80;
const TOP = 200;
const LEGEND_X = 1390;

// A real screenshot with numbered markers on the UI and a matching legend beside it,
// so no label ever covers the interface it explains.
export const Annotated: React.FC<{ file: string; markers: Marker[]; width?: number }> = ({ file, markers, width = 1240 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const k = width / 1920;
  const drift = interpolate(frame, [0, durationInFrames], [0, -14]);
  const enter = spring({ frame, fps, config: { damping: 200 } });

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: TOP,
          width,
          height: width * 0.5625,
          translate: `${drift}px 0`,
          opacity: enter,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 14,
            overflow: "hidden",
            border: `1px solid ${C.rule}`,
            boxShadow: "0 40px 120px rgba(0,0,0,0.7)",
          }}
        >
          <Img src={staticFile(`shots/${file}`)} style={{ width: "100%", height: "100%" }} />
        </div>
        {markers.map((m, i) => (
          <Pin key={m.title} n={i + 1} x={m.x * k} y={m.y * k} at={m.at} />
        ))}
      </div>
      <div style={{ position: "absolute", left: LEGEND_X, top: TOP, width: 1920 - LEGEND_X - 80 }}>
        {markers.map((m, i) => (
          <LegendItem key={m.title} n={i + 1} marker={m} />
        ))}
      </div>
    </>
  );
};

const Pin: React.FC<{ n: number; x: number; y: number; at: number }> = ({ n, x, y, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 160 } });
  const t = (frame - at) % 50;
  const ring = interpolate(t, [0, 50], [1, 2.2]);
  const ringOpacity = interpolate(t, [0, 50], [0.7, 0]);
  const live = frame >= at;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: live ? 1 : 0 }}>
      <div
        style={{
          position: "absolute",
          left: -26,
          top: -26,
          width: 52,
          height: 52,
          borderRadius: 26,
          border: `3px solid ${C.next}`,
          scale: String(ring),
          opacity: ringOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -26,
          top: -26,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: C.next,
          border: `3px solid ${C.bg}`,
          boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
          scale: String(s),
          color: C.onNext,
          fontFamily: display,
          fontWeight: 700,
          fontSize: 34,
          lineHeight: "46px",
          textAlign: "center",
        }}
      >
        {n}
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ n: number; marker: Marker }> = ({ n, marker }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - marker.at, fps, config: { damping: 200 } });
  return (
    <div style={{ display: "flex", gap: 22, marginBottom: 28, opacity: s, translate: `${(1 - s) * 40}px 0`, minHeight: 100 }}>
      <div
        style={{
          flex: "0 0 56px",
          height: 56,
          borderRadius: 28,
          backgroundColor: C.next,
          color: C.onNext,
          fontFamily: display,
          fontWeight: 700,
          fontSize: 38,
          lineHeight: "56px",
          textAlign: "center",
        }}
      >
        {n}
      </div>
      <div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 60,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: C.text,
            lineHeight: 1,
          }}
        >
          {marker.title}
        </div>
        {marker.body ? (
          <div style={{ fontFamily: ui, fontWeight: 500, fontSize: 38, color: C.muted, marginTop: 10, lineHeight: 1.22 }}>
            {marker.body}
          </div>
        ) : null}
      </div>
    </div>
  );
};
