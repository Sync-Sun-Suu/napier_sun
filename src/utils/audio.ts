// Deep harmonic series rooted on D3 (146.83 Hz) and e-ratio shimmer overtones
const NAPIER_DEEP_HZ = [
  146.83, 220.00, 293.66, 399.13, // 146.83 * e ≈ 399.13 Hz
  440.00, 587.33, 659.25, 798.26, // 293.66 * e ≈ 798.26 Hz
];

// Pentatonic + e-harmonic crystalline bubble frequencies for underwater melody
const ABYSSAL_BUBBLE_HZ = [
  293.66, 329.63, 399.13, 440.00, 523.25, 587.33, 659.25, 798.26, 880.00, 1085.0,
];

class NapierSoundEngine {
  private ctx: AudioContext | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private dryBus: GainNode | null = null;
  private lastNoteTime = 0;
  private currentWarmth = 0.65;
  private currentAbyssalTone = 0.68;
  private currentReverb = 0.68;

  private droneNodes: {
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    lfo: OscillatorNode;
    masterGain: GainNode;
  } | null = null;

  private bonfireNodes: {
    rumbleSource: AudioBufferSourceNode;
    lowpass: BiquadFilterNode;
    rumbleGain: GainNode;
    masterGain: GainNode;
    crackleTimer: number;
  } | null = null;

  private abyssalNodes: {
    currentSource: AudioBufferSourceNode;
    bandpass: BiquadFilterNode;
    swellLfo: OscillatorNode;
    currentGain: GainNode;
    masterGain: GainNode;
    bubbleTimer: number;
  } | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupSpatialReverb(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Builds a stereo e-decay (2.718s time constant) impulse response for deep spatial reverb
   */
  private setupSpatialReverb(ctx: AudioContext): void {
    const duration = 3.8;
    const length = Math.floor(ctx.sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / ctx.sampleRate;
        // Exponential decay governed by Napier's constant e^(-t * 2.1)
        const env = Math.pow(Math.E, -t * 2.05);
        channelData[i] = (Math.random() * 2 - 1) * env * 0.45;
      }
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(this.currentReverb * 0.85, ctx.currentTime);

    const dryBus = ctx.createGain();
    dryBus.gain.setValueAtTime(1.0, ctx.currentTime);

    convolver.connect(wetGain).connect(ctx.destination);
    dryBus.connect(ctx.destination);

    this.convolver = convolver;
    this.reverbWetGain = wetGain;
    this.dryBus = dryBus;
  }

  private connectWithReverb(node: AudioNode): void {
    if (!this.ctx) return;
    if (this.dryBus) {
      node.connect(this.dryBus);
    } else {
      node.connect(this.ctx.destination);
    }
    if (this.convolver) {
      node.connect(this.convolver);
    }
  }

  public unlockAudio(): void {
    this.ensureContext();
  }

  public setReverbDepth(depth: number): void {
    this.currentReverb = Math.max(0, Math.min(1, depth));
    if (this.ctx && this.reverbWetGain) {
      this.reverbWetGain.gain.setTargetAtTime(
        this.currentReverb * 0.9,
        this.ctx.currentTime,
        0.08
      );
    }
  }

  public setBonfireWarmth(warmth: number): void {
    this.currentWarmth = Math.max(0.05, Math.min(1, warmth));
    if (this.ctx && this.bonfireNodes) {
      const now = this.ctx.currentTime;
      this.bonfireNodes.lowpass.frequency.setTargetAtTime(
        150 + this.currentWarmth * 190,
        now,
        0.1
      );
      this.bonfireNodes.rumbleGain.gain.setTargetAtTime(
        0.08 + this.currentWarmth * 0.16,
        now,
        0.1
      );
    }
  }

  public setAbyssalDepthTone(tone: number): void {
    this.currentAbyssalTone = Math.max(0.05, Math.min(1, tone));
    if (this.ctx && this.abyssalNodes) {
      const now = this.ctx.currentTime;
      // Higher depth tone = deeper, warmer sub-aquatic filter; lower = brighter shallow reef
      const baseCutoff = 320 - this.currentAbyssalTone * 165;
      this.abyssalNodes.bandpass.frequency.setTargetAtTime(baseCutoff, now, 0.15);
      this.abyssalNodes.currentGain.gain.setTargetAtTime(
        0.11 + this.currentAbyssalTone * 0.12,
        now,
        0.15
      );
    }
  }

  /**
   * Plays a deep, warm e-ratio harmonic resonance with spatial reverb
   */
  public playNapierResonance(
    normX: number,
    normY: number,
    enabled: boolean,
    minIntervalMs = 95
  ): void {
    if (!enabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastNoteTime < minIntervalMs) return;
    this.lastNoteTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const clampedX = Math.max(0, Math.min(0.999, normX));
    const clampedY = Math.max(0, Math.min(1, normY));
    const idx =
      Math.floor(((1 - clampedY) * 0.7 + clampedX * 0.3) * NAPIER_DEEP_HZ.length) %
      NAPIER_DEEP_HZ.length;
    const rootFreq = NAPIER_DEEP_HZ[Math.max(0, idx)];
    const eHarmonicFreq = rootFreq * Math.E * 0.5;

    const now = ctx.currentTime;

    const subOsc = ctx.createOscillator();
    const glassOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    const glassGain = ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(rootFreq, now);

    glassOsc.type = 'sine';
    glassOsc.frequency.setValueAtTime(eHarmonicFreq, now);
    glassOsc.frequency.exponentialRampToValueAtTime(eHarmonicFreq * 1.003, now + 1.8);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.065, now + 0.03);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

    glassGain.gain.setValueAtTime(0.0001, now);
    glassGain.gain.exponentialRampToValueAtTime(0.026, now + 0.02);
    glassGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);

