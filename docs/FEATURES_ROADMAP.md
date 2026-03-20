# 🚀 Features Roadmap

> Fitur fungsional yang akan membuat Vibe Code Monitor benar-benar berguna untuk monitoring account limits sehari-hari.

---

## ✅ Sudah Diimplementasi

| Fitur | Deskripsi |
|-------|-----------|
| CRUD Accounts | Tambah, edit, hapus akun via modal form |
| Status Tracking | Status `available` / `limited` per akun |
| 3D Globe | Visualisasi akun sebagai titik di globe Three.js |
| Filter | Filter akun by status (All/Active/Limited) |
| Live Countdown | Timer mundur real-time (d/h/m/s) |
| Notification Center | Bell icon + riwayat notifikasi saat akun ready |
| Drag Reorder | Susun ulang card dengan drag & drop |
| Supabase Backend | Database PostgreSQL via Supabase |

---

## 🔮 Planned Features

### 1. Auto-Status Toggle
> **Priority**: 🔥🔥🔥🔥🔥 | **Impact**: Game changer

Saat countdown mencapai 0, otomatis:
- Ubah status dari `limited` → `available`
- Update di Supabase
- Trigger notification
- Opsional: restart timer untuk cycle berikutnya

**Kenapa penting**: Menghilangkan kebutuhan edit manual setiap kali akun ready. App jadi benar-benar "autopilot".

**Implementasi**:
- Di `ui.js` countdown handler: saat `diff <= 0`, panggil `editAccount(id, { status: 'available' })`
- Tambah setting per akun: `autoReset: true/false`
- **Database**: Tambah kolom `auto_reset` (boolean) di Supabase

---

### 2. Search / Quick Find
> **Priority**: 🔥🔥🔥🔥 | **Impact**: Navigasi cepat

Input search di panel header untuk filter akun by nama. Penting kalau akun sudah 10+.

**Implementasi**:
- Input field di atas filter bar
- Real-time filter saat mengetik (debounced 200ms)
- Highlight matched text di card
- **Files**: `index.html`, `style.css`, `ui.js`

---

### 3. Account Tags / Groups
> **Priority**: 🔥🔥🔥🔥 | **Impact**: Organisasi

Kategorikan akun dengan tags:
- Contoh: `AI Coding`, `ChatGPT`, `Claude`, `Cursor`, `Gemini`
- Filter by tag di panel
- Warna tag yang bisa di-customize

**Implementasi**:
- Dropdown multi-select di form add/edit
- Tag badges di card
- Filter chips di panel
- **Database**: Tabel `tags` + junction table `account_tags`, atau JSON array di kolom `tags`

---

### 4. Sort Options
> **Priority**: 🔥🔥🔥🔥 | **Impact**: Efisiensi

Urutkan akun berdasarkan:
- Nama (A-Z / Z-A)
- Status (Active first / Limited first)
- Waktu tersisa (paling dekat ready di atas)
- Tanggal dibuat

**Implementasi**:
- Dropdown sort di sebelah filter bar
- State `currentSort` di `ui.js`
- Sort function sebelum render
- **Files**: `index.html`, `style.css`, `ui.js`

---

### 5. Export / Import Data
> **Priority**: 🔥🔥🔥🔥 | **Impact**: Data safety

- **Export**: Download semua akun sebagai file `.json` (backup)
- **Import**: Upload file `.json` untuk restore data
- Berguna untuk pindah device atau backup periodik

**Implementasi**:
- Tombol Export/Import di panel header (atau dropdown menu)
- `Blob` + `URL.createObjectURL` untuk download
- `FileReader` API untuk upload
- Validasi format saat import
- **Files**: `export-import.js` (baru), `ui.js`, `index.html`

---

### 6. Usage History Log
> **Priority**: 🔥🔥🔥 | **Impact**: Analytics

Simpan riwayat status changes per akun:
- Kapan terakhir di-limit
- Kapan ready
- Berapa kali total ke-limit
- Average downtime

**Implementasi**:
- Tabel `account_history` di Supabase: `{ account_id, event, timestamp }`
- Detail view per akun (klik card untuk expand)
- Mini chart sparkline (optional)
- **Files**: `history.js` (baru), Supabase migration

---

### 7. Bulk Actions
> **Priority**: 🔥🔥🔥 | **Impact**: Efisiensi

Select beberapa akun sekaligus untuk:
- Bulk ubah status
- Bulk delete
- Bulk reset timer

**Implementasi**:
- Checkbox select mode (toggle via tombol atau long-press)
- Action bar muncul saat ada selection
- "Select All" / "Deselect All"
- **Files**: `ui.js`, `style.css`, `accounts.js`

---

### 8. Real-time Sync (Supabase Realtime)
> **Priority**: 🔥🔥🔥 | **Impact**: Multi-device

Supabase Realtime listener — kalau buka app di 2 browser/device, data auto-sync tanpa refresh manual.

**Implementasi**:
- `supabase.channel('accounts').on('postgres_changes', ...)` 
- Handle INSERT, UPDATE, DELETE events
- Merge changes ke local cache
- **Files**: `accounts.js`, `supabase.js`

---

### 9. Account Notes
> **Priority**: 🔥🔥🔥 | **Impact**: Organisasi

Field catatan per akun untuk info tambahan:
- Email terkait
- Plan type (free/pro)
- API key reference
- Catatan bebas

**Implementasi**:
- Textarea di form add/edit
- Expandable notes section di card (klik untuk expand)
- **Database**: Kolom `notes` (text) di Supabase
- **Files**: `index.html`, `ui.js`, `style.css`, `accounts.js`

---

### 10. Webhook Notifications (Discord / Telegram)
> **Priority**: 🔥🔥🔥🔥🔥 | **Impact**: Always-on alerts

Kirim notifikasi ke Discord/Telegram saat akun ready, bahkan saat browser tertutup.

**Opsi implementasi**:

**A. Client-side (sederhana)**:
- User input Discord webhook URL di settings
- Saat countdown habis, kirim POST ke webhook
- Limitasi: hanya berfungsi saat browser aktif

**B. Server-side (reliable)**:
- Supabase Edge Function yang cek `refresh_deadline` secara periodik
- Kirim ke Discord/Telegram webhook saat deadline lewat
- Berfungsi 24/7 tanpa browser
- **Files**: Supabase Edge Function (Deno), settings UI

---

## 📋 Implementation Priority Order

```
Phase 1 (Core):
  ├── Auto-Status Toggle
  ├── Search
  └── Sort Options

Phase 2 (Organization):
  ├── Account Tags
  ├── Account Notes
  └── Export/Import

Phase 3 (Advanced):
  ├── Real-time Sync
  ├── Usage History
  ├── Bulk Actions
  └── Webhook Notifications
```
