import { Composition } from "remotion";
import { Explainer, TOTAL } from "./Explainer";
import { FPS, H, W } from "./shared/theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="Explainer" component={Explainer} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
