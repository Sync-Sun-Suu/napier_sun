import React, { useEffect, useRef } from 'react';
import { COLOR_PALETTES, StudioMode, StudioState, TelemetryReadout } from '../types/studio';
import { soundEngine } from '../utils/audio';

interface InteractiveCanvasProps {
  state: StudioState;
  resetSignal: number;
  onTelemetryUpdate: (readout: TelemetryReadout) => void;
  canvasRefOut: React.MutableRefObject<HTMLCanvasElement | null>;
}

interface RippleWave {
  x: number;
  y: number;
  radius: number;
  energy: number;
}

interface GravityWell {
  x: number;
  y: number;
  polarity: 1 | -1;
}

interface OrbitalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  state,
  resetSignal,
  onTelemetryUpdate,
  canvasRefOut,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<StudioState>(state);
  stateRef.current = state;

  // Simulation mutable buffers
  const ripplesRef = useRef<RippleWave[]>([]);
  const harmoTimeRef = useRef<number>(0);
  const harmoNeedsClearRef = useRef<boolean>(true);
  const kaleidoDrawingRef = useRef<{ active: boolean; lastX: number; lastY: number; angleOffset: number; strokeTick: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
    angleOffset: 0,
    strokeTick: 0,
  });
  const kaleidoStarterDrawnRef = useRef<boolean>(false);
  const wellsRef = useRef<GravityWell[]>([]);
  const particlesRef = useRef<OrbitalParticle[]>([]);
  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({ width: 800, height: 560, dpr: 1 });

  // Reset or re-seed when mode, harmonograph params, palette, or resetSignal changes
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

    if (state.mode === StudioMode.Ripples) {
      ripplesRef.current = [
        { x: width * 0.38, y: height * 0.46, radius: 12, energy: 0.95 },
        { x: width * 0.62, y: height * 0.54, radius: 44, energy: 0.82 },
      ];
    } else if (state.mode === StudioMode.Harmonograph) {
      harmoTimeRef.current = 0;
      harmoNeedsClearRef.current = true;
    } else if (state.mode === StudioMode.Kaleidoscope) {
      kaleidoStarterDrawnRef.current = false;
    } else if (state.mode === StudioMode.Gravity) {
      wellsRef.current = [{ x: width / 2, y: height / 2, polarity: 1 }];
      const count = state.gravity.particleCount;
      const spin = state.gravity.initialSpin;
      particlesRef.current = Array.from({ length: count }, (_, idx) => {
        const theta = (idx / count) * Math.PI * 2;
        const r = 65 + ((idx * 37) % 165);
        return {
          x: width / 2 + Math.cos(theta) * r,
          y: height / 2 + Math.sin(theta) * r,
          vx: -Math.sin(theta) * 2.35 * spin,
          vy: Math.cos(theta) * 2.35 * spin,
        };
      });
    }
  }, [
    state.mode,
    state.paletteId,
    resetSignal,
    state.harmonograph.freqX,
    state.harmonograph.freqY,
    state.harmonograph.phaseShift,
    state.harmonograph.damping,
    state.harmonograph.rotaryMix,
    state.gravity.particleCount,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    canvasRefOut.current = canvas;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(340, Math.floor(rect.height));

      sizeRef.current = { width, height, dpr };
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const palette = COLOR_PALETTES.find((p) => p.id === stateRef.current.paletteId) || COLOR_PALETTES[0];
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = palette.canvasBg;
        ctx.fillRect(0, 0, width, height);
      }

      if (stateRef.current.mode === StudioMode.Harmonograph) {
        harmoTimeRef.current = 0;
        harmoNeedsClearRef.current = true;
      } else if (stateRef.current.mode === StudioMode.Kaleidoscope) {
        kaleidoStarterDrawnRef.current = false;
      } else if (stateRef.current.mode === StudioMode.Gravity && wellsRef.current.length === 0) {
        wellsRef.current = [{ x: width / 2, y: height / 2, polarity: 1 }];
      }
    };

    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);

    let animId = 0;
    let frameCount = 0;
    let fpsAccumulator = 0;
    let lastFpsStamp = performance.now();
    let currentFps = 60;

    const drawSubtleAxes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawKaleidoscopeStarter = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      symmetry: number,
      mirror: boolean,
      primary: string,
      secondary: string
    ) => {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      const maxR = Math.min(width, height) * 0.34;
      for (let step = 0; step < 90; step++) {
        const t1 = (step / 90) * Math.PI * 2;
        const t2 = ((step + 1) / 90) * Math.PI * 2;
        const r1 = maxR * (0.28 + 0.62 * Math.sin(t1 * 1.5));
        const r2 = maxR * (0.28 + 0.62 * Math.sin(t2 * 1.5));
        const x1 = Math.cos(t1 * 0.5) * r1;
        const y1 = Math.sin(t1 * 0.8) * r1 * 0.55;
        const x2 = Math.cos(t2 * 0.5) * r2;
        const y2 = Math.sin(t2 * 0.8) * r2 * 0.55;

        ctx.strokeStyle = step % 2 === 0 ? primary : secondary;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.6;

        for (let s = 0; s < symmetry; s++) {
          ctx.save();
          ctx.rotate((Math.PI * 2 * s) / symmetry);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          if (mirror) {
            ctx.scale(1, -1);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      ctx.restore();
    };

    const renderFrame = (now: number) => {
      animId = requestAnimationFrame(renderFrame);
      frameCount++;
      fpsAccumulator++;

      if (now - lastFpsStamp >= 500) {
        currentFps = Math.round((fpsAccumulator * 1000) / (now - lastFpsStamp));
        fpsAccumulator = 0;
        lastFpsStamp = now;

        const st = stateRef.current;
        let activeCount = 0;
        if (st.mode === StudioMode.Ripples) activeCount = ripplesRef.current.length;
        else if (st.mode === StudioMode.Harmonograph) activeCount = Math.floor(harmoTimeRef.current * 10);
        else if (st.mode === StudioMode.Kaleidoscope) activeCount = st.kaleidoscope.symmetry * (st.kaleidoscope.mirror ? 2 : 1);
        else activeCount = wellsRef.current.length;

        onTelemetryUpdate({
          fps: currentFps,
          pointerX: Math.round(pointerPosRef.current.x),
          pointerY: Math.round(pointerPosRef.current.y),
          activeElements: activeCount,
          canvasWidth: sizeRef.current.width,
          canvasHeight: sizeRef.current.height,
        });
      }

      const st = stateRef.current;
      if (!st.isPlaying) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width, height, dpr } = sizeRef.current;
      const palette = COLOR_PALETTES.find((p) => p.id === st.paletteId) || COLOR_PALETTES[0];

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (st.mode === StudioMode.Ripples) {
        ctx.fillStyle = palette.canvasBg;
        ctx.fillRect(0, 0, width, height);
        drawSubtleAxes(ctx, width, height);

        if (st.ripples.autoRain && frameCount % st.ripples.rainInterval === 0) {
          const rx = width * (0.15 + Math.random() * 0.7);
          const ry = height * (0.15 + Math.random() * 0.7);
          ripplesRef.current.push({ x: rx, y: ry, radius: 4, energy: 0.85 });
          soundEngine.playChime(rx / width, ry / height, st.soundEnabled, 220);
        }

        const waves = ripplesRef.current;
        for (let i = waves.length - 1; i >= 0; i--) {
          const w = waves[i];
          w.radius += st.ripples.waveSpeed;
          w.energy *= st.ripples.damping;
          if (w.energy < 0.015) {
            waves.splice(i, 1);
            continue;
          }

          for (let k = 0; k < st.ripples.ringCount; k++) {
            const r = w.radius - k * 18;
            if (r <= 1) continue;
            ctx.beginPath();
            ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = k === 0 ? palette.accent : k % 2 === 1 ? palette.primary : palette.secondary;
            ctx.globalAlpha = Math.min(1, w.energy * (1 - k / (st.ripples.ringCount + 0.6)));
            ctx.lineWidth = k === 0 ? 2.0 : 1.35;
            ctx.stroke();
          }

          // Center droplet highlight when fresh
          if (w.radius < 28) {
            ctx.beginPath();
            ctx.arc(w.x, w.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = palette.accent;
            ctx.globalAlpha = w.energy;
            ctx.fill();
          }
        }

        // Interference node highlights where two wave fronts intersect
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < waves.length; i++) {
          for (let j = i + 1; j < waves.length; j++) {
            const a = waves[i];
            const b = waves[j];
            const d = Math.hypot(b.x - a.x, b.y - a.y);
            if (d > 1 && d < a.radius + b.radius && d > Math.abs(a.radius - b.radius)) {
              const ex = (a.radius * a.radius - b.radius * b.radius + d * d) / (2 * d);
              const hSq = a.radius * a.radius - ex * ex;
              if (hSq > 0) {
                const h = Math.sqrt(hSq);
                const px = a.x + (ex * (b.x - a.x)) / d;
                const py = a.y + (ex * (b.y - a.y)) / d;
                const nx1 = px + (h * (b.y - a.y)) / d;
                const ny1 = py - (h * (b.x - a.x)) / d;
                const nx2 = px - (h * (b.y - a.y)) / d;
                const ny2 = py + (h * (b.x - a.x)) / d;

                ctx.fillStyle = palette.accent;
                ctx.globalAlpha = Math.min(0.85, (a.energy + b.energy) * 0.5);
                ctx.beginPath();
                ctx.arc(nx1, ny1, 2.4, 0, Math.PI * 2);
                ctx.arc(nx2, ny2, 2.4, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
        ctx.globalAlpha = 1;
      } else if (st.mode === StudioMode.Harmonograph) {
        if (harmoNeedsClearRef.current) {
          ctx.fillStyle = palette.canvasBg;
          ctx.fillRect(0, 0, width, height);
          drawSubtleAxes(ctx, width, height);
          harmoNeedsClearRef.current = false;
        }

        const { freqX, freqY, phaseShift, damping, drawSpeed, rotaryMix } = st.harmonograph;
        const maxRadius = Math.min(width, height) * 0.40;

        const evalPoint = (time: number) => {
          const env = Math.exp(-damping * time);
          const R = maxRadius * env;
          const x =
            width / 2 +
            R * ((1 - rotaryMix) * Math.sin(freqX * time + phaseShift) + rotaryMix * Math.cos((freqX + 1) * time));
          const y =
            height / 2 +
            R * ((1 - rotaryMix) * Math.sin(freqY * time) + rotaryMix * Math.sin((freqY + 1) * time));
          return { x, y, env };
        };

        const steps = drawSpeed * 8;
        for (let s = 0; s < steps; s++) {
          const p1 = evalPoint(harmoTimeRef.current);
          harmoTimeRef.current += 0.011;
          const p2 = evalPoint(harmoTimeRef.current);
          if (p2.env <= 0.015) break;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = Math.sin(harmoTimeRef.current * 0.35) >= 0 ? palette.primary : palette.secondary;
          ctx.globalAlpha = 0.62 * p2.env;
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (st.mode === StudioMode.Kaleidoscope) {
        if (!kaleidoStarterDrawnRef.current) {
          ctx.fillStyle = palette.canvasBg;
          ctx.fillRect(0, 0, width, height);
          drawSubtleAxes(ctx, width, height);
          drawKaleidoscopeStarter(
            ctx,
            width,
            height,
            st.kaleidoscope.symmetry,
            st.kaleidoscope.mirror,
            palette.primary,
            palette.secondary
          );
          kaleidoStarterDrawnRef.current = true;
        }
        if (st.kaleidoscope.autoRotate > 0) {
          kaleidoDrawingRef.current.angleOffset += (st.kaleidoscope.autoRotate * Math.PI) / 180;
        }
      } else if (st.mode === StudioMode.Gravity) {
        ctx.fillStyle = palette.canvasBg;
        ctx.globalAlpha = st.gravity.trailFade;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;

        const wells = wellsRef.current;
        const particles = particlesRef.current;

        // Draw subtle gravity well rings
        for (const well of wells) {
          ctx.beginPath();
          ctx.arc(well.x, well.y, 7, 0, Math.PI * 2);
          ctx.strokeStyle = well.polarity > 0 ? palette.accent : '#fb7185';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(well.x, well.y, 16, 0, Math.PI * 2);
          ctx.strokeStyle = well.polarity > 0 ? palette.primary : '#fb7185';
          ctx.globalAlpha = 0.28;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const prevX = p.x;
          const prevY = p.y;

          for (let w = 0; w < wells.length; w++) {
            const well = wells[w];
            const dx = well.x - p.x;
            const dy = well.y - p.y;
            const distSq = Math.max(260, dx * dx + dy * dy);
            const dist = Math.sqrt(distSq);
            const force = (st.gravity.gravityStrength * well.polarity) / distSq;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }

          p.vx *= 0.996;
          p.vy *= 0.996;
          p.x += p.vx;
          p.y += p.vy;

          // Soft boundary wrap/reflect so particles remain visible
          if (p.x < -40 || p.x > width + 40 || p.y < -40 || p.y > height + 40) {
            const theta = Math.random() * Math.PI * 2;
            p.x = width / 2 + Math.cos(theta) * 120;
            p.y = height / 2 + Math.sin(theta) * 120;
            p.vx = -Math.sin(theta) * 2.1 * st.gravity.initialSpin;
            p.vy = Math.cos(theta) * 2.1 * st.gravity.initialSpin;
            continue;
          }

          const speed = Math.hypot(p.vx, p.vy);
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = speed > 3.4 ? palette.accent : speed > 2.1 ? palette.primary : palette.secondary;
          ctx.globalAlpha = 0.82;
          ctx.lineWidth = 1.35;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    };

    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [canvasRefOut, onTelemetryUpdate]);

  const getLocalCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getLocalCoords(e);
    pointerPosRef.current = { x, y };
    const { width, height } = sizeRef.current;

    soundEngine.playChime(x / width, y / height, state.soundEnabled, 60);

    if (state.mode === StudioMode.Ripples) {
      ripplesRef.current.push({ x, y, radius: 3, energy: 1.0 });
    } else if (state.mode === StudioMode.Harmonograph) {
      // Re-trigger harmonograph with pointer-modulated phase hint
      harmoTimeRef.current = 0;
      harmoNeedsClearRef.current = true;
    } else if (state.mode === StudioMode.Kaleidoscope) {
      kaleidoDrawingRef.current.active = true;
      kaleidoDrawingRef.current.lastX = x - width / 2;
      kaleidoDrawingRef.current.lastY = y - height / 2;
    } else if (state.mode === StudioMode.Gravity) {
      const polarity: 1 | -1 = e.shiftKey || e.button === 2 ? -1 : 1;
      wellsRef.current.push({ x, y, polarity });
      if (wellsRef.current.length > 5) {
        wellsRef.current.shift();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getLocalCoords(e);
    pointerPosRef.current = { x, y };
    const { width, height, dpr } = sizeRef.current;

    if (state.mode === StudioMode.Ripples && e.buttons === 1) {
      const last = ripplesRef.current[ripplesRef.current.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 26) {
        ripplesRef.current.push({ x, y, radius: 3, energy: 0.85 });
        soundEngine.playChime(x / width, y / height, state.soundEnabled, 120);
      }
    } else if (state.mode === StudioMode.Kaleidoscope && kaleidoDrawingRef.current.active) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const palette = COLOR_PALETTES.find((p) => p.id === state.paletteId) || COLOR_PALETTES[0];
      const relX = x - width / 2;
      const relY = y - height / 2;
      const { lastX, lastY, angleOffset } = kaleidoDrawingRef.current;
      kaleidoDrawingRef.current.strokeTick += 0.08;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(width / 2, height / 2);
      ctx.rotate(angleOffset);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = state.kaleidoscope.brushSize;

      const colorMix = Math.sin(kaleidoDrawingRef.current.strokeTick);
      const strokeColor = colorMix > 0.3 ? palette.primary : colorMix > -0.4 ? palette.secondary : palette.accent;
      ctx.strokeStyle = strokeColor;

      if (state.kaleidoscope.glowStrength > 0) {
        ctx.shadowColor = palette.primary;
        ctx.shadowBlur = state.kaleidoscope.glowStrength;
      }

      const sym = state.kaleidoscope.symmetry;
      for (let i = 0; i < sym; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / sym);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(relX, relY);
        ctx.stroke();

        if (state.kaleidoscope.mirror) {
          ctx.scale(1, -1);
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(relX, relY);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();

      kaleidoDrawingRef.current.lastX = relX;
      kaleidoDrawingRef.current.lastY = relY;

      if (Math.hypot(relX - lastX, relY - lastY) > 18) {
        soundEngine.playChime(x / width, y / height, state.soundEnabled, 140);
      }
    }
  };

  const handlePointerUp = () => {
    kaleidoDrawingRef.current.active = false;
  };

  const instructionMap: Record<StudioMode, string> = {
    [StudioMode.Ripples]: 'キャンバスをクリック・ドラッグすると波紋と五音音階が広がります（波同士の交点が白く干渉します）',
    [StudioMode.Harmonograph]: '2つの減衰振り子の合成軌跡をリアルタイム描画中（クリックで最初から再描画）',
    [StudioMode.Kaleidoscope]: 'キャンバス上をドラッグして回転対称の幾何学模様を自由に描けます',
    [StudioMode.Gravity]: 'クリックで新しい重力源（最大5点）を配置・Shift+クリックで斥力源を配置します',
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[440px] lg:min-h-[600px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 select-none"
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

      {/* Quiet bottom-left contextual guide overlay */}
      <div className="pointer-events-none absolute left-4 bottom-4 right-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300/90 bg-slate-950/75 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-800/80">
        <span>{instructionMap[state.mode]}</span>
        <span className="font-mono tabular-nums text-slate-400">
          HTML5 &lt;canvas&gt; 2D + Web Audio
        </span>
      </div>
    </div>
  );
};
