# 🗄️ Database Setup — Supabase

> Panduan setup dan update database Supabase untuk Vibe Code Monitor.

---

## Tabel: `accounts`

### Kolom yang Sudah Ada

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | `uuid` (PK, default: `gen_random_uuid()`) | Unique ID akun |
| `name` | `text` | Nama akun |
| `status` | `text` | Status: `available` atau `limited` |
| `refresh_days` | `int4` | Hari sampai quota refresh |
| `refresh_hours` | `int4` | Jam sampai quota refresh |
| `created_at` | `timestamptz` (default: `now()`) | Waktu dibuat |

### Kolom yang Perlu Ditambahkan

> ⚠️ Kolom-kolom ini **harus ditambahkan manual** di Supabase Dashboard agar fitur countdown dan minutes berfungsi.

| Kolom | Tipe | Default | Deskripsi |
|-------|------|---------|-----------|
| `refresh_deadline` | `timestamptz` | `null` | Timestamp kapan quota akan refresh (untuk live countdown) |
| `refresh_minutes` | `int4` | `null` | Menit sampai quota refresh |

### Cara Menambahkan Kolom

1. Buka **Supabase Dashboard** → **Table Editor** → tabel `accounts`
2. Klik **Insert Column** (atau **+** di header tabel)
3. Untuk `refresh_deadline`:
   - **Name**: `refresh_deadline`
   - **Type**: `timestamptz`
   - **Default Value**: *(kosong)*
   - **Allow Nullable**: ✅
   - Klik **Save**
4. Untuk `refresh_minutes`:
   - **Name**: `refresh_minutes`
   - **Type**: `int4`
   - **Default Value**: *(kosong)*
   - **Allow Nullable**: ✅
   - Klik **Save**

### SQL Alternatif

Jika lebih suka pakai SQL Editor di Supabase:

```sql
-- Tambah kolom refresh_deadline
ALTER TABLE accounts
ADD COLUMN refresh_deadline TIMESTAMPTZ DEFAULT NULL;

-- Tambah kolom refresh_minutes
ALTER TABLE accounts
ADD COLUMN refresh_minutes INT4 DEFAULT NULL;
```

---

## Kolom untuk Fitur Masa Depan

Kolom-kolom ini belum perlu ditambahkan sekarang, tapi akan diperlukan saat fitur-fitur berikut diimplementasi.

| Kolom | Tipe | Untuk Fitur |
|-------|------|-------------|
| `auto_reset` | `boolean` | Auto-Status Toggle |
| `tags` | `text[]` | Account Tags/Groups |
| `notes` | `text` | Account Notes |

### Tabel Baru (Masa Depan)

| Tabel | Kolom | Untuk Fitur |
|-------|-------|-------------|
| `account_history` | `id`, `account_id` (FK), `event`, `old_status`, `new_status`, `timestamp` | Usage History Log |
| `tags` | `id`, `name`, `color` | Account Tags |

---

## Environment Variables

Saat ini Supabase URL dan Anon Key di-hardcode di `src/supabase.js`. Untuk production, gunakan environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Dan di `supabase.js`:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```
