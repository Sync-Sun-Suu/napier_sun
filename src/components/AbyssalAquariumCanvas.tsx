import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Compass, Eye, Move, Navigation } from 'lucide-react';
import {
  COLOR_PALETTES,
  NapierClockState,
} from '../types/studio';
import { soundEngine } from '../utils/audio';

interface AbyssalAquariumCanvasProps {
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

interface BoidFish {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  schoolId: number;
  phase: number;
  scale: number;
}

interface MantaEntity {
  group: THREE.Group;
  mesh: THREE.Mesh;
  basePositions: Float32Array;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  baseY: number;
  verticalAmp: number;
  phase: number;
  wingSpan: number;
}

interface KelpStrand {
  mesh: THREE.Mesh;
  basePositions: Float32Array;
  x: number;
  z: number;
  height: number;
  phase: number;
}

const DAYS_JP = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function getTimeDisplay(): TimeDisplay {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = now.getMilliseconds();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const dayText = DAYS_JP[now.getDay()];
  return {
    hours: h,
    minutes: m,
    seconds: s,
    dateText: `${year}.${month}.${date}`,
    dayText,
    secondsRatio: (now.getSeconds() + ms / 1000) / 60,
  };
}

/**
 * Procedural seabed height function (ridges, central sanctuary basin, spiral reef mounds)
 */
function sampleSeabedHeight(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  const ridge =
    Math.sin(x * 0.085) * Math.cos(z * 0.085) * 2.2 +
    Math.sin(x * 0.21 + z * 0.17) * 0.85;
  const bowl = Math.min(4.8, (dist / 36) * (dist / 36) * 3.4);
  return -11.5 + ridge + bowl;
}

/**
 * Builds a custom procedural 3D Manta Ray geometry (swept diamond wings + cephalic horns + long tail)
 */
function createMantaGeometry(): THREE.BufferGeometry {
  const segX = 28;
  const segZ = 18;
  const geom = new THREE.PlaneGeometry(6.4, 4.6, segX, segZ);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const rawX = pos.getX(i); // -3.2 to +3.2 (wingspan)
    const rawZ = pos.getZ(i); // -2.3 (head) to +2.3 (tail)

    const u = rawX / 3.2; // -1 to 1
    const v = rawZ / 2.3; // -1 (front) to 1 (back)

    // Shape the diamond manta wing profile along Z
    let wingEnvelope = 0;
    if (v < -0.15) {
      // Forward swept leading edge + cephalic lobes near center
      const t = (v + 1) / 0.85; // 0 at front tip, 1 at max wingspan
      wingEnvelope = Math.pow(Math.max(0, t), 0.72);
    } else {
      // Curved trailing edge tapering into slender tail
      const t = Math.max(0, (1 - v) / 1.15);
      wingEnvelope = Math.pow(t, 1.45);
    }

    let shapedX = rawX * wingEnvelope;
    let shapedZ = rawZ;
    let shapedY = 0;

    // Cephalic fins (front horns) when near the head and slightly off-center
    if (v < -0.65 && Math.abs(u) < 0.45) {
      const hornOffset = Math.abs(u) * 1.4;
      shapedX = Math.sign(u) * (0.28 + hornOffset * 0.45);
      shapedZ -= (1 - Math.abs(u)) * 0.35;
    }

    // Long slender tail extension at the back
    if (v > 0.55 && Math.abs(u) < 0.16) {
      const tailFactor = (v - 0.55) / 0.45;
      shapedX *= 0.18 * (1 - tailFactor * 0.7);
      shapedZ += tailFactor * 2.6;
    }

    // Subtle body thickness arch along the central spine
    const spineProximity = Math.exp(-Math.pow(shapedX * 1.25, 2));
    const bodyArch = spineProximity * (1 - Math.abs(v) * 0.75) * 0.42;
    shapedY += bodyArch;

    pos.setXYZ(i, shapedX, shapedY, shapedZ);

    // Bioluminescent dorsal markings: deep abyssal teal back with glowing cyan wingtips & spine
    const tipGlow = Math.min(1, Math.abs(shapedX) / 2.5);
    const pattern =
      0.5 + 0.5 * Math.sin(shapedZ * 2.718 + Math.abs(shapedX) * 1.8);
    colors[i * 3 + 0] = 0.08 + tipGlow * 0.22 + spineProximity * 0.12;
    colors[i * 3 + 1] = 0.38 + tipGlow * 0.48 + pattern * 0.14;
    colors[i * 3 + 2] = 0.58 + tipGlow * 0.42;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds a procedural Stone Whale Tail monument & Napier 2.718 spiral arch on the seabed
 */
function createStoneWhaleMonument(
  primaryHex: string,
  secondaryHex: string
): THREE.Group {
  const monument = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#13293d'),
    roughness: 0.78,
    metalness: 0.15,
    emissive: new THREE.Color(primaryHex),
    emissiveIntensity: 0.08,
  });

