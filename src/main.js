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
 * Flow:
 * Boot screen (click to start) → notification sound → boot animation → fade out → ambient music starts
 */

import './style.css';
import { initGlobe } from './globe.js';
import { initUI, openModal, openSettingsModal } from './ui.js';
import { requestPermission, initNotifications, clearNotifications } from './notifications.js';
import { initActivityLog } from './activity-log.js';
import { initMatrixRain } from './matrix-rain.js';
import { toggleSound } from './sounds.js';
import { downloadBackup, handleImport } from './export-import.js';
import { toggleAmbient } from './ambient-music.js';
import { initCommandPalette } from './command-palette.js';

// --- Inisialisasi Aplikasi ---
async function boot() {
  // 1. Request notification permission + init notification center
  requestPermission();
  initNotifications();

  // 2. Init Three.js Globe
  const container = document.getElementById('canvas-container');
  const globe = initGlobe(container);

  // 3. Init UI (async: fetch data dari Supabase)
  // Wrap updateVisuals and add focus callback
  let focusGlobeCb = null;
  await initUI((accounts) => {
    globe.updateVisuals(accounts);
    globe.shootPing();
  }, (accountName, isReset = false) => {
    if (isReset) {
      if (globe.resetCameraFocus) globe.resetCameraFocus();
    } else {
      if (globe.focusOnAccount) globe.focusOnAccount(accountName);
    }
  });

  // 4. Init Activity Log
  initActivityLog();

  // 5. Init Matrix Rain background
  initMatrixRain('matrix-canvas');

  // 5.5 Init Command Palette (Ctrl+K)
  initCommandPalette({
    editAccount: (id) => openModal(id),
    openAddModal: () => openModal(),
    clearNotifications: () => clearNotifications(),
    openSettings: () => openSettingsModal(),
  });

  // 6. Sound toggle button
  const soundBtn = document.getElementById('btn-sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const enabled = toggleSound();
      soundBtn.classList.toggle('muted', !enabled);
    });
  }

  // 7. Boot screen: Click to Initialize
  //    User harus klik dulu agar browser mengizinkan audio autoplay.
  const bootScreen = document.getElementById('boot-screen');
  if (bootScreen) {
    bootScreen.addEventListener('click', () => {
      // Sudah di-klik? Skip
      if (!bootScreen.classList.contains('boot-waiting')) return;

      // Hapus waiting state → boot lines muncul dengan animasi
      bootScreen.classList.remove('boot-waiting');

      // LANGSUNG play notification sound (user sudah interact)
      try {
        const bootSound = new Audio('/audio/notification-process-complete-slava-pogorelsky-1-00-03.mp3');
        bootSound.volume = 0.5;
        bootSound.play();
      } catch (e) { /* ignore */ }

      // Setelah boot sequence selesai (7 lines × 0.25s ≈ 1.75s) → fade out + start ambient
      setTimeout(() => {
        bootScreen.classList.add('fade-out');

        // Start ambient music LANGSUNG saat masuk halaman utama
        const musicBtn = document.getElementById('btn-music-toggle');
        toggleAmbient(); // Start playing
        if (musicBtn) musicBtn.classList.add('active');

        setTimeout(() => bootScreen.remove(), 800);
      }, 2000);
    });
  }

  // 8. Music toggle button
  const musicBtn = document.getElementById('btn-music-toggle');
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      const playing = toggleAmbient();
      musicBtn.classList.toggle('active', playing);
    });
  }

  // 9. Init Export/Import backup
  const btnExport = document.getElementById('btn-export');
  if (btnExport) btnExport.addEventListener('click', downloadBackup);

  const inputImport = document.getElementById('input-import');
  if (inputImport) inputImport.addEventListener('change', handleImport);

  console.log('🌐 Vibe Code Monitor initialized');
}

boot().catch((err) => {
  console.error('❌ Failed to initialize app:', err);
});
