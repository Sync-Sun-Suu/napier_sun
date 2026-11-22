// Deep harmonic series rooted on D3 (146.83 Hz) and e-ratio shimmer overtones
const NAPIER_DEEP_HZ = [
  146.83, 220.00, 293.66, 399.13, // 146.83 * e ≈ 399.13 Hz
  440.00, 587.33, 659.25, 798.26, // 293.66 * e ≈ 798.26 Hz
];

// Pentatonic + e-harmonic crystalline bubble frequencies for underwater melody
const ABYSSAL_BUBBLE_HZ = [
  293.66, 329.63, 399.13, 440.00, 523.25, 587.33, 659.25, 798.26, 880.00, 1085.0,
];

// Celestial D-Lydian + 2.718 e-ratio Stardust Celesta scale for the singing galaxy
const STARDUST_MELODY_HZ = [
  293.66, // D4
  329.63, // E4
  370.00, // F#4
  399.13, // D3 * e
  440.00, // A4
  493.88, // B4
  554.37, // C#5
  587.33, // D5
  659.25, // E5
  739.99, // F#5
  798.26, // D4 * e
  880.00, // A5
  987.77, // B5
  1174.66, // D6
];

// Poetic melodic phrases (indices into STARDUST_MELODY_HZ) that the galaxy occasionally sings
const GALAXY_SONG_PHRASES: number[][] = [
  [0, 4, 7, 8, 11],
  [7, 6, 4, 2, 0],
  [2, 4, 6, 9, 7],
  [4, 7, 10, 11, 13],
  [11, 9, 7, 4, 3, 0],
];

class NapierSoundEngine {
  private ctx: AudioContext | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private dryBus: GainNode | null = null;
  private lastNoteTime = 0;
  private currentWarmth = 0.65;
  private currentAbyssalTone = 0.68;
  private currentGalaxyShimmer = 0.85;
  private currentGalaxyDrone = 0.12;
  private currentReverb = 0.95;
  private melodyStepIndex = 0;
  private lastStarPulseMs = 0;
  private lastStarPulsePitch = 0.5;

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

