"use client";
// components/globe/FlyArc.tsx
// ============================================================
// Neon laser arc dari titik A ke titik B di globe (R=50).
// Dual-layer rendering: terang tipis (core) + halo tebal transparan (glow).
// Pre-allocated buffer + drawRange untuk performa GPU optimal.
// ============================================================

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

const R = 50;

interface FlyArcProps {
  fromLat: number;
  fromLng: number;
  toLat:   number;
  toLng:   number;
  color?:  string;
  speed?:  number;
  intensity?: number; // 0–1, affects thickness and brightness
  onDone?: () => void;
}

export function FlyArc({
  fromLat, fromLng,
  toLat,   toLng,
  color = "#22d3ee",
  speed = 0.4,
  intensity = 0.5,
  onDone,
}: FlyArcProps) {
  const groupRef  = useRef<THREE.Group>(null!);
  const coreRef   = useRef<THREE.Line | null>(null);
  const glowRef   = useRef<THREE.Line | null>(null);
  const progress  = useRef(0);
  const SEGMENTS  = 60;

  // Bezier curve from A to B
  const curve = useMemo(() => {
    const from = latLngToXYZ(fromLat, fromLng, R + 0.5);
    const to   = latLngToXYZ(toLat,   toLng,   R + 0.5);
    const mid  = new THREE.Vector3(
      (from.x + to.x) / 2,
      (from.y + to.y) / 2,
      (from.z + to.z) / 2
    ).normalize().multiplyScalar(R * (1.3 + intensity * 0.4)); // Higher intensity = taller arc

    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(from.x, from.y, from.z),
      mid,
      new THREE.Vector3(to.x, to.y, to.z)
    );
  }, [fromLat, fromLng, toLat, toLng, intensity]);

  useEffect(() => {
    // Pre-allocate buffer with ALL segment points
    const allPts = curve.getPoints(SEGMENTS);
    const positions = new Float32Array(allPts.length * 3);
    allPts.forEach((v, i) => {
      positions[i * 3]     = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    });

    // Shared geometry for both core and glow
    const coreGeo = new THREE.BufferGeometry();
    coreGeo.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
    coreGeo.setDrawRange(0, 0);

    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
    glowGeo.setDrawRange(0, 0);

    // Core: thin bright line
    const coreMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      linewidth: 1,
    });

    // Glow: thick transparent halo with additive blending
    const glowMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15 + intensity * 0.2,
      linewidth: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const coreLine = new THREE.Line(coreGeo, coreMat);
    const glowLine = new THREE.Line(glowGeo, glowMat);

    coreRef.current = coreLine;
    glowRef.current = glowLine;

    if (groupRef.current) {
      groupRef.current.add(glowLine); // Glow behind
      groupRef.current.add(coreLine); // Core in front
    }

    return () => {
      if (groupRef.current) {
        groupRef.current.remove(coreLine);
        groupRef.current.remove(glowLine);
      }
      coreGeo.dispose();
      glowGeo.dispose();
      coreMat.dispose();
      glowMat.dispose();
      coreRef.current = null;
      glowRef.current = null;
    };
  }, [curve, color, intensity]);

  useFrame((_, delta) => {
    // EaseInOut for smooth launch + landing feel
    const rawProgress = Math.min(progress.current + delta * speed, 1);
    progress.current = rawProgress;
    const eased = rawProgress < 0.5
      ? 2 * rawProgress * rawProgress
      : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

    const core = coreRef.current;
    const glow = glowRef.current;
    if (!core || !glow) return;

    const tailStart = Math.max(0, eased - 0.35);
    const startI = Math.floor(tailStart * SEGMENTS);
    const endI   = Math.floor(eased * SEGMENTS);
    const count  = Math.max(0, endI - startI + 1);

    // Sync draw range on both layers
    core.geometry.setDrawRange(startI, count);
    glow.geometry.setDrawRange(startI, count);

    // Fade out as arc reaches destination
    const fadeOut = rawProgress > 0.7 ? (1 - rawProgress) / 0.3 : 1;
    (core.material as THREE.LineBasicMaterial).opacity = 0.9 * fadeOut;
    (glow.material as THREE.LineBasicMaterial).opacity = (0.15 + intensity * 0.2) * fadeOut;

    if (rawProgress >= 1) onDone?.();
  });

  return <group ref={groupRef} />;
}
