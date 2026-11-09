import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "./theme";

// Dark stage floor with a slow-breathing spotlight. Put scene content on top of it.
export const Backdrop: React.FC<{ spot?: string; x?: number; y?: number }> = ({ spot = C.next, x = 50, y = 38 }) => {
  const frame = useCurrentFrame();
  const breathe = interpolate(Math.sin(frame / 38), [-1, 1], [0.1, 0.2]);
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 60% at ${x}% ${y}%, ${spot}, transparent 70%)`,
          opacity: breathe,
        }}
      />
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)" }}
      />
    </AbsoluteFill>
  );
};
