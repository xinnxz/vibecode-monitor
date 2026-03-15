"use client";
// components/globe/NodePing.tsx
// Titik glowing di permukaan globe saat ada transaksi baru.
// Skala sudah disesuaikan untuk R=50 (sesuai referensi).

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

interface NodePingProps {
  lat: number;
  lng: number;
  color?: string;
  onDone: () => void;
}

const R = 50;

export function NodePing({ lat, lng, color = "#22d3ee", onDone }: NodePingProps) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const age = useRef(0);
  const LIFETIME = 2.0;

  const pos = latLngToXYZ(lat, lng, R + 0.5);

  useFrame((_, delta) => {
    age.current += delta;
    const t = age.current / LIFETIME;

    if (coreRef.current) {
      const scale = Math.min(t * 4, 1);
      coreRef.current.scale.setScalar(scale);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + t * 3);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.6;
    }
    if (age.current >= LIFETIME) onDone();
  });

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={1} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.4, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