    subOsc.connect(subGain);
    glassOsc.connect(glassGain);
    this.connectWithReverb(subGain);
    this.connectWithReverb(glassGain);

    subOsc.start(now);
    glassOsc.start(now);
    subOsc.stop(now + 2.2);
    glassOsc.stop(now + 1.8);
  }

  /**
   * Plays an interactive underwater bubble & harmonic water chime when touching/swimming
   */
  public playBubbleRipple(
    normX: number,
    normY: number,
    enabled: boolean,
    minIntervalMs = 110
  ): void {
    if (!enabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastNoteTime < minIntervalMs) return;
    this.lastNoteTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const clampedX = Math.max(0, Math.min(0.999, normX));
    const clampedY = Math.max(0, Math.min(1, normY));
    const idx =
      Math.floor(((1 - clampedY) * 0.65 + clampedX * 0.35) * ABYSSAL_BUBBLE_HZ.length) %
      ABYSSAL_BUBBLE_HZ.length;
    const baseFreq = ABYSSAL_BUBBLE_HZ[Math.max(0, idx)];
    const now = ctx.currentTime;

    // 1. Soft rising bubble droplet (pitch upward glide)
    const dropOsc = ctx.createOscillator();
    const dropGain = ctx.createGain();
    dropOsc.type = 'sine';
    dropOsc.frequency.setValueAtTime(baseFreq * 0.85, now);
    dropOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.38, now + 0.085);

    dropGain.gain.setValueAtTime(0.0001, now);
    dropGain.gain.exponentialRampToValueAtTime(0.048, now + 0.015);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    // 2. Deep aquatic e-harmonic shimmer tail
    const padOsc = ctx.createOscillator();
    const padGain = ctx.createGain();
    padOsc.type = 'sine';
    padOsc.frequency.setValueAtTime(baseFreq * 0.5, now);

    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.exponentialRampToValueAtTime(0.032, now + 0.06);
    padGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    dropOsc.connect(dropGain);
    padOsc.connect(padGain);
    this.connectWithReverb(dropGain);
    this.connectWithReverb(padGain);

    dropOsc.start(now);
    padOsc.start(now);
    dropOsc.stop(now + 0.35);
    padOsc.stop(now + 2.3);
  }

  /**
   * Plays a soft, crystalline clock bell chime (for periodic time chimes & timer completion)
   */
  public playClockBell(enabled: boolean, isTimerComplete = false): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = isTimerComplete
      ? [293.66, 399.13, 440.0, 587.33, 798.26] // 5-note e-ratio celestial arpeggio
      : [293.66, 440.0, 587.33]; // Gentle 3-note minute chime

    notes.forEach((freq, idx) => {
      const delay = idx * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.045 / (idx * 0.4 + 1), now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 2.8);

      osc.connect(gain);
      this.connectWithReverb(gain);

      osc.start(now + delay);
      osc.stop(now + delay + 2.9);
    });
  }

  /**
   * Triggers a single organic wood/ember crackle pop scaled by bonfireWarmth
   */
  private triggerEmberPop(ctx: AudioContext, masterGain: GainNode): void {
    const now = ctx.currentTime;
    const duration = 0.014 + Math.random() * 0.032;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.exp((-i / bufferSize) * 5.8);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(
      1100 + this.currentWarmth * 900 + Math.random() * 1800,
      now
    );
    filter.Q.setValueAtTime(2.4 + Math.random() * 3.0, now);

    const popGain = ctx.createGain();
    const peak = (0.04 + Math.random() * 0.11) * (0.45 + this.currentWarmth * 0.75);
    popGain.gain.setValueAtTime(peak, now);
    popGain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    noise.connect(filter).connect(popGain).connect(masterGain);
    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * Triggers a melodic underwater bubble or distant manta/whale harmonic call
   */
  private triggerAbyssalEvent(ctx: AudioContext, masterGain: GainNode): void {
    const now = ctx.currentTime;

    // 18% chance of a gentle distant whale/manta harmonic glide, 82% chance of melodic water bubble
    if (Math.random() < 0.18) {
      const whaleNotes = [146.83, 196.0, 220.0, 293.66, 399.13];
      const f0 = whaleNotes[Math.floor(Math.random() * whaleNotes.length)];
      const f1 = f0 * (Math.random() < 0.5 ? 1.25 : 1 / 1.18);
      const dur = 2.2 + Math.random() * 1.4;

      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f1, now + dur * 0.85);

      sub.type = 'triangle';
      sub.frequency.setValueAtTime(f0 * 0.5, now);
      sub.frequency.exponentialRampToValueAtTime(f1 * 0.5, now + dur * 0.85);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, now);

      const peak = 0.032 * (0.5 + this.currentAbyssalTone * 0.6);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + dur * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      if (this.convolver) {
        gain.connect(this.convolver);
      }

      osc.start(now);
      sub.start(now);
      osc.stop(now + dur + 0.05);
      sub.stop(now + dur + 0.05);
      return;
    }

    // Melodic rising bubble droplet rooted in the 2.718 harmonic scale
    const freq =
      ABYSSAL_BUBBLE_HZ[Math.floor(Math.random() * ABYSSAL_BUBBLE_HZ.length)] *
      (1.12 - this.currentAbyssalTone * 0.25);
    const dur = 0.055 + Math.random() * 0.055;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.78, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.36, now + dur);

    const peak = (0.022 + Math.random() * 0.032) * (1.15 - this.currentAbyssalTone * 0.35);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + dur * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.16);

    osc.connect(gain);
    gain.connect(masterGain);
    if (this.convolver) {
      gain.connect(this.convolver);
    }

    osc.start(now);
    osc.stop(now + dur + 0.18);
  }

  /**
   * Toggles procedural cozy Bonfire Soundscape (warm hearth rumble + random wood crackles)
   */
  public setBonfireSound(active: boolean): void {
    if (!active) {
      if (this.bonfireNodes && this.ctx) {
        window.clearInterval(this.bonfireNodes.crackleTimer);
        const now = this.ctx.currentTime;
        this.bonfireNodes.masterGain.gain.setValueAtTime(
          this.bonfireNodes.masterGain.gain.value,
          now
        );
        this.bonfireNodes.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        const nodesToStop = this.bonfireNodes;
        this.bonfireNodes = null;
        setTimeout(() => {
          try {
            nodesToStop.rumbleSource.stop();
          } catch {
            // ignore
          }
        }, 400);
      }
      return;
    }

    if (this.bonfireNodes) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 1.8;
    }

    const rumbleSource = ctx.createBufferSource();
    rumbleSource.buffer = noiseBuffer;
    rumbleSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(150 + this.currentWarmth * 190, ctx.currentTime);

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.08 + this.currentWarmth * 0.16, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.58, ctx.currentTime + 0.6);

    rumbleSource.connect(lowpass).connect(rumbleGain).connect(masterGain);
    if (this.dryBus) {
      masterGain.connect(this.dryBus);
    } else {
      masterGain.connect(ctx.destination);
    }
    if (this.convolver) {
      const fireReverbSend = ctx.createGain();
      fireReverbSend.gain.value = 0.18;
      masterGain.connect(fireReverbSend).connect(this.convolver);
    }

    rumbleSource.start();

    const crackleTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const probability = 0.25 + this.currentWarmth * 0.55;
      if (Math.random() < probability) {
        this.triggerEmberPop(this.ctx, masterGain);
        if (Math.random() < 0.32 * this.currentWarmth) {
          setTimeout(() => {
            if (this.ctx && this.bonfireNodes) {
              this.triggerEmberPop(this.ctx, masterGain);
            }
          }, 50 + Math.random() * 85);
        }
      }
    }, 170);

    this.bonfireNodes = { rumbleSource, lowpass, rumbleGain, masterGain, crackleTimer };
  }

  /**
   * Toggles procedural Abyssal Underwater Soundscape (1/f ocean current + melodic rising bubbles + whale calls)
   */
  public setAbyssalSound(active: boolean): void {
    if (!active) {
      if (this.abyssalNodes && this.ctx) {
        window.clearInterval(this.abyssalNodes.bubbleTimer);
        const now = this.ctx.currentTime;
        this.abyssalNodes.masterGain.gain.setValueAtTime(
          this.abyssalNodes.masterGain.gain.value,
          now
        );
        this.abyssalNodes.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        const nodesToStop = this.abyssalNodes;
        this.abyssalNodes = null;
        setTimeout(() => {
          try {
            nodesToStop.currentSource.stop();
            nodesToStop.swellLfo.stop();
          } catch {
            // ignore
          }
        }, 500);
      }
      return;
    }

    if (this.abyssalNodes) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.028;
      b1 = 0.985 * b1 + white * 0.045;
      b2 = 0.95 * b2 + white * 0.06;
      output[i] = (b0 + b1 + b2) * 0.65;
    }

    const currentSource = ctx.createBufferSource();
    currentSource.buffer = noiseBuffer;
    currentSource.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'lowpass';
    const baseCutoff = 320 - this.currentAbyssalTone * 165;
    bandpass.frequency.setValueAtTime(baseCutoff, ctx.currentTime);
    bandpass.Q.setValueAtTime(1.4, ctx.currentTime);

    // 1/e Hz (≈ 0.368 Hz, period 2.718s) slow underwater tide breathing LFO
    const swellLfo = ctx.createOscillator();
    const swellLfoGain = ctx.createGain();
    swellLfo.type = 'sine';
    swellLfo.frequency.setValueAtTime(1 / Math.E, ctx.currentTime);
    swellLfoGain.gain.setValueAtTime(65, ctx.currentTime);
    swellLfo.connect(swellLfoGain).connect(bandpass.frequency);

    const currentGain = ctx.createGain();
    currentGain.gain.setValueAtTime(0.11 + this.currentAbyssalTone * 0.12, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.62, ctx.currentTime + 0.8);

    currentSource.connect(bandpass).connect(currentGain).connect(masterGain);
    if (this.dryBus) {
      masterGain.connect(this.dryBus);
    } else {
      masterGain.connect(ctx.destination);
    }
    if (this.convolver) {
      const waterReverbSend = ctx.createGain();
      waterReverbSend.gain.value = 0.35;
      masterGain.connect(waterReverbSend).connect(this.convolver);
    }

    currentSource.start();
    swellLfo.start();

    const bubbleTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (Math.random() < 0.42) {
        this.triggerAbyssalEvent(this.ctx, masterGain);
        // Occasional double or triple rising bubble stream
        if (Math.random() < 0.38) {
          setTimeout(() => {
            if (this.ctx && this.abyssalNodes) {
              this.triggerAbyssalEvent(this.ctx, masterGain);
            }
          }, 95 + Math.random() * 140);
        }
      }
    }, 340);

    this.abyssalNodes = {
      currentSource,
      bandpass,
      swellLfo,
      currentGain,
      masterGain,
      bubbleTimer,
    };
  }

  /**
   * Toggles a subtle 1/2.718 Hz breathing sub-harmonic drone
   */
  public setDeepDrone(active: boolean): void {
    if (!active) {
      if (this.droneNodes && this.ctx) {
        const now = this.ctx.currentTime;
        this.droneNodes.masterGain.gain.setValueAtTime(
          this.droneNodes.masterGain.gain.value,
          now
        );
        this.droneNodes.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        const nodesToStop = this.droneNodes;
        this.droneNodes = null;
        setTimeout(() => {
          try {
            nodesToStop.osc1.stop();
            nodesToStop.osc2.stop();
            nodesToStop.lfo.stop();
          } catch {
            // ignore
          }
        }, 450);
      }
      return;
    }

    if (this.droneNodes) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const masterGain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(110.0, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(110.0 * (Math.E / 2), now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(1 / Math.E, now);
    lfoGain.gain.setValueAtTime(0.014, now);

    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.03, now + 0.8);

    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);

    osc1.connect(masterGain);
    osc2.connect(masterGain);
    this.connectWithReverb(masterGain);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    this.droneNodes = { osc1, osc2, lfo, masterGain };
  }
}

export const soundEngine = new NapierSoundEngine();
