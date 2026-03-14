"use client";
// components/globe/NodePing.tsx
// ============================================================
// Titik glowing yang muncul di permukaan globe saat ada transaksi
// baru. Setiap tx → satu ping muncul, tumbuh, lalu fade out.
//
// Animasi:
// 1. Muncul (scale 0 → 1, opacity 0 → 1)
// 2. Pulse ring melebar ke luar
// 3. Fade out dan destroy setelah 2 detik
//
// Warna berdasarkan nilai transaksi:
// - Normal tx        → cyan
// - Large tx (>1K)   → purple/orange
// ============================================================

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

interface NodePingProps {
  lat: number;
  lng: number;
  color?: string;
  onDone: () => void;  // Dipanggil saat animasi selesai → parent hapus dari list
}

export function NodePing({ lat, lng, color = "#22d3ee", onDone }: NodePingProps) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const age     = useRef(0);
  const LIFETIME = 2.0; // detik

  const pos = latLngToXYZ(lat, lng, 1.01); // Sedikit di atas permukaan globe

  useFrame((_, delta) => {
    age.current += delta;
    const t = age.current / LIFETIME; // 0 → 1

    if (coreRef.current) {
      // Core: tumbuh cepat lalu fade
      const scale = Math.min(t * 4, 1);
      coreRef.current.scale.setScalar(scale);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
    }

    if (ringRef.current) {
      // Ring: melebar dan fade
      const ringScale = 1 + t * 3;
      ringRef.current.scale.setScalar(ringScale);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.6;
    }

    // Selesai → panggil callback
    if (age.current >= LIFETIME) onDone();
  });

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      {/* Titik inti */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={1} />
      </mesh>

      {/* Cincin pulse melebar */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.018, 0.028, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
