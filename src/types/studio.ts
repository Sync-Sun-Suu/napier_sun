export enum StudioMode {
  Ripples = 'ripples',
  Harmonograph = 'harmonograph',
  Kaleidoscope = 'kaleidoscope',
  Gravity = 'gravity',
}

export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  canvasBg: string;
}

export interface RippleParams {
  waveSpeed: number;     // px/frame (1.5 - 6.0)
  damping: number;       // 0.960 - 0.995
  autoRain: boolean;     // gentle periodic droplets
  rainInterval: number;  // frames between droplets (20 - 120)
  ringCount: number;     // harmonic concentric rings (2 - 6)
}

export interface HarmonographParams {
  freqX: number;         // 1.0 - 9.0 Hz
  freqY: number;         // 1.0 - 9.0 Hz
  phaseShift: number;    // 0 - 3.14 rad
  damping: number;       // 0.0005 - 0.008
  drawSpeed: number;     // steps per frame (1 - 12)
  rotaryMix: number;     // 0 - 0.5 secondary rotary pendulum
}

export interface KaleidoscopeParams {
  symmetry: number;      // 4 - 16 fold
  mirror: boolean;       // mirror reflection within each sector
  brushSize: number;     // 1.5 - 10 px
  glowStrength: number;  // 0 - 20 px
  autoRotate: number;    // 0 - 1.5 deg/frame
}

export interface GravityParams {
  particleCount: number; // 120 - 600
  gravityStrength: number; // 20 - 160
  trailFade: number;     // 0.03 - 0.25
  initialSpin: number;   // 0.3 - 1.5 tangential factor
}

export interface StudioState {
  mode: StudioMode;
  paletteId: string;
  isPlaying: boolean;
  soundEnabled: boolean;
  ripples: RippleParams;
  harmonograph: HarmonographParams;
  kaleidoscope: KaleidoscopeParams;
  gravity: GravityParams;
}

export interface TelemetryReadout {
  fps: number;
  pointerX: number;
  pointerY: number;
  activeElements: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'cerulean',
    name: '蒼水 (Cerulean)',
    primary: '#38bdf8',
    secondary: '#818cf8',
    accent: '#f8fafc',
    canvasBg: '#090f1d',
  },
  {
    id: 'amber',
    name: '琥珀 (Amber)',
    primary: '#f59e0b',
    secondary: '#fb7185',
    accent: '#fef3c7',
    canvasBg: '#120f0c',
  },
  {
    id: 'jade',
    name: '翡翠 (Jade)',
    primary: '#34d399',
    secondary: '#2dd4bf',
    accent: '#ecfdf5',
    canvasBg: '#081412',
  },
  {
    id: 'sakura',
    name: '桜霞 (Sakura)',
    primary: '#f472b6',
    secondary: '#c084fc',
    accent: '#fdf2f8',
    canvasBg: '#130c16',
  },
];

export interface HarmonographPreset {
  label: string;
  ratioText: string;
  freqX: number;
  freqY: number;
  phaseShift: number;
  rotaryMix: number;
}

export const HARMONOGRAPH_PRESETS: HarmonographPreset[] = [
  {
    label: '完全五度 (3:2)',
    ratioText: '3 : 2',
    freqX: 3.0,
    freqY: 2.0,
    phaseShift: 1.57,
    rotaryMix: 0.18,
  },
  {
    label: '完全四度 (4:3)',
    ratioText: '4 : 3',
    freqX: 4.0,
    freqY: 3.0,
    phaseShift: 0.78,
    rotaryMix: 0.12,
  },
  {
    label: '長六度 (5:3)',
    ratioText: '5 : 3',
    freqX: 5.0,
    freqY: 3.0,
    phaseShift: 1.15,
    rotaryMix: 0.25,
  },
  {
    label: '準黄金比 (8:5)',
    ratioText: '8 : 5',
    freqX: 8.0,
    freqY: 5.0,
    phaseShift: 2.09,
    rotaryMix: 0.32,
  },
];
