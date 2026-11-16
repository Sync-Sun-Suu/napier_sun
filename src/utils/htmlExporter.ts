import { COLOR_PALETTES, NapierClockState } from '../types/studio';

export function generateStandaloneHtml(state: NapierClockState): string {
  if (state.sceneMode === 'abyssal') {
    return generateAbyssalStandaloneHtml(state);
  }
  return generateBonfireStandaloneHtml(state);
}

function generateAbyssalStandaloneHtml(state: NapierClockState): string {
  const palette =
    COLOR_PALETTES.find((p) => p.id === state.paletteId) || COLOR_PALETTES[0];

  const fontStack =
    state.clockFont === 'serif'
      ? "'Cormorant Garamond', 'Shippori Mincho', Georgia, serif"
      : state.clockFont === 'mono'
      ? "'IBM Plex Mono', monospace"
      : "'Outfit', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="2.718 深海水槽" />
  <meta name="theme-color" content="${palette.canvasBg}" />
  <link id="apple-icon-link" rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <title>2.718 深海水槽 — Abyssal Garden</title>
  <script>
    // Dynamically generate an iPad Home Screen icon with Manta + 2.718 Spiral
    (function() {
      try {
        const ic = document.createElement('canvas');
        ic.width = 180; ic.height = 180;
        const x = ic.getContext('2d');
        x.fillStyle = '${palette.canvasBg}';
        x.fillRect(0, 0, 180, 180);
        const g = x.createRadialGradient(90, 90, 4, 90, 90, 76);
        g.addColorStop(0, '${palette.accent}');
        g.addColorStop(0.45, '${palette.primary}');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.globalAlpha = 0.45;
        x.beginPath(); x.arc(90, 90, 76, 0, Math.PI * 2); x.fill();
        x.globalAlpha = 0.9; x.strokeStyle = '${palette.primary}'; x.lineWidth = 3;
        x.beginPath(); x.arc(90, 90, 68, -Math.PI / 2, Math.PI * 1.25); x.stroke();
        x.fillStyle = '#ffffff'; x.font = 'bold 25px sans-serif'; x.textAlign = 'center';
        x.fillText('2.718', 90, 98);
        const link = document.getElementById('apple-icon-link');
        if (link) link.href = ic.toDataURL('image/png');
      } catch (e) {}
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=IBM+Plex+Mono:wght@400;600&family=Outfit:wght@500;600;700&family=Shippori+Mincho:wght@500;600&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${palette.canvasBg};
      color: #f8fafc;
      font-family: ${fontStack};
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
    }
    canvas { display: block; width: 100vw; height: 100vh; cursor: grab; touch-action: none; }
    canvas:active { cursor: grabbing; }
    .clock-center {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      transition: opacity 0.35s ease;
    }
    .clock-center.hidden { opacity: 0; }
    .clock-dial {
      position: relative;
      width: 316px;
      height: 316px;
      border-radius: 9999px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(3, 16, 31, ${state.glassFrost});
      backdrop-filter: blur(${Math.round(state.glassFrost * 20)}px);
      -webkit-backdrop-filter: blur(${Math.round(state.glassFrost * 20)}px);
      border: 1px solid rgba(165, 243, 252, ${state.glassFrost > 0.05 ? 0.14 : 0});
      font-variant-numeric: tabular-nums;
    }
    .clock-dial svg { position: absolute; inset: 0; }
    .clock-date {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.22em;
      color: rgba(207, 250, 254, 0.85);
    }
    .clock-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-top: 4px;
    }
    .clock-hm {
      font-size: 66px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.96);
      text-shadow: 0 2px 28px ${palette.primary}44;
      line-height: 1.05;
    }
    .clock-s {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 19px;
      color: ${palette.primary};
      width: 2.4ch;
      text-align: left;
    }
    .clock-sub {
      margin-top: 8px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.12em;
      color: rgba(165, 243, 252, 0.78);
    }
    .dock {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 14px;
      background: rgba(3, 16, 31, 0.76);
      border: 1px solid rgba(165, 243, 252, 0.16);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: opacity 0.25s ease;
    }
    .dock.hidden { opacity: 0; pointer-events: none; }
    .btn {
      padding: 7px 12px;
      border-radius: 9px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(15, 23, 42, 0.75);
      color: #e2e8f0;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn.active {
      background: rgba(34, 211, 238, 0.22);
      border-color: rgba(34, 211, 238, 0.55);
      color: #cffafe;
    }
  </style>
