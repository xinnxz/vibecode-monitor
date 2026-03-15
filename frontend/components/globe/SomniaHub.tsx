"use client";
// components/globe/SomniaHub.tsx
// ============================================================
// Somnia Hub — permanent glowing orb anchored at Singapore (1.35°N, 103.82°E).
// Represents the Somnia network node. Pulses faster as TPS increases.
// Emits a burst glow each time a new block arrives.
// ============================================================

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

// Singapore coordinates — geographic center of SEA + Somnia's home
export const HUB_LAT =   1.3521;
export const HUB_LNG = 103.8198;

interface SomniaHubProps {
  tps?: number;        // Current TPS — controls pulse speed
  flash?: boolean;     // True on new block → burst glow
}

const R = 50;

export function SomniaHub({ tps = 0, flash = false }: SomniaHubProps) {
  const coreRef   = useRef<THREE.Mesh>(null!);
  const haloRef   = useRef<THREE.Mesh>(null!);
  const ring1Ref  = useRef<THREE.Mesh>(null!);
  const ring2Ref  = useRef<THREE.Mesh>(null!);
  const flashRef  = useRef(0); // Flash intensity (decays to 0)
  const timeRef   = useRef(0);

  const pos = useMemo(() => latLngToXYZ(HUB_LAT, HUB_LNG, R + 1), []);

  // Billboard quaternion: orient rings to face outward from globe center
  const billboardQuat = useMemo(() => {
    const dir = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
    const m = new THREE.Matrix4().lookAt(
      new THREE.Vector3(0, 0, 0), dir, new THREE.Vector3(0, 1, 0)
    );
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [pos]);

  // Trigger flash on new block
  useEffect(() => {
    if (flash) flashRef.current = 1.0;
  }, [flash]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // Pulse speed scales with TPS (min 0.8/s, max 3/s)
    const pulseSpeed = 0.8 + Math.min(tps, 30) * 0.07;
    const pulse = (Math.sin(t * pulseSpeed * Math.PI * 2) + 1) / 2; // 0–1

    // Decay flash
    flashRef.current = Math.max(0, flashRef.current - delta * 2.5);
    const f = flashRef.current;

    // Core: small bright sphere + flash boost
    if (coreRef.current) {
      const s = 0.8 + pulse * 0.4 + f * 0.8;
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).color.setHex(
        f > 0.1 ? 0xffffff : 0x9d00ff
      );
    }

    // Halo: large soft glow ring (always visible)
    if (haloRef.current) {
      const hs = 1.2 + pulse * 0.6 + f * 1.5;
      haloRef.current.scale.setScalar(hs);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + pulse * 0.08 + f * 0.2;
    }

    // Orbit ring 1: rotates slowly
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.3;
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + pulse * 0.2;
    }

    // Orbit ring 2: rotates opposite direction, slightly bigger
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.2;
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + pulse * 0.15;
    }
  });

  return (
    <group position={[pos.x, pos.y, pos.z]} quaternion={billboardQuat}>
      {/* Core glow sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color={0x9d00ff}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Halo blob */}
      <mesh ref={haloRef}>
        <circleGeometry args={[3, 32]} />
        <meshBasicMaterial
          color={0xa855f7}
          transparent
          opacity={0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner orbit ring */}
      <mesh ref={ring1Ref}>
        <ringGeometry args={[2.0, 2.4, 48]} />
        <meshBasicMaterial
          color={0xc084fc}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer orbit ring */}
      <mesh ref={ring2Ref}>
        <ringGeometry args={[3.2, 3.5, 48]} />
        <meshBasicMaterial
          color={0x7c3aed}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
