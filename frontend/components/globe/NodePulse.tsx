"use client";
// components/globe/NodePulse.tsx
// ============================================================
// Phase 2: Mempool Gossip Protocol
//
// Translating a transaction spread (gossip) across nodes.
// Visualized as an expanding ripple ring originating from the sender 
// before the main validator arc is launched.
// ============================================================

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

interface NodePulseProps {
  lat: number;
  lng: number;
  color?: string;
  onDone?: () => void;
}

const R = 50;

export function NodePulse({ lat, lng, color = "#4ade80", onDone }: NodePulseProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  const progress = useRef(0);

  // Position is at the surface of the earth
  const pos = latLngToXYZ(lat, lng, R + 0.5);

  useFrame((_, delta) => {
    // Pulse expands and fades over 1.5 seconds
    progress.current += delta / 1.5;

    if (progress.current > 1) {
      if (onDone) onDone();
      return;
    }

    if (meshRef.current && matRef.current) {
      // Scale expands outward (like a radar ping)
      const s = 1 + progress.current * 4.0;
      meshRef.current.scale.set(s, s, s);

      // Opacity peaks quickly, then fades out slowly
      const opacity = progress.current < 0.2
        ? progress.current * 5
        : 1 - (progress.current - 0.2) / 0.8;

      matRef.current.opacity = opacity * 0.6; // Max opacity 0.6
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[pos.x, pos.y, pos.z]}
      onUpdate={(self) => {
        // Orient the pulse flat against the globe
        self.lookAt(0, 0, 0);
      }}
    >
      <ringGeometry args={[0.8, 1.0, 24]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        depthTest={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
