"use client";
// components/globe/FlyArc.tsx
// ============================================================
// Neon laser arc from point A to point B.
// Technique ported from reference globe.js:
//   Layer 1: Static faint path line (stays persistent until arc done)
//   Layer 2: Animated comet — THREE.Points travelling along path
//            with size gradient (small tail → large head) via custom shader
// Pre-allocated buffers, zero GPU realloc per frame.
// ============================================================

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

const R = 50;
const SEGMENTS = 80;

interface FlyArcProps {
  fromLat: number;
  fromLng: number;
  toLat:   number;
  toLng:   number;
  color?:  string;
  speed?:  number;
  intensity?: number; // 0–1
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
  const groupRef = useRef<THREE.Group>(null!);
  const { scene } = useThree();
  const progress = useRef(0);
  const linesAdded = useRef(false);

  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  // Bezier curve
  const curve = useMemo(() => {
    const from = latLngToXYZ(fromLat, fromLng, R + 0.5);
    const to   = latLngToXYZ(toLat, toLng, R + 0.5);
    const arcHeight = R * (1.2 + intensity * 0.5);
    const mid = new THREE.Vector3(
      (from.x + to.x) / 2,
      (from.y + to.y) / 2,
      (from.z + to.z) / 2
    ).normalize().multiplyScalar(arcHeight);

    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(from.x, from.y, from.z),
      mid,
      new THREE.Vector3(to.x, to.y, to.z)
    );
  }, [fromLat, fromLng, toLat, toLng, intensity]);

  // All points along the full curve (pre-computed)
  const allPoints = useMemo(() => curve.getPoints(SEGMENTS), [curve]);

  // ——— Layer 1: Static faint path line (full arc) ———
  const pathLine = useMemo(() => {
    const positions = new Float32Array(allPoints.length * 3);
    allPoints.forEach((v, i) => {
      positions[i * 3]     = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12 + intensity * 0.08,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Line(geo, mat);
  }, [allPoints, color, intensity]);

  // ——— Layer 2: Comet — THREE.Points with gradient size shader ———
  // Comet covers ~30% of arc length, head bright + big, tail dim + tiny
  const COMET_POINTS = 60;
  const cometGeo = useMemo(() => {
    const positions = new Float32Array(COMET_POINTS * 3);
    const percents  = new Float32Array(COMET_POINTS); // 0=tail, 1=head — controls size
    const colors    = new Float32Array(COMET_POINTS * 3);

    // Initialize at origin; useFrame updates per-frame
    const col1 = new THREE.Color(color).multiplyScalar(0.6);
    const col2 = new THREE.Color(color);

    for (let i = 0; i < COMET_POINTS; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      percents[i] = i / COMET_POINTS;
      const c = col1.clone().lerp(col2, i / COMET_POINTS);
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("percent",  new THREE.BufferAttribute(percents, 1));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [color]);

  // Comet material with custom vertex shader for size gradient
  const cometMat = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: 1.4 + intensity * 0.8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
    });

    // Custom shader: gl_PointSize = percent * size (head big, tail small)
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "void main() {",
        "attribute float percent;\nvoid main() {"
      );
      shader.vertexShader = shader.vertexShader.replace(
        "gl_PointSize = size;",
        "gl_PointSize = percent * size;"
      );
    };

    return mat;
  }, [intensity]);

  const cometPoints = useMemo(
    () => new THREE.Points(cometGeo, cometMat),
    [cometGeo, cometMat]
  );

  useEffect(() => {
    if (groupRef.current && !linesAdded.current) {
      groupRef.current.add(pathLine);
      groupRef.current.add(cometPoints);
      linesAdded.current = true;
    }
    return () => {
      pathLine.geometry.dispose();
      (pathLine.material as THREE.Material).dispose();
      cometGeo.dispose();
      cometMat.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    // EaseInOut
    const raw = Math.min(progress.current + delta * speed, 1);
    progress.current = raw;
    const eased = raw < 0.5
      ? 2 * raw * raw
      : 1 - Math.pow(-2 * raw + 2, 2) / 2;

    // Comet: advance 30% window along arc
    const TAIL_FRAC = 0.30;
    const headIdx = Math.floor(eased * SEGMENTS);
    const tailIdx = Math.max(0, Math.floor((eased - TAIL_FRAC) * SEGMENTS));

    const posAttr = cometGeo.getAttribute("position") as THREE.BufferAttribute;
    const totalSpan = headIdx - tailIdx;

    for (let i = 0; i < COMET_POINTS; i++) {
      const segIdx = tailIdx + Math.round((i / COMET_POINTS) * totalSpan);
      const pt = allPoints[Math.min(segIdx, SEGMENTS)];
      posAttr.setXYZ(i, pt.x, pt.y, pt.z);
    }
    posAttr.needsUpdate = true;

    // Fade path line as comet passes (nice trailing effect)
    const pathMat = pathLine.material as THREE.LineBasicMaterial;
    pathMat.opacity = (0.12 + intensity * 0.08) * Math.min(eased * 3, 1);

    // Fade comet near destination
    cometMat.opacity = raw > 0.8 ? (1 - raw) / 0.2 : 0.9;

    if (raw >= 1) onDone?.();
  });

  return <group ref={groupRef} />;
}
