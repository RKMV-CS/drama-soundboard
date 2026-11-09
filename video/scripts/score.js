'use strict';
// Synthesizes an 80 s A-minor cinematic score to public/score.wav (44.1 kHz, stereo, 16-bit PCM).
// No dependencies. Deterministic: all noise comes from a seeded mulberry32 PRNG.

const fs = require('fs');
const path = require('path');

const SR = 44100;
const DUR = 80;
const N = DUR * SR;
const OUT = path.join(__dirname, '..', 'public', 'score.wav');

// ---------- PRNG ----------
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20240501);
const noise = () => rnd() * 2 - 1;

// ---------- buses ----------
const L = new Float32Array(N);
const R = new Float32Array(N);
const SEND = new Float32Array(N); // reverb send (mono)
const GATE = new Float32Array(N).fill(1); // global cut for the "sucked-in breath"
for (let i = Math.round(10.85 * SR); i < N; i++) {
  const t = i / SR;
  GATE[i] = t < 10.9 ? 1 - 0.97 * ((t - 10.85) / 0.05) : t < 11.0 ? 0.03 : 1;
}

// ---------- DSP helpers ----------
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12); // MIDI -> Hz
// ADSR: attack a, decay d to sustain s, note length dur, release r after dur (all seconds)
function env(t, dur, a, d, s, r) {
  const tt = Math.min(t, dur);
  let v = tt < a ? tt / a : tt < a + d ? 1 + (s - 1) * (tt - a) / d : s;
  if (t > dur) v *= Math.max(0, 1 - (t - dur) / r);
  return v;
}
// Oscillators: call o(freqHz) once per sample. Naive saw/square: keep them low-passed.
function mkOsc(type) {
  let ph = 0;
  return (f) => {
    ph += f / SR;
    ph -= Math.floor(ph);
    if (type === 'sin') return Math.sin(2 * Math.PI * ph);
    if (type === 'saw') return 2 * ph - 1;
    return ph < 0.5 ? 1 : -1; // square
  };
}
// One-pole filters; cutoff fc is passed per sample so it can sweep.
function mkLP() {
  let y = 0;
  return (x, fc) => (y += (1 - Math.exp(-2 * Math.PI * fc / SR)) * (x - y));
}
function mkHP() {
  const lp = mkLP();
  return (x, fc) => x - lp(x, fc);
}
// Write fn(t) (t = seconds since t0) into the stereo bus. pan -1 (L) .. 1 (R), constant power.
function voice(t0, dur, fn, { gain = 1, pan = 0, send = 0 } = {}) {
  const s0 = Math.round(t0 * SR);
  const n = Math.round(dur * SR);
  const ang = (pan + 1) * Math.PI / 4;
  const gl = gain * Math.cos(ang);
  const gr = gain * Math.sin(ang);
  for (let i = 0; i < n; i++) {
    const idx = s0 + i;
    if (idx < 0 || idx >= N) continue;
    const x = fn(i / SR) * GATE[idx];
    L[idx] += x * gl;
    R[idx] += x * gr;
    SEND[idx] += x * send;
  }
}

