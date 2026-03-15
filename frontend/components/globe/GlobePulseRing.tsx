"use client";
// components/globe/GlobePulseRing.tsx
// ============================================================
// Efek cincin sonar yang memuai dari pusat globe setiap blok baru.
// Seperti radar ping — ring putih memuai + memudar.
// ============================================================

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface GlobePulseRingProps {
  color?: string;
  onDone: () => void;
}

const R = 50;

export function GlobePulseRing({ color = "#ffffff", onDone }: GlobePulseRingProps) {
  const ringRef = useRef<THREE.Mesh>(null!);
  const age = useRef(0);
  const LIFETIME = 1.8; // seconds for full expand + fade

  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color]
  );

  useFrame((_, delta) => {
    age.current += delta;
    const t = Math.min(age.current / LIFETIME, 1);

    if (ringRef.current) {
      // Expand from R to R*2.5
      const scale = R + t * R * 1.5;
      ringRef.current.scale.setScalar(scale / R);

      // Fade out with easeOut curve
      ringMat.opacity = 0.4 * (1 - t * t);
    }

    if (age.current >= LIFETIME) {
      ringMat.dispose();
      onDone();
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[R - 0.5, R + 0.5, 64]} />
      <primitive object={ringMat} attach="material" />
    </mesh>
  );
}
