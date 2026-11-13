import React, { useEffect, useRef, useState } from 'react';
import { COLOR_PALETTES, NapierClockState } from '../types/studio';
import { soundEngine } from '../utils/audio';

interface InteractiveCanvasProps {
  state: NapierClockState;
  resetSignal: number;
  uiHidden: boolean;
  onToggleUiHidden: () => void;
  canvasRefOut: React.MutableRefObject<HTMLCanvasElement | null>;
}

interface NapierParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  theta: number;
  size: number;
  luminescence: number;
  swaySeed: number;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  state,
  resetSignal,
  uiHidden,
  onToggleUiHidden,
  canvasRefOut,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<NapierClockState>(state);
  stateRef.current = state;

  // High-precision clock state (updates every 50ms for smooth 60s orbital ring)
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  const lastChimeMinuteRef = useRef<number>(-1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const d = new Date();
      setNowDate(d);
      const st = stateRef.current;
      if (
        st.soundEnabled &&
        st.autoChime &&
        d.getSeconds() === 0 &&
        lastChimeMinuteRef.current !== d.getMinutes()
      ) {
        lastChimeMinuteRef.current = d.getMinutes();
        soundEngine.playClockBell(true, false);
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, []);

  // Sync audio parameters
  useEffect(() => {
    soundEngine.setReverbDepth(state.reverbDepth);
  }, [state.reverbDepth]);

  useEffect(() => {
    soundEngine.setBonfireWarmth(state.bonfireWarmth);
  }, [state.bonfireWarmth]);

  useEffect(() => {
    const shouldPlayDrone = state.soundEnabled && state.isPlaying && state.harmonicDrone;
    soundEngine.setDeepDrone(shouldPlayDrone);
    return () => {
      soundEngine.setDeepDrone(false);
    };
  }, [state.soundEnabled, state.isPlaying, state.harmonicDrone]);

  useEffect(() => {
    const shouldPlayBonfire = state.soundEnabled && state.isPlaying && state.bonfireSound;
    soundEngine.setBonfireSound(shouldPlayBonfire);
    return () => {
      soundEngine.setBonfireSound(false);
    };
  }, [state.soundEnabled, state.isPlaying, state.bonfireSound]);

  // Simulation mutable buffers
  const napierParticlesRef = useRef<NapierParticle[]>([]);
  const napierPhaseRef = useRef<number>(0);
  const pointerActiveRef = useRef<boolean>(false);
  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 800,
    height: 600,
    dpr: 1,
  });

  // Seed particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, dpr } = sizeRef.current;
    const palette = COLOR_PALETTES.find((p) => p.id === state.paletteId) || COLOR_PALETTES[0];

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = palette.canvasBg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const count = 155;
    napierParticlesRef.current = Array.from({ length: count }, (_, i) => {
      const theta = (i / count) * Math.PI * 6;
      const r = 16 * Math.exp(state.spiralExponent * (theta % (Math.PI * 3.8)));
      return {
        x: width / 2 + Math.cos(theta) * r + (Math.random() - 0.5) * 45,
        y: height * 0.52 + Math.sin(theta) * r + (Math.random() - 0.5) * 45,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.35 - Math.random() * 0.65,
        theta,
        size: 1.35 + (i % 4) * 0.65,
        luminescence: 0.5 + Math.random() * 0.5,
        swaySeed: Math.random() * Math.PI * 2,
      };
    });
  }, [state.paletteId, resetSignal, state.spiralExponent]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    canvasRefOut.current = canvas;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(360, Math.floor(rect.height));

      sizeRef.current = { width, height, dpr };
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      if (pointerPosRef.current.x === 0 && pointerPosRef.current.y === 0) {
        pointerPosRef.current = { x: Math.round(width / 2), y: Math.round(height / 2) };
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const palette =
          COLOR_PALETTES.find((p) => p.id === stateRef.current.paletteId) || COLOR_PALETTES[0];
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = palette.canvasBg;
        ctx.fillRect(0, 0, width, height);
      }
    };

    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);

    let animId = 0;
    let frameCount = 0;

    const renderFrame = (now: number) => {
      animId = requestAnimationFrame(renderFrame);
      frameCount++;

      const st = stateRef.current;
      if (!st.isPlaying) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width, height, dpr } = sizeRef.current;
      const palette = COLOR_PALETTES.find((p) => p.id === st.paletteId) || COLOR_PALETTES[0];

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Velvet trail fade for deep abyssal bonfire texture
      ctx.fillStyle = palette.canvasBg;
      ctx.globalAlpha = 0.14;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      const cx = width / 2;
      const cy = height * 0.52;
      const { spiralExponent, antiGravityLift, filamentWeb, tactileGrain, bonfireSway } = st;
      napierPhaseRef.current += 0.013 * (antiGravityLift / 0.85);
      const phase = napierPhaseRef.current;
      const tSec = now / 1000;

      // 1/f Pink-Noise-like harmonic wind sway for Bonfire feel
      const windSway = bonfireSway
        ? Math.sin(tSec * 1.1) * 0.55 +
          Math.sin(tSec * Math.E) * 0.3 +
          Math.cos(tSec * 4.3) * 0.15
        : 0;

      // 2.718s breathing pulse
      const breath =
        0.88 +
        0.12 * Math.sin(tSec * ((Math.PI * 2) / Math.E)) +
        (bonfireSway ? 0.05 * Math.sin(tSec * 6.2) : 0);

      // 1. Draw the Logarithmic Spiral of e: r(theta) = a * e^(b * theta) with gentle flame sway
      const armCount = 2;
      const maxTheta = Math.PI * 5.2;
      const baseScale = Math.min(width, height) * 0.022 * breath;

      for (let arm = 0; arm < armCount; arm++) {
        const armOffset = arm * Math.PI;
        ctx.beginPath();
        for (let step = 0; step <= 165; step++) {
          const theta = (step / 165) * maxTheta;
          const r = baseScale * Math.exp(spiralExponent * theta);
          if (r > Math.max(width, height) * 0.65) break;
          const angle = theta - phase * 0.75 + armOffset;
          const heightFactor = r / (Math.min(width, height) * 0.45);
          const swayOffsetX = bonfireSway
            ? windSway * 18 * heightFactor * Math.sin(theta * 0.7 + tSec * 2)
            : 0;
          const swayOffsetY = bonfireSway ? -Math.abs(heightFactor) * 14 : 0;

          const sx = cx + Math.cos(angle) * r + swayOffsetX;
          const sy = cy + Math.sin(angle) * r + swayOffsetY;
          if (step === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = arm === 0 ? palette.primary : palette.secondary;
        ctx.globalAlpha = 0.34 + tactileGrain * 0.2;
        ctx.lineWidth = arm === 0 ? 1.75 : 1.15;
        ctx.stroke();
      }

      // Warm flickering hearth core (Napier Sun / Bonfire Heart)
      const coreRadius = (bonfireSway ? 82 : 68) * breath;
      const coreGrad = ctx.createRadialGradient(
        cx + windSway * 4,
        cy - 4,
        2,
        cx,
        cy,
        coreRadius
      );
      coreGrad.addColorStop(0, palette.accent);
      coreGrad.addColorStop(0.32, palette.primary);
      coreGrad.addColorStop(0.7, palette.secondary);
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.globalAlpha = bonfireSway ? 0.26 : 0.22;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Update & render Anti-Gravity Bonfire Embers
      const embers = napierParticlesRef.current;
      const px = pointerPosRef.current.x;
      const py = pointerPosRef.current.y;

      for (let i = 0; i < embers.length; i++) {
        const p = embers[i];
        const prevX = p.x;
        const prevY = p.y;

        const dxCenter = p.x - cx;
        const dyCenter = p.y - cy;
        const distCenter = Math.max(12, Math.hypot(dxCenter, dyCenter));
        const angleCenter = Math.atan2(dyCenter, dxCenter);

        const tangentAngle = angleCenter + Math.PI / 2 - spiralExponent * 0.65;
        const spiralForce = 0.048 * antiGravityLift;

        const emberSway = bonfireSway
          ? Math.sin(tSec * 2.4 + p.swaySeed) * 0.032 + windSway * 0.022
          : 0;

        p.vx += Math.cos(tangentAngle) * spiralForce + emberSway;
        p.vy += Math.sin(tangentAngle) * spiralForce - 0.034 * antiGravityLift;

        // Tactile pointer resonance
        const dxPtr = px - p.x;
        const dyPtr = py - p.y;
        const distPtr = Math.hypot(dxPtr, dyPtr);
        const interactionRadius = pointerActiveRef.current ? 220 : 145;

        if (distPtr > 4 && distPtr < interactionRadius) {
          const factor =
            (1 - distPtr / interactionRadius) * (pointerActiveRef.current ? 0.32 : 0.11);
          p.vx += (-dyPtr / distPtr) * factor + (dxPtr / distPtr) * factor * 0.45;
          p.vy +=
            (dxPtr / distPtr) * factor +
            (dyPtr / distPtr) * factor * 0.45 -
            0.05 * antiGravityLift;
        }

        p.vx *= 0.968;
        p.vy *= 0.968;
        p.x += p.vx;
        p.y += p.vy;

        if (
          p.y < -30 ||
          p.y > height + 30 ||
          p.x < -30 ||
          p.x > width + 30 ||
          distCenter > Math.max(width, height) * 0.62
        ) {
          const spawnTheta = Math.random() * Math.PI * 2;
          const spawnR = 6 + Math.random() * 44;
          p.x = cx + Math.cos(spawnTheta) * spawnR;
          p.y = cy + Math.sin(spawnTheta) * spawnR + 14;
          p.vx = -Math.sin(spawnTheta) * 0.75 + windSway * 0.3;
          p.vy = -0.38 * antiGravityLift;
          continue;
        }

        const flicker = bonfireSway
          ? 0.75 + 0.25 * Math.sin(tSec * 7.5 + p.swaySeed * 3)
          : 1.0;

        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle =
          i % 3 === 0 ? palette.accent : i % 2 === 0 ? palette.primary : palette.secondary;
        ctx.globalAlpha = 0.82 * p.luminescence * flicker;
        ctx.lineWidth = p.size;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.95, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? palette.accent : palette.primary;
        ctx.globalAlpha = 0.9 * p.luminescence * flicker;
        ctx.fill();
      }

      // 3. Deep Filament Web
      if (filamentWeb > 0) {
        ctx.lineWidth = 0.75;
        for (let i = 0; i < embers.length; i++) {
          const a = embers[i];
          for (let j = i + 1; j < embers.length; j++) {
            const b = embers[j];
            const d = Math.hypot(b.x - a.x, b.y - a.y);
            if (d < filamentWeb) {
              const alpha = (1 - d / filamentWeb) * 0.32;
              ctx.strokeStyle = (i + j) % 2 === 0 ? palette.primary : palette.secondary;
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      // 4. Tactile Micro-Grain Shimmer Layer (質感)
      if (tactileGrain > 0.05) {
        const grainCount = Math.floor(45 * tactileGrain);
        ctx.fillStyle = palette.accent;
        for (let g = 0; g < grainCount; g++) {
          const gx = (frameCount * 73 + g * 197) % width;
          const gy = (frameCount * 41 + g * 131) % height;
          ctx.globalAlpha = 0.06 * tactileGrain;
          ctx.fillRect(gx, gy, 1.25, 1.25);
        }
      }

      ctx.globalAlpha = 1;
    };

    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [canvasRefOut]);

  const getLocalCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    soundEngine.unlockAudio();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getLocalCoords(e);
    pointerPosRef.current = { x, y };
    pointerActiveRef.current = true;
    const { width, height } = sizeRef.current;

    soundEngine.playNapierResonance(x / width, y / height, state.soundEnabled, 65);
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      napierParticlesRef.current.push({
        x: x + Math.cos(angle) * 6,
        y: y + Math.sin(angle) * 6,
        vx: Math.cos(angle) * 1.4,
        vy: Math.sin(angle) * 1.4 - 0.85 * state.antiGravityLift,
        theta: angle,
        size: 2.2,
        luminescence: 1.0,
        swaySeed: Math.random() * Math.PI * 2,
      });
    }
    if (napierParticlesRef.current.length > 200) {
      napierParticlesRef.current.splice(0, 8);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getLocalCoords(e);
    pointerPosRef.current = { x, y };
    const { width, height } = sizeRef.current;

    if (e.buttons === 1) {
      soundEngine.playNapierResonance(x / width, y / height, state.soundEnabled, 130);
    }
  };

  const handlePointerUp = () => {
    pointerActiveRef.current = false;
  };

  const palette = COLOR_PALETTES.find((p) => p.id === state.paletteId) || COLOR_PALETTES[0];

  // Format Clock & Smooth 60s Progress
  const hours = String(nowDate.getHours()).padStart(2, '0');
  const minutes = String(nowDate.getMinutes()).padStart(2, '0');
  const seconds = String(nowDate.getSeconds()).padStart(2, '0');
  const smoothSecRatio = (nowDate.getSeconds() + nowDate.getMilliseconds() / 1000) / 60;
  const dateStr = `${nowDate.getFullYear()}.${String(nowDate.getMonth() + 1).padStart(2, '0')}.${String(nowDate.getDate()).padStart(2, '0')}`;
  const dayStr = WEEKDAYS[nowDate.getDay()];

  // 27:18 Focus Timer formatting
  const timerMin = String(Math.floor(state.timerRemainingSec / 60)).padStart(2, '0');
  const timerSec = String(state.timerRemainingSec % 60).padStart(2, '0');
  const timerProgress =
    state.timerTotalSec > 0
      ? (state.timerTotalSec - state.timerRemainingSec) / state.timerTotalSec
      : 0;

  // Font family selection for the timepiece
  const clockFontClass =
    state.clockFont === 'serif'
      ? "font-['Cormorant_Garamond','Shippori_Mincho',serif] tracking-normal"
      : state.clockFont === 'mono'
      ? 'font-mono tracking-tight'
      : 'font-display tracking-tight';

  // Position classes for clock
  const positionWrapperClass =
    state.clockPosition === 'center'
      ? 'inset-0 flex items-center justify-center'
      : state.clockPosition === 'top'
      ? 'inset-x-0 top-14 sm:top-16 flex justify-center'
      : 'right-8 bottom-24 flex items-end justify-end';

  // SVG Ring geometry
  const ringSize = 310;
  const ringCenter = ringSize / 2;
  const ringRadius = 136;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const secDashOffset = ringCircumference * (1 - smoothSecRatio);

  // Second hand orbiting pearl dot
  const secAngleRad = smoothSecRatio * Math.PI * 2 - Math.PI / 2;
  const dotX = ringCenter + Math.cos(secAngleRad) * ringRadius;
  const dotY = ringCenter + Math.sin(secAngleRad) * ringRadius;

  return (
    <div
      ref={containerRef}
      onDoubleClick={onToggleUiHidden}
      className="relative w-full h-full overflow-hidden bg-[#060913] select-none"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className="block w-full h-full cursor-crosshair touch-none"
      />

      {/* Architectural Timepiece Overlay (Analog Orbital Ring + Digital Numerals) */}
      <div className={`pointer-events-none absolute ${positionWrapperClass} p-6`}>
        <div
          className="relative flex flex-col items-center justify-center rounded-full transition-all duration-300"
          style={{
            width: state.showAnalogRing ? `${ringSize}px` : 'auto',
            height: state.showAnalogRing ? `${ringSize}px` : 'auto',
            padding: state.showAnalogRing ? '0px' : '24px 36px',
            backgroundColor: `rgba(6, 9, 19, ${state.glassFrost})`,
            backdropFilter: state.glassFrost > 0.04 ? `blur(${Math.round(state.glassFrost * 18)}px)` : 'none',
            border:
              state.glassFrost > 0.05
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid transparent',
            boxShadow:
              state.glassFrost > 0.1
                ? `0 12px 48px -12px rgba(0, 0, 0, 0.6), 0 0 40px -10px ${palette.primary}18`
                : 'none',
          }}
        >
          {/* 60-Second Analog Orbital Ring SVG */}
          {state.showAnalogRing && (
            <svg
              width={ringSize}
              height={ringSize}
              viewBox={`0 0 ${ringSize} ${ringSize}`}
              className="absolute inset-0 pointer-events-none"
            >
              {/* 12 Subtle Hour Marks */}
              {Array.from({ length: 12 }).map((_, idx) => {
                const a = (idx / 12) * Math.PI * 2 - Math.PI / 2;
                const x1 = ringCenter + Math.cos(a) * (ringRadius - 7);
                const y1 = ringCenter + Math.sin(a) * (ringRadius - 7);
                const x2 = ringCenter + Math.cos(a) * (ringRadius - 2);
                const y2 = ringCenter + Math.sin(a) * (ringRadius - 2);
                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={idx % 3 === 0 ? 1.6 : 1}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Background Track Circle */}
              <circle
                cx={ringCenter}
                cy={ringCenter}
                r={ringRadius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.07)"
                strokeWidth="1.25"
              />

              {/* Smooth 60-Second Progress Arc */}
              <circle
                cx={ringCenter}
                cy={ringCenter}
                r={ringRadius}
                fill="none"
                stroke={palette.primary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={secDashOffset}
                transform={`rotate(-90 ${ringCenter} ${ringCenter})`}
                style={{ opacity: 0.78 }}
              />

              {/* Orbiting Second Pearl Dot */}
              <circle
                cx={dotX}
                cy={dotY}
                r="3.5"
                fill={palette.accent}
                style={{
                  filter: `drop-shadow(0 0 8px ${palette.primary})`,
                }}
              />

              {/* Inner 27:18 Focus Timer Ring when active */}
              {state.timerActive && (
                <circle
                  cx={ringCenter}
                  cy={ringCenter}
                  r={ringRadius - 12}
                  fill="none"
                  stroke={palette.secondary}
                  strokeWidth="1.5"
                  strokeDasharray={2 * Math.PI * (ringRadius - 12)}
                  strokeDashoffset={2 * Math.PI * (ringRadius - 12) * (1 - timerProgress)}
                  transform={`rotate(-90 ${ringCenter} ${ringCenter})`}
                  strokeLinecap="round"
                  style={{ opacity: 0.85 }}
                />
              )}
            </svg>
          )}

          {/* Date & e=2.718 Kicker */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono tracking-[0.22em] text-slate-300/85">
            <span>{dateStr}</span>
            <span aria-hidden="true">·</span>
            <span style={{ color: palette.primary }}>{dayStr}</span>
          </div>

          {/* Primary HH:MM + :SS Display */}
          <div
            className={`mt-1 flex items-baseline justify-center gap-1.5 tabular-nums ${clockFontClass}`}
          >
            <span
              className="text-6xl sm:text-7xl font-semibold text-white/95"
              style={{
                textShadow: `0 2px 28px ${palette.primary}38`,
              }}
            >
              {hours}:{minutes}
            </span>
            <span
              className="text-lg sm:text-xl font-mono w-[2.4ch] text-left"
              style={{ color: palette.primary }}
            >
              :{seconds}
            </span>
          </div>

          {/* Subtle e-Formula or Active 27:18 Focus Timer Readout */}
          {state.timerActive ? (
            <div className="mt-2.5 flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-900/70 border border-white/10 text-xs font-mono tabular-nums text-sky-300">
              <span>2.718 TIMER</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-white">
                {timerMin}:{timerSec}
              </span>
            </div>
          ) : (
            <div className="mt-2 text-[11px] font-mono tracking-widest text-slate-400/80">
              e ≈ 2.718 · b={state.spiralExponent.toFixed(3)} · {state.antiGravityLift.toFixed(2)}G
            </div>
          )}
        </div>
      </div>

      {/* Subtle hint when UI is completely hidden for iPad ambient display */}
      {uiHidden && (
        <button
          type="button"
          onClick={onToggleUiHidden}
          className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-900/80 text-[11px] text-slate-400 hover:text-slate-200 border border-white/5 transition-colors cursor-pointer"
        >
          メニューを表示
        </button>
      )}
    </div>
  );
};
