"use client";
// components/globe/FlyArc.tsx
// ============================================================
// PORTED directly from reference globe-utils.js flyArc algorithm:
//   1. Map 3D points → 2D XOY plane (via quaternion rotation)
//   2. Draw CIRCULAR arc in 2D (height proportional to distance)
//   3. Rotate back to 3D
//
// This produces the dramatic HIGH arcs like "throwing" a ball.
// Far-apart cities → arc flies very high above globe surface.
//
// TWO layers:
//   Layer 1: PERSISTENT static path line (faint, stays visible 12s)
//   Layer 2: Comet particles travelling along path (looping once)
// ============================================================

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToXYZ } from "@/lib/utils/geo";

const R = 50;
const GHOST_DURATION = 0.5; // VERY SHORT ghost trail (was 15s) so it vanishes immediately

interface FlyArcProps {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  color?: string;
  endColor?: string; // New: Enables beautiful sci-fi gradients
  speed?: number;
  intensity?: number;
  isBurst?: boolean; // New: LOD trigger for massive blocks
  onDone?: () => void;
}

// ——— Reference algorithm helpers ———

function radianAOB(A: THREE.Vector3, B: THREE.Vector3, O: THREE.Vector3): number {
  const dir1 = A.clone().sub(O).normalize();
  const dir2 = B.clone().sub(O).normalize();
  return Math.acos(THREE.MathUtils.clamp(dir1.dot(dir2), -1, 1));
}

function threePointCenter(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): THREE.Vector3 {
  const L1 = p1.lengthSq(), L2 = p2.lengthSq(), L3 = p3.lengthSq();
  const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y, x3 = p3.x, y3 = p3.y;
  const S = x1 * y2 + x2 * y3 + x3 * y1 - x1 * y3 - x2 * y1 - x3 * y2;
  if (Math.abs(S) < 1e-10) return new THREE.Vector3((x1 + x2 + x3) / 3, (y1 + y2 + y3) / 3, 0);
  const x = (L2 * y3 + L1 * y2 + L3 * y1 - L2 * y1 - L3 * y2 - L1 * y3) / S / 2;
  const y = (L3 * x2 + L2 * x1 + L1 * x3 - L1 * x2 - L2 * x3 - L3 * x1) / S / 2;
  return new THREE.Vector3(x, y, 0);
}

// 3D → 2D: rotate so both points lie on XOY plane, then align midpoint to +Y
function _3Dto2D(start: THREE.Vector3, end: THREE.Vector3) {
  const origin = new THREE.Vector3(0, 0, 0);
  const normal = start.clone().sub(origin).cross(end.clone().sub(origin)).normalize();
  if (normal.length() < 0.001) normal.set(0, 0, 1);
  const xoyNormal = new THREE.Vector3(0, 0, 1);
  const q1 = new THREE.Quaternion().setFromUnitVectors(normal, xoyNormal);

  const sXOY = start.clone().applyQuaternion(q1);
  const eXOY = end.clone().applyQuaternion(q1);

  const mid = sXOY.clone().add(eXOY).multiplyScalar(0.5);
  const midDir = mid.clone().sub(origin).normalize();
  if (midDir.length() < 0.001) midDir.set(0, 1, 0);
  const q2 = new THREE.Quaternion().setFromUnitVectors(midDir, new THREE.Vector3(0, 1, 0));

  return {
    startPoint: sXOY.clone().applyQuaternion(q2),
    endPoint: eXOY.clone().applyQuaternion(q2),
    quaternion: q1.clone().invert().multiply(q2.clone().invert()),
  };
}

// Generate 3D arc points using reference's circular arc technique
function generateArcPoints(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  segments: number
): { points: THREE.Vector3[]; quaternion: THREE.Quaternion } {
  const from3D = latLngToXYZ(fromLat, fromLng, R);
  const to3D = latLngToXYZ(toLat, toLng, R);
  const startV = new THREE.Vector3(from3D.x, from3D.y, from3D.z);
  const endV = new THREE.Vector3(to3D.x, to3D.y, to3D.z);

  const { startPoint, endPoint, quaternion } = _3Dto2D(startV, endV);

  // Arc top height proportional to distance (reference: radius + angle * R * 0.2)
  const midV = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
  const dir = midV.clone().normalize();
  const earthAngle = radianAOB(startPoint, endPoint, new THREE.Vector3(0, 0, 0));
  // Added a flat +0.8 base height so short-distance hops don't scrape the ground
  // Added a subtle +0.08 multiplier so it arcs elegantly
  const arcTopCoord = dir.multiplyScalar(R + 0.8 + earthAngle * R * 0.08);

  const center = threePointCenter(startPoint, endPoint, arcTopCoord);
  const arcR = Math.abs(center.y - arcTopCoord.y);

  const flyAngle = radianAOB(startPoint, new THREE.Vector3(0, -1, 0), center);
  const startAngle = -Math.PI / 2 + flyAngle;
  const endAngle = Math.PI - startAngle;

  // Sample points along circular arc
  const arc = new THREE.ArcCurve(center.x, center.y, arcR, startAngle, endAngle, false);
  const pts2D = arc.getSpacedPoints(segments);

  // Convert back to 3D
  const qInv = quaternion;
  const pts3D = pts2D.map(p => {
    const v = new THREE.Vector3(p.x, p.y, 0);
    v.applyQuaternion(qInv);
    return v;
  });

  return { points: pts3D, quaternion };
}

// ——— Main Component ———

