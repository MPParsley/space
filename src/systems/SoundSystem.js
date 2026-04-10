// SoundSystem — procedural Web Audio API sounds; zero audio files needed.
//
// All sounds are synthesised from oscillators and gain envelopes.
// The AudioContext is created lazily on first use so it always satisfies
// the browser autoplay policy (sounds only play after user input).

export class SoundSystem {
  constructor() {
    this._audioCtx = null;
    this._thrusterActive = false;
    this._thrusterNodes = null; // { master, osc1, osc2 } while engine is on
  }

  // ------------------------------------------------------------------ API

  /** Start continuous thruster hum. Idempotent. */
  thrusterOn() {
    if (this._thrusterActive) return;
    this._thrusterActive = true;

    const ctx = this._ctx();
    if (!ctx) return;

    // Master gain — fades in
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.1);
    master.connect(ctx.destination);

    // Primary low rumble (sawtooth at 65 Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 65;
    osc1.connect(master);
    osc1.start();

    // Harmonic octave above — adds body without harshness
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 130;
    const h = ctx.createGain();
    h.gain.value = 0.22;
    osc2.connect(h);
    h.connect(master);
    osc2.start();

    this._thrusterNodes = { master, osc1, osc2 };
  }

  /** Fade out and stop thruster. Idempotent. */
  thrusterOff() {
    if (!this._thrusterActive) return;
    this._thrusterActive = false;

    const nodes = this._thrusterNodes;
    this._thrusterNodes = null;
    if (!nodes) return;

    const ctx = this._ctx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const { master, osc1, osc2 } = nodes;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 0.28);
    osc1.stop(t + 0.32);
    osc2.stop(t + 0.32);
  }

  /** Two-note ascending chime on arrival at a planet. */
  playDock() {
    const ctx = this._ctx();
    if (!ctx) return;

    // C5 → G5 (a perfect fifth apart)
    [[0, 523.25], [0.22, 783.99]].forEach(([delay, freq]) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.78);
    });
  }

  /** Subtle tick played once when the cursor first enters a body. */
  playHover() {
    const ctx = this._ctx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;

    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.04, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  // ------------------------------------------------------------------ private

  _ctx() {
    if (!this._audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try {
        this._audioCtx = new Ctor();
      } catch (_) {
        return null;
      }
    }
    // Resume context if it was suspended by autoplay policy
    if (this._audioCtx.state === 'suspended') {
      this._audioCtx.resume().catch(() => {});
    }
    return this._audioCtx;
  }
}
