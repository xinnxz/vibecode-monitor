"use client";
// components/globe/SomniaHub.tsx
// ============================================================
// Somnia Hub — permanent glowing orb at Singapore.
// STAYS FIXED ON EARTH SURFACE by tracking earthRef rotation:
// Every frame, the hub group's Y rotation is set to match the
// earthRef group's Y rotation so it rotates with the earth.
// ============================================================

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

// Singapore — geographic anchor
export const HUB_LAT =   1.3521;
export const HUB_LNG = 103.8198;

// Shared mutable ref so EarthGlobe can write rotation.y here
// and SomniaHub can read it every frame
export const earthRotationRef = { y: 0 };

interface SomniaHubProps {
  tps?: number;
  flash?: boolean;
}

const R = 50;

export function SomniaHub({ tps = 0, flash = false }: SomniaHubProps) {
  const groupRef  = useRef<THREE.Group>(null!);
  const coreRef   = useRef<THREE.Mesh>(null!);
  const haloRef   = useRef<THREE.Mesh>(null!);
  const ring1Ref  = useRef<THREE.Mesh>(null!);
  const ring2Ref  = useRef<THREE.Mesh>(null!);
  const flashRef  = useRef(0);
  const timeRef   = useRef(0);

  // Base position on non-rotating unit sphere — rotation applied via group
  const basePos = useMemo(() => {
    const p = latLngToXYZ(HUB_LAT, HUB_LNG, R + 1);
    return new THREE.Vector3(p.x, p.y, p.z);
  }, []);

  // Billboard quaternion (face outward from globe center) — recomputed each frame with rotation
  const billboardQuat = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (flash) flashRef.current = 1.0;
  }, [flash]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // Pulse
    const pulseSpeed = 0.8 + Math.min(tps, 30) * 0.07;
    const pulse = (Math.sin(t * pulseSpeed * Math.PI * 2) + 1) / 2;

    flashRef.current = Math.max(0, flashRef.current - delta * 2.5);
    const f = flashRef.current;

    if (coreRef.current) {
      const s = 0.8 + pulse * 0.4 + f * 0.8;
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).color.setHex(
        f > 0.1 ? 0xffffff : 0x9d00ff
      );
    }
    if (haloRef.current) {
      haloRef.current.scale.setScalar(1.2 + pulse * 0.6 + f * 1.5);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + pulse * 0.08 + f * 0.2;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.3;
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + pulse * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.2;
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + pulse * 0.15;
    }
  });

  // The hub group uses Y rotation to track earth, position is in local (un-rotated) coords
  // basePos is the Singapore coords at rotation.y = 0
  return (
    <group ref={groupRef}>
      <group position={[basePos.x, basePos.y, basePos.z]}>
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
    </group>
  );
}
