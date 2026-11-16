export type SceneMode = 'abyssal' | 'bonfire';
export type ClockFontStyle = 'sans' | 'serif' | 'mono';
export type ClockPosition = 'center' | 'top' | 'corner';
export type AbyssalCameraMode = 'cruise' | 'free';
export type AbyssalQuality = 'low' | 'medium' | 'high';

export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  canvasBg: string;
}

export interface NapierClockState {
  sceneMode: SceneMode;
  paletteId: string;
  isPlaying: boolean;
  soundEnabled: boolean;
  // Sumie's Golden Spiral & Bonfire Physics
  spiralExponent: number;   // b in r = a * e^(b * theta), default: 0.125
  antiGravityLift: number;  // upward & spiral float force, default: 0.850
  filamentWeb: number;      // connection distance between deep particles, default: 15 px
  tactileGrain: number;     // velvet/glass luminescence & grain intensity, default: 0.35
  bonfireSway: boolean;     // 1/f organic bonfire flame sway & rising hearth embers
  // Soundscape & Spatial Reverb
  bonfireSound: boolean;    // procedural Web Audio warm bonfire crackle & hearth sound
  bonfireWarmth: number;    // 0.1 (静かな熾火) to 1.0 (パチパチ焚き火), default: 0.65
  abyssalSound: boolean;    // procedural Web Audio underwater current, bubbles & whale resonance
  abyssalDepthTone: number; // 0.1 (浅瀬のきらめき) to 1.0 (深層海溝の響き), default: 0.68
  reverbDepth: number;      // 0.0 to 0.90 spatial cathedral/abyssal reverb tail, default: 0.68
  autoChime: boolean;       // gentle periodic e-harmonic glass chime every minute
  harmonicDrone: boolean;   // continuous 2.718s breathing harmonic resonance
  // 3D Abyssal Garden (深海水槽) Parameters
  mantaCount: number;       // 1 to 12 graceful swimming manta rays, default: 5
  boidsCount: number;       // 60 to 360 schooling luminescent fish (Boids), default: 180
  causticsIntensity: number;// 0.1 to 1.0 surface light rays & seabed caustics, default: 0.78
  kelpDensity: number;      // 0.1 to 1.0 swaying 1/f kelp forest density, default: 0.75
  cameraMode: AbyssalCameraMode; // 'cruise' (自動遊泳・置き時計) | 'free' (自由遊泳)
  qualityLevel: AbyssalQuality;  // 'low' | 'medium' | 'high'
  showClockOverlay: boolean;     // show/hide the 2.718 clock dial inside the aquarium
  // Timepiece & Visuals
  clockFont: ClockFontStyle;
  clockPosition: ClockPosition;
  showAnalogRing: boolean;  // 60s orbital ring + 2.718s pulse halo
  glassFrost: number;       // 0.0 (transparent) to 0.85 (frosted glass card), default: 0.32
  // 27:18 (e = 2.718) Focus Timer
  timerActive: boolean;
  timerRemainingSec: number; // default 27 * 60 + 18 = 1638 sec
  timerTotalSec: number;
}

export const NAPIER_TIMER_SECONDS = 27 * 60 + 18; // 27分18秒 (2.718)

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'abyssal_garden',
    name: '深海庭園 (Abyssal)',
    primary: '#22d3ee',
    secondary: '#38bdf8',
    accent: '#ecfeff',
    canvasBg: '#03101f',
  },
  {
    id: 'napier_gold',
    name: '深層太陽 (Napier Sun)',
    primary: '#fbbf24',
    secondary: '#38bdf8',
    accent: '#fef3c7',
    canvasBg: '#060913',
  },
  {
    id: 'bonfire_hearth',
    name: '宵の焚き火 (Bonfire)',
    primary: '#f97316',
    secondary: '#fbbf24',
    accent: '#fffbeb',
    canvasBg: '#0b0705',
  },
  {
    id: 'cerulean',
    name: '蒼水 (Cerulean)',
    primary: '#38bdf8',
    secondary: '#818cf8',
    accent: '#f8fafc',
    canvasBg: '#070d19',
  },
  {
    id: 'jade',
    name: '翡翠サンゴ (Jade)',
    primary: '#34d399',
    secondary: '#2dd4bf',
    accent: '#ecfdf5',
    canvasBg: '#041414',
  },
  {
    id: 'sakura',
    name: '深海クラゲ (Biolume)',
    primary: '#f472b6',
    secondary: '#c084fc',
    accent: '#fdf2f8',
    canvasBg: '#0d0718',
  },
];

export const SUMIE_GOLDEN_PRESET: Omit<
  NapierClockState,
  'timerActive' | 'timerRemainingSec' | 'timerTotalSec'
> = {
  sceneMode: 'abyssal',
  paletteId: 'abyssal_garden',
  isPlaying: true,
  soundEnabled: true,
  spiralExponent: 0.125,
  antiGravityLift: 0.85,
  filamentWeb: 15,
  tactileGrain: 0.35,
  bonfireSway: true,
  bonfireSound: false,
  bonfireWarmth: 0.65,
  abyssalSound: false,
  abyssalDepthTone: 0.68,
  reverbDepth: 0.68,
  autoChime: true,
  harmonicDrone: false,
  mantaCount: 5,
  boidsCount: 180,
  causticsIntensity: 0.78,
  kelpDensity: 0.75,
  cameraMode: 'cruise',
  qualityLevel: 'high',
  showClockOverlay: true,
  clockFont: 'sans',
  clockPosition: 'center',
  showAnalogRing: true,
  glassFrost: 0.28,
};
