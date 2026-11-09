import type { ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../shared/Backdrop";
import { C, display } from "../shared/theme";

export const DURATION = 150;

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Door slam at f50: the whole frame jitters for 8 frames, decaying.
const Shake: React.FC<{ children: ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const k = frame - 50;
  const amp = k >= 0 && k < 8 ? 34 * (1 - k / 8) : 0;
  const x = amp * Math.sin(k * 2.9 + 0.5);
  const y = amp * Math.cos(k * 3.7);
  return <AbsoluteFill style={{ translate: `${x}px ${y}px` }}>{children}</AbsoluteFill>;
};

// White hit flash on the door slam.
const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [49, 50, 58], [0, 0.9, 0], CLAMP);
  return <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity }} />;
};

// One centred line: blur-in, hold, fade out before `end`.
const Line: React.FC<{ start: number; end: number; fadeIn?: number; children: ReactNode }> = ({
  start,
  end,
  fadeIn = 10,
  children,
}) => {
  const frame = useCurrentFrame();
  const stops = [start, start + fadeIn, end - 5, end];
  const opacity = interpolate(frame, stops, [0, 1, 1, 0], CLAMP);
  const blur = interpolate(frame, stops, [fadeIn > 2 ? 14 : 0, 0, 0, 6], CLAMP);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
      <div
        style={{
          filter: `blur(${blur}px)`,
          maxWidth: 1600,
          textAlign: "center",
          fontFamily: display,
          fontWeight: 700,
          fontSize: 120,
          lineHeight: 1.04,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: C.text,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// Phone ring at f85: small decaying wobble, then two scale pulses at f85 and f95.
const Beat: React.FC<{ at: number; children: ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const k = frame - at;
  const wobble = k >= 0 && k < 20 ? 4 * (1 - k / 20) * Math.sin(k * 1.3) : 0;
  const pulse =
    interpolate(k, [0, 3, 8], [0, 1, 0], CLAMP) + interpolate(k, [10, 13, 18], [0, 1, 0], CLAMP);
  return <div style={{ rotate: `${wobble}deg`, scale: String(1 + 0.05 * pulse) }}>{children}</div>;
};

// Yellow bar wipes in behind the words; the words turn near-black on it.
const Highlight: React.FC<{ at: number; children: string }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 14], [0, 100], {
    ...CLAMP,
    easing: Easing.bezier(0.7, 0, 0.2, 1),
  });
  const clip = `inset(0 ${100 - p}% 0 0)`;
  return (
    <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", padding: "0 0.18em" }}>
      {children}
      <span style={{ position: "absolute", inset: "0.04em 0", backgroundColor: C.next, clipPath: clip }} />
      <span
        style={{
          position: "absolute",
          inset: 0,
          padding: "0 0.18em",
          whiteSpace: "nowrap",
          color: C.onNext,
          clipPath: clip,
        }}
      >
        {children}
      </span>
    </span>
  );
};

export const ColdOpen: React.FC = () => (
  <Shake>
    <Backdrop spot={C.text} />
    <Line start={0} end={50}>
      Every show has a moment.
    </Line>
    <Line start={50} end={85} fadeIn={2}>
      A door slams.
    </Line>
    <Line start={85} end={115} fadeIn={2}>
      <Beat at={85}>A phone rings.</Beat>
    </Line>
    <Line start={115} end={10000}>
      Someone has to <Highlight at={130}>press the button</Highlight>.
    </Line>
    <Flash />
  </Shake>
);
