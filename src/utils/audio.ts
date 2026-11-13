// Japanese Yo-scale pentatonic frequencies (D4, E4, G4, A4, B4, D5, E5, G5, A5, B5)
const PENTATONIC_HZ = [
  293.66, 329.63, 392.00, 440.00, 493.88,
  587.33, 659.25, 783.99, 880.00, 987.77,
];

class PentatonicSynth {
  private ctx: AudioContext | null = null;
  private lastNoteTime = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays a gentle water/glass chime mapped from normalized coordinates (0..1)
   */
  public playChime(normX: number, normY: number, enabled: boolean, minIntervalMs = 85): void {
    if (!enabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastNoteTime < minIntervalMs) return;
    this.lastNoteTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const clampedX = Math.max(0, Math.min(0.999, normX));
    const clampedY = Math.max(0, Math.min(1, normY));
    const index = Math.floor((1 - clampedY * 0.65 + clampedX * 0.35) * PENTATONIC_HZ.length) % PENTATONIC_HZ.length;
    const baseFreq = PENTATONIC_HZ[Math.max(0, index)];

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    const overtoneGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(baseFreq * 2.0, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);

    overtoneGain.gain.setValueAtTime(0.0001, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.025, now + 0.01);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    overtone.connect(overtoneGain);
    gain.connect(ctx.destination);
    overtoneGain.connect(ctx.destination);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 1.2);
    overtone.stop(now + 0.5);
  }
}

export const soundEngine = new PentatonicSynth();
