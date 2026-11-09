import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../shared/Backdrop";
import { C, display, ui } from "../shared/theme";

export const DURATION = 180;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const COUNT_FRAMES = 45;
const STAGGER = 15;

const STATS = [
  { value: 91, label: "automated tests passing", punch: false },
  { value: 0, label: "cloud calls. Your show stays on your machine", punch: true },
  { value: 1, label: "file to run it", punch: false },
];

const Stat: React.FC<{ index: number; value: number; label: string; punch: boolean }> = ({ index, value, label, punch }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - index * STAGGER;

  let shown = value;
  let numberStyle: React.CSSProperties = {};
  if (punch) {
    // No count: the 0 lands with an overshooting punch scale.
    const s = spring({ frame: lf, fps, config: { damping: 9, stiffness: 220 } });
    numberStyle = { scale: String(interpolate(s, [0, 1], [1.45, 1])) };
  } else {
    const t = interpolate(lf, [0, COUNT_FRAMES], [0, 1], clamp);
    shown = Math.round(value * Easing.bezier(0.16, 1, 0.3, 1)(t));
  }

  return (
    <div style={{ flex: 1, textAlign: "center", padding: "0 40px", opacity: interpolate(lf, [0, 3], [0, 1], clamp) }}>
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: 260, lineHeight: 1, color: C.next, ...numberStyle }}>{shown}</div>
      <div style={{ marginTop: 30, fontFamily: ui, fontSize: 52, lineHeight: 1.2, color: C.text }}>{label}</div>
    </div>
  );
};

export const Trust: React.FC = () => {
  const frame = useCurrentFrame();
  const footOpacity = interpolate(frame, [110, 130], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <Backdrop />

      <div style={{ position: "absolute", left: 140, top: 100, fontFamily: display, fontWeight: 600, fontSize: 64, color: C.muted, textTransform: "uppercase", whiteSpace: "pre" }}>
        {"06  BUILT TO TRUST"}
      </div>

      <div style={{ position: "absolute", left: 140, top: 300, width: 1640, display: "flex", alignItems: "flex-start" }}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{ display: "flex", flex: 1 }}>
            {i > 0 && <div style={{ width: 2, height: 560, background: C.rule, flex: "0 0 auto" }} />}
            <Stat index={i} value={s.value} label={s.label} punch={s.punch} />
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 100,
          textAlign: "center",
          fontFamily: ui,
          fontSize: 44,
          color: C.muted,
          opacity: footOpacity,
          whiteSpace: "nowrap",
        }}
      >
        Open source  |  MIT licensed  |  Windows, macOS, Linux
      </div>
    </AbsoluteFill>
  );
};
