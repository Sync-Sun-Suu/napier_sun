import { COLOR_PALETTES, StudioMode, StudioState } from '../types/studio';

export function generateStandaloneHtml(state: StudioState): string {
  const palette = COLOR_PALETTES.find((p) => p.id === state.paletteId) || COLOR_PALETTES[0];

  const modeTitleMap: Record<StudioMode, string> = {
    [StudioMode.Ripples]: '波紋と五音音階 (HTML5 Ripples & Web Audio)',
    [StudioMode.Harmonograph]: '振り子ハーモノグラフ (HTML5 Pendulum Harmonograph)',
    [StudioMode.Kaleidoscope]: '万華鏡ドローイング (HTML5 Kaleidoscope)',
    [StudioMode.Gravity]: '重力軌道パーティクル (HTML5 Orbital Gravity)',
  };

  const title = modeTitleMap[state.mode];

  let scriptBody = '';

  if (state.mode === StudioMode.Ripples) {
    scriptBody = `
      const ripples = [];
      const SPEED = ${state.ripples.waveSpeed};
      const DAMPING = ${state.ripples.damping};
      const RINGS = ${state.ripples.ringCount};
      const AUTO_RAIN = ${state.ripples.autoRain};
      const RAIN_INTERVAL = ${state.ripples.rainInterval};
      let frame = 0;

      const PENTATONIC = [293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25, 783.99];
      let audioCtx = null;
      function playNote(nx) {
        try {
          if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          if (audioCtx.state === 'suspended') audioCtx.resume();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const freq = PENTATONIC[Math.floor(nx * PENTATONIC.length) % PENTATONIC.length];
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.1);
          osc.connect(gain).connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 1.15);
        } catch (e) {}
      }

      function spawnRipple(x, y, sound = true) {
        ripples.push({ x, y, r: 2, energy: 1.0 });
        if (sound) playNote(Math.max(0, Math.min(0.99, x / width)));
      }

      canvas.addEventListener('pointerdown', (e) => {
        spawnRipple(e.clientX, e.clientY, true);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (e.buttons === 1 && frame % 5 === 0) spawnRipple(e.clientX, e.clientY, true);
      });

      spawnRipple(window.innerWidth * 0.5, window.innerHeight * 0.5, false);

      function loop() {
        frame++;
        ctx.fillStyle = '${palette.canvasBg}';
        ctx.fillRect(0, 0, width, height);

        if (AUTO_RAIN && frame % RAIN_INTERVAL === 0) {
          spawnRipple(Math.random() * width, Math.random() * height, false);
        }

        for (let i = ripples.length - 1; i >= 0; i--) {
          const w = ripples[i];
          w.r += SPEED;
          w.energy *= DAMPING;
          if (w.energy < 0.015) {
            ripples.splice(i, 1);
            continue;
          }
          for (let k = 0; k < RINGS; k++) {
            const radius = w.r - k * 16;
            if (radius <= 0) continue;
            ctx.beginPath();
            ctx.arc(w.x, w.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = k % 2 === 0 ? '${palette.primary}' : '${palette.secondary}';
            ctx.globalAlpha = w.energy * (1 - k / (RINGS + 1));
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(loop);
      }
      loop();
    `;
  } else if (state.mode === StudioMode.Harmonograph) {
    scriptBody = `
      let t = 0;
      const FX = ${state.harmonograph.freqX};
      const FY = ${state.harmonograph.freqY};
      let phase = ${state.harmonograph.phaseShift};
      const DAMP = ${state.harmonograph.damping};
      const SPEED = ${state.harmonograph.drawSpeed};
      const ROTARY = ${state.harmonograph.rotaryMix};

      function clearStage() {
        ctx.fillStyle = '${palette.canvasBg}';
        ctx.fillRect(0, 0, width, height);
        t = 0;
      }
      clearStage();

      canvas.addEventListener('pointerdown', (e) => {
        phase = (e.clientX / width) * Math.PI * 2;
        clearStage();
      });

      function samplePoint(time) {
        const env = Math.exp(-DAMP * time);
        const R = Math.min(width, height) * 0.38 * env;
        const x = width / 2 + R * ((1 - ROTARY) * Math.sin(FX * time + phase) + ROTARY * Math.cos((FX + 1) * time));
        const y = height / 2 + R * ((1 - ROTARY) * Math.sin(FY * time) + ROTARY * Math.sin((FY + 1) * time));
        return { x, y, env };
      }

      function loop() {
        for (let i = 0; i < SPEED * 6; i++) {
          const p1 = samplePoint(t);
          t += 0.012;
          const p2 = samplePoint(t);
          if (p2.env > 0.02) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = Math.sin(t * 0.5) > 0 ? '${palette.primary}' : '${palette.secondary}';
            ctx.globalAlpha = 0.65 * p2.env;
            ctx.lineWidth = 1.3;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(loop);
      }
      loop();
    `;
  } else if (state.mode === StudioMode.Kaleidoscope) {
    scriptBody = `
      const SYMMETRY = ${state.kaleidoscope.symmetry};
      const MIRROR = ${state.kaleidoscope.mirror};
      const BRUSH = ${state.kaleidoscope.brushSize};
      let drawing = false;
      let lastX = 0, lastY = 0;
      let hueTick = 0;

      ctx.fillStyle = '${palette.canvasBg}';
      ctx.fillRect(0, 0, width, height);

      canvas.addEventListener('pointerdown', (e) => {
        drawing = true;
        lastX = e.clientX - width / 2;
        lastY = e.clientY - height / 2;
      });
      window.addEventListener('pointerup', () => { drawing = false; });
      canvas.addEventListener('pointermove', (e) => {
        if (!drawing) return;
        const nx = e.clientX - width / 2;
        const ny = e.clientY - height / 2;
        hueTick += 0.04;
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.lineCap = 'round';
        ctx.lineWidth = BRUSH;
        ctx.strokeStyle = Math.sin(hueTick) > 0 ? '${palette.primary}' : '${palette.secondary}';
        for (let i = 0; i < SYMMETRY; i++) {
          ctx.save();
          ctx.rotate((Math.PI * 2 * i) / SYMMETRY);
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          if (MIRROR) {
            ctx.scale(1, -1);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(nx, ny);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.restore();
        lastX = nx;
        lastY = ny;
      });
    `;
  } else {
    scriptBody = `
      const COUNT = ${state.gravity.particleCount};
      const G_STRENGTH = ${state.gravity.gravityStrength};
      const FADE = ${state.gravity.trailFade};
      const SPIN = ${state.gravity.initialSpin};
      const wells = [{ x: window.innerWidth / 2, y: window.innerHeight / 2, mass: 1 }];
      const particles = Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2;
        const dist = 80 + Math.random() * 180;
        return {
          x: window.innerWidth / 2 + Math.cos(angle) * dist,
          y: window.innerHeight / 2 + Math.sin(angle) * dist,
          vx: -Math.sin(angle) * 2.4 * SPIN,
          vy: Math.cos(angle) * 2.4 * SPIN,
        };
      });

      ctx.fillStyle = '${palette.canvasBg}';
      ctx.fillRect(0, 0, width, height);

      canvas.addEventListener('pointerdown', (e) => {
        wells.push({ x: e.clientX, y: e.clientY, mass: 1 });
        if (wells.length > 5) wells.shift();
      });

      function loop() {
        ctx.fillStyle = '${palette.canvasBg}';
        ctx.globalAlpha = FADE;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;

        for (const p of particles) {
          const px = p.x, py = p.y;
          for (const w of wells) {
            const dx = w.x - p.x;
            const dy = w.y - p.y;
            const d2 = Math.max(220, dx * dx + dy * dy);
            const force = (G_STRENGTH * w.mass) / d2;
            const d = Math.sqrt(d2);
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
          }
          p.vx *= 0.997;
          p.vy *= 0.997;
          p.x += p.vx;
          p.y += p.vy;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(p.x, p.y);
          const speed = Math.hypot(p.vx, p.vy);
          ctx.strokeStyle = speed > 3.2 ? '${palette.primary}' : '${palette.secondary}';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        requestAnimationFrame(loop);
      }
      loop();
    `;
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Hamon Studio Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${palette.canvasBg};
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif;
      overflow: hidden;
      user-select: none;
    }
    canvas { display: block; width: 100vw; height: 100vh; cursor: crosshair; }
    .hud {
      position: fixed;
      left: 20px;
      bottom: 20px;
      padding: 10px 14px;
      background: rgba(15, 23, 42, 0.78);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      backdrop-filter: blur(8px);
      font-size: 12px;
      line-height: 1.5;
      pointer-events: none;
    }
    .hud strong { display: block; color: #f8fafc; font-size: 13px; }
  </style>
</head>
<body>
  <canvas id="stage"></canvas>
  <div class="hud">
    <strong>${title}</strong>
    <span>画面をクリックまたはドラッグして操作できます（単体HTML5ファイル）</span>
  </div>
  <script>
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });
    ${scriptBody.trim()}
  </script>
</body>
</html>`;
}
