/**
 * matrix-rain.js — Matrix Binary Rain Effect
 * 
 * Subtle rain of binary/hex characters falling slowly in the panel background.
 * Sangat transparan (opacity ~0.04) agar tidak mengganggu konten.
 * 
 * Menggunakan Canvas 2D untuk efisiensi rendering.
 * Dioptimasi dengan:
 * - requestAnimationFrame (auto-pause saat tab hidden)
 * - Frame skipping (hanya update setiap ~100ms, bukan setiap frame)
 * - Minimal draw calls
 */

const CHARS = '01アイウエオカキクケコサシスセソ0xABCDEF0123456789';
const FONT_SIZE = 12;
const DROP_SPEED = 0.4;     // Kecepatan jatuh (pixel per update)
const UPDATE_INTERVAL = 80;  // ms antara frame updates
const OPACITY = 0.04;        // Sangat subtle

let canvas = null;
let ctx = null;
let columns = 0;
let drops = [];
let rafId = null;
let lastUpdate = 0;

/**
 * Inisialisasi matrix rain pada canvas element.
 * 
 * @param {string} canvasId - ID dari canvas element
 */
export function initMatrixRain(canvasId) {
  canvas = document.getElementById(canvasId);
  if (!canvas) return;

  ctx = canvas.getContext('2d');

  // Resize canvas agar sesuai ukuran parent
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Start animation loop
  rafId = requestAnimationFrame(tick);
}

/**
 * Resize canvas sesuai ukuran parent container.
 * Reset columns dan drop positions.
 */
function resizeCanvas() {
  if (!canvas) return;

  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;

  // Hitung jumlah kolom berdasarkan lebar canvas
  columns = Math.floor(canvas.width / FONT_SIZE);
  
  // Inisialisasi posisi drop — random Y awal agar tidak semua mulai dari atas
  drops = new Array(columns).fill(0).map(() => Math.random() * canvas.height / FONT_SIZE);
}

/**
 * Animation tick — render satu frame rain.
 */
function tick(timestamp) {
  // Throttle: hanya update setiap UPDATE_INTERVAL ms
  if (timestamp - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = timestamp;
    draw();
  }
  rafId = requestAnimationFrame(tick);
}

/**
 * Render satu frame rain ke canvas.
 * 
 * Cara kerja:
 * 1. Fill canvas dengan hitam semi-transparent (fade effect)
 * 2. Untuk setiap kolom, gambar satu karakter di posisi drop
 * 3. Geser drop ke bawah
 * 4. Reset drop ke atas jika sudah lewat bawah canvas
 */
function draw() {
  if (!ctx) return;

  // Fade effect: overlay hitam tipis di atas frame sebelumnya
  // Ini membuat chars yang lama perlahan menghilang
  ctx.fillStyle = 'rgba(10, 14, 23, 0.12)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Warna karakter: cyan sangat tipis
  ctx.fillStyle = `rgba(56, 189, 248, ${OPACITY})`;
  ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;

  for (let i = 0; i < columns; i++) {
    // Pilih karakter random
    const char = CHARS[Math.floor(Math.random() * CHARS.length)];
    
    // Gambar karakter
    const x = i * FONT_SIZE;
    const y = drops[i] * FONT_SIZE;
    ctx.fillText(char, x, y);

    // Geser drop ke bawah
    drops[i] += DROP_SPEED;

    // Reset drop ke atas jika sudah melewati canvas + random delay
    if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.98) {
      drops[i] = 0;
    }
  }
}

/**
 * Stop matrix rain animation.
 */
export function stopMatrixRain() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
