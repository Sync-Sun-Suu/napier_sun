export type ClockFontStyle = 'sans' | 'serif' | 'mono';
export type ClockPosition = 'center' | 'top' | 'corner';

export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  canvasBg: string;
}

export interface NapierClockState {
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
  reverbDepth: number;      // 0.0 to 0.90 spatial cathedral/abyssal reverb tail, default: 0.65
  autoChime: boolean;       // gentle periodic e-harmonic glass chime every minute
  harmonicDrone: boolean;   // continuous 2.718s breathing harmonic resonance
  // Timepiece & Visuals
  clockFont: ClockFontStyle;
  clockPosition: ClockPosition;
  showAnalogRing: boolean;  // 60s orbital ring + 2.718s pulse halo
  glassFrost: number;       // 0.0 (transparent) to 0.85 (frosted glass card), default: 0.35
  // 27:18 (e = 2.718) Focus Timer
  timerActive: boolean;
  timerRemainingSec: number; // default 27 * 60 + 18 = 1638 sec
  timerTotalSec: number;
}

export const NAPIER_TIMER_SECONDS = 27 * 60 + 18; // 27分18秒 (2.718)

export const COLOR_PALETTES: ColorPalette[] = [
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
    id: 'amber',
    name: '琥珀 (Amber)',
    primary: '#f59e0b',
    secondary: '#fb7185',
    accent: '#fef3c7',
    canvasBg: '#100c09',
  },
  {
    id: 'jade',
    name: '翡翠 (Jade)',
    primary: '#34d399',
    secondary: '#2dd4bf',
    accent: '#ecfdf5',
    canvasBg: '#06110f',
  },
  {
    id: 'sakura',
    name: '桜霞 (Sakura)',
    primary: '#f472b6',
    secondary: '#c084fc',
    accent: '#fdf2f8',
    canvasBg: '#110a14',
  },
];

export const SUMIE_GOLDEN_PRESET: Omit<
  NapierClockState,
  'timerActive' | 'timerRemainingSec' | 'timerTotalSec'
> = {
  paletteId: 'napier_gold',
  isPlaying: true,
  soundEnabled: true,
  spiralExponent: 0.125,
  antiGravityLift: 0.85,
  filamentWeb: 15,
  tactileGrain: 0.35,
  bonfireSway: true,
  bonfireSound: false,
  bonfireWarmth: 0.65,
  reverbDepth: 0.68,
  autoChime: true,
  harmonicDrone: false,
  clockFont: 'sans',
  clockPosition: 'center',
  showAnalogRing: true,
  glassFrost: 0.32,
};
