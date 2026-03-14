"use client";
// components/globe/GlobeScene.tsx
// ============================================================
// Komponen utama yang mengikat semua globe sub-komponen.
// Ini adalah React Three Fiber Canvas root.
//
// Hierarki:
//   Canvas (R3F)
//   ├── ambientLight + pointLight
//   ├── StarField          ← bintang latar belakang
//   ├── EarthGlobe         ← bola bumi berputar
//   ├── NodePing[]         ← animasi titik per transaksi
//   ├── FlyArc[]           ← laser arc per transaksi
//   ├── WhalePulse[]       ← red wave saat whale alert
//   └── OrbitControls      ← user bisa mouse-drag globe
//
// Data realtime masuk dari:
// - useBlockStream  → setiap tx baru → NodePing + FlyArc
// - useWhaleAlerts  → whale alert   → WhalePulse
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import { EarthGlobe }  from "./EarthGlobe";
import { StarField }   from "./StarField";
import { NodePing }    from "./NodePing";
import { FlyArc }      from "./FlyArc";
import { WhalePulse }  from "./WhalePulse";

import { useBlockStream } from "@/hooks/useBlockStream";
import { useWhaleAlerts } from "@/hooks/useWhaleAlerts";
import { hashToLatLng }   from "@/lib/utils/geo";

// ——— Tipe untuk animasi yang sedang berjalan ———
interface ActivePing {
  id: string;
  lat: number;
  lng: number;
  color: string;
}

interface ActiveArc {
  id:      string;
  fromLat: number;
  fromLng: number;
  toLat:   number;
  toLng:   number;
  color:   string;
}

interface ActivePulse {
  id:  string;
  lat: number;
  lng: number;
}

// ——— Pilih warna arc berdasarkan jumlah ETH ———
function arcColor(amountWei: bigint): string {
  const stt = Number(amountWei) / 1e18;
  if (stt > 10_000) return "#f97316"; // Orange — dan sangat besar
  if (stt > 100)    return "#a855f7"; // Purple — menengah
  return "#22d3ee";                   // Cyan — normal
}

export function GlobeScene() {
  const [pings,  setPings]  = useState<ActivePing[]>([]);
  const [arcs,   setArcs]   = useState<ActiveArc[]>([]);
  const [pulses, setPulses] = useState<ActivePulse[]>([]);

  const { latestBlock } = useBlockStream();
  const { latestAlert } = useWhaleAlerts();

  const lastBlockRef = useRef<number | null>(null);

  // ——— Saat blok baru masuk → buat animasi per transaksi ———
  useEffect(() => {
    if (!latestBlock) return;
    if (latestBlock.number === lastBlockRef.current) return;
    lastBlockRef.current = latestBlock.number;

    // Batasi max 10 animasi per blok agar tidak overload GPU
    const txs = latestBlock.transactions.slice(0, 10);
    const timestamp = Date.now();

    const newPings: ActivePing[] = [];
    const newArcs:  ActiveArc[] = [];

    txs.forEach((hash, i) => {
      // Konversi hash ke koordinat (deterministik)
      const fromCoord = hashToLatLng(hash);
      // "To" pakai bagian lain dari hash
      const toCoord   = hashToLatLng(hash.slice(0, 2) + hash.slice(4));

      const id    = `${timestamp}-${i}`;
      const color = "#22d3ee";

      newPings.push({ id: `ping-${id}`, lat: fromCoord.lat, lng: fromCoord.lng, color });
      newArcs.push({
        id:   `arc-${id}`,
        fromLat: fromCoord.lat,
        fromLng: fromCoord.lng,
        toLat:   toCoord.lat,
        toLng:   toCoord.lng,
        color,
      });
    });

    setPings((prev) => [...prev, ...newPings].slice(-50));
    setArcs((prev)  => [...prev, ...newArcs].slice(-40));
  }, [latestBlock]);

  // ——— Saat Whale Alert masuk → buat WhalePulse ———
  useEffect(() => {
    if (!latestAlert) return;

    const { lat, lng } = hashToLatLng(latestAlert.from);
    const id = `pulse-${latestAlert.id}`;

    setPulses((prev) => [
      ...prev.filter((p) => p.id !== id),
      { id, lat, lng },
    ]);
  }, [latestAlert]);

  return (
    <Canvas
      camera={{ position: [0, 0, 2.8], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      {/* ——— Lighting ——— */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 3, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color="#2244ff" />

      {/* ——— Bintang ——— */}
      <StarField count={2000} />

      {/* ——— Bumi ——— */}
      <EarthGlobe radius={1.0} />

      {/* ——— Node pings per tx ——— */}
      {pings.map((p) => (
        <NodePing
          key={p.id}
          lat={p.lat}
          lng={p.lng}
          color={p.color}
          onDone={() => setPings((prev) => prev.filter((x) => x.id !== p.id))}
        />
      ))}

      {/* ——— Laser arcs per tx ——— */}
      {arcs.map((a) => (
        <FlyArc
          key={a.id}
          fromLat={a.fromLat}
          fromLng={a.fromLng}
          toLat={a.toLat}
          toLng={a.toLng}
          color={a.color}
          onDone={() => setArcs((prev) => prev.filter((x) => x.id !== a.id))}
        />
      ))}

      {/* ——— Whale Pulse ——— */}
      {pulses.map((p) => (
        <WhalePulse
          key={p.id}
          lat={p.lat}
          lng={p.lng}
          onDone={() => setPulses((prev) => prev.filter((x) => x.id !== p.id))}
        />
      ))}

      {/* ——— User bisa rotate globe dengan mouse ——— */}
      <OrbitControls
        enableZoom
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        minDistance={1.8}
        maxDistance={5}
      />
    </Canvas>
  );
}
