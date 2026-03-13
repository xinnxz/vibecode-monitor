# 🚀 Vibe Code Monitor v2 — "The Immersion Update" Implementation Plan

## Background
User has approved all 4 proposed "Killer Features" to elevate the application from a simple tracker to a Power-User Intelligence Dashboard. This plan outlines the technical roadmap to implement these features cleanly without breaking existing functionality.

---

## Proposed Changes

### 1. 🟢 The Command Palette (Ctrl+K)
Membuat sistem pencarian universal bergaya Mac Spotlight / Raycast untuk navigasi dan aksi super cepat tanpa mouse.

#### [NEW] [index.html](file:///e:/DATA/Ngoding/vibecode-monitor/index.html)
- Tambahkan struktur HTML untuk `<div id="command-palette" class="command-palette hidden">`.
- Berisi input besar `id="cmd-input"` dan daftar hasil `id="cmd-results"`.

#### [NEW] `src/command-palette.js`
- Modul mandiri untuk menangani *key event* (`Ctrl+K` atau `Cmd+K` untuk membuka).
- Logika *fuzzy search* pada nama akun.
- Logika command parser: 
  - Jika input diawali dengan `> add`, fokuskan enter untuk buka modal *New Account*.
  - Jika `> clear`, bersihkan notifikasi.

#### [MODIFY] [src/style.css](file:///e:/DATA/Ngoding/vibecode-monitor/src/style.css)
- *Styling* modal di tengah layar, *backdrop-filter blur*, *glassmorphism* tebal, dan animasi *slide-down*.
- *Styling* item list yang tersorot (pakai panah atas/bawah untuk navigasi).

---

### 2. 🔵 Global Stats & Analytics Chart
Merombak daftar angka statistik pasif menjadi grafik visual (Mini Dashboard) di *header panel*.

#### [MODIFY] [src/ui.js](file:///e:/DATA/Ngoding/vibecode-monitor/src/ui.js)
- Fungsi [renderStats()](file:///e:/DATA/Ngoding/vibecode-monitor/src/ui.js#378-408) akan dirombak.
- Menghitung persentase/distribusi Provider (misal: 40% Claude, 60% Cursor) dan merendernya sebagai blok HTML bersusun (*Horizontal Stacked Bar*).
- Menampilkan persentase *Available* vs *Blocked*.

#### [MODIFY] [src/style.css](file:///e:/DATA/Ngoding/vibecode-monitor/src/style.css)
- CSS Flexbox untuk `stats-bar-chart`.
- Transisi animasi *width* saat data berubah panjangnya.

---

### 3. 🟣 Globe Interactivity & Geo-Mapping
Membuat bumi 3D bereaksi pada aktivitas aplikasi, bukan sekadar mutar sebagai *background*.

#### [MODIFY] [src/globe.js](file:///e:/DATA/Ngoding/vibecode-monitor/src/globe.js)
- **Ping/Laser Effect**: Saat akun berubah status (misal baru ditambahkan atau otomatis *refresh*), panggil fungsi *shootLaser(fromLat, fromLng, toLat, toLng)*. Koordinat akan di-*randomize* untuk mensimulasikan trafik intelijen.
- **Raycaster Hover**: Tambahkan Three.js `Raycaster` agar saat kursor *mouse/pointer* digerakkan di atas bola dunia, rotasi bumi sedikit melambat dan ada pendaran cahaya (*glow*) di area kursor.

---

### 4. 🟠 Auto-Sync & Background Refresh
*Timer* yang mentok di 0 tidak lagi menunggu secara pasif, tetapi otomatis mengubah status akun menjadi tersedia.

#### [MODIFY] [src/accounts.js](file:///e:/DATA/Ngoding/vibecode-monitor/src/accounts.js) (atau [main.js](file:///e:/DATA/Ngoding/vibecode-monitor/src/main.js))
- Di dalam *loop* pengecekan waktu (`checkDeadlines()`), identifikasi akun yang melewati masa tenggang (`diffMs <= 0`) dan masih berstatus `limited`.
- Secara otomatis mutasi state akun tersebut via [editAccount(id, { status: 'available' })](file:///e:/DATA/Ngoding/vibecode-monitor/src/accounts.js#200-235).

#### [MODIFY] [src/ui.js](file:///e:/DATA/Ngoding/vibecode-monitor/src/ui.js)
- Saat deteksi "Auto-Refresh" terjadi, mainkan suara selebrasi, buat notifikasi sistem, dan berikan animasi *flash* hijau pada kartu akun yang bersangkutan.

---

## Verification Plan
1. **Command Palette**: Tekan Ctrl+K, ketik nama akun, tekan Enter $\rightarrow$ modal Edit Akun terbuka.
2. **Global Stats**: Tambah banyak akun Claude, pastikan batang visual *Claude* memanjang mendominasi layar warna oranye.
3. **Globe Interactivity**: Edit status akun, pastikan bola dunia menembakkan visual laser antar benua.
4. **Auto-Sync**: Set timer 1 menit, tunggu, layar tidak disentuh. Pastikan otomatis berubah hijau dan notifikasi OS muncul.

## User Review Required
> [!IMPORTANT]
> Harap **The Boss** me-*review* rencana di atas. Kita akan kerjakan satu-persatu per modul (Misal: Command Palette dulu) agar rapi, atau semuanya langsung sekaligus?
