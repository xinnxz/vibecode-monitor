/**
 * globe.js — Three.js Globe Visualization Module
 * 
 * Membuat scene 3D dengan:
 * 1. Sphere wireframe transparan dengan glow effect
 * 2. Ring/orbit yang mengelilingi globe (menampilkan status akun)
 * 3. Partikel ambient untuk efek futuristik
 * 4. OrbitControls untuk interaksi user (drag rotate)
 * 5. Auto-rotate animation
 * 
 * Export: initGlobe(container), updateAccountVisuals(accounts)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Module-level variables ---
let scene, camera, renderer, controls;
let globe, glowMesh, innerGlobe;
let ringGroup;
let particles;
let animationId;

// Warna sesuai status
const COLORS = {
  available: new THREE.Color(0x34d399),   // Hijau
  limited: new THREE.Color(0xf87171),     // Merah
  default: new THREE.Color(0x38bdf8),     // Cyan (default/empty)
  glow: new THREE.Color(0x38bdf8),        // Glow warna cyan
};

/**
 * Inisialisasi Three.js Scene.
 * 
 * Penjelasan:
 * - Scene: "wadah" 3D tempat semua object berada
 * - Camera: "mata" yang melihat scene (PerspectiveCamera = seperti mata manusia)
 * - Renderer: merender scene ke canvas HTML
 * - OrbitControls: memungkinkan user drag untuk rotate view
 * 
 * @param {HTMLElement} container - DOM element untuk menampung canvas
 * @returns {{ scene, camera, renderer, updateVisuals }}
 */
export function initGlobe(container) {
  // --- Scene Setup ---
  scene = new THREE.Scene();
  // Fog untuk depth effect (object jauh jadi kabur)
  scene.fog = new THREE.FogExp2(0x0a0e17, 0.035);

  // --- Camera ---
  // PerspectiveCamera(fov, aspect, near, far)
  // fov = field of view (derajat), aspect = rasio layar
  const aspect = getAspect();
  camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 1000);
  camera.position.set(0, 2, 8);

  // --- Renderer ---
  renderer = new THREE.WebGLRenderer({
    antialias: true,          // Smoothing edges
    alpha: true,              // Transparent background
    powerPreference: 'high-performance',
  });
  renderer.setSize(getWidth(), window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // --- Controls ---
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;        // Smooth inertia saat drag
  controls.dampingFactor = 0.05;
  controls.enablePan = false;           // Disable panning (hanya rotate)
  controls.minDistance = 4;             // Jarak minimum zoom
  controls.maxDistance = 15;            // Jarak maximum zoom
  controls.autoRotate = true;           // Auto rotate
  controls.autoRotateSpeed = 0.5;       // Kecepatan auto rotate

  // --- Lighting ---
  // AmbientLight: cahaya merata dari semua arah
  const ambient = new THREE.AmbientLight(0x334466, 0.6);
  scene.add(ambient);

  // PointLight: seperti lampu bohlam, ada posisi & jarak jangkau
  const pointLight = new THREE.PointLight(0x38bdf8, 2, 50);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0x34d399, 1.5, 50);
  pointLight2.position.set(-5, -3, 3);
  scene.add(pointLight2);

  // --- Build Scene Objects ---
  createGlobe();
  createParticles();
  ringGroup = new THREE.Group();
  scene.add(ringGroup);

  // --- Events ---
  window.addEventListener('resize', onResize);

  // --- Start Animation Loop ---
  animate();

  return {
    scene,
    camera,
    renderer,
    updateVisuals: updateAccountVisuals,
  };
}

/**
 * Hitung lebar canvas (dikurangi panel width di desktop).
 */
function getWidth() {
  const panelWidth = window.innerWidth > 768 ? 380 : 0;
  return window.innerWidth - panelWidth;
}

function getAspect() {
  return getWidth() / window.innerHeight;
}

/**
 * Membuat globe utama.
 * 
 * Terdiri dari:
 * 1. Inner globe: sphere solid gelap sebagai "isi"
 * 2. Wireframe globe: sphere wireframe transparan (grid lines)
 * 3. Glow mesh: sphere sedikit lebih besar dengan shader untuk efek glow
 */
function createGlobe() {
  const radius = 2.2;

  // --- Inner Globe (solid, gelap) ---
  const innerGeo = new THREE.SphereGeometry(radius * 0.98, 64, 64);
  const innerMat = new THREE.MeshPhongMaterial({
    color: 0x0a0e17,
    transparent: true,
    opacity: 0.85,
    shininess: 10,
  });
  innerGlobe = new THREE.Mesh(innerGeo, innerMat);
  scene.add(innerGlobe);

  // --- Wireframe Globe ---
  // IcosahedronGeometry memberikan wireframe yang lebih "organik" daripada SphereGeometry
  const wireGeo = new THREE.IcosahedronGeometry(radius, 3);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
  });
  globe = new THREE.Mesh(wireGeo, wireMat);
  scene.add(globe);

  // --- Latitude/Longitude Lines ---
  // Membuat beberapa ring horizontal dan vertikal pada globe
  const ringMaterial = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.08,
  });

  // Horizontal rings (latitude) - setiap 30 derajat
  for (let lat = -60; lat <= 60; lat += 30) {
    const phi = (90 - lat) * (Math.PI / 180);
    const ringRadius = radius * Math.sin(phi);
    const y = radius * Math.cos(phi);

    const curve = new THREE.EllipseCurve(0, 0, ringRadius, ringRadius, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(64);
    const geo = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, y, p.y))
    );
    const line = new THREE.Line(geo, ringMaterial);
    scene.add(line);
  }

  // --- Glow Effect ---
  // Sphere sedikit lebih besar dengan material yang fade di edges (Fresnel-like effect)
  const glowGeo = new THREE.SphereGeometry(radius * 1.15, 32, 32);
  const glowMat = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: COLORS.glow },
      viewVector: { value: camera.position },
    },
    vertexShader: `
      uniform vec3 viewVector;
      varying float intensity;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormel = normalize(normalMatrix * viewVector);
        intensity = pow(0.7 - dot(vNormal, vNormel), 3.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying float intensity;
      void main() {
        vec3 glow = glowColor * intensity;
        gl_FragColor = vec4(glow, intensity * 0.4);
      }
    `,
    side: THREE.BackSide, // Render di sisi belakang = efek glow ke luar
    blending: THREE.AdditiveBlending,
    transparent: true,
  });
  glowMesh = new THREE.Mesh(glowGeo, glowMat);
  scene.add(glowMesh);
}

