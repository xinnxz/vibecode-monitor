"use client";
// components/globe/SpaceEnvironment.tsx
// ============================================================
// Port dari createSpaceEnvironment() di globe.js referensi.
// Membuat latar belakang luar angkasa: nebula, bulan, bintang.
// ============================================================

import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

const R = 50; // Sama dengan earth radius

export function SpaceEnvironment() {
  const moonRef = useRef<THREE.Mesh>(null!);
  const starsRef = useRef<THREE.Points>(null!);
  const moonTex = useLoader(THREE.TextureLoader, "/textures/moon.jpg");

  // ——— Canvas-painted sky background (custom nebulae + stars) ———
  const skyTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // Base: near pure black deep space
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    skyGrad.addColorStop(0, "#000102");
    skyGrad.addColorStop(0.3, "#010204");
    skyGrad.addColorStop(0.5, "#020306");
    skyGrad.addColorStop(0.7, "#010204");
    skyGrad.addColorStop(1, "#000102");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Milky way band
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.translate(1024, 450);
    ctx.rotate(-0.15);
    const bandGrad = ctx.createLinearGradient(0, -150, 0, 150);
    bandGrad.addColorStop(0, "transparent");
    bandGrad.addColorStop(0.15, "#1a2244");
    bandGrad.addColorStop(0.3, "#2a3866");
    bandGrad.addColorStop(0.5, "#3a4888");
    bandGrad.addColorStop(0.7, "#2a3866");
    bandGrad.addColorStop(0.85, "#1a2244");
    bandGrad.addColorStop(1, "transparent");
    ctx.fillStyle = bandGrad;
    ctx.fillRect(-1200, -150, 2400, 300);
    ctx.restore();

    // Paint nebulae
    function paintNebula(cx: number, cy: number, layers: {ox: number, oy: number, rx: number, ry: number, color: string, alpha: number}[]) {
      layers.forEach((layer) => {
        ctx.save();
        ctx.globalAlpha = layer.alpha;
        ctx.translate(cx + layer.ox, cy + layer.oy);
        ctx.scale(1, layer.ry / layer.rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, layer.rx);
        g.addColorStop(0, layer.color);
        g.addColorStop(0.3, layer.color);
        g.addColorStop(0.7, layer.color.replace(/[\d.]+\)$/, "0.3)"));
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(-layer.rx, -layer.rx, layer.rx * 2, layer.rx * 2);
        ctx.restore();
      });
    }

    // Orion-like (blue-purple)
    paintNebula(350, 300, [
      { ox: 0, oy: 0, rx: 140, ry: 100, color: "rgba(80, 50, 160, 0.06)", alpha: 1 },
      { ox: 30, oy: -20, rx: 100, ry: 80, color: "rgba(60, 80, 200, 0.05)", alpha: 1 },
      { ox: -20, oy: 15, rx: 80, ry: 110, color: "rgba(120, 40, 180, 0.04)", alpha: 1 },
      { ox: 10, oy: 5, rx: 50, ry: 40, color: "rgba(150, 100, 255, 0.07)", alpha: 1 },
    ]);

    // Carina-like (warm red-orange)
    paintNebula(1500, 650, [
      { ox: 0, oy: 0, rx: 160, ry: 120, color: "rgba(180, 50, 30, 0.05)", alpha: 1 },
      { ox: -30, oy: 20, rx: 120, ry: 90, color: "rgba(200, 80, 20, 0.04)", alpha: 1 },
      { ox: 25, oy: -15, rx: 90, ry: 130, color: "rgba(160, 40, 60, 0.035)", alpha: 1 },
      { ox: 5, oy: 0, rx: 60, ry: 50, color: "rgba(255, 120, 50, 0.06)", alpha: 1 },
    ]);

    // Eagle-like (green-teal)
    paintNebula(1700, 250, [
      { ox: 0, oy: 0, rx: 120, ry: 90, color: "rgba(30, 120, 80, 0.04)", alpha: 1 },
      { ox: 20, oy: -10, rx: 90, ry: 70, color: "rgba(40, 160, 120, 0.035)", alpha: 1 },
      { ox: -15, oy: 15, rx: 70, ry: 100, color: "rgba(50, 200, 150, 0.03)", alpha: 1 },
    ]);

    // Twinkling stars
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 3000; i++) {
      const sx = Math.random() * 2048;
      const sy = Math.random() * 1024;
      const sr = Math.random() * 0.8 + 0.1;
      ctx.globalAlpha = Math.random() * 0.6 + 0.2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 80; i++) {
      const sx = Math.random() * 2048;
      const sy = Math.random() * 1024;
      const sr = Math.random() * 1.5 + 0.5;
      ctx.globalAlpha = Math.random() * 0.2 + 0.2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // ——— 3D Star particles ———
  const [starPositions, starColors] = useMemo(() => {
    const verts: number[] = [];
    const cols: number[] = [];
    const c = new THREE.Color();

    for (let i = 0; i < 1500; i++) {
      const x = 2000 * Math.random() - 1000;
      const y = 2000 * Math.random() - 1000;
      const z = 2000 * Math.random() - 1000;
      if (Math.abs(x) < 200 && Math.abs(y) < 200 && Math.abs(z) < 200) continue;
      verts.push(x, y, z);

      const temp = Math.random();
      if (temp > 0.85) c.setHex(0xaabfff);      // Blue
      else if (temp > 0.5) c.setHex(0xffffff);   // White
      else if (temp > 0.2) c.setHex(0xffe8c8);   // Yellow
      else c.setHex(0xffcfa0);                    // Orange
      cols.push(c.r, c.g, c.b);
    }
    return [new Float32Array(verts), new Float32Array(cols)];
  }, []);

  // Rotate moon slowly
  useFrame((_, delta) => {
    if (moonRef.current) moonRef.current.rotation.y += delta * 0.05;
    if (starsRef.current) starsRef.current.rotation.y += delta * 0.003;
  });

  return (
    <>
      {/* ——— Skybox sphere ——— */}
      <mesh>
        <sphereGeometry args={[1500, 64, 64]} />
        <meshBasicMaterial map={skyTexture} side={THREE.BackSide} />
      </mesh>

      {/* ——— Moon ——— */}
      <mesh ref={moonRef} position={[150, 70, -100]}>
        <sphereGeometry args={[R * 0.3, 64, 64]} />
        <meshStandardMaterial
          map={moonTex}
          roughness={0.45}
          metalness={0.4}
          color={0xffffff}
          emissive={new THREE.Color(0x0a1526)}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* ——— 3D Star particles (multi-color) ——— */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[starColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          sizeAttenuation
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexColors
          fog={false}
        />
      </points>

      {/* ——— Lighting (matching reference) ——— */}
      <directionalLight position={[250, 100, 50]} intensity={5.0} color={0xeef4ff} />
      <pointLight position={[100, 50, -150]} intensity={600} distance={400} color={0x00f0ff} />
      <ambientLight intensity={0.2} />
    </>
  );
}
