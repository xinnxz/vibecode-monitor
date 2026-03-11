/**
 * globe.js — Three.js Globe Visualization Module (Redesigned)
 *
 * Berdasarkan 3d-earth project (GhostCat) yang diadaptasi untuk Vibe Code Monitor.
 *
 * Fitur:
 * 1. Earth sphere dengan texture bumi + custom GLSL shader (scan line + Fresnel glow)
 * 2. Atmospheric glow (Fresnel shader + sprite)
 * 3. Light pillars di titik kota Indonesia (per account)
 * 4. Fly arcs antar kota
 * 5. Satellite orbits (3 ring + rotating dots)
 * 6. Wave ripple animation
 * 7. Star particles
 * 8. Labels (nama account sebagai sprite, muncul saat hover)
 * 9. GSAP entry animation
 *
 * Export: initGlobe(container), updateAccountVisuals(accounts)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';

import {
  lon2xyz,
  createLightPillar,
  createWaveMesh,
  createPointMesh,
  flyArc,
  getCirclePoints,
  createAnimateLine,
  WORLD_CITIES,
} from './globe-utils.js';

// ============================================================
// CONFIG
// ============================================================

const CONFIG = {
  earth: {
    radius: 50,
    rotateSpeed: 0.002,
  },
  satellite: {
    rotateSpeed: -0.01,
    size: 1,
    number: 2,
  },
  flyLine: {
    color: 0xf3ae76,
    flyLineColor: 0xff7714,
    speed: 0.004,
  },
  punctuation: {
    circleColor: 0x3892ff,
    lightColumn: {
      startColor: 0x00ffcc, // Cyan-hijau (available)
      endColor: 0xff4444,   // Merah (limited)
    },
  },
};

// ============================================================
// MODULE VARIABLES
// ============================================================

let scene, camera, renderer, controls;
let earthGroup, mainGroup;
let earthMesh;
let starPoints;
let moonMesh, spaceBackground;
let waveMeshArr = [];
let circleLineList = [];
let flyLineArcGroup;
let markupPointGroup;
let labelSprites = [];
let timeValue = 100;
let textures = {};
let isUserDragging = false; // Flag: true saat user hold/drag globe

// Shader uniforms untuk scan line animation
let uniforms;

// ============================================================
// TEXTURE LOADER
// ============================================================

/**
 * Load semua texture yang dibutuhkan.
 * TextureLoader Three.js menggunakan callback pattern.
 */
function loadTextures() {
  const loader = new THREE.TextureLoader();
  const basePath = import.meta.env.BASE_URL + 'textures/';

  return {
    earth: loader.load(basePath + 'earth.jpg'),
    glow: loader.load(basePath + 'glow.png'),
    gradient: loader.load(basePath + 'gradient.png'),
    aperture: loader.load(basePath + 'aperture.png'),
    light_column: loader.load(basePath + 'light_column.png'),
    label: loader.load(basePath + 'label.png'),
    redCircle: loader.load(basePath + 'redCircle.png'),
    moon: loader.load(basePath + 'moon.jpg'),
  };
}

// ============================================================
// INIT GLOBE
// ============================================================

/**
 * Inisialisasi globe scene.
 *
 * @param {HTMLElement} container
 * @returns {{ scene, camera, renderer, updateVisuals }}
 */