// ---------- instruments ----------
// Pitched thump with exponential pitch drop (kicks, heartbeats, title/outro booms).
function thump(t0, f0, f1, tau, decay, gain, send = 0) {
  const o = mkOsc('sin');
  voice(t0, decay, (t) => o(f1 + (f0 - f1) * Math.exp(-t / tau)) * Math.exp(-5 * t / decay), { gain, send });
}
// Filtered noise burst / whoosh; cutoff(p) takes progress p in 0..1.
function whoosh(t0, dur, cutoff, gain, send = 0) {
  const lp = mkLP();
  voice(t0, dur, (t) => lp(noise(), cutoff(t / dur)) * Math.exp(-3 * t / dur), { gain, send });
}
// High-passed noise click (hats, chaos ticks).
function tick(t0, dur, gain, pan = 0) {
  const hp = mkHP();
  voice(t0, dur, (t) => hp(noise(), 5000) * Math.exp(-5 * t / dur), { gain, pan });
}
// Plucked note with brightness decay, sent to reverb/delay.
function pluck(t0, m, gain, pan) {
  const s = mkOsc('saw'), q = mkOsc('sin'), lp = mkLP(), f = hz(m);
  voice(t0, 0.8, (t) => lp(0.6 * s(f) + 0.4 * q(f), 500 + 3500 * Math.exp(-9 * t)) *
    Math.min(1, t / 0.004) * Math.exp(-6 * t), { gain, pan, send: 0.6 });
}
// Low-passed bass note (saw or square).
function bass(t0, m, gain, type = 'saw', len = 0.42) {
  const o = mkOsc(type), lp = mkLP(), f = hz(m);
  voice(t0, len + 0.15, (t) => lp(o(f), 250 + 500 * Math.exp(-10 * t)) *
    env(t, len, 0.01, 0.25, 0.6, 0.15), { gain });
}
// Detuned low-passed saw pad. len = chord length, rel = release tail.
function pad(t0, len, notes, { gain = 0.11, attack = 0.12, rel = 0.8, send = 0.4, cut = 1100 } = {}) {
  const oscs = [];
  for (const m of notes) for (const d of [-0.004, 0.004]) oscs.push([mkOsc('saw'), hz(m) * (1 + d)]);
  const lp = mkLP();
  voice(t0, len + rel, (t) => {
    let s = 0;
    for (const [o, f] of oscs) s += o(f);
    return lp(s / oscs.length, cut) * env(t, len, attack, 0.3, 0.8, rel);
  }, { gain, send });
}
// Airy sine lead with vibrato that fades in.
function lead(t0, m, len, gain) {
  const o = mkOsc('sin'), f = hz(m);
  voice(t0, len + 0.4, (t) => o(f * (1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.6))) *
    env(t, len, 0.25, 0.2, 0.9, 0.4), { gain, pan: 0.2, send: 0.5 });
}
// Soft bell chime.
function chime(t0, gain) {
  const a = mkOsc('sin'), b = mkOsc('sin');
  voice(t0, 2.5, (t) => (a(1760) + 0.35 * b(2637)) * Math.exp(-2.2 * t), { gain, send: 0.6 });
}
// Punchy chord stab.
function stab(t0, notes, gain) {
  const oscs = notes.map(() => mkOsc('saw'));
  const lp = mkLP();
  voice(t0, 0.3, (t) => {
    let s = 0;
    notes.forEach((m, i) => (s += oscs[i](hz(m))));
    return lp(s / notes.length, 400 + 2600 * Math.exp(-14 * t)) * Math.min(1, t / 0.004) * Math.exp(-7 * t);
  }, { gain, send: 0.25 });
}
// Rising riser: noise with rising cutoff plus rising tone.
function riser(t0, dur, gain) {
  const lp = mkLP(), o = mkOsc('sin');
  voice(t0, dur, (t) => {
    const p = t / dur;
    return (lp(noise(), 300 * Math.pow(20, p)) * 0.7 + o(110 * Math.pow(8, p)) * 0.3) * Math.pow(p, 1.5);
  }, { gain, send: 0.15 });
}
// Dual-tone phone ring burst.
function ring(t0, gain) {
  voice(t0, 0.12, (t) => (Math.sin(2 * Math.PI * 880 * t) + Math.sin(2 * Math.PI * 1320 * t)) * 0.5 *
    Math.min(1, t / 0.005) * Math.min(1, (0.12 - t) / 0.02), { gain, pan: 0.3, send: 0.2 });
}

// ---------- musical data ----------
const CHORDS = {
  Am: { bass: 45, pad: [57, 60, 64] },
  F: { bass: 41, pad: [53, 57, 60] },
  C: { bass: 36, pad: [55, 60, 64] },
  G: { bass: 43, pad: [55, 59, 62] },
};
const PENT = [57, 60, 64, 67, 69]; // A minor pentatonic
const LEAD = [76, 79, 81, 79];
// Title pad Am (11.0-14.4), then cue cycle F, C, G, Am in 2.4 s bars from 14.4.
function chordAt(t) {
  if (t < 14.4) return CHORDS.Am;
  return CHORDS[['F', 'C', 'G', 'Am'][Math.floor((t - 14.4) / 2.4) % 4]];
}
// Energy multiplier for drums/bass/hats.
function energy(t) {
  if (t < 25) return 0.7;
  if (t < 40) return 0.85;
  if (t < 54) return 0.9;
  if (t < 67) return 0.9 + 0.2 * (t - 54) / 13;
  return t < 72 ? 1.1 + 0.2 * (t - 67) / 5 : 1.3 - 0.3 * (t - 72);
}
// Grid helper: calls fn(t) for t = start + k*step while t < end (integer k avoids drift).
function grid(start, step, end, fn) {
  for (let k = 0; start + step * k < end - 1e-9; k++) fn(start + step * k, k);
}

// ---------- 0-5 s: cold open ----------
{
  const saw = mkOsc('saw'), sub = mkOsc('sin'), lp = mkLP();
  voice(0, 5.0, (t) => lp(saw(55) * 0.5 + sub(82.41 * 1.004) * 0.4, 180) *
    Math.min(1, t / 3.5) * Math.min(1, (5 - t) / 0.1) * 0.25);
}
for (let k = 0; k < 4; k++) {
  const t = 1.0 + 1.2 * k;
  thump(t, 50, 40, 0.05, 0.12, 0.7);
  thump(t + 0.15, 50, 40, 0.05, 0.12, 0.55);
}
whoosh(1.667, 0.25, () => 1200, 0.9);        // door slam
thump(1.667, 150, 60, 0.03, 0.4, 1.0);
ring(2.833, 0.5); ring(3.013, 0.5);           // phone ring
ring(3.433, 0.25); ring(3.613, 0.25);
riser(3.8, 1.2, 0.5);

// ---------- 5-11 s: chaos ----------
for (let t = 5.0; t < 8.0 - 1e-9; t += 0.3) tick(t, 0.05, (0.3 + 0.2 * (t - 5) / 3) * (0.4 + 0.6 * rnd()), noise() * 0.8);
for (let t = 8.0; t < 10.85; t += 0.15) tick(t, 0.05, (0.5 + 0.2 * (t - 8) / 2.85) * (0.4 + 0.6 * rnd()), noise() * 0.8);
grid(5.0, 0.6, 10.85, (t) => bass(t, 33, 0.22 + 0.2 * (t - 5) / 5.85, 'sq', 0.3)); // A1 square pulse
riser(9.0, 1.85, 0.5);

