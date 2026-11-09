import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../shared/Backdrop";
import { Logo } from "../shared/Logo";
import { C, display, ui, W } from "../shared/theme";

export const DURATION = 120;

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const BAR_W = 2600;
const BAR_H = 230;
const SLANT = Math.round(BAR_H * 0.15); // same lean as the logo bars

// A slanted tape bar that sweeps across the frame once.
const Sweep: React.FC<{ color: string; delay: number; top: number }> = ({ color, delay, top }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [delay, delay + 18], [-2700, 2700], {
    ...CLAMP,
    easing: Easing.bezier(0.7, 0, 0.3, 1),
  });
  return (
    <div
      style={{
        position: "absolute",
        left: (W - BAR_W) / 2,
        top,
        width: BAR_W,
        height: BAR_H,
        backgroundColor: color,
        clipPath: `polygon(${SLANT}px 0, 100% 0, calc(100% - ${SLANT}px) 100%, 0 100%)`,
        translate: `${x}px 0px`,
      }}
    />
  );
};

const LogoIn: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  return (
    <div style={{ position: "absolute", left: (W - 220) / 2, top: 130, scale: String(s) }}>
      <Logo size={220} />
    </div>
  );
};

// Left-to-right wipe reveal of the title, f10-f40.
const TitleWord: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [10, 40], [0, 100], {
    ...CLAMP,
    easing: Easing.bezier(0.6, 0, 0.2, 1),
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 420,
        textAlign: "center",
        fontFamily: display,
        fontWeight: 700,
        fontSize: 190,
        lineHeight: 1,
        letterSpacing: 6,
        color: C.text,
        whiteSpace: "nowrap",
        clipPath: `inset(0 ${100 - p}% 0 0)`,
      }}
    >
      DRAMA SOUNDBOARD
    </div>
  );
};

// Tagline at f60 with NEXT in a yellow key cap.
const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [60, 74], [0, 1], CLAMP);
  const y = interpolate(frame, [60, 74], [24, 0], CLAMP);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 700,
        textAlign: "center",
        fontFamily: ui,
        fontWeight: 500,
        fontSize: 72,
        color: C.next,
        opacity,
        translate: `0px ${y}px`,
      }}
    >
      Press{" "}
      <span
        style={{
          display: "inline-block",
          fontFamily: display,
          fontWeight: 700,
          fontSize: 66,
          lineHeight: 1.1,
          letterSpacing: 2,
          padding: "0 18px",
          margin: "0 6px",
          border: `3px solid ${C.next}`,
          borderRadius: 14,
          boxShadow: `inset 0 -5px 0 ${C.next}`,
        }}
      >
        NEXT
      </span>
      . Run the show.
    </div>
  );
};

export const Title: React.FC = () => (
  <AbsoluteFill>
    <Backdrop spot={C.fx} x={50} y={42} />
    <Sweep color={C.fx} delay={0} top={425} />
    <Sweep color={C.bgm} delay={6} top={425} />
    <LogoIn />
    <TitleWord />
    <Tagline />
  </AbsoluteFill>
);
