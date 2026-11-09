import type { ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../shared/Backdrop";
import { Logo } from "../shared/Logo";
import { C, display, ui, W } from "../shared/theme";

export const DURATION = 180;

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CURTAIN_LEN = 34;
const FACTS = ["Open source", "Local-first", "Works offline"];

// Two dark panels part left and right to reveal the headline, f0-34.
const Curtain: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, CURTAIN_LEN], [0, W / 2], {
    ...CLAMP,
    easing: Easing.bezier(0.7, 0, 0.2, 1),
  });
  const panel = { position: "absolute" as const, top: 0, width: W / 2 + 1, height: "100%", backgroundColor: "#050506" };
  return (
    <>
      <div style={{ ...panel, left: 0, translate: `${-x}px 0px` }} />
      <div style={{ ...panel, right: 0, translate: `${x}px 0px` }} />
    </>
  );
};

const Dot: React.FC = () => (
  <span
    style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: C.muted,
      margin: "0 36px",
      verticalAlign: "middle",
    }}
  />
);

// Fact line: each item rises in one after another from f50.
const Facts: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 56 }}>
      {FACTS.map((fact, i) => {
        const at = 50 + i * 14;
        const opacity = interpolate(frame, [at, at + 12], [0, 1], CLAMP);
        const y = interpolate(frame, [at, at + 12], [16, 0], CLAMP);
        return (
          <div key={fact} style={{ display: "flex", alignItems: "center", opacity, translate: `0px ${y}px` }}>
            <span style={{ fontFamily: ui, fontWeight: 500, fontSize: 52, color: C.muted, whiteSpace: "nowrap" }}>
              {fact}
            </span>
            {i < FACTS.length - 1 ? <Dot /> : null}
          </div>
        );
      })}
    </div>
  );
};

// Headline and facts; they fade out at f92-102 to make room for the logo.
const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [92, 102], [1, 0], CLAMP);
  const scale = interpolate(frame, [0, 40], [1.04, 1], CLAMP);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
      <div style={{ textAlign: "center", scale: String(scale) }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 200,
            lineHeight: 1,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: C.text,
            whiteSpace: "nowrap",
          }}
        >
          Curtain up.
        </div>
        <Facts />
      </div>
    </AbsoluteFill>
  );
};

// Logo lockup at f100.
const Lockup: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [100, 114], [0, 1], CLAMP);
  const y = interpolate(frame, [100, 114], [14, 0], CLAMP);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity, translate: `0px ${y}px` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <Logo size={120} />
        <div style={{ fontFamily: display, fontWeight: 700, fontSize: 64, letterSpacing: 2, color: C.text, whiteSpace: "nowrap" }}>
          Drama Soundboard{"  "}
          <span style={{ fontFamily: ui, fontWeight: 500, fontSize: 40, letterSpacing: 0, color: C.muted }}>v0.9.0</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Black cover that takes the whole scene to black over the last 24 frames.
const FadeOut: React.FC<{ children: ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const black = interpolate(frame, [DURATION - 24, DURATION - 1], [0, 1], CLAMP);
  return (
    <AbsoluteFill>
      {children}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: black }} />
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => (
  <FadeOut>
    <Backdrop spot={C.text} />
    <Hero />
    <Lockup />
    <Curtain />
  </FadeOut>
);
