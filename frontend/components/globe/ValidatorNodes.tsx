"use client";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";
import { earthRotationRef, HUB_LAT, HUB_LNG } from "./SomniaHub";

const R = 50;

// Coordinates for the 5 Regional Validators
export const VALIDATORS = [
  { id: "nyc",  lat: 40.7128,  lng: -74.0060, color: 0x3b82f6 }, // Blue (NYC)
  { id: "fra",  lat: 50.1109,  lng: 8.6821,   color: 0x10b981 }, // Green (Frankfurt)
  { id: "nrt",  lat: 35.6762,  lng: 139.6503, color: 0xf59e0b }, // Orange (Tokyo)
  { id: "sp",   lat: -23.5505, lng: -46.6333, color: 0xef4444 }, // Red (São Paulo)
  { id: "dxb",  lat: 25.2048,  lng: 55.2708,  color: 0x06b6d4 }  // Cyan (Dubai)
];

// Helper to draw a curved static line between two vectors
function getCurvePositions(startVec: THREE.Vector3, endVec: THREE.Vector3, segments = 32) {
  const points = [];
  // Calculate a midpoint that bulges outwards slightly to clear the earth sphere
  const mid = startVec.clone().lerp(endVec, 0.5);
  // Bulge radius depends on how far apart they are
  const dist = startVec.distanceTo(endVec);
  const bulge = Math.max(0.5, dist * 0.15); 
  
  mid.normalize().multiplyScalar(R + 1 + bulge);
  
  const curve = new THREE.QuadraticBezierCurve3(startVec, mid, endVec);
  
  for (let i = 0; i <= segments; i++) {
    points.push(curve.getPoint(i / segments));
  }
  return points;
}

export function ValidatorNodes() {
  const groupRef = useRef<THREE.Group>(null!);

  // Pre-calculate 3D positions for the 5 validators + 1 Hub
  const nodePositions = useMemo(() => {
    return VALIDATORS.map(v => {
      const p = latLngToXYZ(v.lat, v.lng, R + 1);
      return new THREE.Vector3(p.x, p.y, p.z);
    });
  }, []);

  const hubPos = useMemo(() => {
    const p = latLngToXYZ(HUB_LAT, HUB_LNG, R + 1);
    return new THREE.Vector3(p.x, p.y, p.z);
  }, []);

  // Pre-calculate the permanent web lines (Constellation)
  const lines = useMemo(() => {
    const nyc = nodePositions[0];
    const fra = nodePositions[1];
    const nrt = nodePositions[2];
    const sp  = nodePositions[3];
    const dxb = nodePositions[4];
    const hub = hubPos;

    // Pairs of connections to form the web loop
    const pairs = [
      [nyc, fra], // transatlantic (NYC -> Frankfurt)
      [fra, dxb], // EU to Middle East
      [dxb, hub], // Middle East to Asia (Hub)
      [hub, nrt], // Singapore to Tokyo
      [nrt, nyc], // cross-pacific Tokyo -> NYC
      [sp, nyc],  // South Am to North Am
    ];

    return pairs.map(pair => getCurvePositions(pair[0], pair[1]));
  }, [nodePositions, hubPos]);



  return (
    <group ref={groupRef}>
      
      {/* 1. Draw the static Web Lines */}
      {lines.map((linePts, i) => (
        <group key={`line-${i}`}>
          <line>
            {/* @ts-ignore */}
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={linePts.length}
                array={new Float32Array(linePts.flatMap(p => [p.x, p.y, p.z]))}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={0x8b5cf6} transparent opacity={0.15} linewidth={1} />
          </line>
        </group>
      ))}

      {/* 2. Draw the 5 Validator Nodes */}
      {VALIDATORS.map((v, i) => {
        const pos = nodePositions[i];
        return (
          <group key={v.id} position={[pos.x, pos.y, pos.z]}>
            <mesh>
              <sphereGeometry args={[0.4, 8, 8]} />
              <meshBasicMaterial color={v.color} />
            </mesh>
            {/* Subtle glow aura */}
            <mesh>
              <sphereGeometry args={[0.8, 8, 8]} />
              <meshBasicMaterial color={v.color} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false}/>
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
