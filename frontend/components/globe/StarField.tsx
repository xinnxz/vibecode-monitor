"use client";
// components/globe/StarField.tsx
// Latar belakang bintang 3D — 2000 partikel acak mengelilingi globe.
// Menggunakan Points geometry Three.js.

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function StarField({ count = 2000 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);

  // Buat posisi acak untuk semua bintang (hanya satu kali)
  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz  = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Distribusi bola acak radius 4-14 unit
      const r     = 4 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = Math.random() * 1.5 + 0.3;
    }
    return [pos, sz];
  }, [count]);

  // Rotasi sangat lambat — efek "galaxy berputar"
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size"     args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        color="#8b9cf0"
        size={0.015}
        sizeAttenuation
        transparent
        opacity={0.6}
        fog={false}
      />
    </points>
  );
}
