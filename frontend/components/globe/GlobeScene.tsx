"use client";
// components/globe/GlobeScene.tsx
// ============================================================
// Main 3D scene: Earth globe + live TX visualizations.
// Uses useGlobeTxFeed for centralized data → visual mapping.
// ============================================================

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload } from "@react-three/drei";

import { EarthGlobe }       from "./EarthGlobe";
import { SpaceEnvironment } from "./SpaceEnvironment";
import { NodePing }         from "./NodePing";
import { FlyArc }           from "./FlyArc";
import { WhalePulse }       from "./WhalePulse";
import { GlobePulseRing }   from "./GlobePulseRing";
import { ImpactBurst }      from "./ImpactBurst";

import { useGlobeTxFeed }   from "@/hooks/useGlobeTxFeed";

export function GlobeScene() {
  const {
    pings, arcs, bursts, pulses, flashes,
    removePing, removeArc, removeBurst, removePulse, removeFlash,
  } = useGlobeTxFeed();

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
      <Suspense fallback={null}>
        {/* ——— Space: nebula skybox, moon, stars, lighting ——— */}
        <SpaceEnvironment />

        {/* ——— Earth ——— */}
        <EarthGlobe />

        {/* ——— Globe Pulse Rings (block arrival sonar) ——— */}
        {flashes.map((f) => (
          <GlobePulseRing
            key={f.id}
            color={f.color}
            onDone={() => removeFlash(f.id)}
          />
        ))}

        {/* ——— Node Pings (TX origin markers) ——— */}
        {pings.map((p) => (
          <NodePing
            key={p.id}
            lat={p.lat}
            lng={p.lng}
            color={p.color}
            size={p.size}
            onDone={() => removePing(p.id)}
          />
        ))}

        {/* ——— Laser Arcs (TX flight paths) ——— */}
        {arcs.map((a) => (
          <FlyArc
            key={a.id}
            fromLat={a.fromLat}
            fromLng={a.fromLng}
            toLat={a.toLat}
            toLng={a.toLng}
            color={a.color}
            speed={a.speed}
            intensity={a.intensity}
            onDone={() => removeArc(a.id)}
          />
        ))}

        {/* ——— Impact Bursts (TX landing particle explosions) ——— */}
        {bursts.map((b) => (
          <ImpactBurst
            key={b.id}
            lat={b.lat}
            lng={b.lng}
            color={b.color}
            onDone={() => removeBurst(b.id)}
          />
        ))}

        {/* ——— Whale Pulses (large TX indicators) ——— */}
        {pulses.map((p) => (
          <WhalePulse
            key={p.id}
            lat={p.lat}
            lng={p.lng}
            onDone={() => removePulse(p.id)}
          />
        ))}

        <Preload all />
      </Suspense>

      {/* OrbitControls must be outside Suspense */}
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