</head>
<body>
  <canvas id="stage"></canvas>
  <div class="clock-center" id="clock-wrap">
    <div class="clock-dial">
      <svg width="316" height="316" viewBox="0 0 316 316">
        <circle cx="158" cy="158" r="136" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.25" />
        <circle id="sec-arc" cx="158" cy="158" r="136" fill="none" stroke="${palette.primary}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="854.5" stroke-dashoffset="854.5" transform="rotate(-90 158 158)" opacity="0.85" />
        <circle id="sec-dot" cx="158" cy="22" r="3.5" fill="${palette.accent}" />
      </svg>
      <div class="clock-date" id="clock-date">2026.11.15 · SUN</div>
      <div class="clock-row">
        <span class="clock-hm" id="clock-hm">00:00</span>
        <span class="clock-s" id="clock-s">:00</span>
      </div>
      <div class="clock-sub" id="clock-sub">e ≈ 2.718 · Boids=${state.boidsCount} · Manta=${state.mantaCount}</div>
    </div>
  </div>

  <div class="dock" id="dock">
    <button class="btn" id="water-btn">🌊 深海音</button>
    <button class="btn" id="chime-btn">🔔 チャイム</button>
    <button class="btn" id="timer-btn">⏳ 27:18</button>
    <button class="btn" id="clock-toggle-btn">🕒 時計切替</button>
    <button class="btn" id="hide-btn">画面のみ</button>
  </div>

  <script>
    async function keepAwake() {
      try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (e) {}
    }
    document.addEventListener('pointerdown', keepAwake, { once: true });

    const BOIDS_COUNT = ${state.boidsCount};
    const MANTA_COUNT = ${state.mantaCount};
    const CAUSTICS = ${state.causticsIntensity};
    const KELP_DENSITY = ${state.kelpDensity};
    const DEPTH_TONE = ${state.abyssalDepthTone};
    const REVERB_AMT = ${state.reverbDepth};

    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    // 2.718 Clock & Timer
    const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    const CIRC = 2 * Math.PI * 136;
    let timerActive = false, timerRem = 27 * 60 + 18, lastMin = -1;

    setInterval(() => {
      if (timerActive && timerRem > 0) {
        timerRem--;
        if (timerRem === 0) {
          timerActive = false;
          playBell(true);
          document.getElementById('timer-btn').classList.remove('active');
        }
      }
    }, 1000);

    function updateClock() {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const ratio = (d.getSeconds() + d.getMilliseconds() / 1000) / 60;
      document.getElementById('clock-hm').textContent = hh + ':' + mm;
      document.getElementById('clock-s').textContent = ':' + ss;
      document.getElementById('clock-date').textContent =
        d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0') + ' · ' + DAYS[d.getDay()];

      const arc = document.getElementById('sec-arc');
      const dot = document.getElementById('sec-dot');
      if (arc) arc.setAttribute('stroke-dashoffset', String(CIRC * (1 - ratio)));
      if (dot) {
        const ang = ratio * Math.PI * 2 - Math.PI / 2;
        dot.setAttribute('cx', String(158 + Math.cos(ang) * 136));
        dot.setAttribute('cy', String(158 + Math.sin(ang) * 136));
      }
      if (timerActive) {
        const tm = String(Math.floor(timerRem / 60)).padStart(2, '0');
        const ts = String(timerRem % 60).padStart(2, '0');
        document.getElementById('clock-sub').textContent = '2.718 TIMER · ' + tm + ':' + ts;
      } else {
        document.getElementById('clock-sub').textContent = 'e ≈ 2.718 · Boids=' + BOIDS_COUNT + ' · Manta=' + MANTA_COUNT;
      }
      if (d.getSeconds() === 0 && lastMin !== d.getMinutes()) {
        lastMin = d.getMinutes();
        playBell(false);
      }
    }
    setInterval(updateClock, 60);
    updateClock();

    // Procedural Web Audio Underwater Soundscape
    const BUBBLE_HZ = [293.66, 329.63, 399.13, 440.00, 523.25, 587.33, 659.25, 798.26, 880.00];
    let audioCtx = null, conv = null, wet = null, waterOn = false, waterNodes = null;

    function ensureAudio() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const len = Math.floor(audioCtx.sampleRate * 3.6);
        const ir = audioCtx.createBuffer(2, len, audioCtx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const ch = ir.getChannelData(c);
          for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(Math.E, -(i / audioCtx.sampleRate) * 2.05) * 0.45;
        }
        conv = audioCtx.createConvolver(); conv.buffer = ir;
        wet = audioCtx.createGain(); wet.gain.value = REVERB_AMT * 0.85;
        conv.connect(wet).connect(audioCtx.destination);
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }

    function playBubble(nx) {
      try {
        const c = ensureAudio();
        const f = BUBBLE_HZ[Math.floor(nx * BUBBLE_HZ.length) % BUBBLE_HZ.length];
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f * 0.82, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(f * 1.36, c.currentTime + 0.08);
        g.gain.setValueAtTime(0.001, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.045, c.currentTime + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.28);
        o.connect(g); g.connect(c.destination); if (conv) g.connect(conv);
        o.start(); o.stop(c.currentTime + 0.3);
      } catch (e) {}
    }

    function playBell(complete) {
      if (!audioCtx) return;
      const notes = complete ? [293.66, 399.13, 440.0, 587.33, 798.26] : [293.66, 440.0, 587.33];
      notes.forEach((f, idx) => {
        const d = idx * 0.16;
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, audioCtx.currentTime + d);
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.04, audioCtx.currentTime + d + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d + 2.6);
        o.connect(g); g.connect(audioCtx.destination); if (conv) g.connect(conv);
        o.start(audioCtx.currentTime + d); o.stop(audioCtx.currentTime + d + 2.7);
      });
    }

    document.getElementById('water-btn').addEventListener('click', (e) => {
      const c = ensureAudio();
      if (waterOn && waterNodes) {
        clearInterval(waterNodes.timer); waterNodes.src.stop();
        waterNodes = null; waterOn = false;
        e.target.classList.remove('active');
        return;
      }
      const bLen = c.sampleRate * 4;
      const buf = c.createBuffer(1, bLen, c.sampleRate);
      const out = buf.getChannelData(0);
      let b0 = 0, b1 = 0;
      for (let i = 0; i < bLen; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.996 * b0 + w * 0.03; b1 = 0.98 * b1 + w * 0.05;
        out[i] = (b0 + b1) * 0.7;
      }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320 - DEPTH_TONE * 160;
      const mg = c.createGain(); mg.gain.value = 0.25;
      src.connect(lp).connect(mg).connect(c.destination);
      src.start();
      const timer = setInterval(() => {
        if (Math.random() < 0.45) playBubble(Math.random());
      }, 360);
      waterNodes = { src, timer }; waterOn = true;
      e.target.classList.add('active');
    });

    document.getElementById('chime-btn').addEventListener('click', () => { ensureAudio(); playBell(false); });
    document.getElementById('timer-btn').addEventListener('click', (e) => {
      ensureAudio(); timerActive = !timerActive; timerRem = 27 * 60 + 18;
      e.target.classList.toggle('active', timerActive);
    });
    document.getElementById('clock-toggle-btn').addEventListener('click', () => {
      document.getElementById('clock-wrap').classList.toggle('hidden');
    });
    document.getElementById('hide-btn').addEventListener('click', () => {
      document.getElementById('dock').classList.add('hidden');
    });
    canvas.addEventListener('dblclick', () => {
      document.getElementById('dock').classList.toggle('hidden');
    });

    // 3D Perspective Underwater Projection Engine (Manta Rays + Boids Schools + Kelp Forest + Light Rays)
    let yaw = 0, pitch = -0.05, ptrDown = false, px = 0, py = 0;
    canvas.addEventListener('pointerdown', (e) => {
      ptrDown = true; px = e.clientX; py = e.clientY;
      document.getElementById('dock').classList.remove('hidden');
      playBubble(Math.max(0, Math.min(0.99, e.clientX / width)));
    });
    window.addEventListener('pointermove', (e) => {
      if (!ptrDown) return;
      yaw -= (e.clientX - px) * 0.004;
      pitch = Math.max(-0.5, Math.min(0.5, pitch - (e.clientY - py) * 0.003));
      px = e.clientX; py = e.clientY;
    });
    window.addEventListener('pointerup', () => { ptrDown = false; });

    const boids = Array.from({ length: BOIDS_COUNT }, (_, i) => {
      const a = (i / BOIDS_COUNT) * Math.PI * 6;
      const r = 6 + (i % 3) * 5 + Math.random() * 5;
      return {
        x: Math.cos(a) * r, y: -2 + (Math.random() - 0.5) * 6, z: Math.sin(a) * r,
        vx: -Math.sin(a) * 0.08, vy: 0, vz: Math.cos(a) * 0.08,
        school: i % 3, phase: Math.random() * 6.28
      };
    });

    const mantas = Array.from({ length: MANTA_COUNT }, (_, i) => ({
      r: 10 + i * 3.2, speed: (0.2 - i * 0.015) * (i % 2 === 0 ? 1 : -1),
      angle: (i / MANTA_COUNT) * Math.PI * 2, baseY: 2.0 - (i % 3) * 2.2, phase: i * Math.E
    }));

    const kelps = Array.from({ length: Math.floor(65 * KELP_DENSITY) }, (_, i) => {
      const a = (i / 65) * Math.PI * 6;
      const r = 5 + (i % 6) * 3.6;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 4.5 + (i % 4) * 1.5, phase: i * 0.718 };
    });

    function project3D(wx, wy, wz, camX, camY, camZ, camYaw, camPitch) {
      let dx = wx - camX, dy = wy - camY, dz = wz - camZ;
      const cosY = Math.cos(-camYaw), sinY = Math.sin(-camYaw);
      const rx = dx * cosY - dz * sinY;
      let rz = dx * sinY + dz * cosY;
      const cosP = Math.cos(-camPitch), sinP = Math.sin(-camPitch);
      const ry = dy * cosP - rz * sinP;
      rz = dy * sinP + rz * cosP;
      if (rz <= 0.4) return null;
      const fov = Math.min(width, height) * 0.85;
      return { x: width / 2 + (rx / rz) * fov, y: height / 2 - (ry / rz) * fov, z: rz, scale: fov / rz };
    }

    function loop(now) {
      const t = now * 0.001;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#062642');
      grad.addColorStop(0.55, '${palette.canvasBg}');
      grad.addColorStop(1, '#020813');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Volumetric Surface Light Rays (Caustics Curtains)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const rx = width * (0.12 + i * 0.095) + Math.sin(t * 0.4 + i) * 35;
        const rw = 55 + Math.sin(t * 0.7 + i * 2) * 20;
        const lg = ctx.createLinearGradient(rx, 0, rx - 90, height * 0.9);
        lg.addColorStop(0, 'rgba(165, 243, 252, ' + (0.09 * CAUSTICS) + ')');
        lg.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(rx - rw, 0); ctx.lineTo(rx + rw, 0);
        ctx.lineTo(rx - 140 + rw * 1.8, height); ctx.lineTo(rx - 140 - rw * 1.8, height);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();

      const camAngle = t * 0.09 + yaw;
      const camX = Math.cos(camAngle) * 19;
      const camZ = Math.sin(camAngle) * 19;
      const camY = -1.0 + Math.sin(t * 0.25) * 1.6 + pitch * 8;
      const lookYaw = camAngle + Math.PI / 2;

      // Swaying 1/f Kelp Forest
      ctx.lineCap = 'round';
      for (let i = 0; i < kelps.length; i++) {
        const k = kelps[i];
        const p0 = project3D(k.x, -8.5, k.z, camX, camY, camZ, lookYaw, pitch);
        const swayX = Math.sin(t * 1.4 + k.phase) * 0.9;
        const p1 = project3D(k.x + swayX, -8.5 + k.h, k.z, camX, camY, camZ, lookYaw, pitch);
        if (p0 && p1 && p0.z < 42) {
          ctx.strokeStyle = '${palette.primary}';
          ctx.globalAlpha = Math.max(0.08, Math.min(0.55, 1 - p0.z / 42));
          ctx.lineWidth = Math.max(1.2, p0.scale * 0.22);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.quadraticCurveTo((p0.x + p1.x) / 2 + swayX * 12, (p0.y + p1.y) / 2, p1.x, p1.y);
          ctx.stroke();
        }
      }

      // 3D Boids Schooling Fish
      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];
        const ang = Math.atan2(b.z, b.x) + Math.PI / 2 - 0.125 * 0.6;
        b.vx += Math.cos(ang) * 0.003;
        b.vz += Math.sin(ang) * 0.003;
        const r = Math.hypot(b.x, b.z);
        if (r > 22) { b.vx -= (b.x / r) * 0.008; b.vz -= (b.z / r) * 0.008; }
        b.vx *= 0.97; b.vy *= 0.97; b.vz *= 0.97;
        b.x += b.vx; b.y += b.vy + Math.sin(t * 2 + b.phase) * 0.01; b.z += b.vz;

        const proj = project3D(b.x, b.y, b.z, camX, camY, camZ, lookYaw, pitch);
        if (proj && proj.z < 45) {
          const sz = Math.max(1.8, proj.scale * 0.16);
          ctx.fillStyle = b.school === 0 ? '${palette.primary}' : b.school === 1 ? '${palette.secondary}' : '${palette.accent}';
          ctx.globalAlpha = Math.max(0.15, Math.min(0.88, 1 - proj.z / 45));
          ctx.beginPath();
          ctx.ellipse(proj.x, proj.y, sz * 1.7, sz * 0.65, Math.sin(t * 8 + b.phase) * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3D Flapping Manta Rays
      for (let i = 0; i < mantas.length; i++) {
        const m = mantas[i];
        const a = m.angle + t * m.speed;
        const mx = Math.cos(a) * m.r;
        const mz = Math.sin(a) * m.r;
        const my = m.baseY + Math.sin(t * 0.8 + m.phase) * 1.4;
        const flap = Math.sin(t * Math.E + m.phase) * 1.1;

        const body = project3D(mx, my, mz, camX, camY, camZ, lookYaw, pitch);
        const wingL = project3D(mx + Math.cos(a) * 2.6, my + flap, mz + Math.sin(a) * 2.6, camX, camY, camZ, lookYaw, pitch);
        const wingR = project3D(mx - Math.cos(a) * 2.6, my + flap, mz - Math.sin(a) * 2.6, camX, camY, camZ, lookYaw, pitch);
        if (body && wingL && wingR && body.z < 50) {
          ctx.strokeStyle = '${palette.accent}';
          ctx.fillStyle = '${palette.primary}';
          ctx.globalAlpha = Math.max(0.25, Math.min(0.85, 1 - body.z / 50));
          ctx.lineWidth = Math.max(1.5, body.scale * 0.12);
          ctx.beginPath();
          ctx.moveTo(wingL.x, wingL.y);
          ctx.quadraticCurveTo(body.x, body.y - body.scale * 0.35, wingR.x, wingR.y);
          ctx.quadraticCurveTo(body.x, body.y + body.scale * 0.55, wingL.x, wingL.y);
          ctx.fill(); ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  </script>
</body>
</html>`;
}

function generateBonfireStandaloneHtml(state: NapierClockState): string {
  const palette = COLOR_PALETTES.find((p) => p.id === state.paletteId) || COLOR_PALETTES[1];

  const fontStack =
    state.clockFont === 'serif'
      ? "'Cormorant Garamond', 'Shippori Mincho', Georgia, serif"
      : state.clockFont === 'mono'
      ? "'IBM Plex Mono', monospace"
      : "'Outfit', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="2.718 時計" />
  <meta name="theme-color" content="${palette.canvasBg}" />
  <link id="apple-icon-link" rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  <title>2.718 焚き火時計 — Napier_sun</title>
  <script>
    (function() {
      try {
        const ic = document.createElement('canvas');
        ic.width = 180; ic.height = 180;
        const x = ic.getContext('2d');
        x.fillStyle = '${palette.canvasBg}';
        x.fillRect(0, 0, 180, 180);
        const g = x.createRadialGradient(90, 96, 4, 90, 96, 72);
        g.addColorStop(0, '${palette.accent}');
        g.addColorStop(0.4, '${palette.primary}');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.globalAlpha = 0.45;
        x.beginPath(); x.arc(90, 96, 72, 0, Math.PI * 2); x.fill();
        x.globalAlpha = 0.85; x.strokeStyle = '${palette.primary}'; x.lineWidth = 3;
        x.beginPath(); x.arc(90, 90, 68, -Math.PI / 2, Math.PI * 1.1); x.stroke();
        x.beginPath();
        for (let s = 0; s <= 120; s++) {
          const th = (s / 120) * Math.PI * 4.5;
          const r = 3.5 * Math.exp(${state.spiralExponent} * th);
          const sx = 90 + Math.cos(th) * r, sy = 96 + Math.sin(th) * r;
          if (s === 0) x.moveTo(sx, sy); else x.lineTo(sx, sy);
        }
        x.strokeStyle = '${palette.accent}'; x.lineWidth = 2.2; x.stroke();
        x.fillStyle = '#ffffff'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center';
        x.fillText('2.718', 90, 96);
        const link = document.getElementById('apple-icon-link');
        if (link) link.href = ic.toDataURL('image/png');
      } catch (e) {}
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=IBM+Plex+Mono:wght@400;600&family=Outfit:wght@500;600;700&family=Shippori+Mincho:wght@500;600&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${palette.canvasBg};
      color: #f8fafc;
      font-family: ${fontStack};
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
    }
    canvas { display: block; width: 100vw; height: 100vh; cursor: crosshair; touch-action: none; }
    .clock-center {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .clock-dial {
      position: relative;
      width: 310px;
      height: 310px;
      border-radius: 9999px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(6, 9, 19, ${state.glassFrost});
      backdrop-filter: blur(${Math.round(state.glassFrost * 18)}px);
      -webkit-backdrop-filter: blur(${Math.round(state.glassFrost * 18)}px);
      border: 1px solid rgba(255, 255, 255, ${state.glassFrost > 0.05 ? 0.08 : 0});
      font-variant-numeric: tabular-nums;
    }
    .clock-dial svg { position: absolute; inset: 0; }
    .clock-date {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.22em;
      color: rgba(226, 232, 240, 0.85);
    }
    .clock-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-top: 4px;
    }
    .clock-hm {
      font-size: 66px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.96);
      text-shadow: 0 2px 28px ${palette.primary}38;
      line-height: 1.05;
    }
    .clock-s {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 19px;
      color: ${palette.primary};
      width: 2.4ch;
      text-align: left;
    }
    .clock-sub {
      margin-top: 8px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.12em;
      color: rgba(148, 163, 184, 0.8);
    }
    .dock {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: opacity 0.25s ease;
    }
    .dock.hidden { opacity: 0; pointer-events: none; }
    .btn {
      padding: 7px 12px;
      border-radius: 9px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(30, 41, 59, 0.7);
      color: #e2e8f0;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn.active {
      background: rgba(251, 191, 36, 0.18);
      border-color: rgba(251, 191, 36, 0.5);
      color: #fde68a;
    }
  </style>
</head>
<body>
  <canvas id="stage"></canvas>
  <div class="clock-center">
    <div class="clock-dial">
      <svg width="310" height="310" viewBox="0 0 310 310">
        <circle cx="155" cy="155" r="136" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1.25" />
        <circle id="sec-arc" cx="155" cy="155" r="136" fill="none" stroke="${palette.primary}" stroke-width="2" stroke-linecap="round" stroke-dasharray="854.5" stroke-dashoffset="854.5" transform="rotate(-90 155 155)" opacity="0.8" />
        <circle id="sec-dot" cx="155" cy="19" r="3.5" fill="${palette.accent}" />
      </svg>
      <div class="clock-date" id="clock-date">2026.11.13 · FRI</div>
      <div class="clock-row">
        <span class="clock-hm" id="clock-hm">00:00</span>
        <span class="clock-s" id="clock-s">:00</span>
      </div>
      <div class="clock-sub" id="clock-sub">e ≈ 2.718 · b=${state.spiralExponent.toFixed(3)} · ${state.antiGravityLift.toFixed(2)}G</div>
    </div>
  </div>

  <div class="dock" id="dock">
    <button class="btn" id="bonfire-btn">🔥 焚き火音</button>
    <button class="btn" id="chime-btn">🔔 チャイム</button>
    <button class="btn" id="timer-btn">⏳ 27:18</button>
    <button class="btn" id="hide-btn">画面のみにする</button>
  </div>

  <script>
    async function keepAwake() {
      try {
        if ('wakeLock' in navigator) await navigator.wakeLock.request('screen');
      } catch (e) {}
    }
    document.addEventListener('pointerdown', keepAwake, { once: true });

    const B_EXP = ${state.spiralExponent};
    const LIFT = ${state.antiGravityLift};
    const WEB_DIST = ${state.filamentWeb};
    const WARMTH = ${state.bonfireWarmth};
    const REVERB_AMT = ${state.reverbDepth};
    const SWAY = ${state.bonfireSway};

    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    const CIRC = 2 * Math.PI * 136;
    let timerActive = false;
    let timerRem = 27 * 60 + 18;
    let lastMin = -1;

    setInterval(() => {
      if (timerActive && timerRem > 0) {
        timerRem--;
        if (timerRem === 0) {
          timerActive = false;
          playBell(true);
          document.getElementById('timer-btn').classList.remove('active');
        }
      }
    }, 1000);

    function updateClock() {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const ratio = (d.getSeconds() + d.getMilliseconds() / 1000) / 60;
      document.getElementById('clock-hm').textContent = hh + ':' + mm;
      document.getElementById('clock-s').textContent = ':' + ss;
      document.getElementById('clock-date').textContent =
        d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0') + ' · ' + DAYS[d.getDay()];

      const arc = document.getElementById('sec-arc');
      const dot = document.getElementById('sec-dot');
      if (arc) arc.setAttribute('stroke-dashoffset', String(CIRC * (1 - ratio)));
      if (dot) {
        const ang = ratio * Math.PI * 2 - Math.PI / 2;
        dot.setAttribute('cx', String(155 + Math.cos(ang) * 136));
        dot.setAttribute('cy', String(155 + Math.sin(ang) * 136));
      }

      if (timerActive) {
        const tm = String(Math.floor(timerRem / 60)).padStart(2, '0');
        const ts = String(timerRem % 60).padStart(2, '0');
        document.getElementById('clock-sub').textContent = '2.718 TIMER · ' + tm + ':' + ts;
      } else {
        document.getElementById('clock-sub').textContent = 'e ≈ 2.718 · b=' + B_EXP.toFixed(3) + ' · ' + LIFT.toFixed(2) + 'G';
      }

      if (d.getSeconds() === 0 && lastMin !== d.getMinutes()) {
        lastMin = d.getMinutes();
        playBell(false);
      }
    }
    setInterval(updateClock, 60);
    updateClock();

    const DEEP_HZ = [146.83, 220.00, 293.66, 399.13, 440.00, 587.33, 659.25, 798.26];
    let audioCtx = null, conv = null, wet = null;
    let bonfireOn = false, bonfireNodes = null;

    function ensureAudio() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const len = Math.floor(audioCtx.sampleRate * 3.4);
        const ir = audioCtx.createBuffer(2, len, audioCtx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const ch = ir.getChannelData(c);
          for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(Math.E, -(i / audioCtx.sampleRate) * 2.1) * 0.4;
        }
        conv = audioCtx.createConvolver(); conv.buffer = ir;
        wet = audioCtx.createGain(); wet.gain.value = REVERB_AMT * 0.85;
        conv.connect(wet).connect(audioCtx.destination);
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }

    function playNapierTone(nx) {
      try {
        const c = ensureAudio();
        const osc = c.createOscillator(), glass = c.createOscillator(), g = c.createGain();
        const f = DEEP_HZ[Math.floor(nx * DEEP_HZ.length) % DEEP_HZ.length];
        osc.type = 'sine'; osc.frequency.value = f;
        glass.type = 'sine'; glass.frequency.value = f * Math.E * 0.5;
        g.gain.setValueAtTime(0.001, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.8);
        osc.connect(g); glass.connect(g);
        g.connect(c.destination); if (conv) g.connect(conv);
        osc.start(); glass.start();
        osc.stop(c.currentTime + 1.9); glass.stop(c.currentTime + 1.9);
      } catch (e) {}
    }

    function playBell(complete) {
      if (!audioCtx) return;
      const notes = complete ? [293.66, 399.13, 440.0, 587.33, 798.26] : [293.66, 440.0, 587.33];
      notes.forEach((f, idx) => {
        const d = idx * 0.16;
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, audioCtx.currentTime + d);
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.04, audioCtx.currentTime + d + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d + 2.6);
        o.connect(g); g.connect(audioCtx.destination); if (conv) g.connect(conv);
        o.start(audioCtx.currentTime + d); o.stop(audioCtx.currentTime + d + 2.7);
      });
    }

    document.getElementById('bonfire-btn').addEventListener('click', (e) => {
      const c = ensureAudio();
      if (bonfireOn && bonfireNodes) {
        clearInterval(bonfireNodes.timer); bonfireNodes.src.stop();
        bonfireNodes = null; bonfireOn = false;
        e.target.classList.remove('active');
        return;
      }
      const bLen = c.sampleRate * 3;
      const buf = c.createBuffer(1, bLen, c.sampleRate);
      const out = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bLen; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; out[i] = last * 1.8; }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150 + WARMTH * 190;
      const mg = c.createGain(); mg.gain.value = 0.22;
      src.connect(lp).connect(mg).connect(c.destination);
      src.start();
      const timer = setInterval(() => {
        if (Math.random() < 0.25 + WARMTH * 0.55) {
          const dur = 0.02 + Math.random() * 0.03;
          const pL = Math.floor(c.sampleRate * dur);
          const pB = c.createBuffer(1, pL, c.sampleRate);
          const pD = pB.getChannelData(0);
          for (let k = 0; k < pL; k++) pD[k] = (Math.random() * 2 - 1) * Math.exp((-k / pL) * 5.8);
          const pS = c.createBufferSource(); pS.buffer = pB;
          const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100 + WARMTH * 900 + Math.random() * 1800;
          const pG = c.createGain(); pG.gain.value = 0.12 * WARMTH;
          pS.connect(bp).connect(pG).connect(c.destination);
          pS.start();
        }
      }, 170);
      bonfireNodes = { src, timer }; bonfireOn = true;
      e.target.classList.add('active');
    });

    document.getElementById('chime-btn').addEventListener('click', () => { ensureAudio(); playBell(false); });
    document.getElementById('timer-btn').addEventListener('click', (e) => {
      ensureAudio();
      timerActive = !timerActive;
      timerRem = 27 * 60 + 18;
      e.target.classList.toggle('active', timerActive);
    });
    document.getElementById('hide-btn').addEventListener('click', () => {
      document.getElementById('dock').classList.add('hidden');
    });
    canvas.addEventListener('dblclick', () => {
      document.getElementById('dock').classList.toggle('hidden');
    });

    let phase = 0, ptrX = width / 2, ptrY = height / 2, ptrDown = false;
    const embers = Array.from({ length: 155 }, (_, i) => {
      const theta = (i / 155) * Math.PI * 6;
      const r = 16 * Math.exp(B_EXP * (theta % (Math.PI * 3.8)));
      return {
        x: width / 2 + Math.cos(theta) * r,
        y: height * 0.52 + Math.sin(theta) * r,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.35 - Math.random() * 0.65,
        size: 1.35 + (i % 4) * 0.65,
        seed: Math.random() * Math.PI * 2,
      };
    });

    canvas.addEventListener('pointerdown', (e) => {
      ptrDown = true; ptrX = e.clientX; ptrY = e.clientY;
      document.getElementById('dock').classList.remove('hidden');
      playNapierTone(Math.max(0, Math.min(0.99, e.clientX / width)));
    });
    canvas.addEventListener('pointermove', (e) => { ptrX = e.clientX; ptrY = e.clientY; });
    window.addEventListener('pointerup', () => { ptrDown = false; });

    ctx.fillStyle = '${palette.canvasBg}';
    ctx.fillRect(0, 0, width, height);

    function loop(now) {
      const tSec = now / 1000;
      ctx.fillStyle = '${palette.canvasBg}';
      ctx.globalAlpha = 0.14;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      const cx = width / 2, cy = height * 0.52;
      phase += 0.013 * (LIFT / 0.85);
      const wind = SWAY ? (Math.sin(tSec * 1.1) * 0.55 + Math.sin(tSec * Math.E) * 0.3) : 0;
      const breath = 0.88 + 0.12 * Math.sin(tSec * ((Math.PI * 2) / Math.E));
      const baseScale = Math.min(width, height) * 0.022 * breath;

      for (let arm = 0; arm < 2; arm++) {
        ctx.beginPath();
        for (let s = 0; s <= 155; s++) {
          const theta = (s / 155) * Math.PI * 5.2;
          const r = baseScale * Math.exp(B_EXP * theta);
          const ang = theta - phase * 0.75 + arm * Math.PI;
          const hf = r / (Math.min(width, height) * 0.45);
          const sx = cx + Math.cos(ang) * r + (SWAY ? wind * 18 * hf * Math.sin(theta * 0.7 + tSec * 2) : 0);
          const sy = cy + Math.sin(ang) * r - (SWAY ? Math.abs(hf) * 14 : 0);
          if (s === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = arm === 0 ? '${palette.primary}' : '${palette.secondary}';
        ctx.globalAlpha = 0.36;
        ctx.lineWidth = 1.65;
        ctx.stroke();
      }

      for (let i = 0; i < embers.length; i++) {
        const p = embers[i];
        const px = p.x, py = p.y;
        const dxC = p.x - cx, dyC = p.y - cy;
        const angC = Math.atan2(dyC, dxC);
        const tanAng = angC + Math.PI / 2 - B_EXP * 0.65;
        p.vx += Math.cos(tanAng) * 0.048 * LIFT + (SWAY ? Math.sin(tSec * 2.4 + p.seed) * 0.032 : 0);
        p.vy += Math.sin(tanAng) * 0.048 * LIFT - 0.034 * LIFT;

        const dxP = ptrX - p.x, dyP = ptrY - p.y;
        const dP = Math.hypot(dxP, dyP);
        if (dP > 4 && dP < 180) {
          const f = (1 - dP / 180) * (ptrDown ? 0.3 : 0.1);
          p.vx += (-dyP / dP) * f;
          p.vy += (dxP / dP) * f - 0.04 * LIFT;
        }
        p.vx *= 0.968; p.vy *= 0.968;
        p.x += p.vx; p.y += p.vy;

        if (p.y < -30 || p.y > height + 30 || p.x < -30 || p.x > width + 30) {
          const st = Math.random() * Math.PI * 2;
          p.x = cx + Math.cos(st) * 30; p.y = cy + Math.sin(st) * 30 + 14;
          p.vx = 0; p.vy = -0.38 * LIFT;
          continue;
        }
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = i % 2 === 0 ? '${palette.primary}' : '${palette.secondary}';
        ctx.globalAlpha = 0.82; ctx.lineWidth = p.size; ctx.stroke();
      }

      if (WEB_DIST > 0) {
        ctx.lineWidth = 0.7;
        for (let i = 0; i < embers.length; i++) {
          for (let j = i + 1; j < embers.length; j++) {
            const d = Math.hypot(embers[j].x - embers[i].x, embers[j].y - embers[i].y);
            if (d < WEB_DIST) {
              ctx.strokeStyle = '${palette.primary}';
              ctx.globalAlpha = (1 - d / WEB_DIST) * 0.28;
              ctx.beginPath(); ctx.moveTo(embers[i].x, embers[i].y); ctx.lineTo(embers[j].x, embers[j].y); ctx.stroke();
            }
          }
        }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  </script>
</body>
</html>`;
}