/**
 * Membuat sistem partikel untuk efek ambient.
 * 
 * Partikel = titik-titik kecil yang berserakan di ruang 3D.
 * Menggunakan BufferGeometry (lebih efisien daripada Geometry biasa)
 * karena data langsung disimpan dalam Float32Array.
 */
function createParticles() {
  const count = 1500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Posisi random di sekitar scene (range -20 to 20)
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

    // Warna partikel: mix antara cyan dan putih
    const isCyan = Math.random() > 0.6;
    colors[i * 3] = isCyan ? 0.22 : 0.6;
    colors[i * 3 + 1] = isCyan ? 0.74 : 0.65;
    colors[i * 3 + 2] = isCyan ? 0.97 : 0.75;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,      // Partikel lebih kecil saat jauh
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  particles = new THREE.Points(geo, mat);
  scene.add(particles);
}

/**
 * Update visual ring orbit berdasarkan data akun.
 * 
 * Setiap akun direpresentasikan sebagai sebuah ring orbit
 * yang mengelilingi globe dengan warna sesuai status.
 * 
 * Ring disusun pada sudut (tilt) yang berbeda-beda agar
 * tidak saling tumpang tindih.
 * 
 * @param {Array} accounts - Daftar akun dari accounts.js
 */
export function updateAccountVisuals(accounts) {
  // Hapus semua ring lama
  while (ringGroup.children.length > 0) {
    const child = ringGroup.children[0];
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
    ringGroup.remove(child);
  }

  if (!accounts || accounts.length === 0) return;

  const baseRadius = 2.8;

  accounts.forEach((account, index) => {
    const color = account.status === 'available' ? COLORS.available : COLORS.limited;
    
    // --- Ring orbit ---
    // Setiap ring di-offset radius sedikit dan tilt berbeda
    const ringRadius = baseRadius + index * 0.25;
    const segments = 128;
    const ringPoints = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      ringPoints.push(
        new THREE.Vector3(
          Math.cos(angle) * ringRadius,
          0,
          Math.sin(angle) * ringRadius
        )
      );
    }

    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
    const ringMat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Line(ringGeo, ringMat);

    // Tilt ring di sudut berbeda supaya tidak overlap
    // Setiap ring diputar di sumbu X dan Z
    const tiltX = (index * 35 + 15) * (Math.PI / 180);
    const tiltZ = (index * 25) * (Math.PI / 180);
    ring.rotation.x = tiltX;
    ring.rotation.z = tiltZ;

    ringGroup.add(ring);

    // --- Glowing point di ring (penanda posisi) ---
    const pointGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const pointMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });
    const point = new THREE.Mesh(pointGeo, pointMat);

    // Posisi awal di ring
    point.position.set(ringRadius, 0, 0);
    // Simpan metadata untuk animasi
    point.userData = {
      ringRadius,
      speed: 0.3 + index * 0.15,
      offset: index * 1.5,
    };
    ring.add(point);

    // --- Glow di sekitar point ---
    const glowPointGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const glowPointMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });
    const glowPoint = new THREE.Mesh(glowPointGeo, glowPointMat);
    glowPoint.position.copy(point.position);
    glowPoint.userData = point.userData;
    ring.add(glowPoint);
  });
}

/**
 * Animation Loop.
 * 
 * requestAnimationFrame: browser memanggil fungsi ini ~60x/detik (60fps).
 * Di setiap frame:
 * 1. Update controls (damping)
 * 2. Rotate globe dan partikel
 * 3. Animate ring points (penanda bergerak di orbit)
 * 4. Re-render scene
 */
function animate() {
  animationId = requestAnimationFrame(animate);

  const time = Date.now() * 0.001; // Waktu dalam detik

  // Update controls (damping effect)
  controls.update();

  // Rotate globe perlahan
  if (globe) {
    globe.rotation.y += 0.001;
  }
  if (innerGlobe) {
    innerGlobe.rotation.y += 0.001;
  }

  // Partikel bergerak perlahan
  if (particles) {
    particles.rotation.y += 0.0002;
    particles.rotation.x += 0.0001;
  }

  // Animate ring points (penanda bergerak di orbit)
  if (ringGroup) {
    ringGroup.children.forEach((ring) => {
      ring.children.forEach((child) => {
        if (child.userData && child.userData.ringRadius) {
          const { ringRadius, speed, offset } = child.userData;
          const angle = time * speed + offset;
          child.position.x = Math.cos(angle) * ringRadius;
          child.position.z = Math.sin(angle) * ringRadius;
        }
      });
    });
  }

  // Update glow shader
  if (glowMesh && glowMesh.material.uniforms) {
    glowMesh.material.uniforms.viewVector.value = camera.position;
  }

  renderer.render(scene, camera);
}

/**
 * Handle window resize.
 * Update camera aspect ratio dan renderer size.
 */
function onResize() {
  const width = getWidth();
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}
