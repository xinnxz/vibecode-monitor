"use client";
// components/globe/EarthGlobe.tsx
// Bola Bumi 3D premium — terinspirasi dari Vibe Code Monitor.
// Menggunakan kombinasi material + shader custom untuk efek:
// - Bola biru gelap dengan glow benua
// - Atmosphere neon biru di pinggir
// - Grid transparan di permukaan
// - Titik-titik node di permukaan

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function EarthGlobe({ radius = 1.0 }: { radius?: number }) {
  const coreRef      = useRef<THREE.Mesh>(null!);
  const glowRef      = useRef<THREE.Mesh>(null!);
  const gridRef      = useRef<THREE.Mesh>(null!);
  const outerGlowRef = useRef<THREE.Mesh>(null!);

  // Rotasi lambat
  useFrame((_, delta) => {
    coreRef.current.rotation.y      += delta * 0.04;
    gridRef.current.rotation.y      += delta * 0.04;
  });

  // Buat geometry titik-titik di permukaan (dot grid)
  const dotPositions = useMemo(() => {
    const positions: number[] = [];
    const R = radius + 0.002;
    // Grid berdasarkan lat/lng — 30 baris × 60 kolom
    for (let lat = -80; lat <= 80; lat += 6) {
      for (let lng = -180; lng < 180; lng += 6) {
        const phi   = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        positions.push(
          -R * Math.sin(phi) * Math.cos(theta),
           R * Math.cos(phi),
           R * Math.sin(phi) * Math.sin(theta)
        );
      }
    }
    return new Float32Array(positions);
  }, [radius]);

  return (
    <group>
      {/* ——— Core sphere: medium blue, emissive ——— */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          color="#0a1f4e"
          emissive="#0d3388"
          emissiveIntensity={0.6}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* ——— Grid pattern (wireframe longitude/latitude) ——— */}
      <mesh ref={gridRef}>
        <sphereGeometry args={[radius + 0.002, 24, 12]} />
        <meshBasicMaterial
          color="#1a6fff"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* ——— Surface dot grid (titik + di permukaan) ——— */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dotPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#3a9fff"
          size={0.008}
          sizeAttenuation
          transparent
          opacity={0.5}
        />
      </points>

      {/* ——— Inner atmosphere (permukaan terang di tepian = rim lighting) ——— */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius * 1.02, 64, 64]} />
        <meshStandardMaterial
          color="#1a88ff"
          emissive="#0066ff"
          emissiveIntensity={0.5}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ——— Mid atmosphere glow biru cerah ——— */}
      <mesh>
        <sphereGeometry args={[radius * 1.08, 64, 64]} />
        <meshBasicMaterial
          color="#0055ff"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ——— Outer halo lebar (rim glow yang terlihat jelas) ——— */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[radius * 1.18, 64, 64]} />
        <meshBasicMaterial
          color="#00aaff"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
