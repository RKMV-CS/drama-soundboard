import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../shared/Backdrop";
import { C, display, ui } from "../shared/theme";

export const DURATION = 450;
const PHASE = 150;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Shared text + panel styling
const Head: React.FC<{ text: string; sub: string }> = ({ text, sub }) => (
  <>
    <div style={{ position: "absolute", left: 140, top: 190, fontFamily: display, fontWeight: 700, fontSize: 120, lineHeight: 1, color: C.text, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {text}
    </div>
    <div style={{ position: "absolute", left: 140, top: 330, fontFamily: ui, fontSize: 48, color: C.muted, whiteSpace: "nowrap" }}>{sub}</div>
  </>
);

const Panel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: 140,
      top: 440,
      width: 1640,
      height: 460,
      borderRadius: 28,
      background: C.surface,
      border: `1px solid ${C.rule}`,
      overflow: "hidden",
    }}
  >
    {children}
  </div>
);

// ---- Phase 1: NO LAG --------------------------------------------------------
const CHIPS = ["door-slam.wav", "thunder.wav", "phone-ring.wav"];
const TICKS = [12, 26, 40];

const PhaseNoLag: React.FC<{ f: number }> = ({ f }) => {
  const press = interpolate(f, [60, 66, 74], [1, 0.92, 1], clamp);
  const ring = interpolate(f, [60, 90], [1, 2.4], clamp);
  const ringOpacity = interpolate(f, [60, 63, 90], [0, 0.9, 0], clamp);
  const env = interpolate(f, [61, 62, 110, 150], [0, 1, 0.75, 0.6], clamp);
  const counterOpacity = interpolate(f, [61, 62], [0, 1], clamp);

  return (
    <>
      <Head text="No lag" sub="Effects are decoded once, then fired from memory." />
      <Panel>
        {CHIPS.map((name, i) => {
          const tick = interpolate(f, [TICKS[i], TICKS[i] + 8], [0, 1], clamp);
          return (
            <div
              key={name}
              style={{
                position: "absolute",
                left: 60,
                top: 60 + i * 130,
                width: 700,
                height: 110,
                boxSizing: "border-box",
                borderRadius: 20,
                background: C.surface2,
                border: `2px solid ${C.fx}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 36px",
                fontFamily: ui,
                fontSize: 44,
                color: C.text,
              }}
            >
              <span>{name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 14, color: C.muted }}>
                <svg width={44} height={44} viewBox="0 0 24 24">
                  <path
                    d="M4 12.5l5 5L20 6"
                    fill="none"
                    stroke={C.text}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - tick}
                  />
                </svg>
                decoded
              </span>
            </div>
          );
        })}

        {/* NEXT button: press at f60, ripple ring behind it */}
        <div
          style={{
            position: "absolute",
            left: 850,
            top: 110,
            width: 300,
            height: 180,
            borderRadius: 36,
            border: `4px solid ${C.next}`,
            boxSizing: "border-box",
            scale: String(ring),
            opacity: ringOpacity,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 850,
            top: 110,
            width: 300,
            height: 180,
            borderRadius: 36,
            background: C.next,
            color: C.onNext,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 88,
            letterSpacing: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            scale: String(press),
          }}
        >
          NEXT
        </div>

        {/* Waveform burst, starts at f62 */}
        <div style={{ position: "absolute", left: 1200, top: 80, width: 280, height: 240, display: "flex", alignItems: "center", gap: 5 }}>
          {Array.from({ length: 18 }, (_, i) => {
            const h = 220 * env * (0.3 + 0.7 * Math.abs(Math.sin(i * 0.9 + f * 0.45)));
            return (
              <div key={i} style={{ width: 10, height: Math.max(h, 0), borderRadius: 5, background: C.fx }} />
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            left: 1200,
            top: 300,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 96,
            color: C.text,
            opacity: counterOpacity,
            whiteSpace: "nowrap",
          }}
        >
          0 ms <span style={{ fontFamily: ui, fontWeight: 500, fontSize: 44, color: C.muted }}>wait</span>
        </div>
      </Panel>
    </>
  );
};

// ---- Phase 2: MUSIC STEPS ASIDE ---------------------------------------------
const TRACK_X = 60;
const TRACK_W = 1520;
const BARS = 96;
const HITS: [number, number][] = [
  [42, 60],
  [90, 108],
];

const PhaseDuck: React.FC<{ f: number }> = ({ f }) => {
  // Gain keyframes: 0.3 s (9 f) ramp down before each hit so it is at 80% when the hit starts,
  // 0.5 s (15 f) ramp back up after the hit ends.
  const gain = interpolate(
    f,
    [0, 33, 42, 60, 75, 81, 90, 108, 123, 150],
    [1, 1, 0.8, 0.8, 1, 1, 0.8, 0.8, 1, 1],
    clamp,
  );
  const playX = TRACK_X + TRACK_W * interpolate(f, [0, 150], [0, 1], clamp);
  const scroll = f * 0.35;
  const halfMax = 105;
  const centreY = 175;

  return (
    <>
      <Head text="Music steps aside" sub="Effects duck the music, then it swells back." />
      <Panel>
        <div
          style={{
            position: "absolute",
            right: 60,
            top: 14,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 64,
            color: C.bgm,
            whiteSpace: "nowrap",
          }}
        >
          MUSIC {Math.round(gain * 100)}%
        </div>

        {/* Music waveform: mirrored bars, amplitude follows the duck gain */}
        {Array.from({ length: BARS }, (_, i) => {
          const shape = Math.abs(0.6 * Math.sin(0.21 * (i + scroll)) + 0.4 * Math.sin(0.53 * (i + scroll) + 1.3));
          const h = halfMax * gain * (0.2 + 0.8 * shape);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: TRACK_X + i * (TRACK_W / BARS),
                top: centreY - h,
                width: 9,
                height: 2 * h,
                borderRadius: 4,
                background: C.bgm,
              }}
            />
          );
        })}

        {/* Effect lane */}
        <div style={{ position: "absolute", left: TRACK_X, top: 349, width: TRACK_W, height: 2, background: C.rule }} />
        {HITS.map(([s, e], i) => {
          const x = TRACK_X + TRACK_W * (s / PHASE);
          const w = TRACK_W * ((e - s) / PHASE);
          const active = interpolate(f, [s - 1, s, e, e + 1], [0.55, 1, 1, 0.55], clamp);
          return (
            <div key={i}>
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: 318,
                  width: w,
                  height: 62,
                  borderRadius: 10,
                  background: C.fx,
                  opacity: active,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: 392,
                  width: w,
                  textAlign: "center",
                  fontFamily: ui,
                  fontSize: 44,
                  color: C.fx,
                }}
              >
                effect
              </div>
            </div>
          );
        })}

        {/* Playhead */}
        <div style={{ position: "absolute", left: playX - 1.5, top: 20, width: 3, height: 420, background: C.text, opacity: 0.9 }} />
        <div style={{ position: "absolute", left: playX - 8, top: 12, width: 16, height: 16, borderRadius: 8, background: C.text }} />
      </Panel>
    </>
  );
};

// ---- Phase 3: SMOOTH CROSSFADES ---------------------------------------------
const PhaseCrossfade: React.FC<{ f: number }> = ({ f }) => {
  const p = interpolate(f, [0, 150], [0, 1], clamp);
  const X0 = 220;
  const X1 = 1480;
  const Y0 = 110; // 100% volume
  const Y1 = 350; // 0% volume
  const X = (t: number) => X0 + (X1 - X0) * t;
  const Y = (v: number) => Y1 - (Y1 - Y0) * v;
  const N = 60;
  const fnA = (t: number) => 1 - t;
  const fnB = (t: number) => t;
  const path = (fn: (t: number) => number, upTo: number) =>
    Array.from({ length: N + 1 }, (_, k) => {
      const t = (upTo * k) / N;
      return `${X(t)},${Y(fn(t))}`;
    }).join(" ");
  const B_COLOR = "#8fdcff";
  const dotA = { x: X(p), y: Y(fnA(p)) };
  const dotB = { x: X(p), y: Y(fnB(p)) };

  return (
    <>
      <Head text="Smooth crossfades" sub="A new track fades in while the old one fades out." />
      <Panel>
        <svg width={1640} height={460} style={{ position: "absolute", left: 0, top: 0 }}>
          <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={C.rule} strokeWidth={2} />
          <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={C.rule} strokeWidth={2} />
          <line x1={X0} y1={Y((0.5))} x2={X1} y2={Y(0.5)} stroke={C.rule} strokeWidth={2} strokeDasharray="10 10" />
          {/* full-length guides */}
          <polyline points={path(fnA, 1)} fill="none" stroke={C.bgm} strokeWidth={4} strokeDasharray="4 12" opacity={0.3} />
          <polyline points={path(fnB, 1)} fill="none" stroke={B_COLOR} strokeWidth={4} strokeDasharray="4 12" opacity={0.3} />
          {/* drawn so far */}
          <polyline points={path(fnA, p)} fill="none" stroke={C.bgm} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={path(fnB, p)} fill="none" stroke={B_COLOR} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
          <line x1={dotA.x} y1={Y0 - 10} x2={dotA.x} y2={Y1} stroke={C.text} strokeWidth={2} opacity={0.6} />
          <circle cx={dotA.x} cy={dotA.y} r={14} fill={C.bgm} stroke={C.bg} strokeWidth={4} />
          <circle cx={dotB.x} cy={dotB.y} r={14} fill={B_COLOR} stroke={C.bg} strokeWidth={4} />
        </svg>

        <div style={{ position: "absolute", left: X0, top: Y0 - 62, fontFamily: ui, fontWeight: 600, fontSize: 44, color: C.bgm, whiteSpace: "nowrap" }}>
          haunted-hall-theme
        </div>
        <div style={{ position: "absolute", right: 1640 - X1, top: Y0 - 62, fontFamily: ui, fontWeight: 600, fontSize: 44, color: B_COLOR, whiteSpace: "nowrap" }}>
          rain-ambience
        </div>
        <div style={{ position: "absolute", left: 20, width: X0 - 40, textAlign: "right", top: Y0 - 22, fontFamily: ui, fontSize: 44, color: C.muted }}>100%</div>
        <div style={{ position: "absolute", left: 20, width: X0 - 40, textAlign: "right", top: Y1 - 22, fontFamily: ui, fontSize: 44, color: C.muted }}>0%</div>
        <div style={{ position: "absolute", left: X0, width: X1 - X0, textAlign: "center", top: Y1 + 22, fontFamily: ui, fontSize: 44, color: C.muted }}>time</div>
      </Panel>
    </>
  );
};

// ---- Scene ------------------------------------------------------------------
export const Engine: React.FC = () => {
  const frame = useCurrentFrame();
  // Each phase fades in over the 12 frames before its start and out over the 12 frames before its end.
  const opacityOf = (i: number) =>
    interpolate(frame, [i * PHASE - 12, i * PHASE], [0, 1], clamp) *
    interpolate(frame, [(i + 1) * PHASE - 12, (i + 1) * PHASE], [1, 0], clamp);

  return (
    <AbsoluteFill>
      <Backdrop />

      <div
        style={{
          position: "absolute",
          left: 140,
          top: 100,
          fontFamily: display,
          fontWeight: 600,
          fontSize: 64,
          color: C.muted,
          textTransform: "uppercase",
          whiteSpace: "pre",
        }}
      >
        {"04  THE SOUND ENGINE"}
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: opacityOf(0) }}>
        <PhaseNoLag f={frame} />
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: opacityOf(1) }}>
        <PhaseDuck f={frame - PHASE} />
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: opacityOf(2) }}>
        <PhaseCrossfade f={frame - 2 * PHASE} />
      </div>

      <div style={{ position: "absolute", left: 140, bottom: 100, fontFamily: ui, fontSize: 36, color: C.muted, whiteSpace: "nowrap" }}>
        Web Audio API  |  effects decoded once  |  music streamed
      </div>
    </AbsoluteFill>
  );
};