export function initGlobe(container) {
  textures = loadTextures();

  // --- Scene ---
  scene = new THREE.Scene();
  // NOTE: Removed FogExp2 — it was making ALL distant objects (nebula, stars, moon) invisible

  // --- Camera ---
  const aspect = getAspect();
  camera = new THREE.PerspectiveCamera(45, aspect, 1, 2000);
  camera.position.set(0, 20, 160);
  camera.lookAt(0, 0, 0);

  // --- Renderer ---
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x010204, 1);
  renderer.setSize(getWidth(), window.innerHeight);
  // Reverted to 2 for crisp, high-resolution display
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Apply maximum anisotropy to textures for ultimate crispness
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  if (textures.earth) textures.earth.anisotropy = maxAnisotropy;
  if (textures.moon) textures.moon.anisotropy = maxAnisotropy;

  // --- Controls ---
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 80;
  controls.maxDistance = 350;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // Track drag state: stop earth rotation saat user hold/drag
  controls.addEventListener('start', () => { isUserDragging = true; });
  controls.addEventListener('end', () => { isUserDragging = false; });

  // --- Groups ---
  mainGroup = new THREE.Group();
  mainGroup.name = 'mainGroup';
  mainGroup.scale.set(0, 0, 0); // Start hidden for GSAP animation
  scene.add(mainGroup);

  earthGroup = new THREE.Group();
  earthGroup.name = 'earthGroup';
  mainGroup.add(earthGroup);

  markupPointGroup = new THREE.Group();
  markupPointGroup.name = 'markupPoints';

  flyLineArcGroup = new THREE.Group();
  flyLineArcGroup.userData.flyLineArray = [];
  earthGroup.add(flyLineArcGroup);

  // --- Build Scene ---
  createEarth();
  createEarthGlow();
  createEarthAperture();
  createSpaceEnvironment();
  createSatelliteOrbits();

  // --- GSAP Entry Animation ---
  showEntryAnimation();

  // --- Events ---
  window.addEventListener('resize', onResize);

  // --- Start Animation ---
  animate();

  return {
    scene,
    camera,
    renderer,
    updateVisuals: updateAccountVisuals,
  };
}

// ============================================================
// EARTH SPHERE + SHADER
// ============================================================

function createEarth() {
  const R = CONFIG.earth.radius;

  // --- Point border (dot border around earth) ---
  const borderGeo = new THREE.SphereGeometry(R + 10, 60, 60);
  const borderMat = new THREE.PointsMaterial({
    color: 0x81ffff,
    transparent: true,
    sizeAttenuation: true,
    opacity: 0.1,
    vertexColors: false,
    size: 0.01,
  });
  const borderPoints = new THREE.Points(borderGeo, borderMat);
  earthGroup.add(borderPoints);

  // --- Shader Uniforms ---
  uniforms = {
    glowColor: { value: new THREE.Color(0x0cd1eb) },
    scale: { type: 'f', value: -1.0 },
    bias: { type: 'f', value: 1.0 },
    power: { type: 'f', value: 3.3 },
    time: { type: 'f', value: timeValue },
    isHover: { value: false },
    map: { value: textures.earth },
  };

  // --- Earth Mesh with custom ShaderMaterial ---
  const earthGeo = new THREE.SphereGeometry(R, 50, 50);

  // Vertex Shader: pass UV, normal, position to fragment
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vp;
    varying vec3 vPositionNormal;
    void main(void) {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vp = position;
      vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // Fragment Shader: Fresnel glow + scan line + earth texture
  const fragmentShader = `
    uniform vec3 glowColor;
    uniform float bias;
    uniform float power;
    uniform float time;
    varying vec3 vp;
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    uniform float scale;
    uniform sampler2D map;
    varying vec2 vUv;

    void main(void) {
      // Fresnel glow: tepi bumi lebih terang
      float a = pow(bias + scale * abs(dot(vNormal, vPositionNormal)), power);

      // Scan line: garis cahaya bergerak vertikal
      if (vp.y > time && vp.y < time + 20.0) {
        float t = smoothstep(0.0, 0.8, (1.0 - abs(0.5 - (vp.y - time) / 20.0)) / 3.0);
        gl_FragColor = mix(gl_FragColor, vec4(glowColor, 1.0), t * t);
      }

      // Apply glow
      gl_FragColor = mix(gl_FragColor, vec4(glowColor, 1.0), a);

      // Apply earth texture
      gl_FragColor = gl_FragColor + texture2D(map, vUv);
    }
  `;

  const earthMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
  });

  earthMesh = new THREE.Mesh(earthGeo, earthMat);
  earthMesh.name = 'earth';
  earthGroup.add(earthMesh);
}

