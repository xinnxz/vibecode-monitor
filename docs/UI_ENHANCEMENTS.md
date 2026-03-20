# 🎨 UI Enhancements Roadmap

> Visual & UX improvements untuk memperkuat vibe **hacker terminal** dan membuat app terasa premium.

---

## ✅ Sudah Diimplementasi

### 1. Hacker Font
- **Font**: `Share Tech Mono` (body), `JetBrains Mono` (code elements)
- **Files**: `index.html`, `style.css`

### 2. Filter Bar
- Tombol filter **ALL / ACTIVE / LIMITED** di panel
- Active state dengan glow cyan
- **Files**: `index.html`, `style.css`, `ui.js`

### 3. Live Countdown Timer
- Format: `Xd XXh XXm XXs` mundur real-time
- Tampilkan **"READY ✓"** saat countdown habis (pulse animation hijau)
- Menggunakan `requestAnimationFrame` (bukan `setInterval`) untuk performa optimal
- **Files**: `ui.js`, `accounts.js`, `style.css`
- **Database**: Memerlukan kolom `refresh_deadline` (timestamptz) di Supabase

### 4. Notification Center
- Ikon 🔔 bell di panel header dengan badge counter (merah, pulse animation)
- Dropdown panel berisi riwayat notifikasi dengan timestamp
- Mark-as-read saat panel dibuka, tombol clear all
- Browser Notification API (native OS notification)
- **Files**: `notifications.js`, `index.html`, `style.css`, `main.js`, `ui.js`

### 5. Drag-to-Reorder Cards
- Custom pointer-based drag system (bukan HTML5 Drag API)
- Card "terangkat" jadi floating clone (scale + shadow + cyan glow)
- Card lain bergeser smooth membuat gap (CSS `translateY` transition)
- Drag hanya dari header bar card (tidak interfere dengan tombol edit/delete)
- **Files**: `ui.js`, `style.css`

### 6. Minutes Input
- Form sekarang punya 3 field: **DAYS : HRS : MIN**
- **Files**: `index.html`, `ui.js`, `accounts.js`
- **Database**: Memerlukan kolom `refresh_minutes` (int4) di Supabase

---

## 🔮 Planned Enhancements

### 7. Boot Sequence Animation
> **Priority**: ⭐⭐⭐⭐⭐ | **Impact**: First impression

Saat app pertama dibuka, tampilkan animasi terminal "booting":

```
> initializing system...
> connecting to supabase...          [OK]
> loading account data...            [OK]
> rendering globe visualization...   [OK]
> system ready. welcome, operator.
```

Setelah selesai, fade out dan reveal app asli. Durasi ~3 detik.

**Implementasi**:
- Buat overlay `#boot-screen` di `index.html`
- CSS animasi typing per baris
- JavaScript timeout sequence, lalu fade out overlay
- **Files**: `index.html`, `style.css`, `main.js` (atau `boot.js` baru)

---

### 8. CRT Scanline Overlay
> **Priority**: ⭐⭐⭐⭐⭐ | **Impact**: Seluruh app terasa retro

Overlay CSS di seluruh layar yang mensimulasikan monitor CRT:
- Garis horizontal tipis (scanlines) semi-transparan
- Subtle screen flicker (~0.5% opacity oscillation)
- Slight vignette effect di tepi layar

**Implementasi**:
- CSS `::after` pseudo-element di `body` atau wrapper
- Background: `repeating-linear-gradient` untuk scanlines
- Animation: subtle opacity flicker
- **Files**: `style.css` (hanya CSS, tidak perlu JS)

---

### 9. Activity Log / Terminal Console
> **Priority**: ⭐⭐⭐⭐ | **Impact**: App terasa "hidup"

Mini terminal console di bawah panel yang menampilkan log aktivitas:

```
[04:12:35] > SYSTEM: boot complete
[04:13:01] > ACCOUNT_ADDED: "Reon" (status: limited)
[04:15:22] > TIMER_EXPIRED: "XeonMayy" → READY
[04:16:00] > STATUS_CHANGED: "XeonMayy" → available
```

**Implementasi**:
- Collapsible console di bawah account list
- Module `activity-log.js` untuk manage log entries
- Auto-scroll ke baris terbaru
- Max ~50 entries (FIFO buffer)
- **Files**: `index.html`, `style.css`, `activity-log.js` (baru), integrasi di `ui.js`

---

### 10. Blinking Terminal Cursor
> **Priority**: ⭐⭐⭐ | **Impact**: Detail polish

Cursor `█` yang berkedip di akhir text "ACCOUNTS" di panel header, khas terminal prompt.

**Implementasi**:
- CSS `::after` dengan `content: "█"` dan `animation: blink`
- **Files**: `style.css` saja

---

### 11. Custom Hacker Scrollbar
> **Priority**: ⭐⭐⭐ | **Impact**: Detail polish

Scrollbar panel dengan style tipis dan warna cyan neon:
- Width: 4px
- Track: transparan
- Thumb: cyan dengan glow
- Hover: sedikit lebih terang

**Implementasi**:
- CSS `::-webkit-scrollbar` variants
- **Files**: `style.css` saja

---

### 12. Matrix / Binary Rain
> **Priority**: ⭐⭐⭐⭐ | **Impact**: Background ambiance

Subtle rain efek binary/hex yang jatuh pelan di background panel. Sangat transparan (opacity ~0.03-0.05), tidak mengganggu konten.

**Implementasi**:
- Canvas element di belakang account list
- Render karakter jatuh (0, 1, hex chars)
- Performa: gunakan RAF, skip frames jika CPU sibuk
- **Files**: `matrix-rain.js` (baru), `style.css`, `index.html`

---

### 13. Sound Effects (Optional)
> **Priority**: ⭐⭐⭐ | **Impact**: Immersion

Suara kecil saat interaksi:
- Klik tombol → keyboard tick
- Add account → confirmation beep
- Notification → alert tone
- Toggle filter → switch click

**Implementasi**:
- Tiny audio files (< 5KB each, format: mp3/ogg)
- Module `sounds.js` dengan `AudioContext` API
- User preference: toggle on/off
- **Files**: `sounds.js` (baru), audio assets, settings toggle di UI
