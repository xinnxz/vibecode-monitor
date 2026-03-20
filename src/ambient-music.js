/**
 * ambient-music.js — Background Ambient Music Player
 *
 * Memainkan file audio MP3 sebagai background ambient music.
 * File audio harus diletakkan di: /audio/cyberpunk-ambient.mp3
 *
 * Jika file belum ada, modul akan gracefully fail tanpa error.
 *
 * Browser Policy: Audio hanya bisa dimulai setelah user interaction (click).
 * Modul ini otomatis menunggu klik pertama lalu memulai musik.
 */

let audio = null;
let isPlaying = false;

const AUDIO_SRC = '/audio/void-protocol-dark-suspense-sci-fi.mp3';
const VOLUME = 0.15; // 15% — cukup rendah agar tidak mengganggu

/**
 * Buat dan mulai audio player.
 */
function startAmbient() {
  if (isPlaying) return;

  audio = new Audio(AUDIO_SRC);
  audio.loop = true;
  audio.volume = VOLUME;

  // Fade in efek
  audio.volume = 0;
  audio.play().then(() => {
    isPlaying = true;

    // Smooth fade in selama 2 detik
    let vol = 0;
    const fadeIn = setInterval(() => {
      vol += 0.005;
      if (vol >= VOLUME) {
        vol = VOLUME;
        clearInterval(fadeIn);
      }
      audio.volume = vol;
    }, 50);
  }).catch((err) => {
    // File tidak ditemukan atau browser block — ignore gracefully
    console.warn('Ambient music not available:', err.message);
  });
}

/**
 * Stop musik dengan fade out.
 */
export function stopAmbient() {
  if (!isPlaying || !audio) return;

  // Fade out
  let vol = audio.volume;
  const fadeOut = setInterval(() => {
    vol -= 0.005;
    if (vol <= 0) {
      vol = 0;
      clearInterval(fadeOut);
      audio.pause();
      audio.currentTime = 0;
      audio = null;
      isPlaying = false;
    }
    if (audio) audio.volume = Math.max(0, vol);
  }, 50);
}

/**
 * Toggle musik on/off. Returns true jika sekarang playing.
 */
export function toggleAmbient() {
  if (isPlaying) {
    stopAmbient();
    return false;
  } else {
    startAmbient();
    return true;
  }
}

/**
 * Inisialisasi: tunggu klik pertama user lalu mulai musik.
 */
export function initAmbientMusic() {
  // Cek apakah file audio ada sebelum setup autoplay
  fetch(AUDIO_SRC, { method: 'HEAD' })
    .then((res) => {
      if (!res.ok) {
        console.warn('Ambient music file not found at', AUDIO_SRC);
        return;
      }

      // File ada — autoplay setelah user interaction pertama
      const handler = () => {
        startAmbient();
        // Update button style jika ada
        const btn = document.getElementById('btn-music-toggle');
        if (btn) btn.classList.add('active');
        document.removeEventListener('click', handler);
        document.removeEventListener('keydown', handler);
      };
      document.addEventListener('click', handler);
      document.addEventListener('keydown', handler);
    })
    .catch(() => {
      // Network error — skip silently
    });
}
