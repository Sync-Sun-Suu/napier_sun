import React from 'react';
import {
  Code2,
  ImageDown,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  COLOR_PALETTES,
  HARMONOGRAPH_PRESETS,
  StudioMode,
  StudioState,
} from '../types/studio';

interface ControlDeckProps {
  state: StudioState;
  onChange: (updater: (prev: StudioState) => StudioState) => void;
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
      <span className="font-mono tabular-nums text-sky-300">{valueText}</span>
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

export const ControlDeck: React.FC<ControlDeckProps> = ({
  state,
  onChange,
  onResetCanvas,
  onSavePng,
  onOpenHtmlModal,
}) => {
  return (
    <aside className="flex flex-col justify-between gap-6 rounded-xl border border-slate-800 bg-slate-900/70 p-5 lg:p-6">
      <div className="space-y-6">
        {/* Playback & Audio Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">
              シミュレーション制御
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {state.isPlaying ? '▲ 実行中' : '■ 一時停止'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                onChange((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium bg-sky-500 text-slate-950 hover:bg-sky-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {state.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>一時停止</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>再開する</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onResetCanvas}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>リセット</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  soundEnabled: !prev.soundEnabled,
                }))
              }
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                state.soundEnabled
                  ? 'bg-slate-800 text-sky-300 border-sky-500/40 hover:bg-slate-700'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {state.soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>音 ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>音 OFF</span>
                </>
              )}
            </button>
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* Color Palette Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">色彩パレット（日本の伝統色調）</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_PALETTES.map((pal) => {
              const active = pal.id === state.paletteId;
              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({ ...prev, paletteId: pal.id }))
                  }
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-slate-100 border-sky-400/60'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
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

        <hr className="border-slate-800" />

        {/* Mode-Specific Parameters & Mathematical Formula */}
        {state.mode === StudioMode.Ripples && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-100">
                01. 波紋と干渉パラメータ
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                複数の円形波が重なる交点をリアルタイムに計算し、五音音階（陽音階）の倍音チャイムを鳴らします。
              </p>
            </div>

            <SliderRow
              label="波の伝播速度"
              valueText={`${state.ripples.waveSpeed.toFixed(1)} px/f`}
              min={1.2}
              max={6.0}
              step={0.2}
              value={state.ripples.waveSpeed}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  ripples: { ...p.ripples, waveSpeed: v },
                }))
              }
            />

            <SliderRow
              label="エネルギー減衰率"
              valueText={`${(state.ripples.damping * 100).toFixed(1)} %`}
              min={0.96}
              max={0.995}
              step={0.002}
              value={state.ripples.damping}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  ripples: { ...p.ripples, damping: v },
                }))
              }
            />

            <SliderRow
              label="同心リング数"
              valueText={`${state.ripples.ringCount} 重`}
              min={2}
              max={6}
              step={1}
              value={state.ripples.ringCount}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  ripples: { ...p.ripples, ringCount: v },
                }))
              }
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-300 font-medium">
                自動しずく（雨音モード）
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange((p) => ({
                    ...p,
                    ripples: { ...p.ripples, autoRain: !p.ripples.autoRain },
                  }))
                }
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  state.ripples.autoRain
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                {state.ripples.autoRain ? '有効' : '無効'}
              </button>
            </div>
          </div>
        )}

        {state.mode === StudioMode.Harmonograph && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-100">
                02. 振り子ハーモノグラフ比率
              </h3>
              <p className="text-xs font-mono text-slate-400">
                x(t) = e^(-dt)·sin(f_x·t + φ), y(t) = e^(-dt)·sin(f_y·t)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {HARMONOGRAPH_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onChange((p) => ({
                      ...p,
                      harmonograph: {
                        ...p.harmonograph,
                        freqX: preset.freqX,
                        freqY: preset.freqY,
                        phaseShift: preset.phaseShift,
                        rotaryMix: preset.rotaryMix,
                      },
                    }))
                  }
                  className="px-2.5 py-2 rounded-lg text-xs font-medium bg-slate-950/80 text-slate-300 border border-slate-800 hover:border-sky-500/50 hover:text-sky-200 transition-colors whitespace-nowrap shrink-0 truncate cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <SliderRow
              label="X軸 周波数 (f_x)"
              valueText={`${state.harmonograph.freqX.toFixed(2)} Hz`}
              min={1.0}
              max={9.0}
              step={0.05}
              value={state.harmonograph.freqX}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  harmonograph: { ...p.harmonograph, freqX: v },
                }))
              }
            />

            <SliderRow
              label="Y軸 周波数 (f_y)"
              valueText={`${state.harmonograph.freqY.toFixed(2)} Hz`}
              min={1.0}
              max={9.0}
              step={0.05}
              value={state.harmonograph.freqY}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  harmonograph: { ...p.harmonograph, freqY: v },
                }))
              }
            />

            <SliderRow
              label="位相差 (φ)"
              valueText={`${state.harmonograph.phaseShift.toFixed(2)} rad`}
              min={0}
              max={3.14}
              step={0.05}
              value={state.harmonograph.phaseShift}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  harmonograph: { ...p.harmonograph, phaseShift: v },
                }))
              }
            />

            <SliderRow
              label="回転振り子ブレンド"
              valueText={`${Math.round(state.harmonograph.rotaryMix * 100)} %`}
              min={0}
              max={0.45}
              step={0.02}
              value={state.harmonograph.rotaryMix}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  harmonograph: { ...p.harmonograph, rotaryMix: v },
                }))
              }
            />
          </div>
        )}

        {state.mode === StudioMode.Kaleidoscope && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-100">
                03. 万華鏡シンメトリー設定
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ストロークを座標変換行列でN等分回転＆鏡像反転し、幾何学文様をリアルタイム描画します。
              </p>
            </div>

            <SliderRow
              label="回転対称の分割数"
              valueText={`${state.kaleidoscope.symmetry} 分割`}
              min={4}
              max={16}
              step={2}
              value={state.kaleidoscope.symmetry}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  kaleidoscope: { ...p.kaleidoscope, symmetry: v },
                }))
              }
            />

            <SliderRow
              label="筆致の太さ"
              valueText={`${state.kaleidoscope.brushSize.toFixed(1)} px`}
              min={1.0}
              max={8.0}
              step={0.5}
              value={state.kaleidoscope.brushSize}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  kaleidoscope: { ...p.kaleidoscope, brushSize: v },
                }))
              }
            />

            <SliderRow
              label="光彩ブラー強度"
              valueText={`${state.kaleidoscope.glowStrength} px`}
              min={0}
              max={20}
              step={2}
              value={state.kaleidoscope.glowStrength}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  kaleidoscope: { ...p.kaleidoscope, glowStrength: v },
                }))
              }
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-300 font-medium">
                鏡像反転（ミラー対称）
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange((p) => ({
                    ...p,
                    kaleidoscope: {
                      ...p.kaleidoscope,
                      mirror: !p.kaleidoscope.mirror,
                    },
                  }))
                }
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  state.kaleidoscope.mirror
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                {state.kaleidoscope.mirror ? '有効' : '無効'}
              </button>
            </div>
          </div>
        )}

        {state.mode === StudioMode.Gravity && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-100">
                04. 重力多体軌道パラメータ
              </h3>
              <p className="text-xs font-mono text-slate-400">
                F = G · m / r² （逆二乗則による軌道計算）
              </p>
            </div>

            <SliderRow
              label="粒子数"
              valueText={`${state.gravity.particleCount} 個`}
              min={120}
              max={520}
              step={40}
              value={state.gravity.particleCount}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  gravity: { ...p.gravity, particleCount: v },
                }))
              }
            />

            <SliderRow
              label="重力定数スケール (G)"
              valueText={`${state.gravity.gravityStrength}`}
              min={25}
              max={160}
              step={5}
              value={state.gravity.gravityStrength}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  gravity: { ...p.gravity, gravityStrength: v },
                }))
              }
            />

            <SliderRow
              label="軌跡の残像クリア率"
              valueText={`${Math.round((1 - state.gravity.trailFade) * 100)} %`}
              min={0.03}
              max={0.22}
              step={0.01}
              value={state.gravity.trailFade}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  gravity: { ...p.gravity, trailFade: v },
                }))
              }
            />

            <SliderRow
              label="初期公転スピード"
              valueText={`${state.gravity.initialSpin.toFixed(2)} x`}
              min={0.4}
              max={1.5}
              step={0.05}
              value={state.gravity.initialSpin}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  gravity: { ...p.gravity, initialSpin: v },
                }))
              }
            />
          </div>
        )}
      </div>

      {/* Export / Inspect Utilities */}
      <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onSavePng}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ImageDown className="w-3.5 h-3.5" />
          <span>PNG画像保存</span>
        </button>

        <button
          type="button"
          onClick={onOpenHtmlModal}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium bg-slate-800 text-sky-300 hover:bg-slate-700 border border-sky-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>HTMLコード表示</span>
        </button>
      </div>
    </aside>
  );
};
