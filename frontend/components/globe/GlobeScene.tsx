"use client";
// components/globe/GlobeScene.tsx

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload } from "@react-three/drei";

import { EarthGlobe }        from "./EarthGlobe";
import { SpaceEnvironment }  from "./SpaceEnvironment";
import { NodePing }          from "./NodePing";
import { FlyArc }            from "./FlyArc";
import { WhalePulse }        from "./WhalePulse";

import { useBlockStream }    from "@/hooks/useBlockStream";
import { useWhaleAlerts }    from "@/hooks/useWhaleAlerts";
import { hashToLatLng }      from "@/lib/utils/geo";

// ——— Tipe untuk animasi aktif ———
interface ActivePing {
  id: string; lat: number; lng: number; color: string;
}
interface ActiveArc {
  id: string;
  fromLat: number; fromLng: number;
  toLat: number;   toLng: number;
  color: string;
}
interface ActivePulse {
  id: string; lat: number; lng: number;
}

export function GlobeScene() {
  const [pings, setPings]   = useState<ActivePing[]>([]);
  const [arcs, setArcs]     = useState<ActiveArc[]>([]);
  const [pulses, setPulses] = useState<ActivePulse[]>([]);

  const { latestBlock } = useBlockStream();
  const { latestAlert } = useWhaleAlerts();
  const lastBlockRef    = useRef<number | null>(null);

  // ——— Blok baru → spawn NodePing + FlyArc ———
  useEffect(() => {
    if (!latestBlock || latestBlock.number === lastBlockRef.current) return;
    lastBlockRef.current = latestBlock.number;

    const txs = latestBlock.transactions.slice(0, 8);
    const ts  = Date.now();

    const newPings: ActivePing[] = [];
    const newArcs: ActiveArc[] = [];

    txs.forEach((hash, i) => {
      const from = hashToLatLng(hash);
      const to   = hashToLatLng(hash.slice(0, 2) + hash.slice(4));
      const id   = `${ts}-${i}`;

      newPings.push({ id: `p-${id}`, lat: from.lat, lng: from.lng, color: "#22d3ee" });
      newArcs.push({
        id: `a-${id}`,
        fromLat: from.lat, fromLng: from.lng,
        toLat: to.lat, toLng: to.lng,
        color: "#f3ae76",
      });
    });

    setPings((prev) => [...prev, ...newPings].slice(-40));
    setArcs((prev) => [...prev, ...newArcs].slice(-30));
  }, [latestBlock]);

  // ——— Whale Alert → spawn WhalePulse ———
  useEffect(() => {
    if (!latestAlert) return;
    const { lat, lng } = hashToLatLng(latestAlert.from);
    setPulses((prev) => [
      ...prev.filter((p) => p.id !== `pulse-${latestAlert.id}`),
      { id: `pulse-${latestAlert.id}`, lat, lng },
    ]);
  }, [latestAlert]);

  return (
    <Canvas
      camera={{
        position: [0, 20, 160],
        fov: 45,
        near: 1,
        far: 2000,
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: 6, // ACESFilmicToneMapping
        toneMappingExposure: 1.2,
      }}
      style={{ background: "#010204" }}
    >
      {/* Suspense WAJIB untuk useLoader di EarthGlobe / SpaceEnvironment */}
      <Suspense fallback={null}>
        {/* ——— Space: nebula skybox, moon, bintang, lighting ——— */}
        <SpaceEnvironment />

        {/* ——— Bumi ——— */}
        <EarthGlobe />

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
            fromLat={a.fromLat} fromLng={a.fromLng}
            toLat={a.toLat}     toLng={a.toLng}
            color={a.color}
            onDone={() => setArcs((prev) => prev.filter((x) => x.id !== a.id))}
          />
        ))}

        {/* ——— Whale Pulses ——— */}
        {pulses.map((p) => (
          <WhalePulse
            key={p.id}
            lat={p.lat}
            lng={p.lng}
            onDone={() => setPulses((prev) => prev.filter((x) => x.id !== p.id))}
          />
        ))}

        <Preload all />
      </Suspense>

      {/* OrbitControls harus di luar Suspense */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enablePan
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={80}
        maxDistance={350}
      />
    </Canvas>
  );
}

