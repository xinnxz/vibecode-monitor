/**
 * sounds.js — Sound Effects Module
 * 
 * Suara kecil saat interaksi untuk menambah immersion.
 * Menggunakan Web Audio API (AudioContext) untuk generate suara
 * secara programmatic — TANPA file audio eksternal.
 * 
 * Ini lebih ringan dari file audio dan tidak perlu download.
 * Semua suara di-synthesize dari oscillator + gain envelope.
 */

let audioCtx = null;
let soundEnabled = true;

/**
 * Inisialisasi AudioContext.
 * Harus dipanggil setelah user interaction (browser policy).
 */
function ensureContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Toggle sound on/off.
 * @returns {boolean} Status baru
 */
export function toggleSound() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

/**
 * Cek apakah sound aktif.
 * @returns {boolean}
 */
export function isSoundEnabled() {
  return soundEnabled;
}

/**
 * Play suara "click" — keyboard tick.
 * Digunakan untuk: klik tombol, toggle filter.
 * 
 * Karakter: sharp, short, high-pitched tick
 */
export function playClick() {
  if (!soundEnabled) return;
  const ctx = ensureContext();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.03);
  
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);
}

/**
 * Play suara "confirm" — sukses beep.
 * Digunakan untuk: add account, save edit.
 * 
 * Karakter: dual-tone ascending beep
 */
export function playConfirm() {
  if (!soundEnabled) return;
  const ctx = ensureContext();
  
  // Tone 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523, ctx.currentTime); // C5
  gain1.gain.setValueAtTime(0.06, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.12);
  
  // Tone 2 (higher, delayed)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659, ctx.currentTime + 0.08); // E5
  gain2.gain.setValueAtTime(0.001, ctx.currentTime);
  gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.08);
  osc2.stop(ctx.currentTime + 0.2);
}

/**
 * Play suara "alert" — notification tone.
 * Digunakan untuk: account ready notification.
 * 
 * Karakter: soft chime, slightly warmer
 */
export function playAlert() {
  if (!soundEnabled) return;
  const ctx = ensureContext();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);   // A5
  osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.1); // C6
  osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
  
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.setValueAtTime(0.07, ctx.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
}

/**
 * Play suara "delete" — warning beep.
 * Digunakan untuk: delete account.
 * 
 * Karakter: low descending tone
 */
export function playDelete() {
  if (!soundEnabled) return;
  const ctx = ensureContext();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
  
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

/**
 * Play suara "sonar ping" dengan Spatial Audio (Stereo Panning).
 * Digunakan untuk: klik pada bola dunia (Globe Interactivity).
 * 
 * @param {number} panValue - Nilai panning dari -1.0 (Kiri) hingga 1.0 (Kanan)
 */
export function playSpatialPing(panValue = 0) {
  if (!soundEnabled) return;
  const ctx = ensureContext();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  // Buat node Panner untuk efek spatial (stereo)
  const panner = ctx.createStereoPanner();
  // Clamp value antara -1 dan 1 untuk safety
  panner.pan.value = Math.max(-1, Math.min(1, panValue));
  
  // Karakter Sonar Ping: Sine wave, high pitch yang cepat turun
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.4);
  
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05); // Attack cepat
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8); // Decay panjang menggema
  
  // Routing: Oscillator -> Gain -> Panner -> Destination (Speaker)
  osc.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.8);
}
