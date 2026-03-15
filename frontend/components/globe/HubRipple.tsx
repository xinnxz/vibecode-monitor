"use client";
// components/globe/HubRipple.tsx
// ============================================================
// Outward ripple wave that emanates from the Somnia Hub
// when a TX arc lands. Like a sonar pulse — bigger than
// GlobePulseRing but centered at the Hub point.
// ============================================================

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";
import { HUB_LAT, HUB_LNG } from "./SomniaHub";

interface HubRippleProps {
  color?: string;
  onDone: () => void;
}

const R = 50;
const LIFETIME = 1.5;
const MAX_SCALE = 8; // Ripple expands to 8x the hub radius

export function HubRipple({ color = "#a855f7", onDone }: HubRippleProps) {
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const age = useRef(0);

  const pos = useMemo(() => latLngToXYZ(HUB_LAT, HUB_LNG, R + 0.5), []);

  // Billboard: face outward from globe center
  const quat = useMemo(() => {
    const dir = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
    const m = new THREE.Matrix4().lookAt(
      new THREE.Vector3(0, 0, 0), dir, new THREE.Vector3(0, 1, 0)
    );
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [pos]);

  const mat1 = useMemo(() => new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [color]);

  // Ring 2 is slightly delayed
  const mat2 = useMemo(() => new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [color]);

  useFrame((_, delta) => {
    age.current += delta;
    const t = Math.min(age.current / LIFETIME, 1);

    // Ring 1: expand + fade
    if (ring1Ref.current) {
      const scale = 1 + t * MAX_SCALE;
      ring1Ref.current.scale.setScalar(scale);
      mat1.opacity = 0.5 * (1 - t * t);
    }

    // Ring 2: delayed by 0.3s
    if (ring2Ref.current) {
      const t2 = Math.max(0, Math.min((age.current - 0.3) / LIFETIME, 1));
      if (t2 > 0) {
        ring2Ref.current.visible = true;
        ring2Ref.current.scale.setScalar(1 + t2 * MAX_SCALE * 0.8);
        mat2.opacity = 0.3 * (1 - t2 * t2);
      }
    }

    if (age.current >= LIFETIME) {
      mat1.dispose();
      mat2.dispose();
      onDone();
    }
  });

  return (
    <group position={[pos.x, pos.y, pos.z]} quaternion={quat}>
      <mesh ref={ring1Ref}>
        <ringGeometry args={[1.8, 2.2, 48]} />
        <primitive object={mat1} attach="material" />
      </mesh>
      <mesh ref={ring2Ref} visible={false}>
        <ringGeometry args={[1.5, 1.8, 48]} />
        <primitive object={mat2} attach="material" />
      </mesh>
    </group>
  );
}
