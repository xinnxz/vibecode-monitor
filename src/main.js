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
  //    Container: div#canvas-container di index.html
  const container = document.getElementById('canvas-container');
  const globe = initGlobe(container);

  // 3. Init UI
  //    Pass globe.updateVisuals sebagai callback agar UI bisa trigger update globe
  //    saat data akun berubah (add/edit/delete)
  await initUI(globe.updateVisuals);

  // Log untuk debugging
  console.log('🌐 Vibe Code Monitor initialized');
}

boot().catch((err) => {
  console.error('❌ Failed to initialize app:', err);
});
