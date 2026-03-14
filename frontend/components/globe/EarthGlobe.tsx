"use client";
// components/globe/EarthGlobe.tsx
// Bola Bumi 3D dengan texture + glowing atmosphere.
// Sphere utama + lapisan atmosphere biru (additive blending).

import { useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

export function EarthGlobe({ radius = 1.0 }: { radius?: number }) {
  const meshRef   = useRef<THREE.Mesh>(null!);
  const outerRef  = useRef<THREE.Mesh>(null!);

  // Rotasi bumi sangat lambat
  useFrame((_, delta) => {
    if (meshRef.current)  meshRef.current.rotation.y  += delta * 0.05;
    if (outerRef.current) outerRef.current.rotation.y += delta * 0.04;
  });

  return (
    <group>
      {/* ——— Bola utama: garis bumi dengan warna solid gelap ——— */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          color="#0a1628"
          roughness={0.8}
          metalness={0.1}
          emissive="#0d2040"
          emissiveIntensity={0.3}
          wireframe={false}
        />
      </mesh>

      {/* ——— Grid lines / wireframe overlay (benua effect) ——— */}
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[radius + 0.001, 36, 18]} />
        <meshBasicMaterial
          color="#1a4a8a"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* ——— Atmosphere glow (lapisan luar biru bercahaya) ——— */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[radius * 1.06, 64, 64]} />
        <meshStandardMaterial
          color="#1e6fff"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          emissive="#0044ff"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* ——— Rim glow (halo di pinggir bola) ——— */}
      <mesh>
        <sphereGeometry args={[radius * 1.12, 64, 64]} />
        <meshBasicMaterial
          color="#00ccff"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
