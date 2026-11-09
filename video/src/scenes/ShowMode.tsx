import { AbsoluteFill } from "remotion";
import { Backdrop } from "../shared/Backdrop";
import { Annotated } from "../shared/Annotated";
import { SectionLabel } from "../shared/SectionLabel";

export const DURATION = 270;

export const ShowMode: React.FC = () => (
  <AbsoluteFill>
    <Backdrop x={25} />
    <SectionLabel n="02" text="Show mode" />
    <Annotated
      file="show.png"
      markers={[
        { x: 700, y: 30, title: "Fullscreen", body: "Nothing on screen but the show.", at: 20 },
        { x: 960, y: 220, title: "One huge NEXT", body: "Readable across the stage.", at: 75 },
        { x: 1500, y: 650, title: "Edit controls hidden", body: "No accidental changes mid-show.", at: 130 },
        { x: 1842, y: 30, title: "Esc to leave", body: "The screen stays awake while you run.", at: 190 },
      ]}
    />
  </AbsoluteFill>
);
