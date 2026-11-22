import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Compass, Eye, Move, Navigation, Sparkles } from 'lucide-react';
import { COLOR_PALETTES, NapierClockState } from '../types/studio';
import { soundEngine } from '../utils/audio';

interface StardustGalaxyCanvasProps {
  state: NapierClockState;
  resetSignal: number;
  uiHidden: boolean;
  onToggleUiHidden: () => void;
  onChangeState: (updater: (prev: NapierClockState) => NapierClockState) => void;
  canvasRefOut: React.MutableRefObject<HTMLCanvasElement | null>;
}

interface TimeDisplay {
  hours: string;
  minutes: string;
  seconds: string;
  dateText: string;
  dayText: string;
  secondsRatio: number;
}

interface StarCoord {
  baseTheta: number;
  armIndex: number;
  radialJitter: number;
  verticalAmp: number;
  verticalPhase: number;
  orbitSpeedFactor: number;
  isAnchor: boolean;
}

interface ScannedCoordinate {
  r: string;
  theta: string;
  z: string;
}

const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function readCurrentTime(): TimeDisplay {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = now.getMilliseconds();
  return {
    hours: h,
    minutes: m,
    seconds: s,
    dateText: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
      now.getDate()
    ).padStart(2, '0')}`,
    dayText: WEEKDAYS_EN[now.getDay()],
    secondsRatio: (now.getSeconds() + ms / 1000) / 60,
  };
}

export const StardustGalaxyCanvas: React.FC<StardustGalaxyCanvasProps> = ({
  state,
  resetSignal,
  uiHidden,
  onToggleUiHidden,
  onChangeState,
  canvasRefOut,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<NapierClockState>(state);
  const lastMinuteRef = useRef<number>(new Date().getMinutes());
  const [timeDisplay, setTimeDisplay] = useState<TimeDisplay>(readCurrentTime);
  const [scannedCoord, setScannedCoord] = useState<ScannedCoordinate>({
    r: '12.718',
    theta: '2.718 rad',
    z: '+0.125',
  });

  const flightInputRef = useRef({
    forward: 0,
    strafe: 0,
    vertical: 0,
  });

  useEffect(() => {
    stateRef.current = state;
    soundEngine.setGalaxySound(state.soundEnabled && state.galaxySound);
    soundEngine.setAbyssalSound(state.soundEnabled && state.abyssalSound);
    soundEngine.setBonfireSound(state.soundEnabled && state.bonfireSound);
    soundEngine.setGalaxyShimmer(state.galaxyShimmer);
    soundEngine.setGalaxyNebulaDrone(state.galaxyNebulaDrone);
    soundEngine.setReverbDepth(state.reverbDepth);
    soundEngine.setDeepDrone(state.soundEnabled && state.harmonicDrone);
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeDisplay(readCurrentTime());
      const d = new Date();
      if (d.getSeconds() === 0 && d.getMinutes() !== lastMinuteRef.current) {
        lastMinuteRef.current = d.getMinutes();
        if (stateRef.current.soundEnabled && stateRef.current.autoChime) {
          soundEngine.playClockBell(true, false);
        }
      }
    }, 60);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: stateRef.current.qualityLevel !== 'low',
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      return;
    }

    const dpr =
      stateRef.current.qualityLevel === 'high'
        ? Math.min(window.devicePixelRatio || 1, 2)
        : stateRef.current.qualityLevel === 'medium'
        ? 1.35
        : 1.0;
    renderer.setPixelRatio(dpr);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    canvasRefOut.current = renderer.domElement;

    const palette =
      COLOR_PALETTES.find((p) => p.id === stateRef.current.paletteId) ||
      COLOR_PALETTES[0];

    const scene = new THREE.Scene();
    const spaceBg = new THREE.Color(palette.canvasBg);
    scene.background = spaceBg;
    scene.fog = new THREE.FogExp2(spaceBg.getHex(), 0.011);

    const camera = new THREE.PerspectiveCamera(
      58,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.2,
      220
    );
    camera.position.set(0, 14, 28);

    // Soft sprite texture for glowing stars
    const starSpriteCanvas = document.createElement('canvas');
    starSpriteCanvas.width = 64;
    starSpriteCanvas.height = 64;
    const sCtx = starSpriteCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(32, 32, 1, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.75)');
      grad.addColorStop(0.7, 'rgba(200, 220, 255, 0.18)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 64, 64);
    }
    const starTexture = new THREE.CanvasTexture(starSpriteCanvas);

    // 1. Napier 2.718 Galactic Pulsar Core & Coordinate Rings
    const coreGroup = new THREE.Group();
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.accent),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const coreSphere = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.95, 2),
      coreMat
    );
    coreGroup.add(coreSphere);

    // Concentric Logarithmic Polar Coordinate Rings (r = a * e^(b * theta))
    const coordRingMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(palette.secondary),
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });

    for (let ringIdx = 1; ringIdx <= 4; ringIdx++) {
      const r = 3.2 * Math.exp(0.34 * ringIdx);
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 96; s++) {
        const ang = (s / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r));
      }
      const ringGeom = new THREE.BufferGeometry().setFromPoints(pts);
      coreGroup.add(new THREE.Line(ringGeom, coordRingMat));
    }
    scene.add(coreGroup);

    // 2. Swirling Logarithmic Spiral Star Coordinates
    const starTotal = Math.max(800, Math.min(6000, stateRef.current.galaxyStars));
    const armTotal = Math.max(2, Math.min(6, stateRef.current.galaxyArms));

    const starCoords: StarCoord[] = [];
    const starPositions = new Float32Array(starTotal * 3);
    const starColors = new Float32Array(starTotal * 3);

    const colPrimary = new THREE.Color(palette.primary);
    const colSecondary = new THREE.Color(palette.secondary);
    const colAccent = new THREE.Color(palette.accent);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < starTotal; i++) {
      const armIndex = i % armTotal;
      // theta ranges from 0.2 to 4.5 * PI along each spiral arm
      const progress = i / starTotal;
      const baseTheta = 0.25 + progress * Math.PI * 4.4;
      const spread = (Math.random() - 0.5) * (0.45 + progress * 1.4);
      const verticalAmp = (Math.random() - 0.5) * (0.6 + (1 - progress) * 1.8);
      const isAnchor = i % 10 === 0;

      starCoords.push({
        baseTheta,
        armIndex,
        radialJitter: spread,
        verticalAmp,
        verticalPhase: Math.random() * Math.PI * 2,
        orbitSpeedFactor: 0.42 / (0.35 + progress * 1.45),
        isAnchor,
      });

      if (progress < 0.22) {
        tmpColor.copy(colAccent).lerp(colPrimary, progress / 0.22);
      } else if (i % 3 === 0) {
        tmpColor.copy(colPrimary).lerp(colSecondary, progress);
      } else {
        tmpColor.copy(colSecondary).lerp(colAccent, (i % 7) / 7);
      }

      starColors[i * 3 + 0] = tmpColor.r;
      starColors[i * 3 + 1] = tmpColor.g;
      starColors[i * 3 + 2] = tmpColor.b;
    }

    const starsGeom = new THREE.BufferGeometry();
    starsGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(starPositions, 3)
    );
    starsGeom.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starsMat = new THREE.PointsMaterial({
      size: 0.52,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starsPoints = new THREE.Points(starsGeom, starsMat);
    scene.add(starsPoints);

    // 3. Constellation Coordinate Filaments (connecting anchor stars across core & spiral arms, pulsing with melody)
    const maxFilamentSegments = 780;
    const filamentPositions = new Float32Array(maxFilamentSegments * 6);
    const filamentColors = new Float32Array(maxFilamentSegments * 6);
    const filamentGeom = new THREE.BufferGeometry();
    filamentGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(filamentPositions, 3)
    );
    filamentGeom.setAttribute(
      'color',
      new THREE.BufferAttribute(filamentColors, 3)
    );
    const filamentMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55 * stateRef.current.galaxyCoreGlow,
      blending: THREE.AdditiveBlending,
    });
    const filamentLines = new THREE.LineSegments(filamentGeom, filamentMat);
    scene.add(filamentLines);

    // 4. Interactive Starlight Gravity Scanner Ring (follows pointer in 3D plane)
    const scannerGroup = new THREE.Group();
    const scannerRingGeom = new THREE.RingGeometry(0.45, 0.58, 32);
    scannerRingGeom.rotateX(-Math.PI / 2);
    const scannerRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.accent),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const scannerRing = new THREE.Mesh(scannerRingGeom, scannerRingMat);
    scannerGroup.add(scannerRing);
    scene.add(scannerGroup);

    // Navigation & Pointer State
    const camPos = new THREE.Vector3(0, 14, 26);
    let camYaw = 0;
    let camPitch = -0.45;
    let orbitYawOffset = 0;
    let orbitPitchOffset = 0;
    let isDragging = false;
    let lastPtrX = 0;
    let lastPtrY = 0;
    const pointerWorldTarget = new THREE.Vector3(0, 0, 0);
    let pointerActiveStrength = 0;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const galacticPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const updatePointerOnGalacticPlane = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      ndc.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(galacticPlane, hit)) {
        if (hit.length() < 38) {
          pointerWorldTarget.copy(hit);
          pointerActiveStrength = 1.0;
          const rVal = Math.hypot(hit.x, hit.z);
          const thVal = Math.atan2(hit.z, hit.x);
          setScannedCoord({
            r: rVal.toFixed(3),
            theta: `${((thVal + Math.PI * 2) % (Math.PI * 2)).toFixed(3)} rad`,
            z: `${hit.y >= 0 ? '+' : ''}${hit.y.toFixed(3)}`,
          });
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      soundEngine.unlockAudio();
      isDragging = true;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
      updatePointerOnGalacticPlane(e.clientX, e.clientY);

      const rect = renderer.domElement.getBoundingClientRect();
      soundEngine.playStarlightTwinkle(
        (e.clientX - rect.left) / Math.max(1, rect.width),
        (e.clientY - rect.top) / Math.max(1, rect.height),
        stateRef.current.soundEnabled,
        85
      );
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPtrX;
      const dy = e.clientY - lastPtrY;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;

      if (stateRef.current.cameraMode === 'free') {
        camYaw -= dx * 0.0045;
        camPitch = Math.max(-1.2, Math.min(1.2, camPitch - dy * 0.0045));
      } else {
        orbitYawOffset -= dx * 0.0045;
        orbitPitchOffset = Math.max(
          -0.65,
          Math.min(0.65, orbitPitchOffset + dy * 0.0035)
        );
      }

      updatePointerOnGalacticPlane(e.clientX, e.clientY);
      const rect = renderer.domElement.getBoundingClientRect();
      soundEngine.playStarlightTwinkle(
        (e.clientX - rect.left) / Math.max(1, rect.width),
        (e.clientY - rect.top) / Math.max(1, rect.height),
        stateRef.current.soundEnabled,
        140
      );
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => keys.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const forwardVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    let animId = 0;

    const animate = (nowMs: number) => {
      const tSec = nowMs * 0.001;
      const cur = stateRef.current;
      const bExp = cur.spiralExponent;
      const lift = cur.antiGravityLift;

      // 1. Pulse the 2.718 Core
      const corePulse =
        0.92 + 0.16 * Math.sin(tSec * ((Math.PI * 2) / Math.E));
      coreSphere.scale.setScalar(corePulse * (0.7 + cur.galaxyCoreGlow * 0.5));
      coreGroup.rotation.y = tSec * 0.12;

      // 2. Update every Star Coordinate on the 3D Logarithmic Spiral r(theta) = a * e^(b * theta)
      const posAttr = starsGeom.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const anchorIndices: number[] = [];

      pointerActiveStrength *= 0.96;
      scannerGroup.position.copy(pointerWorldTarget);
      scannerGroup.rotation.y = tSec * 1.5;
      scannerRingMat.opacity = pointerActiveStrength * 0.75;
      scannerRing.scale.setScalar(1 + (1 - pointerActiveStrength) * 0.8);

      for (let i = 0; i < starTotal; i++) {
        const sc = starCoords[i];
        const armOffset = (sc.armIndex / armTotal) * Math.PI * 2;
        const dynamicTheta =
          sc.baseTheta + tSec * sc.orbitSpeedFactor * lift;

        // Logarithmic spiral radius r = a * e^(b * theta)
        const baseRadius = 1.65 * Math.exp(bExp * sc.baseTheta);
        const r = Math.max(0.4, baseRadius + sc.radialJitter);
        const worldAngle = sc.baseTheta + armOffset - tSec * sc.orbitSpeedFactor * lift;

        let sx = Math.cos(worldAngle) * r;
        let sz = Math.sin(worldAngle) * r;
        let sy =
          Math.sin(dynamicTheta * 1.8 + sc.verticalPhase) *
          sc.verticalAmp *
          Math.exp(-r * 0.045);

        // Gentle gravitational swirl toward pointer when touched
        if (pointerActiveStrength > 0.05) {
          const dx = pointerWorldTarget.x - sx;
          const dz = pointerWorldTarget.z - sz;
          const dist = Math.hypot(dx, dz);
          if (dist < 8.5 && dist > 0.2) {
            const pull = (1 - dist / 8.5) * 0.65 * pointerActiveStrength;
            sx += dx * pull * 0.35;
            sz += dz * pull * 0.35;
            sy += Math.sin(dist * 2 - tSec * 4) * 0.35 * pull;
          }
        }

        const idx = i * 3;
        posArr[idx + 0] = sx;
        posArr[idx + 1] = sy;
        posArr[idx + 2] = sz;

        if (sc.isAnchor && anchorIndices.length < 300) {
          anchorIndices.push(i);
        }
      }
      posAttr.needsUpdate = true;

      // 3. Update Constellation Coordinate Web across core & spiral arms, synced to Star Melody!
      const melodyPulse = soundEngine.getStarMelodyPulse();
      const webDensity = cur.galaxyConstellationDensity ?? 0.85;
      filamentMat.opacity =
        Math.min(1, (0.38 + melodyPulse.intensity * 0.35) * cur.galaxyCoreGlow) *
        (0.35 + webDensity * 0.65);

      const filAttr = filamentGeom.attributes.position as THREE.BufferAttribute;
      const filColAttr = filamentGeom.attributes.color as THREE.BufferAttribute;
      const filArr = filAttr.array as Float32Array;
      const filColArr = filColAttr.array as Float32Array;
      let segCount = 0;

      // Neighbor window increases with webDensity so stars weave rich geometric constellations
      const neighborSpan = Math.max(3, Math.floor(4 + webDensity * 14));

      for (
        let a = 0;
        a < anchorIndices.length - 1 && segCount < maxFilamentSegments;
        a++
      ) {
        const idxA = anchorIndices[a] * 3;
        const ax = posArr[idxA],
          ay = posArr[idxA + 1],
          az = posArr[idxA + 2];
        const rA = Math.hypot(ax, az);

        // Adaptive connection distance that grows with spiral radius r so outer spiral arms also weave constellations!
        const maxDist = (3.4 + rA * 0.36) * (0.55 + webDensity * 0.85);
        const maxDistSq = maxDist * maxDist;

        let linksForStar = 0;
        for (
          let step = 1;
          step <= neighborSpan &&
          a + step < anchorIndices.length &&
          segCount < maxFilamentSegments;
          step++
        ) {
          const idxB = anchorIndices[a + step] * 3;
          const bx = posArr[idxB],
            by = posArr[idxB + 1],
            bz = posArr[idxB + 2];
          const dSq =
            (ax - bx) * (ax - bx) +
            (ay - by) * (ay - by) +
            (az - bz) * (az - bz);

          if (dSq < maxDistSq) {
            const fBase = segCount * 6;
            filArr[fBase + 0] = ax;
            filArr[fBase + 1] = ay;
            filArr[fBase + 2] = az;
            filArr[fBase + 3] = bx;
            filArr[fBase + 4] = by;
            filArr[fBase + 5] = bz;

            // Color & brightness respond to the singing star pitch zone + touch scanner proximity
            const radialNorm = Math.min(1, rA / 26);
            const pitchMatch =
              1 - Math.min(1, Math.abs(radialNorm - melodyPulse.pitchNorm) * 2.2);
            const songGlow = melodyPulse.intensity * pitchMatch;

            tmpColor
              .copy(colPrimary)
              .lerp(colSecondary, radialNorm)
              .lerp(colAccent, Math.min(1, songGlow * 0.9 + (1 - dSq / maxDistSq) * 0.25));

            filColArr[fBase + 0] = tmpColor.r;
            filColArr[fBase + 1] = tmpColor.g;
            filColArr[fBase + 2] = tmpColor.b;
            filColArr[fBase + 3] = tmpColor.r;
            filColArr[fBase + 4] = tmpColor.g;
            filColArr[fBase + 5] = tmpColor.b;

            segCount++;
            linksForStar++;
            if (linksForStar >= 3) break;
          }
        }
      }
      filamentGeom.setDrawRange(0, segCount * 2);
      filAttr.needsUpdate = true;
      filColAttr.needsUpdate = true;

      // 4. Camera Choreography (Auto-Cruise Orbit vs Free Spaceflight)
      if (cur.cameraMode === 'cruise') {
        if (!isDragging) {
          orbitYawOffset *= 0.994;
          orbitPitchOffset *= 0.994;
        }
        const orbitAngle = tSec * 0.085 + orbitYawOffset;
        const orbitRadius = 23 + Math.sin(tSec * 0.16) * 4.5;
        const targetY =
          11.5 + Math.sin(tSec * 0.21) * 5.5 + orbitPitchOffset * 14;
        const targetX = Math.cos(orbitAngle) * orbitRadius;
        const targetZ = Math.sin(orbitAngle) * orbitRadius;

        camPos.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.045);
        camera.position.copy(camPos);
        camera.lookAt(0, 0, 0);
      } else {
        const ctrl = flightInputRef.current;
        let moveF = ctrl.forward;
        let moveS = ctrl.strafe;
        let moveV = ctrl.vertical;

        if (keys.has('KeyW') || keys.has('ArrowUp')) moveF += 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) moveF -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) moveS += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) moveS -= 1;
        if (keys.has('Space') || keys.has('KeyE')) moveV += 1;
        if (keys.has('ShiftLeft') || keys.has('KeyQ')) moveV -= 1;

        forwardVec
          .set(
            -Math.sin(camYaw) * Math.cos(camPitch),
            Math.sin(camPitch),
            -Math.cos(camYaw) * Math.cos(camPitch)
          )
          .normalize();
        rightVec.set(Math.cos(camYaw), 0, -Math.sin(camYaw)).normalize();

        const speed = 0.22;
        camPos.addScaledVector(forwardVec, moveF * speed);
        camPos.addScaledVector(rightVec, moveS * speed);
        camPos.y += moveV * speed;

        camPos.clampLength(1.8, 65);
        camera.position.copy(camPos);
        lookTarget.copy(camPos).add(forwardVec);
        camera.lookAt(lookTarget);
      }

      renderer.render(scene, camera);
      animId = window.requestAnimationFrame(animate);
    };

    animId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      domElem.removeEventListener('pointerdown', onPointerDown);
      starTexture.dispose();
      renderer.dispose();
    };
  }, [
    resetSignal,
    state.paletteId,
    state.galaxyStars,
    state.galaxyArms,
    state.qualityLevel,
    canvasRefOut,
  ]);

  const activePalette =
    COLOR_PALETTES.find((p) => p.id === state.paletteId) || COLOR_PALETTES[0];

  const clockPositionClasses =
    state.clockPosition === 'center'
      ? 'inset-0 flex items-center justify-center'
      : state.clockPosition === 'top'
      ? 'top-14 inset-x-0 flex justify-center'
      : 'bottom-20 right-8 flex items-end justify-end';

  const clockFontClass =
    state.clockFont === 'serif'
      ? 'font-serif tracking-tight'
      : state.clockFont === 'mono'
      ? 'font-mono tracking-tighter'
      : 'font-display tracking-tight';

  const timerMinutes = String(Math.floor(state.timerRemainingSec / 60)).padStart(2, '0');
  const timerSeconds = String(state.timerRemainingSec % 60).padStart(2, '0');
  const timerProgress =
    state.timerTotalSec > 0
      ? 1 - state.timerRemainingSec / state.timerTotalSec
      : 0;

  const ringRadius = 136;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const secondsDashOffset = ringCircumference * (1 - timeDisplay.secondsRatio);
  const timerRadius = 124;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerDashOffset = timerCircumference * (1 - timerProgress);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      onDoubleClick={onToggleUiHidden}
    >
      {/* 3D WebGL Galaxy Viewport */}
      <div
        ref={containerRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing touch-none"
        aria-label="2.718 星屑の銀河 — Stardust Spiral Galaxy"
      />

      {/* 2.718 Timepiece Overlay inside the Stardust Galaxy */}
      {state.showClockOverlay && (
        <div
          className={`fixed ${clockPositionClasses} pointer-events-none z-10 px-6 transition-all duration-500`}
        >
          <div
            className="relative flex flex-col items-center justify-center rounded-full px-10 py-9 transition-all duration-300"
            style={{
              width: state.showAnalogRing ? '316px' : 'auto',
              height: state.showAnalogRing ? '316px' : 'auto',
              backgroundColor: `rgba(4, 6, 17, ${state.glassFrost})`,
              backdropFilter:
                state.glassFrost > 0.02
                  ? `blur(${Math.round(state.glassFrost * 22)}px)`
                  : 'none',
              WebkitBackdropFilter:
                state.glassFrost > 0.02
                  ? `blur(${Math.round(state.glassFrost * 22)}px)`
                  : 'none',
              border:
                state.glassFrost > 0.05
                  ? '1px solid rgba(196, 181, 253, 0.16)'
                  : '1px solid transparent',
              boxShadow:
                state.glassFrost > 0.05
                  ? `0 24px 70px rgba(0, 0, 0, 0.55), inset 0 0 32px ${activePalette.primary}1e`
                  : 'none',
            }}
          >
            {state.showAnalogRing && (
              <svg
                className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                viewBox="0 0 316 316"
              >
                <circle
                  cx="158"
                  cy="158"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1.25"
                />
                <circle
                  cx="158"
                  cy="158"
                  r={ringRadius}
                  fill="none"
                  stroke={activePalette.primary}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={secondsDashOffset}
                  style={{ opacity: 0.88 }}
                />
                {(() => {
                  const angle = timeDisplay.secondsRatio * Math.PI * 2;
                  const dotX = 158 + Math.cos(angle) * ringRadius;
                  const dotY = 158 + Math.sin(angle) * ringRadius;
                  return (
                    <circle
                      cx={dotX}
                      cy={dotY}
                      r="3.5"
                      fill={activePalette.accent}
                    />
                  );
                })()}
                {state.timerActive && (
                  <circle
                    cx="158"
                    cy="158"
                    r={timerRadius}
                    fill="none"
                    stroke={activePalette.secondary}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={timerCircumference}
                    strokeDashoffset={timerDashOffset}
                    style={{ opacity: 0.9 }}
                  />
                )}
              </svg>
            )}

            {/* Date & Day Header */}
            <div className="flex items-center gap-2.5 text-[11px] font-mono tracking-[0.22em] text-violet-100/85 uppercase mb-1">
              <span>{timeDisplay.dateText}</span>
              <span
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: activePalette.primary }}
              />
              <span style={{ color: activePalette.primary }}>
                {timeDisplay.dayText}
              </span>
            </div>

            {/* Primary Hours : Minutes + Seconds */}
            <div
              className={`flex items-baseline gap-1.5 tabular-nums ${clockFontClass}`}
              style={{
                textShadow: `0 2px 32px ${activePalette.primary}55, 0 4px 16px rgba(0,0,0,0.75)`,
              }}
            >
              <span className="text-6xl sm:text-7xl font-semibold text-white/95 leading-none">
                {timeDisplay.hours}:{timeDisplay.minutes}
              </span>
              <span
                className="text-lg sm:text-xl font-mono font-medium w-[2.4ch] text-left"
                style={{ color: activePalette.primary }}
              >
                :{timeDisplay.seconds}
              </span>
            </div>

            {/* Active 27:18 Timer or Logarithmic Spiral Coordinate Formula Readout */}
            {state.timerActive ? (
              <div className="mt-2.5 flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-950/75 border border-violet-400/30 text-xs font-mono tracking-wider text-violet-200">
                <span>2.718 TIMER</span>
                <span>·</span>
                <span className="font-semibold text-white">
                  {timerMinutes}:{timerSeconds}
                </span>
              </div>
            ) : (
              <div className="mt-2.5 flex flex-col items-center gap-0.5 text-[11px] font-mono tracking-[0.11em] text-violet-100/80">
                <div>
                  e ≈ 2.718 · b={state.spiralExponent.toFixed(3)} · Stars={state.galaxyStars}
                </div>
                <div className="text-[10px] text-sky-300/80">
                  r(θ)={scannedCoord.r} · θ={scannedCoord.theta}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top-Left Flight Mode & Live Star Coordinate Telemetry Badge */}
      {!uiHidden && (
        <div className="fixed top-14 left-5 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() =>
              onChangeState((p) => ({
                ...p,
                cameraMode: p.cameraMode === 'cruise' ? 'free' : 'cruise',
              }))
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-md transition-colors cursor-pointer ${
              state.cameraMode === 'free'
                ? 'bg-violet-500/25 text-violet-100 border-violet-400/60 shadow-lg'
                : 'bg-slate-950/65 text-slate-200 border-white/15 hover:text-white'
            }`}
          >
            {state.cameraMode === 'free' ? (
              <>
                <Navigation className="w-3.5 h-3.5 text-violet-300" />
                <span>自由航行モード（ドラッグで視点・パッド/WASDで星間飛行）</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-violet-300" />
                <span>銀河周回クルーズ（タップで自由航行へ）</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              onChangeState((p) => ({
                ...p,
                showClockOverlay: !p.showClockOverlay,
              }))
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-950/65 text-slate-200 border border-white/15 backdrop-blur-md hover:text-white transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-violet-300" />
            <span>{state.showClockOverlay ? '時計表示: ON' : '時計表示: OFF'}</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono bg-slate-950/55 text-violet-200/85 border border-violet-400/20 backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>
              星座標スキャン: r={scannedCoord.r} · θ={scannedCoord.theta} · z={scannedCoord.z}
            </span>
          </div>
        </div>
      )}

      {/* Touch / iPad On-Screen Spaceflight Controller when in Free Flight Mode */}
      {!uiHidden && state.cameraMode === 'free' && (
        <div className="fixed bottom-20 left-5 z-20 flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/70 border border-violet-400/25 backdrop-blur-md pointer-events-auto">
          <div className="grid grid-cols-3 gap-1 w-28">
            <div />
            <button
              type="button"
              onPointerDown={() => {
                flightInputRef.current.forward = 1;
              }}
              onPointerUp={() => {
                flightInputRef.current.forward = 0;
              }}
              onPointerLeave={() => {
                flightInputRef.current.forward = 0;
              }}
              className="py-2 rounded-lg bg-slate-900/90 hover:bg-violet-500/30 text-violet-200 text-xs font-mono border border-white/10 active:bg-violet-400/40 cursor-pointer"
            >
              前進
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => {
                flightInputRef.current.strafe = -1;
              }}
              onPointerUp={() => {
                flightInputRef.current.strafe = 0;
              }}
              onPointerLeave={() => {
                flightInputRef.current.strafe = 0;
              }}
              className="py-2 rounded-lg bg-slate-900/90 hover:bg-violet-500/30 text-violet-200 text-xs font-mono border border-white/10 active:bg-violet-400/40 cursor-pointer"
            >
              左
            </button>
            <div className="flex items-center justify-center text-violet-400/60">
              <Move className="w-3.5 h-3.5" />
            </div>
            <button
              type="button"
              onPointerDown={() => {
                flightInputRef.current.strafe = 1;
              }}
              onPointerUp={() => {
                flightInputRef.current.strafe = 0;
              }}
              onPointerLeave={() => {
                flightInputRef.current.strafe = 0;
              }}
              className="py-2 rounded-lg bg-slate-900/90 hover:bg-violet-500/30 text-violet-200 text-xs font-mono border border-white/10 active:bg-violet-400/40 cursor-pointer"
            >
              右
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => {
                flightInputRef.current.forward = -1;
              }}
              onPointerUp={() => {
                flightInputRef.current.forward = 0;
              }}
              onPointerLeave={() => {
                flightInputRef.current.forward = 0;
              }}
              className="py-2 rounded-lg bg-slate-900/90 hover:bg-violet-500/30 text-violet-200 text-xs font-mono border border-white/10 active:bg-violet-400/40 cursor-pointer"
            >
              後退
            </button>
            <div />
          </div>

          <div className="flex flex-col gap-1.5 border-l border-white/10 pl-2.5">
            <button
              type="button"
              onPointerDown={() => {
                flightInputRef.current.vertical = 1;
              }}
              onPointerUp={() => {
                flightInputRef.current.vertical = 0;
              }}
              onPointerLeave={() => {
                flightInputRef.current.vertical = 0;
              }}
              className="px-2.5 py-2 rounded-lg bg-slate-900/90 hover:bg-violet-500/30 text-violet-200 text-xs font-mono border border-white/10 active:bg-violet-400/40 cursor-pointer"
            >
              上昇 ↑
            </button>
            <button
              type="button"
              onPointerDown={() => {
                flightInputRef.current.vertical = -1;
              }}
              onPointerUp={() => {
                flightInputRef.current.vertical = 0;
              }}
              onPointerLeave={() => {
                flightInputRef.current.vertical = 0;
              }}
              className="px-2.5 py-2 rounded-lg bg-slate-900/90 hover:bg-violet-500/30 text-violet-200 text-xs font-mono border border-white/10 active:bg-violet-400/40 cursor-pointer"
            >
              下降 ↓
            </button>
          </div>
        </div>
      )}

      {/* Subtle Floating Wake Button when in Pure Clock Mode (uiHidden = true) */}
      {uiHidden && (
        <button
          type="button"
          onClick={onToggleUiHidden}
          className="fixed bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-slate-950/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/10 text-[11px] font-mono transition-all cursor-pointer"
        >
          メニューを表示
        </button>
      )}
    </div>
  );
};
