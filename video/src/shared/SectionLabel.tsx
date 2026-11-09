import { interpolate, useCurrentFrame } from "remotion";
import { C, display } from "./theme";

export const SectionLabel: React.FC<{ n: string; text: string }> = ({ n, text }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 64,
        opacity: o,
        translate: `${(1 - o) * -30}px 0`,
        fontFamily: display,
        fontWeight: 700,
        fontSize: 64,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: C.muted,
      }}
    >
      <span style={{ color: C.next, marginRight: 22 }}>{n}</span>
      {text}
    </div>
  );
};
