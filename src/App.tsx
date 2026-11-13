/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  EyeOff,
  Flame,
  Maximize,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import { ControlDeck } from './components/ControlDeck';
import { HtmlSourceModal } from './components/HtmlSourceModal';
import { InteractiveCanvas } from './components/InteractiveCanvas';
import {
  NAPIER_TIMER_SECONDS,
  NapierClockState,
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

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  }, []);

  // Capture PWA beforeinstallprompt if available
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Request Screen Wake Lock on iPad/Desktop so screen stays on gracefully
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
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'napier-2718-clock.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('napier-2718-clock.html を保存しました');
  }, [standaloneHtml, showToast]);

  const handleSavePng = useCallback(() => {
    const canvas = canvasElementRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'napier-2718-clock.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('napier-2718-clock.png を保存しました');
  }, [showToast]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        setUiHidden(true);
        showToast('時計のみの常時表示ビューに切り替えました');
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, [showToast]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060913] text-slate-100 flex flex-col">
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
            Napier 2.718 Clock
          </a>

          {/* Zone 2: Quick Style Switcher Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300/85 pointer-events-auto">
            <a
              href="#sans"
              onClick={(e) => {
                e.preventDefault();
                setClockState((p) => ({ ...p, clockFont: 'sans' }));
              }}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
                clockState.clockFont === 'sans' ? 'text-amber-300 underline underline-offset-4' : ''
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
                clockState.clockFont === 'serif' ? 'text-amber-300 underline underline-offset-4' : ''
              }`}
            >
              映画・灯台セリフ体
            </a>
            <a
              href="#mono"
              onClick={(e) => {
                e.preventDefault();
                setClockState((p) => ({ ...p, clockFont: 'mono' }));
              }}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${
                clockState.clockFont === 'mono' ? 'text-amber-300 underline underline-offset-4' : ''
              }`}
            >
              数理モノスペース
            </a>
            <a
              href="#icon"
              onClick={(e) => {
                e.preventDefault();
                setIsHomeIconModalOpen(true);
              }}
              className="transition-colors whitespace-nowrap shrink-0 hover:text-white"
            >
              ホームアイコン
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
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-300 rounded-lg hover:bg-amber-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>時計HTMLを保存</span>
            </button>
          </div>
        </header>
      )}

      {/* Full-Viewport 2.718 Bonfire & Logarithmic Spiral Clock Stage */}
      <main className="w-full h-full flex-1">
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
      </main>

      {/* Sleek Bottom Floating Ambient Dock (Hides completely for iPad always-on display) */}
      {!uiHidden && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-950/75 border border-white/10 backdrop-blur-xl shadow-2xl max-w-[95vw] overflow-x-auto">
          {/* 1. Bonfire Crackle Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine.unlockAudio();
              setClockState((p) => ({
                ...p,
                soundEnabled: true,
                bonfireSound: !p.bonfireSound,
              }));
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              clockState.bonfireSound
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{clockState.bonfireSound ? '焚き火音: ON' : '焚き火音を鳴らす'}</span>
          </button>

          {/* 2. Reverb Chime Preview */}
          <button
            type="button"
            onClick={() => {
              soundEngine.unlockAudio();
              soundEngine.playClockBell(true, false);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900/80 text-slate-300 hover:text-amber-200 border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>残響チャイム</span>
          </button>

          {/* 3. 27:18 Focus Timer Quick Button */}
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

          {/* 4. Settings Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isDrawerOpen
                ? 'bg-slate-800 text-amber-300 border-amber-400/50'
                : 'bg-slate-900/80 text-slate-200 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>質感・音の調整</span>
          </button>

          {/* 5. Home Screen Icon & Install Guide */}
          <button
            type="button"
            onClick={() => setIsHomeIconModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900/80 text-amber-200 hover:text-white border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-300" />
            <span>ホームアイコン</span>
          </button>

          {/* 6. Pure Clock View (Hide UI for iPad Always-On) */}
          <button
            type="button"
            onClick={() => {
              setUiHidden(true);
              setIsDrawerOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="ボタンを隠して時計だけにする（ダブルタップでも切替可能）"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>時計のみ表示</span>
          </button>

          {/* 7. Fullscreen */}
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

            {/* Icon Preview Card */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <img
                src={`${import.meta.env.BASE_URL}apple-touch-icon.png`}
                alt="2.718 焚き火時計 ホームアイコン"
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl shadow-lg border border-white/10 shrink-0"
              />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white">2.718 時計</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  iPadOS / iOS 用の <code className="text-amber-300 font-mono">apple-touch-icon.png</code> と <code className="text-amber-300 font-mono">icon.svg</code>、PWA マニフェストをすべて組み込み済みです。
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <p className="font-semibold text-amber-300">📱 iPad のホーム画面に追加するとき：</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>19 に GitHub Pages などで公開してもらうか、共有URLを Safari で開きます。</li>
                <li>Safari 右上の <strong>共有マーク（四角から上矢印）</strong> をタップします。</li>
                <li><strong>「ホーム画面に追加」</strong> を選ぶと、上のアイコンでホーム画面に並びます！</li>
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
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-300 text-slate-950 hover:bg-amber-200 cursor-pointer"
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
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 border border-amber-400/40 text-xs font-medium text-slate-100 shadow-lg backdrop-blur-md"
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
