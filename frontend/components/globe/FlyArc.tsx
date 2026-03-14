"use client";
// components/globe/FlyArc.tsx
// Laser arc melengkung dari titik A ke titik B di permukaan globe.
// Menggunakan THREE.Line imperatively via useEffect untuk menghindari
// konflik tipe antara SVGLineElement dan THREE.Line di React Three Fiber.

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

interface FlyArcProps {
  fromLat: number;
  fromLng: number;
  toLat:   number;
  toLng:   number;
  color?:  string;
  speed?:  number;
  onDone?: () => void;
}

export function FlyArc({
  fromLat, fromLng,
  toLat,   toLng,
  color = "#22d3ee",
  speed = 0.4,
  onDone,
}: FlyArcProps) {
  const groupRef  = useRef<THREE.Group>(null!);
  const lineRef   = useRef<THREE.Line | null>(null);
  const progress  = useRef(0);
  const { scene } = useThree();
  const SEGMENTS  = 60;

  // Buat kurva Bezier sekali saja
  const curve = useMemo(() => {
    const from = latLngToXYZ(fromLat, fromLng, 1.01);
    const to   = latLngToXYZ(toLat,   toLng,   1.01);
    const mid  = new THREE.Vector3(
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

  // Setup THREE.Line imperatively
  useEffect(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(2));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    lineRef.current = line;

    if (groupRef.current) groupRef.current.add(line);

    return () => {
      if (groupRef.current) groupRef.current.remove(line);
      geo.dispose();
      mat.dispose();
      lineRef.current = null;
    };
  }, [curve, color, scene]);

  useFrame((_, delta) => {
    progress.current = Math.min(progress.current + delta * speed, 1);
    const line = lineRef.current;
    if (!line) return;

    const tailStart = Math.max(0, progress.current - 0.35);
    const pts     = curve.getPoints(SEGMENTS);
    const startI  = Math.floor(tailStart * SEGMENTS);
    const endI    = Math.floor(progress.current * SEGMENTS);
    const subPts  = pts.slice(startI, endI + 1);

    if (subPts.length >= 2) {
      line.geometry.setFromPoints(subPts);
      (line.material as THREE.LineBasicMaterial).opacity =
        progress.current > 0.7 ? (1 - progress.current) / 0.3 : 0.85;
    }

    if (progress.current >= 1) onDone?.();
  });

  return <group ref={groupRef} />;
}