  // 1. Sculpted Stone Whale Tail rising from the seabed
  const tailGroup = new THREE.Group();
  const stemGeom = new THREE.CylinderGeometry(1.1, 2.1, 7.5, 12, 8);
  const stemPos = stemGeom.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < stemPos.count; i++) {
    const y = stemPos.getY(i);
    const bend = Math.pow((y + 3.75) / 7.5, 1.8) * 1.8;
    stemPos.setZ(i, stemPos.getZ(i) * 0.65 - bend);
  }
  stemGeom.computeVertexNormals();
  const stemMesh = new THREE.Mesh(stemGeom, stoneMat);
  stemMesh.position.set(0, 3.2, 0);
  tailGroup.add(stemMesh);

  // Left and Right Whale Flukes
  for (let side = -1; side <= 1; side += 2) {
    const flukeGeom = new THREE.ConeGeometry(2.2, 5.8, 10, 4);
    flukeGeom.scale(0.32, 1.0, 0.85);
    flukeGeom.rotateZ(side * -1.12);
    flukeGeom.rotateX(0.32);
    const flukeMesh = new THREE.Mesh(flukeGeom, stoneMat);
    flukeMesh.position.set(side * 2.4, 6.8, -1.65);
    tailGroup.add(flukeMesh);
  }

  tailGroup.position.set(-6, sampleSeabedHeight(-6, -8) - 0.5, -8);
  tailGroup.rotation.y = 0.45;
  monument.add(tailGroup);

  // 2. Logarithmic Spiral (r = a * e^(0.125 * theta)) Glowing Sanctuary Stones
  const runeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(secondaryHex),
    emissive: new THREE.Color(primaryHex),
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.3,
  });

  for (let i = 0; i < 16; i++) {
    const theta = i * 0.52;
    const r = 2.4 * Math.exp(0.125 * theta);
    const sx = Math.cos(theta) * r;
    const sz = Math.sin(theta) * r;
    const sy = sampleSeabedHeight(sx, sz);
    const h = 1.2 + (i % 4) * 0.65;

    const pillarGeom = new THREE.CylinderGeometry(0.18, 0.34, h, 7);
    const pillar = new THREE.Mesh(pillarGeom, i % 3 === 0 ? runeMat : stoneMat);
    pillar.position.set(sx, sy + h * 0.45, sz);
    pillar.rotation.z = Math.sin(theta) * 0.14;
    monument.add(pillar);
  }

  return monument;
}

