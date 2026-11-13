import React from 'react';
import {
  Clock,
  Code2,
  Flame,
  ImageDown,
  RotateCcw,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import {
  ClockFontStyle,
  ClockPosition,
  COLOR_PALETTES,
  NAPIER_TIMER_SECONDS,
  NapierClockState,
  SUMIE_GOLDEN_PRESET,
} from '../types/studio';
import { soundEngine } from '../utils/audio';

interface ControlDeckProps {
  isOpen: boolean;
  state: NapierClockState;
  onChange: (updater: (prev: NapierClockState) => NapierClockState) => void;
  onClose: () => void;
  onResetCanvas: () => void;
  onSavePng: () => void;
  onOpenHtmlModal: () => void;
}

interface SliderRowProps {
  label: string;
  valueText: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  valueText,
  min,
  max,
  step,
  value,
  onChange,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs">
      <label className="text-slate-300 font-medium">{label}</label>
      <span className="font-mono tabular-nums text-amber-300">{valueText}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full"
    />
  </div>
);

const FONT_OPTIONS: { value: ClockFontStyle; label: string }[] = [
  { value: 'sans', label: 'モダン (Sans)' },
  { value: 'serif', label: '映画・灯台 (明朝)' },
  { value: 'mono', label: '数理 (Mono)' },
];

const POSITION_OPTIONS: { value: ClockPosition; label: string }[] = [
  { value: 'center', label: '中央' },
  { value: 'top', label: '上部' },
  { value: 'corner', label: '右下' },
];

export const ControlDeck: React.FC<ControlDeckProps> = ({
  isOpen,
  state,
  onChange,
  onClose,
  onResetCanvas,
  onSavePng,
  onOpenHtmlModal,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="fixed top-16 right-4 bottom-20 z-40 w-[350px] max-w-[calc(100vw-2rem)] flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-slate-950/90 backdrop-blur-xl p-5 shadow-2xl overflow-y-auto">
      <div className="space-y-5">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              2.718 焚き火時計・質感と音の調整
            </h2>
            <p className="text-[11px] text-slate-400">
              iPad 常時表示・単体HTML書き出しにそのまま反映されます
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="設定を閉じる"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Clock Typography, Ring & Glass Texture */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>時計のフォント・ガラス質感</span>
            </span>
            <button
              type="button"
              onClick={() =>
                onChange((p) => ({ ...p, showAnalogRing: !p.showAnalogRing }))
              }
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                state.showAnalogRing
                  ? 'bg-amber-400/15 text-amber-300 border-amber-400/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {state.showAnalogRing ? '60秒リング: ON' : '60秒リング: OFF'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
            {FONT_OPTIONS.map((opt) => {
              const active = state.clockFont === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onChange((p) => ({ ...p, clockFont: opt.value }))
                  }
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-amber-300 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
            {POSITION_OPTIONS.map((opt) => {
              const active = state.clockPosition === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onChange((p) => ({ ...p, clockPosition: opt.value }))
                  }
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-sky-300 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  配置: {opt.label}
                </button>
              );
            })}
          </div>

          <SliderRow
            label="すりガラスの透明度 (Glass Frost)"
            valueText={`${Math.round(state.glassFrost * 100)} %`}
            min={0}
            max={0.8}
            step={0.04}
            value={state.glassFrost}
            onChange={(v) => onChange((p) => ({ ...p, glassFrost: v }))}
          />
        </div>

        <hr className="border-slate-800/80" />

        {/* 2. Bonfire Soundscape & Spatial Reverb */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>焚き火の温度感 ＆ 深海リバーブ（残響）</span>
            </span>
          </div>

          <SliderRow
            label="焚き火の温度感（熾火 ↔ パチパチ薪火）"
            valueText={`${Math.round(state.bonfireWarmth * 100)} %`}
            min={0.1}
            max={1.0}
            step={0.05}
            value={state.bonfireWarmth}
            onChange={(v) => onChange((p) => ({ ...p, bonfireWarmth: v }))}
          />

          <SliderRow
            label="空間リバーブ・残響の深さ (e-Reverb)"
            valueText={`${Math.round(state.reverbDepth * 100)} %`}
            min={0.0}
            max={0.95}
            step={0.05}
            value={state.reverbDepth}
            onChange={(v) => onChange((p) => ({ ...p, reverbDepth: v }))}
          />

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                soundEngine.unlockAudio();
                if (!state.autoChime) soundEngine.playClockBell(true, false);
                onChange((p) => ({
                  ...p,
                  soundEnabled: true,
                  autoChime: !p.autoChime,
                }));
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                state.autoChime
                  ? 'bg-sky-500/15 text-sky-300 border-sky-400/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>{state.autoChime ? '毎分チャイム: ON' : '毎分チャイム: OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.unlockAudio();
                onChange((p) => ({
                  ...p,
                  soundEnabled: true,
                  harmonicDrone: !p.harmonicDrone,
                }));
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                state.harmonicDrone
                  ? 'bg-amber-400/15 text-amber-300 border-amber-400/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <span>{state.harmonicDrone ? '2.718秒共鳴: ON' : '2.718秒共鳴: OFF'}</span>
            </button>
          </div>
        </div>

        <hr className="border-slate-800/80" />

        {/* 3. 27:18 (e = 2.718) Focus Timer */}
        <div className="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            <Timer className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">27分18秒 (2.718) タイマー</div>
              <div className="text-[11px] text-slate-400">完了時に5音の倍音アルペジオが鳴ります</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.unlockAudio();
              onChange((p) => ({
                ...p,
                timerActive: !p.timerActive,
                timerRemainingSec: NAPIER_TIMER_SECONDS,
                timerTotalSec: NAPIER_TIMER_SECONDS,
              }));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              state.timerActive
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-sky-400 text-slate-950 hover:bg-sky-300'
            }`}
          >
            {state.timerActive ? '停止' : '27:18 開始'}
          </button>
        </div>

        <hr className="border-slate-800/80" />

        {/* 4. Color Palettes */}
        <div className="space-y-2">
          <span className="text-xs text-slate-300 font-medium">色彩パレット</span>
          <div className="grid grid-cols-2 gap-1.5">
            {COLOR_PALETTES.map((pal) => {
              const active = pal.id === state.paletteId;
              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, paletteId: pal.id }))}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-slate-100 border-amber-400/60'
                      : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${pal.primary}, ${pal.secondary})`,
                    }}
                  />
                  <span className="truncate">{pal.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-slate-800/80" />

        {/* 5. Sumie's Logarithmic Spiral & Bonfire Parameters */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">
              対数螺旋と反重力パラメータ
            </h3>
            <button
              type="button"
              onClick={() =>
                onChange((p) => ({
                  ...p,
                  ...SUMIE_GOLDEN_PRESET,
                  bonfireSound: p.bonfireSound,
                }))
              }
              className="text-[11px] font-mono text-amber-300 hover:text-amber-200 underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              Sumie黄金設定 (0.125) に戻す
            </button>
          </div>

          <SliderRow
            label="対数螺旋の成長指数 (b)"
            valueText={`${state.spiralExponent.toFixed(3)}`}
            min={0.08}
            max={0.32}
            step={0.005}
            value={state.spiralExponent}
            onChange={(v) => onChange((p) => ({ ...p, spiralExponent: v }))}
          />

          <SliderRow
            label="反重力リフト (Anti-Gravity)"
            valueText={`${state.antiGravityLift.toFixed(3)} G`}
            min={0.4}
            max={2.718}
            step={0.05}
            value={state.antiGravityLift}
            onChange={(v) => onChange((p) => ({ ...p, antiGravityLift: v }))}
          />

          <SliderRow
            label="深層フィラメント結合距離"
            valueText={`${state.filamentWeb} px`}
            min={0}
            max={150}
            step={5}
            value={state.filamentWeb}
            onChange={(v) => onChange((p) => ({ ...p, filamentWeb: v }))}
          />

          <SliderRow
            label="粒子グレイン質感強度"
            valueText={`${Math.round(state.tactileGrain * 100)} %`}
            min={0}
            max={1.0}
            step={0.05}
            value={state.tactileGrain}
            onChange={(v) => onChange((p) => ({ ...p, tactileGrain: v }))}
          />
        </div>
      </div>

      {/* Bottom Export & Reset Actions */}
      <div className="pt-4 mt-5 border-t border-slate-800 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onResetCanvas}
          className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>再描画</span>
        </button>

        <button
          type="button"
          onClick={onSavePng}
          className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ImageDown className="w-3.5 h-3.5" />
          <span>PNG保存</span>
        </button>

        <button
          type="button"
          onClick={onOpenHtmlModal}
          className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium bg-slate-900 text-sky-300 hover:bg-slate-800 border border-sky-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>HTML表示</span>
        </button>
      </div>
    </aside>
  );
};
