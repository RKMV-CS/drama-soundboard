import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../shared/Backdrop";
import { C, display, ui } from "../shared/theme";

export const DURATION = 150;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SHOT_W = 840; // narrower than 880 so the pair keeps 90px side margins
const SHOT_H = (SHOT_W * 1080) / 1920;
const TOP = 170;
const GAP = 60;
const LEFT = (1920 - (SHOT_W * 2 + GAP)) / 2;

const Look: React.FC<{
  file: string;
  label: string;
  underline: string;
  x: number;
  delay: number;
  phase: number;
}> = ({ file, label, underline, x, delay, phase }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const underlineGrow = spring({ frame: frame - delay - 20, fps, config: { damping: 200 } });
  const drift = Math.sin(frame / 40 + phase) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: TOP,
        width: SHOT_W,
        opacity: enter,
        translate: `0px ${(1 - enter) * 80 + drift}px`,
      }}
    >
      <Img
        src={staticFile(`shots/${file}`)}
        style={{
          width: SHOT_W,
          height: SHOT_H,
          borderRadius: 12,
          border: `1px solid ${C.rule}`,
          boxShadow: "0 40px 120px rgba(0,0,0,0.7)",
        }}
      />
      <div
        style={{
          marginTop: 32,
          textAlign: "center",
          fontFamily: display,
          fontWeight: 700,
          fontSize: 72,
          lineHeight: 1,
          letterSpacing: 3,
          color: C.text,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 200,
          height: 8,
          margin: "12px auto 0",
          borderRadius: 4,
          backgroundColor: underline,
          scale: `${interpolate(underlineGrow, [0, 1], [0, 1], clamp)} 1`,
        }}
      />
    </div>
  );
};

export const TwoLooks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = spring({ frame: frame - 60, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill>
      <Backdrop />
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 24,
          fontFamily: display,
          fontWeight: 600,
          fontSize: 64,
          lineHeight: 1,
          letterSpacing: 2,
          color: C.muted,
          textTransform: "uppercase",
          whiteSpace: "pre",
          opacity: interpolate(frame, [0, 20], [0, 1], clamp),
        }}
      >
        03  TWO LOOKS
      </div>
      <Look file="board.png" label="TAPE" underline={C.next} x={LEFT} delay={0} phase={0} />
      <Look
        file="book.png"
        label="BOOK"
        underline="#d7f25c"
        x={LEFT + SHOT_W + GAP}
        delay={14}
        phase={2}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 880,
          textAlign: "center",
          fontFamily: ui,
          fontWeight: 500,
          fontSize: 48,
          color: C.muted,
          opacity: line,
          translate: `0px ${(1 - line) * 24}px`,
        }}
      >
        Pick the one you like. Both are built for a dark room.
      </div>
    </AbsoluteFill>
  );
};
