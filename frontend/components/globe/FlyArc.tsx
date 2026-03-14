"use client";
// components/globe/FlyArc.tsx
// ============================================================
// Laser arc melengkung dari titik A ke titik B di permukaan globe.
// Ini adalah efek visual utama — setiap transaksi menghasilkan
// satu garis cahaya yang "terbang" dari pengirim ke penerima.
//
// Teknik:
// - Buat QuadraticBezierCurve3 dari titik A → control point → titik B.
//   Control point ada di luar bola (radius * 1.5) di titik tengah,
//   menghasilkan lengkungan yang realistis.
// - Gunakan TubeGeometry dengan radius kecil untuk efek "balok cahaya".
// - Animasi: head point bergerak dari 0% → 100% kurva, meninggalkan
//   tail yang fade out (efek comet/meteor).
//
// Warna berdasarkan jumlah STT:
// - < 100 STT   → cyan (#22d3ee)
// - 100-10K STT → purple (#a855f7)
// - > 10K STT   → orange (#f97316)
// ============================================================

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

interface FlyArcProps {
  fromLat: number;
  fromLng: number;
  toLat:   number;
  toLng:   number;
  color?:  string;
  speed?:  number;  // 0.3 = normal, 0.6 = fast
  onDone?: () => void;
}

export function FlyArc({
  fromLat, fromLng,
  toLat,   toLng,
  color = "#22d3ee",
  speed = 0.4,
  onDone,
}: FlyArcProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const progress = useRef(0);
  const SEGMENTS = 60; // Jumlah titik di kurva

  // Buat kurva Bezier sekali saja
  const curve = useMemo(() => {
    const from = latLngToXYZ(fromLat, fromLng, 1.01);
    const to   = latLngToXYZ(toLat,   toLng,   1.01);

    // Control point: titik tengah di luar bola (radius 1.5)
    const mid = new THREE.Vector3(
      (from.x + to.x) / 2,
      (from.y + to.y) / 2,
      (from.z + to.z) / 2
    ).normalize().multiplyScalar(1.8);

    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(from.x, from.y, from.z),
      mid,
      new THREE.Vector3(to.x, to.y, to.z)
    );
  }, [fromLat, fromLng, toLat, toLng]);

  // Buat geometry awal (akan di-update tiap frame)
  const geometry = useMemo(() => {
    const pts = curve.getPoints(SEGMENTS);
    const geo  = new THREE.BufferGeometry().setFromPoints(pts);
    return geo;
  }, [curve]);

  useFrame((_, delta) => {
    progress.current = Math.min(progress.current + delta * speed, 1);

    if (meshRef.current) {
      // Hitung sub-kurva dari start → progress (efek "ekor komet")
      const tailStart = Math.max(0, progress.current - 0.35);
      const pts = curve.getPoints(SEGMENTS);
      const startIdx = Math.floor(tailStart * SEGMENTS);
      const endIdx   = Math.floor(progress.current * SEGMENTS);
      const subPts   = pts.slice(startIdx, endIdx + 1);

      if (subPts.length >= 2) {
        meshRef.current.geometry.setFromPoints(subPts);
        // Fade out di ujung perjalanan
        const mat = meshRef.current.material as THREE.LineBasicMaterial;
        if (progress.current > 0.7) {
          mat.opacity = (1 - progress.current) / 0.3;
        }
      }
    }

    if (progress.current >= 1 && onDone) onDone();
  });

  return (
    <group>
      <primitive
        object={
          (() => {
            const pts = curve.getPoints(10);
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
            const lineObj = new THREE.Line(geo, mat);
            // Store refs for animation access
            meshRef.current = lineObj as unknown as THREE.Mesh;
            return lineObj;
          })()
        }
      />
    </group>
  );
}
