/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { ControlDeck } from './components/ControlDeck';
import { HtmlSourceModal } from './components/HtmlSourceModal';
import { InteractiveCanvas } from './components/InteractiveCanvas';
import { StudioMode, StudioState, TelemetryReadout } from './types/studio';
import { generateStandaloneHtml } from './utils/htmlExporter';

const INITIAL_STATE: StudioState = {
  mode: StudioMode.Ripples,
  paletteId: 'cerulean',
  isPlaying: true,
  soundEnabled: true,
  ripples: {
    waveSpeed: 2.6,
    damping: 0.985,
    autoRain: true,
    rainInterval: 55,
    ringCount: 4,
  },
  harmonograph: {
    freqX: 3.0,
    freqY: 2.0,
    phaseShift: 1.57,
    damping: 0.0018,
    drawSpeed: 5,
    rotaryMix: 0.18,
  },
  kaleidoscope: {
    symmetry: 8,
    mirror: true,
    brushSize: 2.5,
    glowStrength: 8,
    autoRotate: 0,
  },
  gravity: {
    particleCount: 280,
    gravityStrength: 75,
    trailFade: 0.08,
    initialSpin: 0.95,
  },
};

const MODE_TABS: { mode: StudioMode; label: string; shortLabel: string }[] = [
  { mode: StudioMode.Ripples, label: '01. 波紋と五音音階', shortLabel: '波紋と音' },
  { mode: StudioMode.Harmonograph, label: '02. 振り子ハーモノグラフ', shortLabel: 'ハーモノグラフ' },
  { mode: StudioMode.Kaleidoscope, label: '03. 万華鏡ドローイング', shortLabel: '万華鏡' },
  { mode: StudioMode.Gravity, label: '04. 重力多体軌道', shortLabel: '重力軌道' },
];

