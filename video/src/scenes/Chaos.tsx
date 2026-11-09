import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../shared/Backdrop";
import { C, display, ui, W, H } from "../shared/theme";

export const DURATION = 180;

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SUCK_AT = 120; // every chip is pulled into the centre from here
const SUCK_LEN = 18;

const NAMES = [
  "door_FINAL.mp3",
  "door_FINAL2 (1).mp3",
  "thunder copy.wav",
  "BGM??.mp3",
  "applause_loud.wav",
  "phone ring v3.ogg",
  "rain_loop_REAL.wav",
  "scene2_sting.mp3",
  "new folder (3)/clap.wav",
  "DO NOT USE.mp3",
  "intro_v7_final_final.wav",
  "footsteps.wav",
  "bell.m4a",
  "wind (2).mp3",
  "creak_old.wav",
  "music for act 2.mp3",
];

// One audio-file chip. Its pile spot, angle and entry side come from random(seed), so every render is identical.
const Chip: React.FC<{ name: string; index: number }> = ({ name, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const px = (random(`px${index}`) - 0.5) * 620; // pile offset from centre
  const py = (random(`py${index}`) - 0.5) * 400;
  const rot = (random(`rot${index}`) - 0.5) * 40;
  const side = Math.floor(random(`side${index}`) * 4);
  const along = random(`along${index}`) - 0.5;
  // Start point, fully outside the 1920x1080 frame, measured from the centre.
  const [sx, sy] =
    side === 0 ? [-1400, along * 700]
    : side === 1 ? [1400, along * 700]
    : side === 2 ? [along * 1000, -950]
    : [along * 1000, 950];
  const delay = index * 4 + random(`delay${index}`) * 10;
  const tab = /BGM|music/i.test(name) ? C.bgm : C.fx;

  const enter = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
  const suck = spring({ frame: frame - SUCK_AT, fps, config: { damping: 200 }, durationInFrames: SUCK_LEN });
  const x = (px + (sx - px) * (1 - enter)) * (1 - suck);
  const y = (py + (sy - py) * (1 - enter)) * (1 - suck);

  const style: CSSProperties = {
    position: "absolute",
    left: W / 2,
    top: H / 2,
    width: 0,
    height: 0,
    translate: `${x}px ${y}px`,
    rotate: `${rot * (1 - suck)}deg`,
    scale: String(1 - 0.9 * suck),
    opacity: interpolate(frame, [delay, delay + 8], [0, 1], CLAMP) * interpolate(frame, [SUCK_AT + 6, SUCK_AT + SUCK_LEN], [1, 0], CLAMP),
  };

  return (
    <div style={style}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          translate: "-50% -50%",
          display: "flex",
          alignItems: "stretch",
          whiteSpace: "nowrap",
          backgroundColor: C.surface,
          border: `1px solid ${C.rule}`,
          borderRadius: 12,
          boxShadow: "0 14px 30px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: 8, backgroundColor: tab }} />
        <div
          style={{
            padding: "14px 26px 14px 20px",
            fontFamily: ui,
            fontWeight: 500,
            fontSize: 44,
            lineHeight: 1.1,
            color: C.text,
          }}
        >
          {name}
        </div>
      </div>
    </div>
  );
};

// "WHICH ONE?!" jitters over the pile, then fades before the suck-in.
const Panic: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [60, 70, 112, 120], [0, 1, 1, 0], CLAMP);
  const jit = interpolate(frame, [60, 70], [0, 1], CLAMP);
  const x = jit * 7 * Math.sin(frame * 2.1);
  const y = jit * 5 * Math.sin(frame * 3.3);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
      <div style={{ translate: `${x}px ${y}px`, textAlign: "center", textShadow: "0 4px 40px rgba(0,0,0,0.9)" }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 200,
            lineHeight: 1,
            letterSpacing: 2,
            color: C.danger,
          }}
        >
          WHICH ONE?!
        </div>
        <div style={{ fontFamily: ui, fontWeight: 500, fontSize: 56, color: C.text, marginTop: 18 }}>
          Tabs. Folders. Panic.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Final line, fades up from f138 and holds.
const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [SUCK_AT + SUCK_LEN, SUCK_AT + SUCK_LEN + 12], [0, 1], CLAMP);
  const y = interpolate(frame, [SUCK_AT + SUCK_LEN, SUCK_AT + SUCK_LEN + 12], [30, 0], CLAMP);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
      <div
        style={{
          translate: `0px ${y}px`,
          fontFamily: display,
          fontWeight: 700,
          fontSize: 140,
          lineHeight: 1,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: C.text,
          whiteSpace: "nowrap",
        }}
      >
        One board. <span style={{ color: C.next }}>Every cue</span>.
      </div>
    </AbsoluteFill>
  );
};

export const Chaos: React.FC = () => (
  <AbsoluteFill>
    <Backdrop spot={C.text} />
    {NAMES.map((name, i) => (
      <Chip key={name} name={name} index={i} />
    ))}
    <Panic />
    <Tagline />
  </AbsoluteFill>
);
