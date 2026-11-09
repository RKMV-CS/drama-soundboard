import { Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { C } from "./theme";

// A real app screenshot with a slow camera move. focus is the point (in %) the camera pushes toward.
export const Shot: React.FC<{
  file: string; // file in public/shots
  duration: number; // frames the move takes
  width?: number; // on-screen width in px (screenshot is 1920x1080)
  focus?: [number, number];
  scaleFrom?: number;
  scaleTo?: number;
}> = ({ file, duration, width = 1500, focus = [50, 50], scaleFrom = 1, scaleTo = 1.12 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.2, 1),
  });
  const scale = scaleFrom + (scaleTo - scaleFrom) * t;
  return (
    <div
      style={{
        width,
        height: (width * 1080) / 1920,
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${C.rule}`,
        boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
        backgroundColor: C.bg,
      }}
    >
      <Img
        src={staticFile(`shots/${file}`)}
        style={{ width: "100%", height: "100%", transformOrigin: `${focus[0]}% ${focus[1]}%`, scale: String(scale) }}
      />
    </div>
  );
};