// ---------- 11-14.4 s: title ----------
thump(11.0, 90, 45, 0.12, 2.0, 1.0, 0.8);     // big boom
whoosh(11.0, 2.0, (p) => 900 - 600 * p, 0.45, 0.6);
pad(11.0, 3.4, CHORDS.Am.pad, { gain: 0.16, attack: 0.6, send: 0.5 });

// ---------- 14-73 s: pads, cues, engine, show, two looks, ship, trust ----------
for (let s = 14.4; s < 73.0; s += 2.4) {
  const c = chordAt(s);
  pad(s, Math.min(2.4, 73.0 - s), c.pad, { gain: 0.11, attack: 0.12, send: 0.4 });
}
grid(14.0, 0.6, 73.0, (t, k) => {                                  // kick + bass on each beat
  if (!(t >= 49 && t < 54)) thump(t, 110, 55, 0.03, 0.3, 0.45 * energy(t));
  if ((t >= 25 && t < 40) || t >= 54) bass(t, chordAt(t).bass + (k % 2 ? 12 : 0), 0.22 * energy(t));
});
grid(14.3, 0.6, 73.0, (t) => {                                     // hats on off-beats
  if ((t >= 25 && t < 40) || t >= 54) tick(t, 0.04, 0.2 * energy(t) * (0.7 + 0.3 * rnd()), noise() * 0.6);
});
grid(14.0, 0.3, 73.0, (t) => {                                     // sparse pluck arpeggio
  if (t < 25 && rnd() < 0.45) return;
  pluck(t, PENT[Math.floor(rnd() * PENT.length)], 0.1, rnd() * 1.2 - 0.6);
});
grid(40.0, 1.2, 49.0, (t, k) => lead(t, LEAD[k % 4], 1.2, 0.07 + 0.04 * (t - 40) / 9)); // show-mode lead
chime(49.0, 0.35);
chime(54.0, 0.3);
[67.0, 67.5, 68.0].forEach((t) => stab(t, chordAt(t).pad.map((m) => m - 12), 0.3));
riser(71.5, 1.5, 0.45);

// ---------- 73-80 s: outro ----------
thump(73.0, 90, 45, 0.12, 2.0, 1.0, 0.8);     // final hit
whoosh(73.0, 2.0, (p) => 900 - 600 * p, 0.45, 0.6);
pad(73.0, 7.0, [45, 52, 57, 60, 64], { gain: 0.13, attack: 0.2, rel: 3.0, send: 0.6 });

// ---------- reverb: damped feedback combs, echo part only ----------
function reverb(src, delays, g, damp) {
  const out = new Float32Array(src.length);
  for (const D of delays) {
    const buf = new Float32Array(D);
    let w = 0, lp = 0;
    for (let i = 0; i < src.length; i++) {
      lp += (1 - damp) * (buf[w] - lp);
      const y = src[i] + g * lp;
      buf[w] = y;
      w = (w + 1) % D;
      out[i] += g * lp;
    }
  }
  return out;
}
const wetL = reverb(SEND, [1310, 1636, 1927], 0.86, 0.4);
const wetR = reverb(SEND, [1447, 1777, 2099], 0.86, 0.4);
for (let i = 0; i < N; i++) {
  L[i] += 0.35 * wetL[i];
  R[i] += 0.35 * wetR[i];
}

// ---------- master: soft limit, fade, normalise to -3 dBFS peak ----------
const fadeStart = N - 3 * SR;
for (let i = 0; i < N; i++) {
  let l = Math.tanh(L[i]), r = Math.tanh(R[i]);
  if (i >= fadeStart) {
    const f = (N - i) / (3 * SR);
    l *= f;
    r *= f;
  }
  L[i] = l;
  R[i] = r;
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = Math.pow(10, -3 / 20) / peak;
for (let i = 0; i < N; i++) {
  L[i] *= norm;
  R[i] *= norm;
}

// ---------- WAV writer (44-byte header, 16-bit PCM) ----------
const dataBytes = N * 4;
const buf = Buffer.alloc(44 + dataBytes);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataBytes, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);            // PCM
buf.writeUInt16LE(2, 22);            // stereo
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);       // byte rate
buf.writeUInt16LE(4, 32);            // block align
buf.writeUInt16LE(16, 34);           // bits per sample
buf.write('data', 36);
buf.writeUInt32LE(dataBytes, 40);
const clip16 = (x) => Math.round(Math.max(-1, Math.min(1, x)) * 32767);
for (let i = 0, o = 44; i < N; i++, o += 4) {
  buf.writeInt16LE(clip16(L[i]), o);
  buf.writeInt16LE(clip16(R[i]), o + 2);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buf);
console.log(`wrote ${OUT} (${buf.length} bytes, ${DUR}.0 s, peak ${(norm * peak).toFixed(4)})`);
