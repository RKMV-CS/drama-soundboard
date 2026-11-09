const assert = require("node:assert/strict");

// Minimal stand-in for the Web Audio API and HTMLAudioElement so the audio
// engine can be unit-tested in node without a browser. Only what the engine
// touches is modelled.

class FakeParam {
  constructor(ctx) {
    this.ctx = ctx;
    this._base = 1;
    this.events = [];
  }

  get value() {
    return this.now();
  }

  // Assigning directly sets the base value and drops scheduled events.
  set value(v) {
    this._base = v;
    this.events = [];
  }

  setValueAtTime(value, time) {
    this.events.push({ type: "setValueAtTime", value, time });
    return this;
  }

  linearRampToValueAtTime(value, time) {
    this.events.push({ type: "linearRampToValueAtTime", value, time });
    return this;
  }

  cancelScheduledValues(time) {
    this.events = this.events.filter((e) => e.time < time);
    return this;
  }

  cancelAndHoldAtTime(time) {
    const held = this.valueAt(time);
    this.cancelScheduledValues(time);
    return this.setValueAtTime(held, time);
  }

  now() {
    return this.valueAt(this.ctx ? this.ctx.currentTime : 0);
  }

  valueAt(t) {
    const evs = this.events.slice().sort((a, b) => a.time - b.time);
    if (evs.length === 0 || t < evs[0].time) return this._base;

    let prevT = evs[0].time;
    let prevV = this._base;
    for (const e of evs) {
      if (t < e.time) {
        if (e.type === "linearRampToValueAtTime") {
          return prevV + ((e.value - prevV) * (t - prevT)) / (e.time - prevT);
        }
        return prevV; // step: hold the previous value until the next event
      }
      prevT = e.time;
      prevV = e.value;
    }
    return prevV; // after the last event, hold it
  }
}

class FakeNode {
  connect(node) {
    this.connected = node;
    return node;
  }

  disconnect() {
    this.connected = null;
  }
}

class FakeGain extends FakeNode {
  constructor(ctx) {
    super();
    this.gain = new FakeParam(ctx);
  }
}

class FakeBufferSource extends FakeNode {
  constructor() {
    super();
    this.buffer = null;
    this.loop = false;
    this.onended = null;
  }

  start(when = 0) {
    this.started = true;
    this.startedAt = when;
  }

  stop(when = 0) {
    this.stopped = true;
    this.stoppedAt = when;
  }

  fireEnded() {
    if (this.onended) this.onended();
  }
}

class FakeMediaElementSource extends FakeNode {
  constructor(element) {
    super();
    this.element = element;
  }
}

class FakeAudioContext {
  constructor(opts = {}) {
    this.currentTime = 0;
    this.state = opts.state || "running";
    this.destination = { name: "destination" };
    this.gains = [];
    this.sources = [];
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  advance(seconds) {
    this.currentTime += seconds;
  }

  createGain() {
    const gain = new FakeGain(this);
    this.gains.push(gain);
    return gain;
  }

  createBufferSource() {
    const source = new FakeBufferSource();
    this.sources.push(source);
    return source;
  }

  createMediaElementSource(el) {
    const source = new FakeMediaElementSource(el);
    this.sources.push(source);
    return source;
  }

  decodeAudioData(arrayBuffer) {
    if (arrayBuffer.byteLength === 0) {
      return Promise.reject(new Error("EncodingError"));
    }
    return Promise.resolve({
      duration: arrayBuffer.byteLength / 1000,
      length: arrayBuffer.byteLength,
      numberOfChannels: 1,
    });
  }
}

class FakeAudioElement {
  constructor(src) {
    this.src = src;
    this.loop = false;
    this.paused = true;
    this.currentTime = 0;
    this.duration = NaN;
    this.volume = 1;
    this.crossOrigin = null;
    this._listeners = {};
  }

  play() {
    if (this.refusePlay) {
      return Promise.reject(new Error("NotAllowedError"));
    }
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }

  removeEventListener(type, fn) {
    this._listeners[type] = (this._listeners[type] || []).filter((f) => f !== fn);
  }

  dispatch(type) {
    for (const fn of this._listeners[type] || []) fn({ type, target: this });
  }

  fireEnded() {
    if (!this.loop) this.paused = true;
    this.dispatch("ended");
  }
}

module.exports = { FakeAudioContext, FakeAudioElement };

if (require.main === module) {
  // Ramp math: 1 at t=0 ramping linearly to 0 at t=2.
  const ctx = new FakeAudioContext();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, 0);
  gain.gain.linearRampToValueAtTime(0, 2);
  assert.equal(gain.gain.valueAt(1), 0.5);
  assert.equal(gain.gain.valueAt(3), 0);
  console.log("fake-audio self-check passed");
}
