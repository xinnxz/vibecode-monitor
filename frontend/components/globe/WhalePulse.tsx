"use client";
// components/globe/WhalePulse.tsx
// Red wave pulse saat Whale Alert (R=50 scale).

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

const R = 50;

interface WhalePulseProps {
  lat: number;
  lng: number;
  onDone: () => void;
}

function PulseRing({ delay, lat, lng, onDone }: { delay: number; lat: number; lng: number; onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null!);
  const age = useRef(-delay);
  const LIFETIME = 2.5;

  const pos = latLngToXYZ(lat, lng, R + 1);
  const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal
  );

  useFrame((_, delta) => {
    age.current += delta;
    if (age.current < 0) return;
    const t = age.current / LIFETIME;
    if (ref.current) {
      ref.current.scale.setScalar(1 + t * 5);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - t) * 0.8);
    }
    if (age.current >= LIFETIME) onDone();
  });

  return (
    <mesh ref={ref} position={[pos.x, pos.y, pos.z]} quaternion={quaternion}>
      <ringGeometry args={[2, 3, 32]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function WhalePulse({ lat, lng, onDone }: WhalePulseProps) {
  const doneCount = useRef(0);
  const handleDone = () => {
    doneCount.current++;
    if (doneCount.current >= 3) onDone();
  };

  return (
    <>
      {[0, 1, 2].map((i) => (
        <PulseRing key={i} delay={i * 0.3} lat={lat} lng={lng} onDone={handleDone} />
      ))}
    </>
  );
}