export default function App() {
  const [studioState, setStudioState] = useState<StudioState>(INITIAL_STATE);
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryReadout>({
    fps: 60,
    pointerX: 0,
    pointerY: 0,
    activeElements: 2,
    canvasWidth: 800,
    canvasHeight: 560,
  });

  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  }, []);

  const standaloneHtml = useMemo(
    () => generateStandaloneHtml(studioState),
    [studioState]
  );

  const handleSelectMode = (mode: StudioMode) => {
    setStudioState((prev) => ({ ...prev, mode, isPlaying: true }));
    const stageEl = document.getElementById('studio-workspace');
    if (stageEl) {
      stageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleDownloadHtml = useCallback(() => {
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hamon-${studioState.mode}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`hamon-${studioState.mode}.html を保存しました`);
  }, [standaloneHtml, studioState.mode, showToast]);

  const handleSavePng = useCallback(() => {
    const canvas = canvasElementRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `hamon-${studioState.mode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`hamon-${studioState.mode}.png を保存しました`);
  }, [studioState.mode, showToast]);

  const handleResetCanvas = useCallback(() => {
    setResetSignal((n) => n + 1);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#studio-workspace"
            onClick={(e) => {
              e.preventDefault();
              handleResetCanvas();
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
          >
            Hamon Studio
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            {MODE_TABS.map((item) => {
              const isActive = studioState.mode === item.mode;
              return (
                <a
                  key={item.mode}
                  href={`#${item.mode}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectMode(item.mode);
                  }}
                  className={`transition-colors whitespace-nowrap shrink-0 underline-offset-4 hover:underline ${
                    isActive ? 'text-slate-100 underline decoration-sky-400' : 'hover:text-slate-200'
                  }`}
                >
                  {item.shortLabel}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>単体HTMLを保存</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container (1440px Desktop Baseline) */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-8 lg:py-10 space-y-14">
        {/* Intro Header & Interactive Mode Switcher */}
        <section id="studio-workspace" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs text-sky-400 font-medium tracking-wide">
                HTML5 Canvas · Web Audio · 数理シミュレーション
              </p>
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50"
                style={{ textWrap: 'balance' }}
              >
                ブラウザ標準のHTMLだけで描く、音と幾何学のインタラクティブ・アトリエ
              </h1>
            </div>

            {/* Unboxed Metadata Readout with Typographic Separators & Tabular Numerals */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
              <span>{telemetry.canvasWidth}×{telemetry.canvasHeight}px</span>
              <span aria-hidden="true">·</span>
              <span>{telemetry.fps} FPS</span>
              <span aria-hidden="true">·</span>
              <span>座標 ({telemetry.pointerX}, {telemetry.pointerY})</span>
              <span aria-hidden="true">·</span>
              <span>要素 {telemetry.activeElements}</span>
            </div>
          </div>

          {/* Interactive Segmented Mode Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
            {MODE_TABS.map((tab) => {
              const active = studioState.mode === tab.mode;
              return (
                <button
                  key={tab.mode}
                  type="button"
                  onClick={() => handleSelectMode(tab.mode)}
                  className={`flex-1 min-w-[140px] px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-sky-300 shadow-xs border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Two-Zone Sandbox Layout (67% Stage / 33% Control Deck) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8 flex flex-col">
              <InteractiveCanvas
                state={studioState}
                resetSignal={resetSignal}
                onTelemetryUpdate={setTelemetry}
                canvasRefOut={canvasElementRef}
              />
            </div>

            <div className="lg:col-span-4 flex flex-col">
              <ControlDeck
                state={studioState}
                onChange={setStudioState}
                onResetCanvas={handleResetCanvas}
                onSavePng={handleSavePng}
                onOpenHtmlModal={() => setIsHtmlModalOpen(true)}
              />
            </div>
          </div>
        </section>

        {/* Architectural Explanation Section (Whitespace + Hairline Dividers, Zero Nested Cards) */}
        <section className="pt-10 border-t border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            <div className="space-y-2.5">
              <h2 className="text-base font-semibold text-slate-100">
                01. Canvas 2D リアルタイム描画
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                HTML5標準の <code className="text-slate-200 font-mono text-xs">&lt;canvas&gt;</code> 要素のみで、波紋の円形交点計算・減衰振り子の方程式・回転対称変換を毎秒60フレームで描画しています。
              </p>
              <button
                type="button"
                onClick={() => handleSelectMode(StudioMode.Harmonograph)}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 underline underline-offset-4 cursor-pointer whitespace-nowrap"
              >
                ハーモノグラフを試す
              </button>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-base font-semibold text-slate-100">
                02. Web Audio 五音音階シンセサイザー
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                外部音源ファイルを一切使わず、ブラウザ内蔵の <code className="text-slate-200 font-mono text-xs">AudioContext</code> で正弦波と三角波を合成し、日本の陽音階チャイムを生成します。
              </p>
              <button
                type="button"
                onClick={() => handleSelectMode(StudioMode.Ripples)}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 underline underline-offset-4 cursor-pointer whitespace-nowrap"
              >
                波紋と音を鳴らす
              </button>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-base font-semibold text-slate-100">
                03. 1ファイルのHTMLとして持ち出し可能
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                調整したパラメータをそのまま単体の <code className="text-slate-200 font-mono text-xs">.html</code> ファイルとして書き出せます。メモ帳やエディタで開いてHTML構造の学習・改造にも使えます。
              </p>
              <button
                type="button"
                onClick={() => setIsHtmlModalOpen(true)}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 underline underline-offset-4 cursor-pointer whitespace-nowrap"
              >
                生成されるHTMLを見る
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>Hamon Studio · Built with Standard HTML5 Canvas &amp; Web Audio API</span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setIsHtmlModalOpen(true)}
              className="hover:text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              HTMLソースを表示
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="hover:text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              .htmlをダウンロード
            </button>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-40 px-4 py-2.5 rounded-lg bg-slate-900 border border-sky-500/40 text-xs font-medium text-slate-100 shadow-lg"
        >
          {toastMessage}
        </div>
      )}

      {/* Standalone HTML Source Inspector Modal */}
      <HtmlSourceModal
        isOpen={isHtmlModalOpen}
        htmlCode={standaloneHtml}
        onClose={() => setIsHtmlModalOpen(false)}
        onDownloadHtml={handleDownloadHtml}
      />
    </div>
  );
}
