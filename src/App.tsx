/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  EyeOff,
  Fish,
  Flame,
  Maximize,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Stars,
  Timer,
  Waves,
  X,
} from 'lucide-react';
import { AbyssalAquariumCanvas } from './components/AbyssalAquariumCanvas';
import { ControlDeck } from './components/ControlDeck';
import { HtmlSourceModal } from './components/HtmlSourceModal';
import { InteractiveCanvas } from './components/InteractiveCanvas';
import { StardustGalaxyCanvas } from './components/StardustGalaxyCanvas';
import {
  NAPIER_TIMER_SECONDS,
  NapierClockState,
  SceneMode,
  SUMIE_GOLDEN_PRESET,
} from './types/studio';
import { soundEngine } from './utils/audio';
import { generateStandaloneHtml } from './utils/htmlExporter';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INITIAL_STATE: NapierClockState = {
  ...SUMIE_GOLDEN_PRESET,
  timerActive: false,
  timerRemainingSec: NAPIER_TIMER_SECONDS,
  timerTotalSec: NAPIER_TIMER_SECONDS,
};

export default function App() {
  const [clockState, setClockState] = useState<NapierClockState>(INITIAL_STATE);
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [uiHidden, setUiHidden] = useState<boolean>(false);
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState<boolean>(false);
  const [isHomeIconModalOpen, setIsHomeIconModalOpen] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  const isGalaxy = clockState.sceneMode === 'galaxy';
  const isAbyssal = clockState.sceneMode === 'abyssal';
  const isBonfire = clockState.sceneMode === 'bonfire';

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Ignore if blocked by iframe policy
      }
    };
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLock?.release().catch(() => {});
    };
  }, []);

  // 27:18 (e = 2.718) Focus Timer Countdown
  useEffect(() => {
    if (!clockState.timerActive) return;
    const interval = window.setInterval(() => {
      setClockState((prev) => {
        if (!prev.timerActive) return prev;
        if (prev.timerRemainingSec <= 1) {
          soundEngine.playClockBell(prev.soundEnabled, true);
          showToast('27分18秒 (2.718) が経過しました ✨');
          return {
            ...prev,
            timerActive: false,
            timerRemainingSec: NAPIER_TIMER_SECONDS,
          };
        }
        return {
          ...prev,
          timerRemainingSec: prev.timerRemainingSec - 1,
        };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [clockState.timerActive, showToast]);

  const standaloneHtml = useMemo(
    () => generateStandaloneHtml(clockState),
    [clockState]
  );

  const handleDownloadHtml = useCallback(() => {
    const filename =
      clockState.sceneMode === 'galaxy'
        ? 'galaxy-2718-stardust.html'
        : clockState.sceneMode === 'abyssal'
        ? 'abyssal-2718-aquarium.html'
        : 'napier-2718-clock.html';
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`${filename} を保存しました ✨`);
  }, [clockState.sceneMode, standaloneHtml, showToast]);

  const handleSavePng = useCallback(() => {
    const canvas = canvasElementRef.current;
    if (!canvas) return;
    const filename =
      clockState.sceneMode === 'galaxy'
        ? 'galaxy-2718-stardust.png'
        : clockState.sceneMode === 'abyssal'
        ? 'abyssal-2718-aquarium.png'
        : 'napier-2718-clock.png';
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${filename} を保存しました`);
  }, [clockState.sceneMode, showToast]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        setUiHidden(true);
        showToast('時計・空間のみの常時表示ビューに切り替えました');
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, [showToast]);

  const handleSwitchMode = useCallback(
    (targetMode: SceneMode) => {
      setClockState((prev) => {
        if (prev.sceneMode === targetMode) return prev;
        const nextPalette =
          targetMode === 'galaxy'
            ? 'stardust_galaxy'
            : targetMode === 'abyssal'
            ? 'abyssal_garden'
            : 'napier_gold';

        return {
          ...prev,
          sceneMode: targetMode,
          paletteId: nextPalette,
        };
      });
      showToast(
        targetMode === 'galaxy'
          ? '🌌 2.718 星屑の銀河 (Stardust_galaxy) に切り替えました'
          : targetMode === 'abyssal'
          ? '🐋 2.718 深海水槽 (Abyssal_garden) に切り替えました'
          : '🔥 2.718 焚き火時計 (Napier_sun) に切り替えました'
      );
    },
    [showToast]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#040611] text-slate-100 flex flex-col">
      {/* Minimal Floating Top Bar (Hidden when in pure ambient mode) */}
      {!uiHidden && (
        <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between gap-6 px-5 py-3 bg-gradient-to-b from-slate-950/80 via-slate-950/35 to-transparent pointer-events-none">
          {/* Zone 1: Single Wordmark */}
          <a
            href="#clock"
            onClick={(e) => {
              e.preventDefault();
              setResetSignal((n) => n + 1);
            }}
            className="pointer-events-auto font-display text-base font-bold tracking-tight text-slate-100/95 whitespace-nowrap shrink-0"
          >
            {isGalaxy
              ? '2.718 Stardust Galaxy'
              : isAbyssal
              ? '2.718 Abyssal Garden'
              : 'Napier 2.718 Clock'}
          </a>

          {/* Zone 2: 3-World & Typography Switcher Links */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-300/85 pointer-events-auto">
            <a
              href="#galaxy"
              onClick={(e) => {
                e.preventDefault();
                handleSwitchMode('galaxy');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
                isGalaxy
                  ? 'text-violet-300 underline underline-offset-4 font-semibold'
                  : ''
              }`}
            >
              🌌 星屑の銀河 (3D)
            </a>
            <a
              href="#abyssal"
              onClick={(e) => {
                e.preventDefault();
                handleSwitchMode('abyssal');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
                isAbyssal
                  ? 'text-cyan-300 underline underline-offset-4 font-semibold'
                  : ''
              }`}
            >
              🐋 深海水槽 (3D)
            </a>
            <a
              href="#bonfire"
              onClick={(e) => {
                e.preventDefault();
                handleSwitchMode('bonfire');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
                isBonfire
                  ? 'text-amber-300 underline underline-offset-4 font-semibold'
                  : ''
              }`}
            >
              🔥 焚き火時計
            </a>
            <a
              href="#sans"
              onClick={(e) => {
                e.preventDefault();
                setClockState((p) => ({ ...p, clockFont: 'sans' }));
              }}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
                clockState.clockFont === 'sans'
                  ? 'text-white underline underline-offset-4'
                  : ''
              }`}
            >
              モダン文字盤
            </a>
            <a
              href="#serif"
              onClick={(e) => {
                e.preventDefault();
                setClockState((p) => ({ ...p, clockFont: 'serif' }));
              }}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
                clockState.clockFont === 'serif'
                  ? 'text-white underline underline-offset-4'
                  : ''
              }`}
            >
              灯台セリフ体
            </a>
            <a
              href="#source"
              onClick={(e) => {
                e.preventDefault();
                setIsHtmlModalOpen(true);
              }}
              className="transition-colors whitespace-nowrap shrink-0 hover:text-white"
            >
              HTMLコード表示
            </a>
          </nav>

          {/* Zone 3: 1 Primary Export CTA */}
          <div className="flex items-center shrink-0 pointer-events-auto">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg ${
                isGalaxy
                  ? 'bg-violet-300 hover:bg-violet-200'
                  : isAbyssal
                  ? 'bg-cyan-300 hover:bg-cyan-200'
                  : 'bg-amber-300 hover:bg-amber-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isGalaxy
                  ? '銀河HTMLを保存'
                  : isAbyssal
                  ? '水槽HTMLを保存'
                  : '時計HTMLを保存'}
              </span>
            </button>
          </div>
        </header>
      )}

      {/* Full-Viewport Stage: Stardust Galaxy OR Abyssal Aquarium OR Bonfire Clock */}
      <main className="w-full h-full flex-1">
        {isGalaxy ? (
          <StardustGalaxyCanvas
            state={clockState}
            resetSignal={resetSignal}
            uiHidden={uiHidden}
            onToggleUiHidden={() => {
              setUiHidden((prev) => !prev);
              setIsDrawerOpen(false);
            }}
            onChangeState={setClockState}
            canvasRefOut={canvasElementRef}
          />
        ) : isAbyssal ? (
          <AbyssalAquariumCanvas
            state={clockState}
            resetSignal={resetSignal}
            uiHidden={uiHidden}
            onToggleUiHidden={() => {
              setUiHidden((prev) => !prev);
              setIsDrawerOpen(false);
            }}
            onChangeState={setClockState}
            canvasRefOut={canvasElementRef}
          />
        ) : (
          <InteractiveCanvas
            state={clockState}
            resetSignal={resetSignal}
            uiHidden={uiHidden}
            onToggleUiHidden={() => {
              setUiHidden((prev) => !prev);
              setIsDrawerOpen(false);
            }}
            canvasRefOut={canvasElementRef}
          />
        )}
      </main>

      {/* Sleek Bottom Floating Ambient Dock (Hides completely for iPad always-on display) */}
      {!uiHidden && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-950/75 border border-white/10 backdrop-blur-xl shadow-2xl max-w-[95vw] overflow-x-auto">
          {/* 1. 3-World Compact Switcher Pills */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => handleSwitchMode('galaxy')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isGalaxy
                  ? 'bg-violet-500/25 text-violet-200 border border-violet-400/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stars className="w-3.5 h-3.5 text-violet-300" />
              <span>星屑銀河</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('abyssal')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isAbyssal
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Fish className="w-3.5 h-3.5 text-cyan-300" />
              <span>深海水槽</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('bonfire')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isBonfire
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>焚き火</span>
            </button>
          </div>

          {/* 2. Signature Ambient Sound Toggle (Galaxy Melody / Abyssal Ocean / Bonfire Crackle) */}
          {isGalaxy ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.unlockAudio();
                setClockState((p) => ({
                  ...p,
                  soundEnabled: true,
                  galaxySound: !p.galaxySound,
                  abyssalSound: false,
                  bonfireSound: false,
                }));
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                clockState.galaxySound
                  ? 'bg-violet-500/25 text-violet-100 border-violet-400/60'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              <Stars className="w-3.5 h-3.5 text-violet-300" />
              <span>
                {clockState.galaxySound
                  ? '星屑メロディ: ON'
                  : '星屑メロディを鳴らす'}
              </span>
            </button>
          ) : isAbyssal ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.unlockAudio();
                setClockState((p) => ({
                  ...p,
                  soundEnabled: true,
                  abyssalSound: !p.abyssalSound,
                  galaxySound: false,
                  bonfireSound: false,
                }));
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                clockState.abyssalSound
                  ? 'bg-cyan-500/25 text-cyan-100 border-cyan-400/60'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5 text-cyan-300" />
              <span>
                {clockState.abyssalSound ? '深海音: ON' : '深海音を鳴らす'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.unlockAudio();
                setClockState((p) => ({
                  ...p,
                  soundEnabled: true,
                  bonfireSound: !p.bonfireSound,
                  abyssalSound: false,
                  galaxySound: false,
                }));
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                clockState.bonfireSound
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {clockState.bonfireSound ? '焚き火音: ON' : '焚き火音を鳴らす'}
              </span>
            </button>
          )}

          {/* 3. Reverb Chime Preview */}
          <button
            type="button"
            onClick={() => {
              soundEngine.unlockAudio();
              soundEngine.playClockBell(true, false);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900/80 text-slate-300 hover:text-cyan-200 border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>残響チャイム</span>
          </button>

          {/* 4. 27:18 Focus Timer Quick Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.unlockAudio();
              setClockState((p) => ({
                ...p,
                timerActive: !p.timerActive,
                timerRemainingSec: NAPIER_TIMER_SECONDS,
                timerTotalSec: NAPIER_TIMER_SECONDS,
              }));
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              clockState.timerActive
                ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            <Timer className="w-3.5 h-3.5 text-sky-400" />
            <span>{clockState.timerActive ? '27:18 計測中' : '27:18 タイマー'}</span>
          </button>

          {/* 5. Settings Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isDrawerOpen
                ? 'bg-slate-800 text-violet-300 border-violet-400/50'
                : 'bg-slate-900/80 text-slate-200 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>
              {isGalaxy
                ? '銀河・音の調整'
                : isAbyssal
                ? '水槽・音の調整'
                : '質感・音の調整'}
            </span>
          </button>

          {/* 6. Home Screen Icon & Install Guide */}
          <button
            type="button"
            onClick={() => setIsHomeIconModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900/80 text-amber-200 hover:text-white border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-300" />
            <span>ホームアイコン</span>
          </button>

          {/* 7. Pure View (Hide UI for iPad Always-On) */}
          <button
            type="button"
            onClick={() => {
              setUiHidden(true);
              setIsDrawerOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="ボタンを隠して空間と時計だけにする（ダブルタップでも切替可能）"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>画面のみ表示</span>
          </button>

          {/* 8. Fullscreen */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="フルスクリーン表示"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Settings Drawer */}
      <ControlDeck
        isOpen={isDrawerOpen && !uiHidden}
        state={clockState}
        onChange={setClockState}
        onClose={() => setIsDrawerOpen(false)}
        onResetCanvas={() => setResetSignal((n) => n + 1)}
        onSavePng={handleSavePng}
        onOpenHtmlModal={() => setIsHtmlModalOpen(true)}
      />

      {/* Home Screen Icon Preview & iPad Add-to-Home Guide Modal */}
      {isHomeIconModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">
                iPad ホーム画面アイコン設定済み ✨
              </h2>
              <button
                type="button"
                onClick={() => setIsHomeIconModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <img
                src={`${import.meta.env.BASE_URL}apple-touch-icon.png`}
                alt="2.718 星屑銀河・深海水槽・焚き火時計 ホームアイコン"
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl shadow-lg border border-white/10 shrink-0"
              />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white">
                  2.718 星屑銀河 ＆ 深海水槽 ＆ 焚き火時計
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  iPadOS / iOS 用の <code className="text-violet-300 font-mono">apple-touch-icon.png</code> と単体HTML出力を組み込み済みです。
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <p className="font-semibold text-violet-300">📱 iPad のホーム画面に追加するとき：</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>19 に GitHub Pages などで公開してもらうか、共有URLを Safari で開きます。</li>
                <li>Safari 右上の <strong>共有マーク（四角から上矢印）</strong> をタップします。</li>
                <li><strong>「ホーム画面に追加」</strong> を選ぶと、iPad の置き時計になります！</li>
              </ol>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              {deferredPrompt && (
                <button
                  type="button"
                  onClick={async () => {
                    await deferredPrompt.prompt();
                    setDeferredPrompt(null);
                    setIsHomeIconModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-400 text-slate-950 hover:bg-sky-300 cursor-pointer"
                >
                  アプリをインストール
                </button>
              )}
              <a
                href={`${import.meta.env.BASE_URL}pwa-512x512.png`}
                download="napier-2718-icon.png"
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 cursor-pointer"
              >
                アイコン画像を保存
              </a>
              <button
                type="button"
                onClick={() => setIsHomeIconModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-violet-300 text-slate-950 hover:bg-violet-200 cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 border border-violet-400/40 text-xs font-medium text-slate-100 shadow-lg backdrop-blur-md"
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
