// lib/utils/geo.ts
// ============================================================
// Utility untuk mengkonversi data blockchain menjadi koordinat
// geografis pada globe 3D.
//
// Karena transaksi blockchain tidak memiliki info lokasi fisik,
// kita menggunakan pendekatan "deterministic pseudo-random":
// - Hash transaksi/alamat → angka deterministik → lat/lng
// - Ini artinya alamat yang sama SELALU muncul di titik yang sama
//   di globe, memberikan kesan "wallet memiliki lokasi".
//
// Fungsi-fungsi yang tersedia:
// - hashToLatLng: konversi tx hash ke koordinat lat/lng
// - addressToLatLng: konversi wallet address ke koordinat lat/lng
// - latLngToXYZ: konversi lat/lng ke koordinat 3D (untuk Three.js)
// ============================================================

export interface LatLng {
  lat: number;  // -90 sampai 90
  lng: number;  // -180 sampai 180
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

// ——————————————————————————————————————————
// Konversi hex string ke angka 0-1 (deterministik)
// ——————————————————————————————————————————
function hexToFraction(hex: string, offset: number = 0): number {
  // Ambil 8 karakter dari posisi offset (skip "0x" prefix)
  const clean = hex.replace("0x", "").toLowerCase();
  const slice = clean.substring(offset % clean.length, offset % clean.length + 8);
  if (slice.length === 0) return 0.5;

  // Parse sebagai angka dan normalisasi ke 0-1
  const num = parseInt(slice.padEnd(8, "0"), 16);
  return num / 0xffffffff;
}

// ——————————————————————————————————————————
// Konversi tx hash ke koordinat lat/lng
// Hash yang sama → koordinat yang sama (deterministik)
// ——————————————————————————————————————————
export function hashToLatLng(hash: string): LatLng {
  if (!hash || hash === "0x") return { lat: 0, lng: 0 };

  // Gunakan bagian berbeda dari hash untuk lat dan lng
  const latFraction = hexToFraction(hash, 0);  // Karakter 0-7
  const lngFraction = hexToFraction(hash, 8);  // Karakter 8-15

  return {
    lat: latFraction * 180 - 90,    // -90 sampai 90
    lng: lngFraction * 360 - 180,   // -180 sampai 180
  };
}

// ——————————————————————————————————————————
// Konversi wallet address ke koordinat lat/lng
// ——————————————————————————————————————————
export function addressToLatLng(address: string): LatLng {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return { lat: 0, lng: 0 };
  }
  return hashToLatLng(address);
}

// ——————————————————————————————————————————
// Konversi lat/lng ke koordinat XYZ 3D (permukaan bola)
// radius = jari-jari globe (default 1.0 unit Three.js)
// ——————————————————————————————————————————
export function latLngToXYZ(lat: number, lng: number, radius: number = 1.0): XYZ {
  const phi   = (90 - lat) * (Math.PI / 180);   // Polar angle dari atas
  const theta = (lng + 180) * (Math.PI / 180);  // Azimuthal angle

  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

// ——————————————————————————————————————————
// Shortcut: hash langsung ke XYZ (paling sering dipakai di globe)
// ——————————————————————————————————————————
export function hashToXYZ(hash: string, radius: number = 1.0): XYZ {
  const { lat, lng } = hashToLatLng(hash);
  return latLngToXYZ(lat, lng, radius);
}

// ——————————————————————————————————————————
// Format helpers untuk UI
// ——————————————————————————————————————————

/** Format angka besar jadi lebih ringkas: 1,234,567 → 1.23M */
export function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

/** Format alamat: 0xABCD...EF12 */
export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Format STT amount: 100000.5 → "100,000.5 STT" */
export function formatSTT(amountWei: bigint): string {
  const stt = Number(amountWei) / 1e18;
  return `${stt.toLocaleString("en-US", { maximumFractionDigits: 4 })} STT`;
}
