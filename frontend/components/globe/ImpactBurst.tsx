"use client";
// components/globe/ImpactBurst.tsx
// ============================================================
// Ledakan partikel kecil di titik pendaratan arc.
// 12 partikel menyebar radial dari titik impact, lalu fade out.
// ============================================================

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

interface ImpactBurstProps {
  lat: number;
  lng: number;
  color?: string;
  onDone: () => void;
}

const R = 50;
const PARTICLE_COUNT = 12;
const LIFETIME = 0.8;

export function ImpactBurst({ lat, lng, color = "#22d3ee", onDone }: ImpactBurstProps) {
  const pointsRef = useRef<THREE.Points>(null!);
  const age = useRef(0);

  const center = useMemo(() => latLngToXYZ(lat, lng, R + 1), [lat, lng]);

  // Pre-allocate particle positions and velocities
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel: THREE.Vector3[] = [];

    // Surface normal at this point (outward from globe center)
    const normal = new THREE.Vector3(center.x, center.y, center.z).normalize();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Start at the impact point
      pos[i * 3]     = center.x;
      pos[i * 3 + 1] = center.y;
      pos[i * 3 + 2] = center.z;

      // Random direction tangent to the surface + slight outward push
      const theta = Math.random() * Math.PI * 2;
      const tangent1 = new THREE.Vector3(-normal.y, normal.x, 0).normalize();
      const tangent2 = new THREE.Vector3().crossVectors(normal, tangent1).normalize();

      const speed = 2 + Math.random() * 4;
      vel.push(
        tangent1.clone().multiplyScalar(Math.cos(theta) * speed)
          .add(tangent2.clone().multiplyScalar(Math.sin(theta) * speed))
          .add(normal.clone().multiplyScalar(1 + Math.random() * 2))
      );
    }

    return { positions: pos, velocities: vel };
  }, [center]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color,
        size: 0.6,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    [color]
  );

  useFrame((_, delta) => {
    age.current += delta;
    const t = Math.min(age.current / LIFETIME, 1);

    // Update particle positions
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      attr.setXYZ(
        i,
        positions[i * 3]     + velocities[i].x * age.current,
        positions[i * 3 + 1] + velocities[i].y * age.current,
        positions[i * 3 + 2] + velocities[i].z * age.current
      );
    }
    attr.needsUpdate = true;

    // Fade out + shrink
    material.opacity = 1 - t * t;
    material.size = 0.6 * (1 - t * 0.7);

    if (age.current >= LIFETIME) {
      geometry.dispose();
      material.dispose();
      onDone();
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
