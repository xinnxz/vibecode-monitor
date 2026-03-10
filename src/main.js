/**
 * main.js — Entry Point
 * 
 * File ini adalah titik masuk utama aplikasi.
 * Tugasnya:
 * 1. Import CSS (Vite akan otomatis inject ke HTML)
 * 2. Import dan inisialisasi Globe (Three.js 3D scene)
 * 3. Import dan inisialisasi UI (DOM interactions)
 * 4. Menghubungkan UI events ke Globe visuals
 * 
 * Flow data:
 * User interact → UI → accounts.js (Supabase) → onChange callback → UI re-render + Globe update
 */

import './style.css';
import { initGlobe } from './globe.js';
import { initUI } from './ui.js';
import { requestPermission, initNotifications } from './notifications.js';

// --- Inisialisasi Aplikasi ---
async function boot() {
  // 1. Request notification permission + init notification center
  requestPermission();
  initNotifications();

  // 2. Init Three.js Globe
  const container = document.getElementById('canvas-container');
  const globe = initGlobe(container);

  // 3. Init UI (async: fetch data dari Supabase)
  await initUI(globe.updateVisuals);

  // 4. Dismiss boot screen
  //    Delay agar semua boot lines selesai ditampilkan (7 lines × 0.45s = ~3.15s)
  //    Tambah sedikit buffer agar user bisa baca line terakhir
  const bootScreen = document.getElementById('boot-screen');
  if (bootScreen) {
    setTimeout(() => {
      bootScreen.classList.add('fade-out');
      // Hapus dari DOM setelah fade animation selesai (0.8s)
      setTimeout(() => bootScreen.remove(), 800);
    }, 3500);
  }

  console.log('🌐 Vibe Code Monitor initialized');
}

boot().catch((err) => {
  console.error('❌ Failed to initialize app:', err);
});
