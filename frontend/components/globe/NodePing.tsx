"use client";
// components/globe/NodePing.tsx
// ============================================================
// Glowing node ping at globe surface for each transaction.
// Double-ring "sonar echo" effect: ring 1 expands fast,
// ring 2 expands with a slight delay for dramatic echo.
// ============================================================

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

interface NodePingProps {
  lat: number;
  lng: number;
  color?: string;
  size?: number; // 0.5–2, scales the ping diameter
  onDone: () => void;
}

const R = 50;

export function NodePing({ lat, lng, color = "#22d3ee", size = 1, onDone }: NodePingProps) {
  const coreRef  = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const age = useRef(0);
  const LIFETIME = 2.0;

  const pos = useMemo(() => latLngToXYZ(lat, lng, R + 0.5), [lat, lng]);

  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    age.current += delta;
    const t = age.current / LIFETIME;

    if (groupRef.current) {
      // Keep the ping oriented correctly against the curved surface
      // as the container spins.
      groupRef.current.lookAt(0, 0, 0);
    }

    // Core: pop in fast, then fade
    if (coreRef.current) {
      const scale = Math.min(t * 5, 1) * size;
      coreRef.current.scale.setScalar(scale);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t);
    }

    // Ring 1: expand immediately
    if (ring1Ref.current) {
      const r1t = Math.max(0, t);
      ring1Ref.current.scale.setScalar((1 + r1t * 3) * size);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - r1t) * 0.6);
    }

    // Ring 2: delayed echo — starts expanding at t=0.15
    if (ring2Ref.current) {
      const r2t = Math.max(0, t - 0.15);
      if (r2t > 0) {
        ring2Ref.current.visible = true;
        ring2Ref.current.scale.setScalar((1 + r2t * 4) * size);
        (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - r2t / 0.85) * 0.35);
      }
    }

    if (age.current >= LIFETIME) onDone();
  });

  return (
    <group ref={groupRef} position={[pos.x, pos.y, pos.z]}>
      {/* Core glow dot */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ring 1: primary expand */}
      <mesh ref={ring1Ref}>
        <ringGeometry args={[0.8, 1.4, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ring 2: echo ring (delayed) */}
      <mesh ref={ring2Ref} visible={false}>
        <ringGeometry args={[0.6, 1.0, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
