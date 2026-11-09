import { AbsoluteFill, Series, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { ColdOpen, DURATION as D_COLD } from "./scenes/ColdOpen";
import { Chaos, DURATION as D_CHAOS } from "./scenes/Chaos";
import { Title, DURATION as D_TITLE } from "./scenes/Title";
import { Cues, DURATION as D_CUES } from "./scenes/Cues";
import { Engine, DURATION as D_ENGINE } from "./scenes/Engine";
import { ShowMode, DURATION as D_SHOW } from "./scenes/ShowMode";
import { TwoLooks, DURATION as D_LOOKS } from "./scenes/TwoLooks";
import { Ship, DURATION as D_SHIP } from "./scenes/Ship";
import { Trust, DURATION as D_TRUST } from "./scenes/Trust";
import { Outro, DURATION as D_OUTRO } from "./scenes/Outro";
import { C } from "./shared/theme";

export const TOTAL = D_COLD + D_CHAOS + D_TITLE + D_CUES + D_ENGINE + D_SHOW + D_LOOKS + D_SHIP + D_TRUST + D_OUTRO;

// Scene starts must match the score's absolute hit times (see scripts/score.js).
export const Explainer: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <Series>
      <Series.Sequence name="Cold open" durationInFrames={D_COLD}><ColdOpen /></Series.Sequence>
      <Series.Sequence name="Chaos" durationInFrames={D_CHAOS}><Chaos /></Series.Sequence>
      <Series.Sequence name="Title" durationInFrames={D_TITLE}><Title /></Series.Sequence>
      <Series.Sequence name="Cue list" durationInFrames={D_CUES}><Cues /></Series.Sequence>
      <Series.Sequence name="Sound engine" durationInFrames={D_ENGINE}><Engine /></Series.Sequence>
      <Series.Sequence name="Show mode" durationInFrames={D_SHOW}><ShowMode /></Series.Sequence>
      <Series.Sequence name="Two looks" durationInFrames={D_LOOKS}><TwoLooks /></Series.Sequence>
      <Series.Sequence name="Ship" durationInFrames={D_SHIP}><Ship /></Series.Sequence>
      <Series.Sequence name="Trust" durationInFrames={D_TRUST}><Trust /></Series.Sequence>
      <Series.Sequence name="Outro" durationInFrames={D_OUTRO}><Outro /></Series.Sequence>
    </Series>
    <Audio src={staticFile("score.wav")} />
  </AbsoluteFill>
);
