import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Backdrop } from "../shared/Backdrop";
import { Annotated } from "../shared/Annotated";
import { SectionLabel } from "../shared/SectionLabel";

export const DURATION = 330;
const SPLIT = 165;
const FADE = 15;

const Fade: React.FC<{ inFrames?: number; outAt?: number; children: React.ReactNode }> = ({
  inFrames = 0,
  outAt = Infinity,
  children,
}) => {
  const frame = useCurrentFrame();
  const a = inFrames ? interpolate(frame, [0, inFrames], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const b = Number.isFinite(outAt)
    ? interpolate(frame, [outAt, outAt + FADE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  return <AbsoluteFill style={{ opacity: a * b }}>{children}</AbsoluteFill>;
};

export const Cues: React.FC = () => (
  <AbsoluteFill>
    <Backdrop x={30} />
    <SectionLabel n="01" text="The cue list" />
    <Sequence durationInFrames={SPLIT + FADE}>
      <Fade outAt={SPLIT}>
        <Annotated
          file="board.png"
          markers={[
            { x: 960, y: 200, title: "Cues, in order", body: "One press fires the next sound.", at: 25 },
            { x: 760, y: 427, title: "Names and notes", body: "Stage directions live with the cue.", at: 70 },
            { x: 240, y: 238, title: "Level per track", body: "Every effect and every song has its own volume.", at: 115 },
          ]}
        />
      </Fade>
    </Sequence>
    <Sequence from={SPLIT} durationInFrames={DURATION - SPLIT}>
      <Fade inFrames={FADE}>
        <Annotated
          file="edit.png"
          markers={[
            { x: 1188, y: 635, title: "Drag to reorder", body: "Mouse, pen or touch.", at: 25 },
            { x: 955, y: 401, title: "Edit in place", body: "Name, note, action and timing.", at: 70 },
            { x: 594, y: 942, title: "Saved with the show", body: "Cues are kept on the server, per project.", at: 115 },
          ]}
        />
      </Fade>
    </Sequence>
  </AbsoluteFill>
);