export function FlyArc({
  fromLat, fromLng,
  toLat, toLng,
  color = "#22d3ee",
  endColor,
  speed = 0.4, // Increased default speed significantly
  intensity = 0.5,
  isBurst = false,
  onDone,
}: FlyArcProps) {
  // DYNAMIC LEVEL OF DETAIL (LOD)
  // Heavily optimized LOD settings to save CPU array updates in useFrame
  // Normal load: 24 segments, 25 particles
  // Burst load (>50 TX): 10 segments, 8 particles. Looks like a solid laser beam, saves 80% geometry.
  const arcSegments = isBurst ? 10 : 24;
  const cometPoints = isBurst ? 8  : 25;

  const groupRef = useRef<THREE.Group>(null!);
  const progress = useRef(0);
  const ghostAge = useRef(0);
  const phase = useRef<"comet" | "ghost">("comet");
  const addedRef = useRef(false);

  // Circular texture to prevent large particles from looking like squares
  const circleTex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Generate high-arc points using reference algorithm
  const arcPoints = useMemo(
    () => generateArcPoints(fromLat, fromLng, toLat, toLng, arcSegments).points,
    [fromLat, fromLng, toLat, toLng, arcSegments]
  );

  // ——— Layer 1: Static path line ———
  const pathLine = useMemo(() => {
    const positions = new Float32Array(arcPoints.length * 3);
    const colors = new Float32Array(arcPoints.length * 3);
    const colStart = new THREE.Color(color);
    const colEnd = new THREE.Color(endColor || color);

    arcPoints.forEach((v, i) => {
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;

      const factor = i / Math.max(1, arcPoints.length - 1);
      const c = colStart.clone().lerp(colEnd, factor);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,     // Enables the gradient logic
      transparent: true,
      opacity: 0.55 + intensity * 0.25,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { line: new THREE.Line(geo, mat), geo, mat };
  }, [arcPoints, color, endColor, intensity]);

  // ——— Layer 2: Comet particles ———
  const comet = useMemo(() => {
    const positions = new Float32Array(cometPoints * 3);
    const percents = new Float32Array(cometPoints);
    const colors = new Float32Array(cometPoints * 3);

    const colStart = new THREE.Color(color);
    const colEnd = new THREE.Color(endColor || color);

    for (let i = 0; i < cometPoints; i++) {
      percents[i] = i / cometPoints;

      const factor = i / Math.max(1, cometPoints - 1);
      const c = colStart.clone().lerp(colEnd, factor);

      // Prevents 100% white blowout with additive blending.
      // Keeps the head bright, but the tail dims gracefully.
      // Reduced the scalar massively so that 100 overlapping points don't sum to pure white.
      // In burst mode, make them slightly brighter individually to compensate for fewer overlapping points
      const alphaBoost = isBurst ? 1.5 : 1.0;
      const alpha = (0.05 + 0.25 * factor) * (1.1 - intensity * 0.2) * alphaBoost;
      c.multiplyScalar(alpha);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("percent", new THREE.BufferAttribute(percents, 1));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      // Increased size purely to compensate for fewer points, ensuring the tail still looks like an unbroken stream
      size: 1.8 + intensity * 0.5, 
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
      map: circleTex,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "void main() {", "attribute float percent;\nvoid main() {"
      );
      shader.vertexShader = shader.vertexShader.replace(
        "gl_PointSize = size;", "gl_PointSize = percent * size;"
      );
    };

    const points = new THREE.Points(geo, mat);
    return { points, geo, mat };
  }, [color, endColor, intensity, isBurst, cometPoints, circleTex]);

  useEffect(() => {
    if (groupRef.current && !addedRef.current) {
      groupRef.current.add(pathLine.line);
      groupRef.current.add(comet.points);
      addedRef.current = true;
    }
    return () => {
      pathLine.geo.dispose();
      pathLine.mat.dispose();
      comet.geo.dispose();
      comet.mat.dispose();
    };
  }, [pathLine, comet]);

  useFrame((_, delta) => {
    if (phase.current === "comet") {
      // Advance comet along arc
      const raw = Math.min(progress.current + delta * speed, 1);
      progress.current = raw;

      // Suction Effect Easing: Starts slow, finishes incredibly fast (like being sucked into a validator)
      // Math.pow(raw, 3) gives an exponential acceleration curve
      const eased = Math.pow(raw, 3);

      // Update comet positions (30% tail)
      const headIdx = Math.floor(eased * arcSegments);
      const tailIdx = Math.max(0, Math.floor((eased - 0.30) * arcSegments));
      const span = headIdx - tailIdx;

      const posAttr = comet.geo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < cometPoints; i++) {
        const segIdx = tailIdx + Math.round((i / cometPoints) * span);
        const pt = arcPoints[Math.min(segIdx, arcSegments)];
        posAttr.setXYZ(i, pt.x, pt.y, pt.z);
      }
      posAttr.needsUpdate = true;

      // Path line fades in
      pathLine.mat.opacity = (0.55 + intensity * 0.25) * Math.min(raw * 3, 1);

      // Comet fades near end
      comet.mat.opacity = raw > 0.85 ? (1 - raw) / 0.15 : 0.9;

      if (raw >= 1) {
        // Comet done → switch to ghost phase
        phase.current = "ghost";
        comet.points.visible = false;
      }
    } else {
      // Ghost phase: path line slowly fades out
      ghostAge.current += delta;
      const t = ghostAge.current / GHOST_DURATION;
      pathLine.mat.opacity = (0.55 + intensity * 0.25) * Math.max(0, 1 - t * t);

      if (ghostAge.current >= GHOST_DURATION) {
        onDone?.();
      }
    }
  });

  return <group ref={groupRef} />;
}
