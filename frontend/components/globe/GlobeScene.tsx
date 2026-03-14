"use client";
// components/globe/GlobeScene.tsx — UPGRADED lighting + demo arcs

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import { EarthGlobe }  from "./EarthGlobe";
import { StarField }   from "./StarField";
import { NodePing }    from "./NodePing";
import { FlyArc }      from "./FlyArc";
import { WhalePulse }  from "./WhalePulse";

import { useBlockStream } from "@/hooks/useBlockStream";
import { useWhaleAlerts } from "@/hooks/useWhaleAlerts";
import { hashToLatLng }   from "@/lib/utils/geo";

interface ActivePing  { id: string; lat: number; lng: number; color: string }
interface ActiveArc   { id: string; fromLat: number; fromLng: number; toLat: number; toLng: number; color: string }
interface ActivePulse { id: string; lat: number; lng: number }

// Demo arc data — kota-kota besar di dunia untuk visual demo
const DEMO_LOCATIONS = [
  { lat:  40.7, lng: -74.0 },  // New York
  { lat:  51.5, lng:  -0.1 },  // London
  { lat:  35.7, lng: 139.7 },  // Tokyo
  { lat:  22.3, lng: 114.2 },  // Hong Kong
  { lat: -23.5, lng: -46.6 },  // São Paulo
  { lat:  55.8, lng:  37.6 },  // Moscow
  { lat:  1.35, lng: 103.8 },  // Singapore
  { lat:  48.9, lng:   2.3 },  // Paris
  { lat:  28.6, lng:  77.2 },  // New Delhi
  { lat: -33.9, lng: 151.2 },  // Sydney
  { lat:  37.6, lng: -122.4 }, // San Francisco
  { lat:  25.2, lng:  55.3 },  // Dubai
];

const DEMO_COLORS = ["#22d3ee", "#a855f7", "#10b981", "#f59e0b", "#3b82f6", "#ec4899"];

function randomDemoArc(id: string): ActiveArc {
  const fromIdx = Math.floor(Math.random() * DEMO_LOCATIONS.length);
  let toIdx     = Math.floor(Math.random() * DEMO_LOCATIONS.length);
  if (toIdx === fromIdx) toIdx = (toIdx + 1) % DEMO_LOCATIONS.length;
  const color = DEMO_COLORS[Math.floor(Math.random() * DEMO_COLORS.length)];
  return {
    id,
    fromLat: DEMO_LOCATIONS[fromIdx].lat + (Math.random() - 0.5) * 15,
    fromLng: DEMO_LOCATIONS[fromIdx].lng + (Math.random() - 0.5) * 15,
    toLat:   DEMO_LOCATIONS[toIdx].lat   + (Math.random() - 0.5) * 15,
    toLng:   DEMO_LOCATIONS[toIdx].lng   + (Math.random() - 0.5) * 15,
    color,
  };
}

// Internal scene component (must be inside Canvas)
function Scene() {
  const [pings,  setPings]  = useState<ActivePing[]>([]);
  const [arcs,   setArcs]   = useState<ActiveArc[]>([]);
  const [pulses, setPulses] = useState<ActivePulse[]>([]);

  const { latestBlock } = useBlockStream();
  const { latestAlert } = useWhaleAlerts();
  const lastBlockRef    = useRef<number | null>(null);
  const demoCounterRef  = useRef(0);

  // ——— Demo arcs: spawn terus setiap 1.5 detik agar globe terlihat hidup ———
  useEffect(() => {
    const interval = setInterval(() => {
      const id = `demo-${Date.now()}-${demoCounterRef.current++}`;
      const arc = randomDemoArc(id);
      const ping: ActivePing = {
        id: `ping-${id}`,
        lat: arc.fromLat, lng: arc.fromLng,
        color: arc.color,
      };
      setArcs((prev)  => [...prev, arc].slice(-30));
      setPings((prev) => [...prev, ping].slice(-30));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // ——— Real blockchain arcs ———
  useEffect(() => {
    if (!latestBlock || latestBlock.number === lastBlockRef.current) return;
    lastBlockRef.current = latestBlock.number;

    const txs = latestBlock.transactions.slice(0, 8);
    if (txs.length === 0) return;

    const timestamp = Date.now();
    txs.forEach((hash, i) => {
      const fromCoord = hashToLatLng(hash);
      const toCoord   = hashToLatLng(hash.slice(0, 2) + hash.slice(4));
      const id = `${timestamp}-${i}`;
      setArcs((prev) => [...prev, {
        id: `arc-${id}`, fromLat: fromCoord.lat, fromLng: fromCoord.lng,
        toLat: toCoord.lat, toLng: toCoord.lng, color: "#22d3ee",
      }].slice(-40));
      setPings((prev) => [...prev, {
        id: `ping-${id}`, lat: fromCoord.lat, lng: fromCoord.lng, color: "#22d3ee",
      }].slice(-40));
    });
  }, [latestBlock]);

  // ——— Whale pulse ———
  useEffect(() => {
    if (!latestAlert) return;
    const { lat, lng } = hashToLatLng(latestAlert.from);
    const id = `pulse-${latestAlert.id}`;
    setPulses((prev) => [...prev.filter(p => p.id !== id), { id, lat, lng }]);
  }, [latestAlert]);

  return (
    <>
      {/* ——— Lighting: lebih terang ——— */}
      <ambientLight intensity={1.2} color="#ffffff" />
      <pointLight position={[3, 2, 3]}  intensity={3.0} color="#4488ff" />
      <pointLight position={[-3, -2, -3]} intensity={1.5} color="#0033cc" />
      <pointLight position={[0, 3, 0]}  intensity={2.0} color="#8866ff" />
      <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />

      <StarField count={2500} />
      <EarthGlobe radius={1.0} />

      {pings.map((p) => (
        <NodePing key={p.id} lat={p.lat} lng={p.lng} color={p.color}
          onDone={() => setPings(prev => prev.filter(x => x.id !== p.id))} />
      ))}
      {arcs.map((a) => (
        <FlyArc key={a.id} fromLat={a.fromLat} fromLng={a.fromLng}
          toLat={a.toLat} toLng={a.toLng} color={a.color}
          onDone={() => setArcs(prev => prev.filter(x => x.id !== a.id))} />
      ))}
      {pulses.map((p) => (
        <WhalePulse key={p.id} lat={p.lat} lng={p.lng}
          onDone={() => setPulses(prev => prev.filter(x => x.id !== p.id))} />
      ))}

      <OrbitControls
        enableZoom enablePan={false}
        autoRotate autoRotateSpeed={0.4}
        minDistance={1.8} maxDistance={5}
      />
    </>
  );
}

// Wrapper yang menyediakan Canvas context
export function GlobeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.6], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
    >
      <Scene />
    </Canvas>
  );
}