  private galaxyNodes: {
    padOsc1: OscillatorNode;
    padOsc2: OscillatorNode;
    padOsc3: OscillatorNode;
    padLfo: OscillatorNode;
    padFilter: BiquadFilterNode;
    padGain: GainNode;
    masterGain: GainNode;
    melodyTimer: number;
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
    const duration = 4.0;
    const length = Math.floor(ctx.sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / ctx.sampleRate;
        // Exponential decay governed by Napier's constant e^(-t * 1.95)
        const env = Math.pow(Math.E, -t * 1.95);
        channelData[i] = (Math.random() * 2 - 1) * env * 0.45;
      }
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(this.currentReverb * 0.88, ctx.currentTime);

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
        this.currentReverb * 0.92,
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
      const baseCutoff = 320 - this.currentAbyssalTone * 165;
      this.abyssalNodes.bandpass.frequency.setTargetAtTime(baseCutoff, now, 0.15);
      this.abyssalNodes.currentGain.gain.setTargetAtTime(
        0.11 + this.currentAbyssalTone * 0.12,
        now,
        0.15
      );
    }
  }

  public setGalaxyShimmer(shimmer: number): void {
    this.currentGalaxyShimmer = Math.max(0.05, Math.min(1, shimmer));
  }

  public setGalaxyNebulaDrone(drone: number): void {
    this.currentGalaxyDrone = Math.max(0, Math.min(1, drone));
    if (this.ctx && this.galaxyNodes) {
      const now = this.ctx.currentTime;
      // 0% = 0.00001 (completely silent background hum), 100% = 0.065 (warm sleepy cosmic drone)
      const targetGain =
        this.currentGalaxyDrone <= 0.01
          ? 0.00001
          : this.currentGalaxyDrone * 0.065;
      this.galaxyNodes.padGain.gain.setTargetAtTime(targetGain, now, 0.12);
      this.galaxyNodes.padFilter.frequency.setTargetAtTime(
        180 + this.currentGalaxyDrone * 320,
        now,
        0.15
      );
    }
  }

  /**
   * Returns real-time visual pulse intensity (0..1) and normalized pitch (0..1) of the singing stars
   * so the 3D Constellation Lines pulse in sync with the melody!
   */
  public getStarMelodyPulse(): { intensity: number; pitchNorm: number } {
    const elapsedSec = (performance.now() - this.lastStarPulseMs) * 0.001;
    if (elapsedSec < 0 || elapsedSec > 1.8) {
      return { intensity: 0, pitchNorm: this.lastStarPulsePitch };
    }
    const intensity = Math.exp(-elapsedSec * 2.4);
    return { intensity, pitchNorm: this.lastStarPulsePitch };
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

    const dropOsc = ctx.createOscillator();
    const dropGain = ctx.createGain();
    dropOsc.type = 'sine';
    dropOsc.frequency.setValueAtTime(baseFreq * 0.85, now);
    dropOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.38, now + 0.085);

    dropGain.gain.setValueAtTime(0.0001, now);
    dropGain.gain.exponentialRampToValueAtTime(0.048, now + 0.015);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

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
   * Plays a crystalline starlight celesta/harp note when touching or scanning galaxy coordinates
   */
  public playStarlightTwinkle(
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
      Math.floor(((1 - clampedY) * 0.6 + clampedX * 0.4) * STARDUST_MELODY_HZ.length) %
      STARDUST_MELODY_HZ.length;
    const freq = STARDUST_MELODY_HZ[Math.max(0, idx)];
    this.triggerStarNote(ctx, freq, 0.046, 0);
  }

  /**
   * Synthesizes a single crystalline celesta / starlight harp note with e-ratio overtone
   */
  private triggerStarNote(
    ctx: AudioContext,
    freq: number,
    peakGain: number,
    delaySec = 0,
    targetBus?: GainNode
  ): void {
    const startTime = ctx.currentTime + delaySec;
    const pitchNorm = Math.max(0, Math.min(1, (freq - 290) / 890));
    if (delaySec <= 0.01) {
      this.lastStarPulseMs = performance.now();
      this.lastStarPulsePitch = pitchNorm;
    } else {
      window.setTimeout(() => {
        this.lastStarPulseMs = performance.now();
        this.lastStarPulsePitch = pitchNorm;
      }, delaySec * 1000);
    }

    // Fundamental pure crystal tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Warm e-ratio bell shimmer (f * e ≈ 2.718 * f) with rapid gentle decay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * Math.E, startTime);

    // Sub-octave velvet warmth
    const oscSub = ctx.createOscillator();
    const gainSub = ctx.createGain();
    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(freq * 0.5, startTime);

    gain1.gain.setValueAtTime(0.0001, startTime);
    gain1.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.018);
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.5);

    gain2.gain.setValueAtTime(0.0001, startTime);
    gain2.gain.exponentialRampToValueAtTime(peakGain * 0.24, startTime + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.65);

    gainSub.gain.setValueAtTime(0.0001, startTime);
    gainSub.gain.exponentialRampToValueAtTime(peakGain * 0.35, startTime + 0.04);
    gainSub.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.8);

    osc1.connect(gain1);
    osc2.connect(gain2);
    oscSub.connect(gainSub);

    if (targetBus) {
      gain1.connect(targetBus);
      gain2.connect(targetBus);
      gainSub.connect(targetBus);
    } else {
      this.connectWithReverb(gain1);
      this.connectWithReverb(gain2);
      this.connectWithReverb(gainSub);
    }

    osc1.start(startTime);
    osc2.start(startTime);
    oscSub.start(startTime);

    osc1.stop(startTime + 2.6);
    osc2.stop(startTime + 0.7);
    oscSub.stop(startTime + 2.9);
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
   * Triggers a melodic Stardust Galaxy event (either a singing constellation phrase or a gentle logarithmic spiral note)
   */
  private triggerGalaxyMelodyEvent(ctx: AudioContext, masterGain: GainNode): void {
    const shimmer = this.currentGalaxyShimmer;

    // 32% chance: The galaxy sings a 4-5 note lyrical constellation phrase
    if (Math.random() < 0.32) {
      const phrase =
        GALAXY_SONG_PHRASES[
          Math.floor(Math.random() * GALAXY_SONG_PHRASES.length)
        ];
      phrase.forEach((noteIdx, step) => {
        const freq = STARDUST_MELODY_HZ[noteIdx % STARDUST_MELODY_HZ.length];
        const delay = step * (0.2718 + Math.random() * 0.07);
        const vel = (0.032 + shimmer * 0.022) / (1 + step * 0.11);
        this.triggerStarNote(ctx, freq, vel, delay, masterGain);
      });
      return;
    }

    // 68% chance: Gentle logarithmic walk along the Stardust scale so it feels like an endless cosmic music box
    const stepDelta = Math.random() < 0.62 ? 1 : Math.random() < 0.5 ? 2 : -1;
    this.melodyStepIndex =
      (this.melodyStepIndex + stepDelta + STARDUST_MELODY_HZ.length) %
      STARDUST_MELODY_HZ.length;
    const freq = STARDUST_MELODY_HZ[this.melodyStepIndex];
    const peak = 0.03 + shimmer * 0.022;
    this.triggerStarNote(ctx, freq, peak, 0, masterGain);

    // Occasional fifth/octave harmonic twin star
    if (Math.random() < 0.42 * shimmer) {
      const twinIdx = (this.melodyStepIndex + 4) % STARDUST_MELODY_HZ.length;
      this.triggerStarNote(
        ctx,
        STARDUST_MELODY_HZ[twinIdx],
        peak * 0.68,
        0.18,
        masterGain
      );
    }
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
   * Toggles procedural Stardust Galaxy Soundscape (warm breathing nebula pad + singing celesta star melody)
   */
  public setGalaxySound(active: boolean): void {
    if (!active) {
      if (this.galaxyNodes && this.ctx) {
        window.clearInterval(this.galaxyNodes.melodyTimer);
        const now = this.ctx.currentTime;
        this.galaxyNodes.masterGain.gain.setValueAtTime(
          this.galaxyNodes.masterGain.gain.value,
          now
        );
        this.galaxyNodes.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        const nodesToStop = this.galaxyNodes;
        this.galaxyNodes = null;
        setTimeout(() => {
          try {
            nodesToStop.padOsc1.stop();
            nodesToStop.padOsc2.stop();
            nodesToStop.padOsc3.stop();
            nodesToStop.padLfo.stop();
          } catch {
            // ignore
          }
        }, 550);
      }
      return;
    }

    if (this.galaxyNodes) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Warm Nebula Chord Pad: D3 (146.83 Hz) + A3 (220.0 Hz) + E4 (329.63 Hz)
    const padOsc1 = ctx.createOscillator();
    const padOsc2 = ctx.createOscillator();
    const padOsc3 = ctx.createOscillator();
    padOsc1.type = 'sine';
    padOsc1.frequency.setValueAtTime(146.83, now);

    padOsc2.type = 'triangle';
    padOsc2.frequency.setValueAtTime(220.0, now);

    padOsc3.type = 'sine';
    padOsc3.frequency.setValueAtTime(329.63, now);

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(180 + this.currentGalaxyDrone * 320, now);

    // 1/e Hz (period 2.718s) breathing cosmic tide LFO
    const padLfo = ctx.createOscillator();
    const padLfoGain = ctx.createGain();
    padLfo.type = 'sine';
    padLfo.frequency.setValueAtTime(1 / Math.E, now);
    padLfoGain.gain.setValueAtTime(65, now);
    padLfo.connect(padLfoGain).connect(padFilter.frequency);

    const padGain = ctx.createGain();
    const initialDroneGain =
      this.currentGalaxyDrone <= 0.01 ? 0.00001 : this.currentGalaxyDrone * 0.065;
    padGain.gain.setValueAtTime(initialDroneGain, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.8, now + 0.9);

    padOsc1.connect(padFilter);
    padOsc2.connect(padFilter);
    padOsc3.connect(padFilter);
    padFilter.connect(padGain).connect(masterGain);

    if (this.dryBus) {
      masterGain.connect(this.dryBus);
    } else {
      masterGain.connect(ctx.destination);
    }
    if (this.convolver) {
      const spaceReverbSend = ctx.createGain();
      spaceReverbSend.gain.value = 0.78;
      masterGain.connect(spaceReverbSend).connect(this.convolver);
    }

    padOsc1.start(now);
    padOsc2.start(now);
    padOsc3.start(now);
    padLfo.start(now);

    // Play an immediate welcoming star chord when turned on
    this.triggerGalaxyMelodyEvent(ctx, masterGain);

    const melodyTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (Math.random() < 0.25 + this.currentGalaxyShimmer * 0.68) {
        this.triggerGalaxyMelodyEvent(this.ctx, masterGain);
      }
    }, 460);

    this.galaxyNodes = {
      padOsc1,
      padOsc2,
      padOsc3,
      padLfo,
      padFilter,
      padGain,
      masterGain,
      melodyTimer,
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
