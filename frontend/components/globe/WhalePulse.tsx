"use client";
// components/globe/WhalePulse.tsx
// ============================================================
// Animasi Red Wave Pulse — muncul saat Whale Alert terdeteksi.
// Berupa 3 cincin konsentris yang melebar dari titik lokasi whale
// di permukaan globe, warna merah agresif dengan efek berkedip.
//
// Ini adalah "moment dramatis" terbesar di aplikasi —
// ketika muncul, semua perhatian tertuju ke titik ini.
// ============================================================

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

interface WhalePulseProps {
  lat:    number;
  lng:    number;
  onDone: () => void;
}

// Satu ring animasi
function PulseRing({ delay, lat, lng, onDone }: { delay: number; lat: number; lng: number; onDone: () => void }) {
  const ref  = useRef<THREE.Mesh>(null!);
  const age  = useRef(-delay);
  const LIFETIME = 2.5;

  const pos = latLngToXYZ(lat, lng, 1.02);

  // Hitung rotasi agar ring menghadap ke arah normal bola (mengarah ke pusat)
  const normal = new THREE.Vector3(pos.x, pos.y, pos.z).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal
  );

  useFrame((_, delta) => {
    age.current += delta;
    if (age.current < 0) return; // Tunda berdasarkan delay

    const t = age.current / LIFETIME;
    if (ref.current) {
      const scale = 1 + t * 5;
      ref.current.scale.setScalar(scale);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - t) * 0.8);
    }
    if (age.current >= LIFETIME) onDone();
  });

  return (
    <mesh
      ref={ref}
      position={[pos.x, pos.y, pos.z]}
      quaternion={quaternion}
    >
      <ringGeometry args={[0.04, 0.06, 32]} />
      <meshBasicMaterial
        color="#ef4444"
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function WhalePulse({ lat, lng, onDone }: WhalePulseProps) {
  const doneCount = useRef(0);
  const RINGS = 3;

  const handleRingDone = () => {
    doneCount.current++;
    if (doneCount.current >= RINGS) onDone();
  };

  return (
    <>
      {Array.from({ length: RINGS }).map((_, i) => (
        <PulseRing key={i} delay={i * 0.3} lat={lat} lng={lng} onDone={handleRingDone} />
      ))}
    </>
  );
}