export const AbyssalAquariumCanvas: React.FC<AbyssalAquariumCanvasProps> = ({
  state,
  resetSignal,
  uiHidden,
  onToggleUiHidden,
  onChangeState,
  canvasRefOut,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<NapierClockState>(state);
  const lastChimeMinuteRef = useRef<number>(new Date().getMinutes());
  const [timeDisplay, setTimeDisplay] = useState<TimeDisplay>(getTimeDisplay);
  const [webglError, setWebglError] = useState<boolean>(false);

  // Touch / Virtual Swim Pad state for Free-Swim mode on iPad & Desktop
  const swimControlsRef = useRef({
    forward: 0,
    strafe: 0,
    vertical: 0,
    yawDelta: 0,
    pitchDelta: 0,
  });

  useEffect(() => {
    stateRef.current = state;
    soundEngine.setAbyssalSound(state.soundEnabled && state.abyssalSound);
    soundEngine.setBonfireSound(state.soundEnabled && state.bonfireSound);
    soundEngine.setAbyssalDepthTone(state.abyssalDepthTone);
    soundEngine.setBonfireWarmth(state.bonfireWarmth);
    soundEngine.setReverbDepth(state.reverbDepth);
    soundEngine.setDeepDrone(state.soundEnabled && state.harmonicDrone);
  }, [state]);

  // Real-time Clock & Minute Chime Interval
  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextTime = getTimeDisplay();
      setTimeDisplay(nextTime);

      const now = new Date();
      const currentMinute = now.getMinutes();
      if (now.getSeconds() === 0 && currentMinute !== lastChimeMinuteRef.current) {
        lastChimeMinuteRef.current = currentMinute;
        if (stateRef.current.soundEnabled && stateRef.current.autoChime) {
          soundEngine.playClockBell(true, false);
        }
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, []);

  // Main Three.js 3D Underwater World Lifecycle
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
      setWebglError(true);
      return;
    }

    const dprCap =
      stateRef.current.qualityLevel === 'high'
        ? Math.min(window.devicePixelRatio || 1, 2)
        : stateRef.current.qualityLevel === 'medium'
        ? 1.35
        : 1.0;
    renderer.setPixelRatio(dprCap);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Clear container and mount canvas
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    canvasRefOut.current = renderer.domElement;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const palette =
      COLOR_PALETTES.find((p) => p.id === stateRef.current.paletteId) ||
      COLOR_PALETTES[0];

    const scene = new THREE.Scene();
    const deepWaterColor = new THREE.Color('#041527').lerp(
      new THREE.Color(palette.canvasBg),
      0.45
    );
    scene.background = deepWaterColor;
    scene.fog = new THREE.FogExp2(deepWaterColor.getHex(), 0.021);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.3,
      140
    );
    camera.position.set(0, -1.5, 22);

    // --- 1. Underwater Lighting ---
    const ambientLight = new THREE.HemisphereLight(
      palette.secondary,
      '#020a14',
      1.35
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(palette.accent, 2.2);
    sunLight.position.set(12, 38, 16);
    scene.add(sunLight);

    const biolumeLight = new THREE.PointLight(palette.primary, 2.8, 38, 1.4);
    biolumeLight.position.set(0, -4, 0);
    scene.add(biolumeLight);

    // --- 2. Sculpted Seabed with Dynamic Caustics Texture ---
    const causticCanvas = document.createElement('canvas');
    causticCanvas.width = 256;
    causticCanvas.height = 256;
    const causticCtx = causticCanvas.getContext('2d');
    const causticTexture = new THREE.CanvasTexture(causticCanvas);
    causticTexture.wrapS = THREE.RepeatWrapping;
    causticTexture.wrapT = THREE.RepeatWrapping;
    causticTexture.repeat.set(7, 7);

    const updateCausticsTexture = (tSec: number) => {
      if (!causticCtx) return;
      causticCtx.fillStyle = '#05182c';
      causticCtx.fillRect(0, 0, 256, 256);
      causticCtx.globalCompositeOperation = 'lighter';
      const intensity = stateRef.current.causticsIntensity;

      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2 + tSec * 0.35;
        const cx = 128 + Math.cos(angle * 1.3 + tSec * 0.5) * 90;
        const cy = 128 + Math.sin(angle * 1.7 - tSec * 0.4) * 90;
        const r = 34 + 18 * Math.sin(tSec * 2.1 + i);
        const grad = causticCtx.createRadialGradient(cx, cy, 2, cx, cy, r);
        grad.addColorStop(0, `rgba(56, 189, 248, ${0.16 * intensity})`);
        grad.addColorStop(0.5, `rgba(34, 211, 238, ${0.08 * intensity})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        causticCtx.fillStyle = grad;
        causticCtx.beginPath();
        causticCtx.arc(cx, cy, r, 0, Math.PI * 2);
        causticCtx.fill();
      }
      causticCtx.globalCompositeOperation = 'source-over';
      causticTexture.needsUpdate = true;
    };
    updateCausticsTexture(0);

    const seabedGeom = new THREE.PlaneGeometry(130, 130, 72, 72);
    seabedGeom.rotateX(-Math.PI / 2);
    const seabedPos = seabedGeom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < seabedPos.count; i++) {
      const vx = seabedPos.getX(i);
      const vz = seabedPos.getZ(i);
      seabedPos.setY(i, sampleSeabedHeight(vx, vz));
    }
    seabedGeom.computeVertexNormals();

    const seabedMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0c2d48'),
      emissive: new THREE.Color(palette.primary),
      emissiveMap: causticTexture,
      emissiveIntensity: 0.95,
      roughness: 0.85,
      metalness: 0.08,
    });
    const seabedMesh = new THREE.Mesh(seabedGeom, seabedMeshMaterialGuard(seabedMat));
    scene.add(seabedMesh);

    // --- 3. Sunken Stone Whale Tail & 2.718 Spiral Reef Monument ---
    const whaleMonument = createStoneWhaleMonument(
      palette.primary,
      palette.secondary
    );
    scene.add(whaleMonument);

    // --- 4. Volumetric Surface Light Rays (God Rays Curtains) ---
    const lightRayGroup = new THREE.Group();
    const rayMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.accent),
      transparent: true,
      opacity: 0.09 * stateRef.current.causticsIntensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const lightRays: { mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const topR = 0.9 + (i % 3) * 0.55;
      const botR = topR * 3.4;
      const coneGeom = new THREE.CylinderGeometry(topR, botR, 38, 12, 1, true);
      const rayMesh = new THREE.Mesh(coneGeom, rayMat);
      const angle = (i / 16) * Math.PI * 2;
      const dist = 5 + (i % 4) * 6.5;
      const bx = Math.cos(angle) * dist;
      const bz = Math.sin(angle) * dist - 3;
      rayMesh.position.set(bx, 8, bz);
      rayMesh.rotation.z = -0.18 + (i % 3) * 0.05;
      rayMesh.rotation.x = 0.12;
      lightRayGroup.add(rayMesh);
      lightRays.push({ mesh: rayMesh, baseX: bx, baseZ: bz, phase: i * 0.85 });
    }
    scene.add(lightRayGroup);

    // --- 5. Swaying 1/f Kelp Forests & Glowing Coral Fans ---
    const kelpGroup = new THREE.Group();
    const kelpStrands: KelpStrand[] = [];
    const kelpMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0d9488'),
      emissive: new THREE.Color(palette.primary),
      emissiveIntensity: 0.22,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });

    const totalKelp = Math.floor(85 * stateRef.current.kelpDensity);
    for (let i = 0; i < totalKelp; i++) {
      // Place kelp in organic clusters around the spiral sanctuary
      const clusterAngle = (i / Math.max(1, totalKelp)) * Math.PI * 6.5;
      const r = 4.5 + (i % 7) * 3.8;
      const kx = Math.cos(clusterAngle) * r + Math.sin(i * 3.1) * 2.2;
      const kz = Math.sin(clusterAngle) * r + Math.cos(i * 2.7) * 2.2;
      const ky = sampleSeabedHeight(kx, kz);
      const height = 4.2 + (i % 5) * 1.65;
      const width = 0.34 + (i % 3) * 0.12;

      const bladeGeom = new THREE.PlaneGeometry(width, height, 2, 12);
      bladeGeom.translate(0, height / 2, 0);
      const bladePos = bladeGeom.attributes.position as THREE.BufferAttribute;
      const basePositions = new Float32Array(bladePos.array.length);
      basePositions.set(bladePos.array);

      const bladeMesh = new THREE.Mesh(bladeGeom, kelpMat);
      bladeMesh.position.set(kx, ky - 0.2, kz);
      bladeMesh.rotation.y = (i * 1.618) % (Math.PI * 2);
      kelpGroup.add(bladeMesh);

      kelpStrands.push({
        mesh: bladeMesh,
        basePositions,
        x: kx,
        z: kz,
        height,
        phase: i * 0.718,
      });
    }
    scene.add(kelpGroup);

    // --- 6. Gracefully Flapping 3D Manta Rays ---
    const mantaGroup = new THREE.Group();
    const mantaEntities: MantaEntity[] = [];
    const baseMantaGeom = createMantaGeometry();
    const mantaMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.32,
      metalness: 0.18,
      emissive: new THREE.Color(palette.primary),
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide,
    });

    const mantaTotal = Math.max(1, Math.min(12, stateRef.current.mantaCount));
    for (let i = 0; i < mantaTotal; i++) {
      const geomClone = baseMantaGeom.clone();
      const posAttr = geomClone.attributes.position as THREE.BufferAttribute;
      const basePositions = new Float32Array(posAttr.array.length);
      basePositions.set(posAttr.array);

      const mesh = new THREE.Mesh(geomClone, mantaMat);
      const scale = i === 0 ? 1.25 : 0.72 + (i % 3) * 0.22;
      mesh.scale.setScalar(scale);

      const holder = new THREE.Group();
      holder.add(mesh);
      mantaGroup.add(holder);

      mantaEntities.push({
        group: holder,
        mesh,
        basePositions,
        orbitRadius: 9 + i * 3.4,
        orbitSpeed: (0.19 - i * 0.012) * (i % 2 === 0 ? 1 : -1),
        orbitAngle: (i / mantaTotal) * Math.PI * 2,
        baseY: 1.5 - (i % 3) * 2.2,
        verticalAmp: 1.4 + (i % 2) * 0.8,
        phase: i * Math.E,
        wingSpan: 3.2,
      });
    }
    scene.add(mantaGroup);

    // --- 7. 3D Boids Schools of Fish (InstancedMesh) ---
    const maxBoids = Math.max(40, Math.min(360, stateRef.current.boidsCount));
    const fishGeom = new THREE.ConeGeometry(0.14, 0.62, 6);
    fishGeom.scale(0.55, 1.0, 1.15);
    fishGeom.rotateX(Math.PI / 2);

    const fishMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.accent),
      emissive: new THREE.Color(palette.primary),
      emissiveIntensity: 0.58,
      roughness: 0.25,
      metalness: 0.4,
    });

    const boidsInstanced = new THREE.InstancedMesh(fishGeom, fishMat, maxBoids);
    boidsInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const boidsData: BoidFish[] = [];
    const colorHelper = new THREE.Color();
    for (let i = 0; i < maxBoids; i++) {
      const schoolId = i % 3;
      const angle = (i / maxBoids) * Math.PI * 6;
      const r = 5 + schoolId * 5 + Math.random() * 6;
      const pos = new THREE.Vector3(
        Math.cos(angle) * r,
        -2.5 + (Math.random() - 0.5) * 6,
        Math.sin(angle) * r
      );
      const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle))
        .normalize()
        .multiplyScalar(0.09);

      boidsData.push({
        pos,
        vel: tangent,
        schoolId,
        phase: Math.random() * Math.PI * 2,
        scale: 0.75 + Math.random() * 0.55,
      });

      colorHelper.set(
        schoolId === 0
          ? palette.primary
          : schoolId === 1
          ? palette.secondary
          : palette.accent
      );
      boidsInstanced.setColorAt(i, colorHelper);
    }
    if (boidsInstanced.instanceColor) {
      boidsInstanced.instanceColor.needsUpdate = true;
    }
    scene.add(boidsInstanced);

    // --- 8. Bioluminescent Marine Snow & Rising Bubbles ---
    const snowCount = 420;
    const snowGeom = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3 + 0] = (Math.random() - 0.5) * 70;
      snowPositions[i * 3 + 1] = -11 + Math.random() * 24;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    snowGeom.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snowMat = new THREE.PointsMaterial({
      color: new THREE.Color(palette.accent),
      size: 0.19,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const snowPoints = new THREE.Points(snowGeom, snowMat);
    scene.add(snowPoints);

    // --- 9. Interactive Touch / Pointer Bioluminescent Attractor ---
    const attractorTarget = new THREE.Vector3(0, -1, 0);
    let attractorStrength = 0;
    const attractorOrbGeom = new THREE.SphereGeometry(0.38, 16, 16);
    const attractorOrbMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.accent),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const attractorOrb = new THREE.Mesh(attractorOrbGeom, attractorOrbMat);
    scene.add(attractorOrb);

    // Camera navigation state
    const camPos = new THREE.Vector3(0, -1.2, 21);
    let camYaw = 0;
    let camPitch = -0.06;
    let userOrbitYawOffset = 0;
    let userOrbitPitchOffset = 0;
    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;

    // Keyboard listeners for WASD / Arrow swimming
    const keysPressed = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Pointer / Touch interaction on the 3D canvas
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const updatePointerAttractor = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      raycaster.ray.at(15, attractorTarget);
      attractorTarget.y = Math.max(-8.5, Math.min(6, attractorTarget.y));
      attractorStrength = 1.0;
    };

    const onPointerDown = (e: PointerEvent) => {
      soundEngine.unlockAudio();
      isDragging = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      updatePointerAttractor(e.clientX, e.clientY);

      const rect = renderer.domElement.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / Math.max(1, rect.width);
      const normY = (e.clientY - rect.top) / Math.max(1, rect.height);
      soundEngine.playBubbleRipple(
        normX,
        normY,
        stateRef.current.soundEnabled,
        90
      );
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevPointerX;
      const dy = e.clientY - prevPointerY;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;

      if (stateRef.current.cameraMode === 'free') {
        camYaw -= dx * 0.0045;
        camPitch = Math.max(-1.05, Math.min(1.05, camPitch - dy * 0.0045));
      } else {
        userOrbitYawOffset -= dx * 0.0045;
        userOrbitPitchOffset = Math.max(
          -0.55,
          Math.min(0.55, userOrbitPitchOffset - dy * 0.0035)
        );
      }

      updatePointerAttractor(e.clientX, e.clientY);
      const rect = renderer.domElement.getBoundingClientRect();
      soundEngine.playBubbleRipple(
        (e.clientX - rect.left) / Math.max(1, rect.width),
        (e.clientY - rect.top) / Math.max(1, rect.height),
        stateRef.current.soundEnabled,
        150
      );
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Resize Observer
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Dummy object for fast InstancedMesh matrix updates
    const dummy = new THREE.Object3D();
    const forwardVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();
    const targetLook = new THREE.Vector3();
    let animId = 0;
    let lastCausticUpdate = 0;

    const animate = (nowMs: number) => {
      const tSec = nowMs * 0.001;
      const curState = stateRef.current;

      // Update Caustic Seabed Texture at ~20fps for smooth performance
      if (nowMs - lastCausticUpdate > 48) {
        updateCausticsTexture(tSec);
        lastCausticUpdate = nowMs;
      }

      // 1. Update Volumetric Light Rays
      rayMat.opacity = 0.085 * curState.causticsIntensity;
      for (let i = 0; i < lightRays.length; i++) {
        const lr = lightRays[i];
        lr.mesh.position.x = lr.baseX + Math.sin(tSec * 0.45 + lr.phase) * 1.4;
        lr.mesh.rotation.z =
          -0.16 + Math.sin(tSec * 0.368 + lr.phase) * 0.06;
      }

      // 2. Update Swaying 1/f Kelp Forest
      const currentWindX =
        Math.sin(tSec * 1.05) * 0.55 + Math.sin(tSec * Math.E * 0.5) * 0.35;
      const currentWindZ =
        Math.cos(tSec * 0.85) * 0.45 + Math.cos(tSec * 1.718) * 0.25;

      for (let i = 0; i < kelpStrands.length; i++) {
        const ks = kelpStrands[i];
        const posAttr = ks.mesh.geometry.attributes
          .position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const base = ks.basePositions;

        for (let v = 0; v < posAttr.count; v++) {
          const idx = v * 3;
          const by = base[idx + 1];
          const heightRatio = by / ks.height;
          const bendFactor = Math.pow(heightRatio, 1.65);
          const wave =
            Math.sin(tSec * 1.85 + ks.phase + by * 0.7) * 0.48 * bendFactor;

          arr[idx + 0] = base[idx + 0] + (currentWindX * 0.55 + wave);
          arr[idx + 2] =
            base[idx + 2] + currentWindZ * 0.45 * bendFactor;
        }
        posAttr.needsUpdate = true;
      }

      // 3. Update Gracefully Flapping 3D Manta Rays
      for (let i = 0; i < mantaEntities.length; i++) {
        const m = mantaEntities[i];
        const angle = m.orbitAngle + tSec * m.orbitSpeed;
        const nextAngle = angle + m.orbitSpeed * 0.05;

        // Figure-eight / Napier spiral modulation on orbit radius
        const rMod =
          m.orbitRadius * (1 + 0.18 * Math.sin(tSec * 0.368 + m.phase));
        const mx = Math.cos(angle) * rMod;
        const mz = Math.sin(angle) * rMod;
        const my =
          m.baseY + Math.sin(tSec * 0.75 + m.phase) * m.verticalAmp;

        const nextX = Math.cos(nextAngle) * rMod;
        const nextZ = Math.sin(nextAngle) * rMod;
        const nextY =
          m.baseY + Math.sin((tSec + 0.05) * 0.75 + m.phase) * m.verticalAmp;

        m.group.position.set(mx, my, mz);
        m.group.lookAt(nextX, nextY, nextZ);
        // Subtle banking roll into turns
        m.mesh.rotation.z =
          -m.orbitSpeed * 0.85 + Math.sin(tSec * 0.9 + m.phase) * 0.08;

        // Wing undulation vertex animation (traveling wave from spine to wingtip)
        const posAttr = m.mesh.geometry.attributes
          .position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const base = m.basePositions;

        for (let v = 0; v < posAttr.count; v++) {
          const idx = v * 3;
          const bx = base[idx + 0];
          const by = base[idx + 1];
          const bz = base[idx + 2];

          const spanRatio = Math.abs(bx) / m.wingSpan;
          const flapWave =
            Math.sin(tSec * 2.718 - spanRatio * 1.85 - bz * 0.28 + m.phase) *
            Math.pow(spanRatio, 1.35) *
            0.95;
          const tailWave =
            bz > 1.0
              ? Math.sin(tSec * 3.4 - bz * 0.9 + m.phase) *
                ((bz - 1.0) * 0.12)
              : 0;

          arr[idx + 1] = by + flapWave + tailWave;
        }
        posAttr.needsUpdate = true;
        m.mesh.geometry.computeVertexNormals();
      }

      // 4. Update 3D Boids Schools of Fish
      attractorStrength *= 0.965;
      attractorOrb.position.copy(attractorTarget);
      attractorOrbMat.opacity = attractorStrength * 0.55;
      attractorOrb.scale.setScalar(0.6 + attractorStrength * 1.2);
      biolumeLight.position.lerp(attractorTarget, 0.08);

      const bexp = curState.spiralExponent;
      const liftFactor = curState.antiGravityLift;

      for (let i = 0; i < boidsData.length; i++) {
        const b = boidsData[i];
        let sepX = 0,
          sepY = 0,
          sepZ = 0;
        let alignX = 0,
          alignY = 0,
          alignZ = 0;
        let cohX = 0,
          cohY = 0,
          cohZ = 0;
        let neighbors = 0;

        // Sample a strided subset of neighbors for fast O(N) 60fps Boids
        const stride = boidsData.length > 180 ? 3 : 2;
        for (let j = i % stride; j < boidsData.length; j += stride) {
          if (i === j) continue;
          const other = boidsData[j];
          const dx = b.pos.x - other.pos.x;
          const dy = b.pos.y - other.pos.y;
          const dz = b.pos.z - other.pos.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < 18.0 && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            if (dist < 1.65) {
              const push = (1.65 - dist) / dist;
              sepX += dx * push;
              sepY += dy * push;
              sepZ += dz * push;
            }
            if (b.schoolId === other.schoolId) {
              alignX += other.vel.x;
              alignY += other.vel.y;
              alignZ += other.vel.z;
              cohX += other.pos.x;
              cohY += other.pos.y;
              cohZ += other.pos.z;
              neighbors++;
            }
          }
        }

        if (neighbors > 0) {
          alignX /= neighbors;
          alignY /= neighbors;
          alignZ /= neighbors;
          b.vel.x += (alignX - b.vel.x) * 0.045;
          b.vel.y += (alignY - b.vel.y) * 0.045;
          b.vel.z += (alignZ - b.vel.z) * 0.045;

          cohX = cohX / neighbors - b.pos.x;
          cohY = cohY / neighbors - b.pos.y;
          cohZ = cohZ / neighbors - b.pos.z;
          b.vel.x += cohX * 0.0035;
          b.vel.y += cohY * 0.0035;
          b.vel.z += cohZ * 0.0035;
        }

        b.vel.x += sepX * 0.028;
        b.vel.y += sepY * 0.028;
        b.vel.z += sepZ * 0.028;

        // Logarithmic 2.718 spiral reef current around sanctuary center
        const angleC = Math.atan2(b.pos.z, b.pos.x);
        const tangentAngle = angleC + Math.PI / 2 - bexp * 0.85;
        b.vel.x += Math.cos(tangentAngle) * 0.0028 * liftFactor;
        b.vel.z += Math.sin(tangentAngle) * 0.0028 * liftFactor;

        // Touch / Pointer Bioluminescent Attractor Pull
        if (attractorStrength > 0.08) {
          const toAttrX = attractorTarget.x - b.pos.x;
          const toAttrY = attractorTarget.y - b.pos.y;
          const toAttrZ = attractorTarget.z - b.pos.z;
          const distAttr = Math.hypot(toAttrX, toAttrY, toAttrZ);
          if (distAttr < 22 && distAttr > 1.2) {
            const pull = (1 - distAttr / 22) * 0.009 * attractorStrength;
            b.vel.x += (toAttrX / distAttr) * pull;
            b.vel.y += (toAttrY / distAttr) * pull;
            b.vel.z += (toAttrZ / distAttr) * pull;
          }
        }

        // Soft sanctuary boundary containment
        const radialDist = Math.hypot(b.pos.x, b.pos.z);
        if (radialDist > 26) {
          b.vel.x -= (b.pos.x / radialDist) * 0.009;
          b.vel.z -= (b.pos.z / radialDist) * 0.009;
        }
        const floorY = sampleSeabedHeight(b.pos.x, b.pos.z) + 1.4;
        if (b.pos.y < floorY) {
          b.vel.y += 0.015;
        } else if (b.pos.y > 6.5) {
          b.vel.y -= 0.012;
        }

        // Speed clamping
        const speed = b.vel.length();
        const maxSpeed = 0.145 * (0.75 + liftFactor * 0.3);
        const minSpeed = 0.055;
        if (speed > maxSpeed) {
          b.vel.multiplyScalar(maxSpeed / speed);
        } else if (speed < minSpeed && speed > 0.0001) {
          b.vel.multiplyScalar(minSpeed / speed);
        }

        b.pos.add(b.vel);

        // Swim tail wiggle
        const swimWiggle = Math.sin(tSec * 9.5 + b.phase) * 0.16;
        dummy.position.copy(b.pos);
        targetLook.copy(b.pos).add(b.vel);
        dummy.lookAt(targetLook);
        dummy.rotateY(swimWiggle);
        dummy.scale.setScalar(b.scale);
        dummy.updateMatrix();
        boidsInstanced.setMatrixAt(i, dummy.matrix);
      }
      boidsInstanced.instanceMatrix.needsUpdate = true;

      // 5. Update Bioluminescent Marine Snow & Rising Bubbles
      const snowPosAttr = snowGeom.attributes.position as THREE.BufferAttribute;
      const snowArr = snowPosAttr.array as Float32Array;
      for (let i = 0; i < snowCount; i++) {
        const idx = i * 3;
        snowArr[idx + 1] += (0.012 + (i % 5) * 0.006) * liftFactor;
        snowArr[idx + 0] += Math.sin(tSec * 0.8 + i) * 0.008;
        if (snowArr[idx + 1] > 12) {
          snowArr[idx + 1] = -11;
        }
      }
      snowPosAttr.needsUpdate = true;

      // 6. Update Camera Choreography (Auto-Cruise vs Free-Swim)
      if (curState.cameraMode === 'cruise') {
        // Decay manual look offset gently back toward the scenic cruise
        if (!isDragging) {
          userOrbitYawOffset *= 0.992;
          userOrbitPitchOffset *= 0.992;
        }
        const cruiseAngle = tSec * 0.095 + userOrbitYawOffset;
        const cruiseRadius = 18.5 + Math.sin(tSec * 0.18) * 3.5;
        const targetCamX = Math.cos(cruiseAngle) * cruiseRadius;
        const targetCamZ = Math.sin(cruiseAngle) * cruiseRadius;
        const targetCamY =
          -1.2 + Math.sin(tSec * 0.24) * 2.1 + userOrbitPitchOffset * 6.0;

        camPos.lerp(
          new THREE.Vector3(targetCamX, targetCamY, targetCamZ),
          0.04
        );
        camera.position.copy(camPos);

        const lookX = Math.sin(tSec * 0.15) * 3.5;
        const lookY = -1.8 + userOrbitPitchOffset * 4.0;
        const lookZ = Math.cos(tSec * 0.12) * 3.5 - 2.0;
        camera.lookAt(lookX, lookY, lookZ);
      } else {
        // Free-Swim Mode (Keyboard WASD/Arrows + On-Screen Swim Pad + Touch Drag Look)
        const swimCtrl = swimControlsRef.current;
        camYaw += swimCtrl.yawDelta * 0.03;
        camPitch = Math.max(
          -1.05,
          Math.min(1.05, camPitch + swimCtrl.pitchDelta * 0.025)
        );

        let moveForward = swimCtrl.forward;
        let moveStrafe = swimCtrl.strafe;
        let moveVert = swimCtrl.vertical;

        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) moveForward += 1;
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) moveForward -= 1;
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) moveStrafe += 1;
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) moveStrafe -= 1;
        if (keysPressed.has('Space') || keysPressed.has('KeyE')) moveVert += 1;
        if (keysPressed.has('ShiftLeft') || keysPressed.has('KeyQ')) moveVert -= 1;

        forwardVec.set(
          -Math.sin(camYaw) * Math.cos(camPitch),
          Math.sin(camPitch),
          -Math.cos(camYaw) * Math.cos(camPitch)
        ).normalize();

        rightVec.set(Math.cos(camYaw), 0, -Math.sin(camYaw)).normalize();

        const swimSpeed = 0.16;
        camPos.addScaledVector(forwardVec, moveForward * swimSpeed);
        camPos.addScaledVector(rightVec, moveStrafe * swimSpeed);
        camPos.y += moveVert * swimSpeed * 0.85;

        // Keep swimmer above the seabed rock collision and below the water surface
        const minSeabedY = sampleSeabedHeight(camPos.x, camPos.z) + 1.6;
        camPos.y = Math.max(minSeabedY, Math.min(9.5, camPos.y));
        camPos.x = Math.max(-52, Math.min(52, camPos.x));
        camPos.z = Math.max(-52, Math.min(52, camPos.z));

        camera.position.copy(camPos);
        targetLook.copy(camPos).add(forwardVec);
        camera.lookAt(targetLook);
      }

      renderer.render(scene, camera);
      animId = window.requestAnimationFrame(animate);
    };

    animId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domElem.removeEventListener('pointerdown', onPointerDown);
      domElem.removeEventListener('webglcontextlost', handleContextLost);
      renderer.dispose();
    };
  }, [
    resetSignal,
    state.paletteId,
    state.mantaCount,
    state.boidsCount,
    state.kelpDensity,
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
      {/* 3D WebGL Viewport Container */}
      <div
        ref={containerRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing touch-none"
        aria-label="2.718 深海水槽 — 3D Abyssal Garden"
      />

      {webglError && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#03101f] text-slate-200 p-6 text-center">
          <p className="text-sm">
            WebGL 3D表示を初期化できませんでした。ブラウザの設定を確認するか、「焚き火時計」モードへ切り替えてください。
          </p>
        </div>
      )}

      {/* 2.718 Timepiece Overlay inside the Abyssal Aquarium */}
      {state.showClockOverlay && (
        <div
          className={`fixed ${clockPositionClasses} pointer-events-none z-10 px-6 transition-all duration-500`}
        >
          <div
            className="relative flex flex-col items-center justify-center rounded-full px-10 py-9 transition-all duration-300"
            style={{
              width: state.showAnalogRing ? '316px' : 'auto',
              height: state.showAnalogRing ? '316px' : 'auto',
              backgroundColor: `rgba(3, 16, 31, ${state.glassFrost})`,
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
                  ? '1px solid rgba(165, 243, 252, 0.14)'
                  : '1px solid transparent',
              boxShadow:
                state.glassFrost > 0.05
                  ? `0 24px 70px rgba(0, 0, 0, 0.45), inset 0 0 32px ${activePalette.primary}18`
                  : 'none',
            }}
          >
            {/* 60-Second Orbital Ring + 27:18 Timer Progress Ring */}
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
                  style={{ opacity: 0.85 }}
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
            <div className="flex items-center gap-2.5 text-[11px] font-mono tracking-[0.22em] text-cyan-100/85 uppercase mb-1">
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
                textShadow: `0 2px 32px ${activePalette.primary}44, 0 4px 16px rgba(0,0,0,0.75)`,
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

            {/* Active 27:18 Timer or Abyssal Mathematical Formula Readout */}
            {state.timerActive ? (
              <div className="mt-2.5 flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-950/75 border border-cyan-400/30 text-xs font-mono tracking-wider text-cyan-200">
                <span>2.718 TIMER</span>
                <span>·</span>
                <span className="font-semibold text-white">
                  {timerMinutes}:{timerSeconds}
                </span>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono tracking-[0.12em] text-cyan-100/75">
                <span>e ≈ 2.718</span>
                <span>·</span>
                <span>Boids={state.boidsCount}</span>
                <span>·</span>
                <span>Manta={state.mantaCount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Swim Mode & Clock Visibility Pill (Top-Left below header, hidden when uiHidden) */}
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
                ? 'bg-cyan-500/25 text-cyan-100 border-cyan-400/60 shadow-lg'
                : 'bg-slate-950/65 text-slate-200 border-white/15 hover:text-white'
            }`}
          >
            {state.cameraMode === 'free' ? (
              <>
                <Navigation className="w-3.5 h-3.5 text-cyan-300" />
                <span>自由遊泳モード（ドラッグで視点・パッド/WASDで移動）</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-cyan-300" />
                <span>自動クルーズ中（タップで自由遊泳へ）</span>
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
            <Eye className="w-3.5 h-3.5 text-cyan-300" />
            <span>{state.showClockOverlay ? '時計表示: ON' : '時計表示: OFF'}</span>
          </button>
        </div>
      )}

      {/* Touch / iPad On-Screen Swim Controller when in Free-Swim Mode */}
      {!uiHidden && state.cameraMode === 'free' && (
        <div className="fixed bottom-20 left-5 z-20 flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/70 border border-cyan-400/25 backdrop-blur-md pointer-events-auto">
          <div className="grid grid-cols-3 gap-1 w-28">
            <div />
            <button
              type="button"
              onPointerDown={() => {
                swimControlsRef.current.forward = 1;
              }}
              onPointerUp={() => {
                swimControlsRef.current.forward = 0;
              }}
              onPointerLeave={() => {
                swimControlsRef.current.forward = 0;
              }}
              className="py-2 rounded-lg bg-slate-900/90 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono border border-white/10 active:bg-cyan-400/40 cursor-pointer"
            >
              前進
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => {
                swimControlsRef.current.strafe = -1;
              }}
              onPointerUp={() => {
                swimControlsRef.current.strafe = 0;
              }}
              onPointerLeave={() => {
                swimControlsRef.current.strafe = 0;
              }}
              className="py-2 rounded-lg bg-slate-900/90 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono border border-white/10 active:bg-cyan-400/40 cursor-pointer"
            >
              左
            </button>
            <div className="flex items-center justify-center text-cyan-400/60">
              <Move className="w-3.5 h-3.5" />
            </div>
            <button
              type="button"
              onPointerDown={() => {
                swimControlsRef.current.strafe = 1;
              }}
              onPointerUp={() => {
                swimControlsRef.current.strafe = 0;
              }}
              onPointerLeave={() => {
                swimControlsRef.current.strafe = 0;
              }}
              className="py-2 rounded-lg bg-slate-900/90 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono border border-white/10 active:bg-cyan-400/40 cursor-pointer"
            >
              右
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => {
                swimControlsRef.current.forward = -1;
              }}
              onPointerUp={() => {
                swimControlsRef.current.forward = 0;
              }}
              onPointerLeave={() => {
                swimControlsRef.current.forward = 0;
              }}
              className="py-2 rounded-lg bg-slate-900/90 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono border border-white/10 active:bg-cyan-400/40 cursor-pointer"
            >
              後退
            </button>
            <div />
          </div>

          <div className="flex flex-col gap-1.5 border-l border-white/10 pl-2.5">
            <button
              type="button"
              onPointerDown={() => {
                swimControlsRef.current.vertical = 1;
              }}
              onPointerUp={() => {
                swimControlsRef.current.vertical = 0;
              }}
              onPointerLeave={() => {
                swimControlsRef.current.vertical = 0;
              }}
              className="px-2.5 py-2 rounded-lg bg-slate-900/90 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono border border-white/10 active:bg-cyan-400/40 cursor-pointer"
            >
              浮上 ↑
            </button>
            <button
              type="button"
              onPointerDown={() => {
                swimControlsRef.current.vertical = -1;
              }}
              onPointerUp={() => {
                swimControlsRef.current.vertical = 0;
              }}
              onPointerLeave={() => {
                swimControlsRef.current.vertical = 0;
              }}
              className="px-2.5 py-2 rounded-lg bg-slate-900/90 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono border border-white/10 active:bg-cyan-400/40 cursor-pointer"
            >
              潜行 ↓
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

function seabedMeshMaterialGuard(mat: THREE.MeshStandardMaterial) {
  return mat;
}
