/**
 * main.js — Entry Point
 * 
 * File ini adalah titik masuk utama aplikasi.
 * Tugasnya:
 * 1. Import CSS (Vite akan otomatis inject ke HTML)
 * 2. Import dan inisialisasi Globe (Three.js 3D scene)
 * 3. Import dan inisialisasi UI (DOM interactions)
 * 4. Import dan inisialisasi semua sub-modules
 * 5. Menghubungkan UI events ke Globe visuals
 * 
 * Flow data:
 * User interact → UI → accounts.js (Supabase) → onChange callback → UI re-render + Globe update
 */

import './style.css';
import { initGlobe } from './globe.js';
import { initUI } from './ui.js';
import { requestPermission, initNotifications } from './notifications.js';
import { initActivityLog } from './activity-log.js';
import { initMatrixRain } from './matrix-rain.js';
import { toggleSound } from './sounds.js';
import { downloadBackup, handleImport } from './export-import.js';
import { initAmbientMusic, toggleAmbient } from './ambient-music.js';

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

  // 4. Init Activity Log
  initActivityLog();

  // 5. Init Matrix Rain background
  initMatrixRain('matrix-canvas');

  // 6. Sound toggle button
  const soundBtn = document.getElementById('btn-sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const enabled = toggleSound();
      soundBtn.classList.toggle('muted', !enabled);
    });
  }

  // 7. Dismiss boot screen + play notification sound
  //    Delay agar semua boot lines selesai ditampilkan (7 lines × 0.45s = ~3.15s)
  const bootScreen = document.getElementById('boot-screen');
  if (bootScreen) {
    setTimeout(() => {
      // Play boot notification sound
      try {
        const bootSound = new Audio('/audio/notification-process-complete-slava-pogorelsky-1-00-03.mp3');
        bootSound.volume = 0.4;
        bootSound.play().catch(() => {}); // Ignore jika browser block autoplay
      } catch (e) { /* ignore */ }

      bootScreen.classList.add('fade-out');
      setTimeout(() => bootScreen.remove(), 800);
    }, 3500);
  }

  // 8. Init Export/Import backup
  const btnExport = document.getElementById('btn-export');
  if (btnExport) btnExport.addEventListener('click', downloadBackup);

  const inputImport = document.getElementById('input-import');
  if (inputImport) inputImport.addEventListener('change', handleImport);

  // 9. Init ambient music (autoplay setelah klik pertama)
  initAmbientMusic();

  const musicBtn = document.getElementById('btn-music-toggle');
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      const playing = toggleAmbient();
      musicBtn.classList.toggle('active', playing);
    });
  }

  console.log('🌐 Vibe Code Monitor initialized');
}

boot().catch((err) => {
  console.error('❌ Failed to initialize app:', err);
});
