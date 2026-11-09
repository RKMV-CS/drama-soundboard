import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../shared/Backdrop";
import { Logo } from "../shared/Logo";
import { C, display, ui } from "../shared/theme";

export const DURATION = 390;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const CARD_W = 364;
const GAP = (1640 - 4 * CARD_W) / 3; // 4 cards + 3 arrow gaps fill the 1640px content width
const CARD_H = 520;
const ICON_CY = 80; // icon centre, used to line the arrows up with the cards
const STAGE_START = [40, 110, 180, 250];

const Icon: React.FC<{ kind: "zip" | "window" | "tray" | "laptop" }> = ({ kind }) => {
  if (kind === "zip")
    return (
      <svg width={100} height={100} viewBox="0 0 100 100">
        <rect x={22} y={22} width={56} height={70} rx={6} fill={C.surface2} stroke={C.muted} strokeWidth={2} />
        <rect x={16} y={8} width={68} height={18} rx={4} fill={C.fx} />
        {[40, 50, 60, 70, 80].map((y, i) => (
          <rect key={y} x={43} y={y} width={14} height={6} rx={2} fill={i % 2 ? C.surface2 : C.fx} />
        ))}
      </svg>
    );
  if (kind === "window")
    return (
      <div style={{ width: 100, height: 100, borderRadius: 14, border: `2px solid ${C.rule}`, background: C.surface2, position: "relative", boxSizing: "border-box", overflow: "hidden" }}>
        <div style={{ height: 22, background: C.rule, display: "flex", alignItems: "center", gap: 5, padding: "0 8px", boxSizing: "border-box" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: 4, background: C.muted }} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 22, top: 34 }}>
          <Logo size={56} />
        </div>
      </div>
    );
  if (kind === "tray")
    return (
      <svg width={100} height={100} viewBox="0 0 100 100">
        <path d="M50 4 L50 58" stroke={C.next} strokeWidth={6} strokeLinecap="round" />
        <path d="M32 44 L50 62 L68 44" fill="none" stroke={C.next} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 66 L8 88 Q8 94 14 94 L86 94 Q92 94 92 88 L92 66 L70 66 L64 76 L36 76 L30 66 Z" fill={C.surface2} stroke={C.muted} strokeWidth={2} strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <rect x={18} y={12} width={64} height={46} rx={4} fill="none" stroke={C.text} strokeWidth={4} />
      <rect x={22} y={24} width={56} height={12} fill={C.next} />
      <path d="M6 66 L94 66 L86 76 L14 76 Z" fill="none" stroke={C.text} strokeWidth={4} strokeLinejoin="round" />
    </svg>
  );
};

const Card: React.FC<{
  n: string;
  title: string;
  file?: string;
  caption: string;
  icon: "zip" | "window" | "tray" | "laptop";
  start: number;
}> = ({ n, title, file, caption, icon, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - start, fps, config: { damping: 200 } });
  const opacity = interpolate(frame, [start, start + 12], [0, 1], clamp);

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        boxSizing: "border-box",
        background: C.surface,
        border: `1px solid ${C.rule}`,
        borderRadius: 24,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        opacity,
        translate: `0px ${interpolate(sp, [0, 1], [40, 0])}px`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", height: 100 }}>
        <Icon kind={icon} />
        <div style={{ fontFamily: display, fontWeight: 700, fontSize: 64, lineHeight: 1, color: C.next }}>{n}</div>
      </div>
      <div style={{ marginTop: 22, fontFamily: display, fontWeight: 700, fontSize: 60, lineHeight: 1, color: C.text, textTransform: "uppercase" }}>
        {title}
      </div>
      <div style={{ marginTop: 18, minHeight: 100, fontFamily: ui, fontWeight: 600, fontSize: 32, lineHeight: 1.2, color: C.text, whiteSpace: "pre-line" }}>
        {file}
      </div>
      <div style={{ marginTop: 14, fontFamily: ui, fontSize: 40, lineHeight: 1.25, color: C.muted }}>{caption}</div>
    </div>
  );
};

// Arrow that draws from the left card to the right card, with an arrowhead once the line lands.
const Arrow: React.FC<{ drawAt: number }> = ({ drawAt }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [drawAt, drawAt + 16], [0, 1], clamp);
  const head = interpolate(frame, [drawAt + 14, drawAt + 20], [0, 1], clamp);
  const x0 = 10;
  const x1 = GAP - 18;
  return (
    <svg width={GAP} height={CARD_H} style={{ flex: "0 0 auto" }}>
      <path
        d={`M${x0} ${ICON_CY} L${x1} ${ICON_CY}`}
        fill="none"
        stroke={C.muted}
        strokeWidth={4}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
      <path
        d={`M${x1 - 12} ${ICON_CY - 12} L${x1} ${ICON_CY} L${x1 - 12} ${ICON_CY + 12}`}
        fill="none"
        stroke={C.muted}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={head}
      />
    </svg>
  );
};

export const Ship: React.FC = () => {
  const frame = useCurrentFrame();
  const closeOpacity = interpolate(frame, [300, 322], [0, 1], clamp);
  const closeShift = interpolate(frame, [300, 322], [16, 0], clamp);

  return (
    <AbsoluteFill>
      <Backdrop />

      <div style={{ position: "absolute", left: 140, top: 100, fontFamily: display, fontWeight: 600, fontSize: 64, color: C.muted, textTransform: "uppercase", whiteSpace: "pre" }}>
        {"05  YOURS TO KEEP"}
      </div>
      <div style={{ position: "absolute", left: 140, top: 180, fontFamily: display, fontWeight: 700, fontSize: 120, lineHeight: 1, color: C.text, whiteSpace: "nowrap" }}>
        ONE FILE. ANY LAPTOP.
      </div>

      <div style={{ position: "absolute", left: 140, top: 330, width: 1640, display: "flex", alignItems: "flex-start" }}>
        <Card n="01" title="Export" file={"act-one\n.dramashow.zip"} caption="audio + cues + notes" icon="zip" start={STAGE_START[0]} />
        <Arrow drawAt={STAGE_START[1] - 14} />
        <Card n="02" title="One executable" file={"drama-soundboard\n.exe"} caption="88 MB  |  no Node install" icon="window" start={STAGE_START[1]} />
        <Arrow drawAt={STAGE_START[2] - 14} />
        <Card n="03" title="Installer" file={"Drama-Soundboard\n-Setup.exe"} caption="22 MB  |  per-user, no admin" icon="tray" start={STAGE_START[2]} />
        <Arrow drawAt={STAGE_START[3] - 14} />
        <Card n="04" title="On stage" caption="Offline. Local. Yours." icon="laptop" start={STAGE_START[3]} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 140,
          top: 918,
          fontFamily: ui,
          fontWeight: 500,
          fontSize: 56,
          color: C.text,
          whiteSpace: "nowrap",
          opacity: closeOpacity,
          translate: `0px ${closeShift}px`,
        }}
      >
        Move a whole show between laptops in one file.
      </div>
    </AbsoluteFill>
  );
};
