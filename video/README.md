# Explainer video

An 80-second explainer for Drama Soundboard, built with [Remotion](https://www.remotion.dev/).
The screenshots in `public/shots` are real captures of the app.

```bash
cd video
npm install
node scripts/score.js          # synthesizes public/score.wav (the music), about 14 MB, not committed
npx remotion studio            # preview
npx remotion render src/index.ts Explainer out/explainer.mp4 --crf=18
```

Scene starts are tied to hit times in `scripts/score.js`; if you change a scene's `DURATION`, retime the score to match.
