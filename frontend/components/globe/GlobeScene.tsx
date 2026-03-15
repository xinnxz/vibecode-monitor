"use client";
// components/globe/GlobeScene.tsx
// ============================================================
// Hybrid Hub + Ripple Globe Scene (Idea 4):
//   - All TX arcs fly FROM random world cities → Somnia Hub (Singapore)
//   - Hub pulses faster with higher TPS, flashes on each new block
//   - On arc landing → HubRipple outward wave
//   - Whale TX → outbound arc FROM hub → destination (gold)
//   - Impact burst at whale destination
// ============================================================

import { Suspense, useCallback, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Preload } from "@react-three/drei";
import * as THREE from "three";

import { EarthGlobe }       from "./EarthGlobe";
import { SpaceEnvironment } from "./SpaceEnvironment";
import { NodePing }         from "./NodePing";
import { FlyArc }           from "./FlyArc";
import { WhalePulse }       from "./WhalePulse";
import { ImpactBurst }      from "./ImpactBurst";
import { SomniaHub }        from "./SomniaHub";
import { ValidatorNodes }   from "./ValidatorNodes"; // NEW
import { HubRipple }        from "./HubRipple";
import { NodePulse }        from "./NodePulse";
import { HUB_LAT, HUB_LNG } from "./SomniaHub";
import { useGlobeTxFeed }   from "@/hooks/useGlobeTxFeed";

function SpinningContainer({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.04;
    }
  });
  return <group ref={ref}>{children}</group>;
}

export function GlobeScene() {
  const {
    pings, arcs, bursts, pulses, ripples, nodePulses,
    hubFlash, tps,
    removePing, onArcLanded,
    removeBurst, removePulse, removeRipple, removeNodePulse,
  } = useGlobeTxFeed();

  return (
    <Canvas
      camera={{ position: [0, 20, 160], fov: 45, near: 1, far: 2000 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: 6,
        toneMappingExposure: 1.2,
      }}
      style={{ background: "#010204" }}
    >
      <Suspense fallback={null}>
        {/* ——— Environment ——— */}
        <SpaceEnvironment />
        {/* ——— ALL GEOGRAPHIC ACTIVITY WRAPPED TO TRACK EXACT SAME ROTATION ——— */}
        <SpinningContainer>
          <EarthGlobe />

          {/* ——— Constellation Web — 5 Regional Validators ——— */}
          <ValidatorNodes />

          {/* ——— Somnia Hub — permanent anchor at Singapore ——— */}
          <SomniaHub tps={tps} flash={hubFlash} />

          {/* ——— Hub Ripples — triggered when arcs land ——— */}
          {ripples.map((r) => (
            <HubRipple
              key={r.id}
              color={r.color}
              onDone={() => removeRipple(r.id)}
            />
          ))}

          {/* ——— Node Pings — TX origin markers ——— */}
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

          {/* ——— Phase 2: Mempool Gossip Protocol Pulses ——— */}
          {nodePulses.map((np) => (
            <NodePulse
              key={np.id}
              lat={np.lat}
              lng={np.lng}
              color={np.color}
              onDone={() => removeNodePulse(np.id)}
            />
          ))}

          {/* ——— Laser Arcs — TX flights to/from hub ——— */}
          {arcs.map((a) => {
            const isWhale = a.color === "#f59e0b" && a.intensity >= 1.0;
            return (
              <FlyArc
                key={a.id}
                fromLat={a.fromLat}
                fromLng={a.fromLng}
                toLat={a.toLat}
                toLng={a.toLng}
                color={a.color}
                endColor={a.endColor}
                speed={a.speed}
                intensity={a.intensity}
                isBurst={a.isBurst}
                onDone={() => onArcLanded(a.id, isWhale, a.isHubBound)}
              />
            );
          })}

          {/* ——— Impact Bursts — at whale TX destinations ——— */}
          {bursts.map((b) => (
            <ImpactBurst
              key={b.id}
              lat={b.lat}
              lng={b.lng}
              color={b.color}
              onDone={() => removeBurst(b.id)}
            />
          ))}

          {/* ——— Whale Pulses — large TX visual indicators ——— */}
          {pulses.map((p) => (
            <WhalePulse
              key={p.id}
              lat={p.lat}
              lng={p.lng}
              onDone={() => removePulse(p.id)}
            />
          ))}
        </SpinningContainer>

        <Preload all />
      </Suspense>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enablePan
        autoRotate
        autoRotateSpeed={0.2}
        minDistance={80}
        maxDistance={500}
      />
    </Canvas>
  );
}