// ============================================================
// ATMOSPHERIC GLOW
// ============================================================

function createEarthGlow() {
  const R = CONFIG.earth.radius;

  // Sprite glow (simple overlay)
  const spriteMaterial = new THREE.SpriteMaterial({
    map: textures.glow,
    color: 0x4390d1,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(R * 3.0, R * 3.0, 1);
  earthGroup.add(sprite);
}

function createEarthAperture() {
  const R = CONFIG.earth.radius;

  // Atmosphere shader (Fresnel-like glow around earth)
  const vertexShader = `
    varying vec3 vVertexWorldPosition;
    varying vec3 vVertexNormal;
    void main() {
      vVertexNormal = normalize(normalMatrix * normal);
      vVertexWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 glowColor;
    uniform float coeficient;
    uniform float power;
    varying vec3 vVertexNormal;
    varying vec3 vVertexWorldPosition;
    void main() {
      vec3 worldCameraToVertex = vVertexWorldPosition - cameraPosition;
      vec3 viewCameraToVertex = (viewMatrix * vec4(worldCameraToVertex, 0.0)).xyz;
      viewCameraToVertex = normalize(viewCameraToVertex);
      float intensity = pow(coeficient + dot(vVertexNormal, viewCameraToVertex), power);
      gl_FragColor = vec4(glowColor, intensity);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      coeficient: { type: 'f', value: 1.0 },
      power: { type: 'f', value: 3 },
      glowColor: { type: 'c', value: new THREE.Color(0x4390d1) },
    },
    vertexShader,
    fragmentShader,
    blending: THREE.NormalBlending,
    transparent: true,
    depthWrite: false,
  });

  const sphere = new THREE.SphereGeometry(R, 50, 50);
  const mesh = new THREE.Mesh(sphere, material);
  earthGroup.add(mesh);
}

// ============================================================
// SPACE ENVIRONMENT (Nebula, Moon, Stars)
// ============================================================

/**
 * Generate a soft radial glow texture via Canvas.
 * Used for nebula clouds and star particles.
 */
function createGlowTexture(color1, color2, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, color1);
  gradient.addColorStop(0.4, color2);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Create a single nebula sprite using a real NASA image texture.
 */
function createNebulaSprite(texturePath, x, y, z, size, opacity) {
  const loader = new THREE.TextureLoader();
  const tex = loader.load(texturePath);
  
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(size, size, 1);
  return sprite;
}

function createSpaceEnvironment() {
  // ============================
  // 1. Dark Space with painted nebulae + stars (all on one canvas)
  // ============================
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2048;
  skyCanvas.height = 1024;
  const skyCtx = skyCanvas.getContext('2d');

  // Base: near pure black deep space
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 1024);
  skyGrad.addColorStop(0, '#000102');
  skyGrad.addColorStop(0.3, '#010204');
  skyGrad.addColorStop(0.5, '#020306');
  skyGrad.addColorStop(0.7, '#010204');
  skyGrad.addColorStop(1, '#000102');
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, 2048, 1024);

  // Subtle milky way band (wide, faint diffuse glow)
  skyCtx.save();
  skyCtx.globalAlpha = 0.04;
  skyCtx.translate(1024, 450);
  skyCtx.rotate(-0.15);
  const bandGrad = skyCtx.createLinearGradient(0, -150, 0, 150);
  bandGrad.addColorStop(0, 'transparent');
  bandGrad.addColorStop(0.15, '#1a2244');
  bandGrad.addColorStop(0.3, '#2a3866');
  bandGrad.addColorStop(0.5, '#3a4888');
  bandGrad.addColorStop(0.7, '#2a3866');
  bandGrad.addColorStop(0.85, '#1a2244');
  bandGrad.addColorStop(1, 'transparent');
  skyCtx.fillStyle = bandGrad;
  skyCtx.fillRect(-1200, -150, 2400, 300);
  skyCtx.restore();

  // --- Paint realistic nebulae directly onto canvas ---
  // Each nebula is built from multiple overlapping radial gradients
  // with different colors creating complex, organic shapes.

  function paintNebula(cx, cy, layers) {
    layers.forEach(layer => {
      const { ox, oy, rx, ry, color, alpha } = layer;
      skyCtx.save();
      skyCtx.globalAlpha = alpha;
      skyCtx.translate(cx + ox, cy + oy);
      // Scale to create elliptical shapes (not perfect circles)
      skyCtx.scale(1, ry / rx);
      const g = skyCtx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, color);
      g.addColorStop(0.3, color);
      g.addColorStop(0.7, color.replace(/[\d.]+\)$/, '0.3)'));
      g.addColorStop(1, 'transparent');
      skyCtx.fillStyle = g;
      skyCtx.fillRect(-rx, -rx, rx * 2, rx * 2);
      skyCtx.restore();
    });
  }

  // Orion-like nebula — left side (blue-purple)
  paintNebula(350, 300, [
    { ox: 0, oy: 0, rx: 140, ry: 100, color: 'rgba(80, 50, 160, 0.06)', alpha: 1 },
    { ox: 30, oy: -20, rx: 100, ry: 80, color: 'rgba(60, 80, 200, 0.05)', alpha: 1 },
    { ox: -20, oy: 15, rx: 80, ry: 110, color: 'rgba(120, 40, 180, 0.04)', alpha: 1 },
    { ox: 10, oy: 5, rx: 50, ry: 40, color: 'rgba(150, 100, 255, 0.07)', alpha: 1 },
  ]);

  // Carina-like nebula — right side (warm red-orange)
  paintNebula(1500, 650, [
    { ox: 0, oy: 0, rx: 160, ry: 120, color: 'rgba(180, 50, 30, 0.05)', alpha: 1 },
    { ox: -30, oy: 20, rx: 120, ry: 90, color: 'rgba(200, 80, 20, 0.04)', alpha: 1 },
    { ox: 25, oy: -15, rx: 90, ry: 130, color: 'rgba(160, 40, 60, 0.035)', alpha: 1 },
    { ox: 5, oy: 0, rx: 60, ry: 50, color: 'rgba(255, 120, 50, 0.06)', alpha: 1 },
  ]);

  // Eagle-like nebula — upper right (green-teal)
  paintNebula(1700, 250, [
    { ox: 0, oy: 0, rx: 120, ry: 90, color: 'rgba(30, 120, 80, 0.04)', alpha: 1 },
    { ox: 20, oy: -10, rx: 90, ry: 70, color: 'rgba(40, 160, 120, 0.035)', alpha: 1 },
    { ox: -15, oy: 15, rx: 70, ry: 100, color: 'rgba(50, 200, 150, 0.03)', alpha: 1 },
  ]);

  // Small blue emission nebula — bottom center
  paintNebula(900, 850, [
    { ox: 0, oy: 0, rx: 100, ry: 80, color: 'rgba(30, 80, 200, 0.04)', alpha: 1 },
    { ox: 15, oy: -10, rx: 60, ry: 50, color: 'rgba(60, 120, 255, 0.05)', alpha: 1 },
  ]);

  // Faint golden wisp — center left
  paintNebula(600, 500, [
    { ox: 0, oy: 0, rx: 110, ry: 70, color: 'rgba(200, 150, 50, 0.03)', alpha: 1 },
    { ox: 20, oy: 10, rx: 70, ry: 50, color: 'rgba(220, 180, 80, 0.025)', alpha: 1 },
  ]);

  // --- Small twinkle stars ---
  skyCtx.fillStyle = '#ffffff';
  for (let i = 0; i < 3000; i++) {
    const sx = Math.random() * 2048;
    const sy = Math.random() * 1024;
    const sr = Math.random() * 0.8 + 0.1;
    skyCtx.globalAlpha = Math.random() * 0.6 + 0.2;
    skyCtx.beginPath();
    skyCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    skyCtx.fill();
  }
  // Brighter accent stars (fewer, larger)
  for (let i = 0; i < 80; i++) {
    const sx = Math.random() * 2048;
    const sy = Math.random() * 1024;
    const sr = Math.random() * 1.5 + 0.5;
    skyCtx.globalAlpha = Math.random() * 0.2 + 0.2;
    skyCtx.beginPath();
    skyCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    skyCtx.fill();
  }
  skyCtx.globalAlpha = 1;

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyboxGeo = new THREE.SphereGeometry(1500, 64, 64);
  const skyboxMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
  });
  spaceBackground = new THREE.Mesh(skyboxGeo, skyboxMat);
  scene.add(spaceBackground);

  // ============================
  // 3. Realistic Moon
  // ============================
  const R = CONFIG.earth.radius;
  const moonGeo = new THREE.SphereGeometry(R * 0.25, 32, 32);
  const moonMat = new THREE.MeshStandardMaterial({
    map: textures.moon,
    roughness: 0.8,
    metalness: 0.1
  });
  moonMesh = new THREE.Mesh(moonGeo, moonMat);
  moonMesh.position.set(160, 60, -100);

  const moonLight = new THREE.PointLight(0xffffff, 2, 800);
  moonLight.position.set(250, 100, 100);
  scene.add(moonLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambientLight);
  scene.add(moonMesh);

  // ============================
  // 4. Dynamic Stars (multi-color temperature)
  // ============================
  const starGlowTex = createGlowTexture(
    'rgba(255,255,255,0.9)',
    'rgba(200,220,255,0.2)',
    64
  );

  const vertices = [];
  const starColors = [];
  const c = new THREE.Color();

  for (let i = 0; i < 1500; i++) {
    const x = 2000 * Math.random() - 1000;
    const y = 2000 * Math.random() - 1000;
    const z = 2000 * Math.random() - 1000;

    // Don't place stars inside the earth area
    if (Math.abs(x) < 200 && Math.abs(y) < 200 && Math.abs(z) < 200) continue;

    vertices.push(x, y, z);

    const temp = Math.random();
    if (temp > 0.85) c.setHex(0xaabfff);      // Hot blue
    else if (temp > 0.5) c.setHex(0xffffff);   // White
    else if (temp > 0.2) c.setHex(0xffe8c8);   // Warm yellow
    else c.setHex(0xffcfa0);                    // Orange

    starColors.push(c.r, c.g, c.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(starColors), 3));

  const mat = new THREE.PointsMaterial({
    size: 0.4,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
    map: starGlowTex,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
    fog: false,
  });

  starPoints = new THREE.Points(geo, mat);
  starPoints.name = 'stars';
  scene.add(starPoints);
}

// ============================================================
// SATELLITE ORBITS
// ============================================================

function createSatelliteOrbits() {
  const R = CONFIG.earth.radius;
  const list = getCirclePoints({ radius: R + 15, number: 150, closed: true });

  const mat = new THREE.MeshBasicMaterial({
    color: '#0c3172',
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });

  const line = createAnimateLine({ pointList: list, material: mat, number: 100, radius: 0.1 });
  earthGroup.add(line);

  const l2 = line.clone();
  l2.scale.set(1.2, 1.2, 1.2);
  l2.rotateZ(Math.PI / 6);
  earthGroup.add(l2);

  const l3 = line.clone();
  l3.scale.set(0.8, 0.8, 0.8);
  l3.rotateZ(-Math.PI / 6);
  earthGroup.add(l3);

  // Satellite balls
  const ballColors = [0xe0b187, 0x628fbb, 0x806bdf];
  const lines = [line, l2, l3];

  lines.forEach((ringLine, idx) => {
    for (let i = 0; i < CONFIG.satellite.number; i++) {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(CONFIG.satellite.size, 32, 32),
        new THREE.MeshBasicMaterial({ color: ballColors[idx] })
      );
      const num = Math.floor(list.length / CONFIG.satellite.number);
      const pos = list[num * (i + 1)] || list[0];
      ball.position.set(pos[0], pos[1], pos[2]);
      ringLine.add(ball);
    }
    circleLineList.push(ringLine);
  });
}

// ============================================================
// ACCOUNT VISUALS — Light pillars, fly arcs, labels, waves
// ============================================================

/**
 * Update visual elements berdasarkan data akun.
 * Setiap akun ditempatkan di kota random di seluruh dunia.
 *
 * @param {Array} accounts - Daftar akun dari accounts.js
 */
export function updateAccountVisuals(accounts) {
  // Clear previous visuals
  earthGroup.remove(markupPointGroup);
  markupPointGroup = new THREE.Group();
  markupPointGroup.name = 'markupPoints';

  // Clear fly lines
  while (flyLineArcGroup.children.length > 0) {
    const child = flyLineArcGroup.children[0];
    flyLineArcGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }
  flyLineArcGroup.userData.flyLineArray = [];

  // Clear wave meshes
  waveMeshArr = [];
  labelSprites = [];

  if (!accounts || accounts.length === 0) {
    earthGroup.add(markupPointGroup);
    return;
  }

  const R = CONFIG.earth.radius;
  const hubCity = WORLD_CITIES[0]; // New York as hub for fly arcs

  accounts.forEach((account, index) => {
    const city = WORLD_CITIES[index % WORLD_CITIES.length];
    const isAvailable = account.status === 'available';
    const color = isAvailable
      ? CONFIG.punctuation.lightColumn.startColor
      : CONFIG.punctuation.lightColumn.endColor;

    // --- Label marker (base circle) ---
    const markerMat = new THREE.MeshBasicMaterial({
      color: CONFIG.punctuation.circleColor,
      map: textures.label,
      transparent: true,
      depthWrite: false,
    });
    const marker = createPointMesh({ radius: R, lon: city.E, lat: city.N, material: markerMat });
    markupPointGroup.add(marker);

    // --- Light Pillar ---
    const pillar = createLightPillar({
      radius: R,
      lon: city.E,
      lat: city.N,
      texture: textures.light_column,
      color: color,
    });
    markupPointGroup.add(pillar);

    // --- Wave Ripple ---
    const wave = createWaveMesh({
      radius: R,
      lon: city.E,
      lat: city.N,
      texture: textures.aperture,
    });
    markupPointGroup.add(wave);
    waveMeshArr.push(wave);

    // --- Fly Arcs (from hub to other cities) ---
    if (index > 0) {
      const arcline = flyArc(
        R,
        hubCity.E, hubCity.N,
        city.E, city.N,
        CONFIG.flyLine
      );
      flyLineArcGroup.add(arcline);
      if (arcline.userData.flyLine) {
        flyLineArcGroup.userData.flyLineArray.push(arcline.userData.flyLine);
      }
    }

    // --- Label Sprite (nama account) ---
    const label = createLabelSprite(account.name, city, R);
    markupPointGroup.add(label);
    labelSprites.push(label);
  });

  earthGroup.add(markupPointGroup);
}

/**
 * Buat label sprite (text) untuk ditampilkan di atas titik kota.
 * Menggunakan CanvasTexture — render text ke canvas lalu jadikan texture.
 * Desain: dark background box + bright text + glow untuk kontras maksimal.
 *
 * @param {string} text - Nama account
 * @param {Object} city - { N, E } coordinates
 * @param {number} radius - Earth radius
 */
function createLabelSprite(text, city, radius) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 160;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // --- Dark background box with rounded corners ---
  ctx.fillStyle = 'rgba(10, 14, 23, 0.9)';
  const boxW = canvas.width - 40;
  const boxH = 100;
  const boxX = (canvas.width - boxW) / 2;
  const boxY = (canvas.height - boxH) / 2;
  const borderRadius = 16;

  ctx.beginPath();
  ctx.moveTo(boxX + borderRadius, boxY);
  ctx.lineTo(boxX + boxW - borderRadius, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + borderRadius);
  ctx.lineTo(boxX + boxW, boxY + boxH - borderRadius);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - borderRadius, boxY + boxH);
  ctx.lineTo(boxX + borderRadius, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - borderRadius);
  ctx.lineTo(boxX, boxY + borderRadius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + borderRadius, boxY);
  ctx.closePath();
  ctx.fill();

  // --- Border glow ---
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- Sharp readable text ---
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Subtle dark shadow for depth (bukan glow terang yang bikin blur)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Render text — warna terang, tajam, tanpa glow
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(text, centerX, centerY);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);

  // Position above light pillar
  const p = lon2xyz(radius * 1.35, city.E, city.N);
  sprite.position.set(p.x, p.y, p.z);

  const len = 10 + Math.max(0, text.length - 3) * 2.2;
  sprite.scale.set(len, 4, 1);

  return sprite;
}

// ============================================================
// ENTRY ANIMATION
// ============================================================

function showEntryAnimation() {
  gsap.to(mainGroup.scale, {
    x: 1,
    y: 1,
    z: 1,
    duration: 2,
    ease: 'power2.out',
  });
}

// ============================================================
// ANIMATION LOOP
// ============================================================

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  // Rotate earth (STOP saat user sedang drag/hold globe)
  if (CONFIG.earth.rotateSpeed && earthGroup && !isUserDragging) {
    earthGroup.rotation.y += CONFIG.earth.rotateSpeed;
  }

  // Satellite rotation
  circleLineList.forEach((line) => {
    line.rotateY(CONFIG.satellite.rotateSpeed);
  });

  // Rotate space slowly
  if (spaceBackground) {
    spaceBackground.rotation.y -= 0.0003;
    spaceBackground.rotation.x += 0.0001;
  }
  
  // Orbit moon slowly
  if (moonMesh) {
    const time = Date.now() * 0.0001;
    moonMesh.position.x = Math.sin(time) * 160;
    moonMesh.position.z = Math.cos(time) * 160;
    moonMesh.rotation.y += 0.001; // Moon rotates on its axis
  }
  
  // Scintillation for stars (twinkle)
  if (starPoints && starPoints.material) {
    starPoints.material.opacity = 0.5 + Math.sin(Date.now() * 0.002) * 0.3;
  }

  // Scan line animation (shader uniform)
  if (uniforms) {
    uniforms.time.value = uniforms.time.value < -timeValue
      ? timeValue
      : uniforms.time.value - 1;
  }

  // Fly line animation
  flyLineArcGroup?.userData.flyLineArray?.forEach((fly) => {
    fly.rotation.z += CONFIG.flyLine.speed;
    if (fly.rotation.z >= fly.flyEndAngle) fly.rotation.z = 0;
  });

  // Wave ripple animation
  waveMeshArr.forEach((mesh) => {
    mesh.userData.scale += 0.007;
    const s = mesh.userData.size * mesh.userData.scale;
    mesh.scale.set(s, s, s);

    if (mesh.userData.scale <= 1.5) {
      mesh.material.opacity = (mesh.userData.scale - 1) * 2;
    } else if (mesh.userData.scale > 1.5 && mesh.userData.scale <= 2) {
      mesh.material.opacity = 1 - (mesh.userData.scale - 1.5) * 2;
    } else {
      mesh.userData.scale = 1;
    }
  });

  renderer.render(scene, camera);
}

// ============================================================
// RESIZE
// ============================================================

function getWidth() {
  const panelWidth = window.innerWidth > 768 ? 380 : 0;
  return window.innerWidth - panelWidth;
}

function getAspect() {
  return getWidth() / window.innerHeight;
}

function onResize() {
  const width = getWidth();
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
