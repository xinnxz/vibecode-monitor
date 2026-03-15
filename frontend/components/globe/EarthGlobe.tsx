"use client";
// components/globe/EarthGlobe.tsx
// ============================================================
// Port dari globe.js Vibe Code Monitor ke React Three Fiber.
//
// Komponen ini menghasilkan bola bumi persis seperti referensi:
// 1. Earth sphere + earth.jpg texture + GLSL shader (Fresnel glow + scan line)
// 2. Point border (titik-titik kecil transparan mengelilingi bumi)
// 3. Atmospheric glow sprite (glow.png overlay)
// 4. Fresnel atmosphere shader (cahaya di tepi bola)
// 5. 3 Satellite orbit rings + rotating dots
// ============================================================

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

const R = 50; // Radius bumi — sama dengan referensi

export function EarthGlobe() {
  const earthRef = useRef<THREE.Group>(null!);
  const scanTimeRef = useRef(100); // Untuk animasi scan line

  // ——— Load semua textures ———
  const earthTex = useLoader(THREE.TextureLoader, "/textures/earth.jpg");
  const glowTex  = useLoader(THREE.TextureLoader, "/textures/glow.png");

  // ——— GLSL Shader Uniforms ———
  const uniforms = useMemo(() => ({
    glowColor: { value: new THREE.Color(0x4b0082) }, // Dark Purple for base terrain glow
    scale:     { value: -1.0 },
    bias:      { value: 1.0 },
    power:     { value: 3.3 },
    time:      { value: 100.0 },
    isHover:   { value: false },
    map:       { value: earthTex },
  }), [earthTex]);

  // ——— Vertex Shader ———
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vp;
    varying vec3 vPositionNormal;
    void main(void) {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vp = position;
      vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // ——— Fragment Shader: Fresnel glow + moving scan line + earth texture ———
  const fragmentShader = `
    uniform vec3 glowColor;
    uniform float bias;
    uniform float power;
    uniform float time;
    varying vec3 vp;
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    uniform float scale;
    uniform sampler2D map;
    varying vec2 vUv;

    void main(void) {
      // Fresnel glow: tepi bumi lebih terang (efek atmosphere)
      float a = pow(bias + scale * abs(dot(vNormal, vPositionNormal)), power);

      // Scan line: garis cahaya bergerak vertikal dari bawah ke atas
      if (vp.y > time && vp.y < time + 20.0) {
        float t = smoothstep(0.0, 0.8, (1.0 - abs(0.5 - (vp.y - time) / 20.0)) / 3.0);
        gl_FragColor = mix(gl_FragColor, vec4(glowColor, 1.0), t * t);
      }

      // Apply Fresnel glow
      gl_FragColor = mix(gl_FragColor, vec4(glowColor, 1.0), a);

      // Tambahkan earth texture di atas semua efek
      gl_FragColor = gl_FragColor + texture2D(map, vUv);
    }
  `;

  // ——— Atmosphere Fresnel Shader ———
  const atmoVertexShader = `
    varying vec3 vVertexWorldPosition;
    varying vec3 vVertexNormal;
    void main() {
      vVertexNormal = normalize(normalMatrix * normal);
      vVertexWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const atmoFragmentShader = `
    uniform vec3 glowColor;
    uniform float coeficient;
    uniform float power;
    varying vec3 vVertexNormal;
    varying vec3 vVertexWorldPosition;
    void main() {
      vec3 worldCameraToVertex = vVertexWorldPosition - cameraPosition;
      vec3 viewCameraToVertex = (viewMatrix * vec4(worldCameraToVertex, 0.0)).xyz;
      viewCameraToVertex = normalize(viewCameraToVertex);
      float intensity = pow(coeficient + dot(vVertexNormal, viewCameraToVertex), power);
      gl_FragColor = vec4(glowColor, intensity);
    }
  `;

  // ——— Satellite orbit ring points ———
  const orbitPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j < 2 * Math.PI - 0.1; j += (2 * Math.PI) / 150) {
      pts.push(new THREE.Vector3(
        Math.cos(j) * (R + 15),
        0,
        Math.sin(j) * (R + 15)
      ));
    }
    pts.push(pts[0].clone());
    return pts;
  }, []);

  // ——— Create satellite ring tube geometry ———
  const orbitGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(orbitPoints);
    return new THREE.TubeGeometry(curve, 100, 0.1);
  }, [orbitPoints]);

  // ——— Satellite balls positions ———
  const satPositions = useMemo(() => {
    const positions: THREE.Vector3[][] = [];
    for (let ring = 0; ring < 3; ring++) {
      const ringPts: THREE.Vector3[] = [];
      for (let i = 0; i < 2; i++) {
        const idx = Math.floor(orbitPoints.length / 2) * (i + 1);
        const pos = orbitPoints[idx % orbitPoints.length];
        ringPts.push(pos.clone());
      }
      positions.push(ringPts);
    }
    return positions;
  }, [orbitPoints]);

  // ——— Animate scan line + earth rotation ———
  useFrame((_, delta) => {
    // Scan line: bergerak dari bawah ke atas
    scanTimeRef.current -= delta * 15;
    if (scanTimeRef.current < -R - 20) scanTimeRef.current = R + 20;
    uniforms.time.value = scanTimeRef.current;

    // Rotasi bumi
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.1;
    }
  });

  // Ring colors representing Somnia Theme
  const ringColors = [0x4b0082, 0x2e0094, 0x4b0082];
  const ballColors = [0x9d00ff, 0x9d00ff, 0xffffff];

  return (
    <group ref={earthRef}>
      {/* ——— 1. Point border (titik transparan di sekitar bumi) ——— */}
      <points>
        <sphereGeometry args={[R + 10, 60, 60]} />
        <pointsMaterial
          color={0x2e0094} // Indigo Blue for border points
          transparent
          sizeAttenuation
          opacity={0.1}
          size={0.01}
        />
      </points>

      {/* ——— 2. Earth sphere dengan custom GLSL shader ——— */}
      <mesh>
        <sphereGeometry args={[R, 50, 50]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>

      {/* ——— 3. Atmosphere Fresnel glow (inner) ——— */}
      <mesh>
        <sphereGeometry args={[R, 50, 50]} />
        <shaderMaterial
          uniforms={{
            coeficient: { value: 1.0 },
            power:      { value: 3 },
            glowColor:  { value: new THREE.Color(0x4b0082) }, // Dark Purple for inner atmosphere
          }}
          vertexShader={atmoVertexShader}
          fragmentShader={atmoFragmentShader}
          blending={THREE.NormalBlending}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* ——— 4. Glow sprite overlay ——— */}
      <sprite scale={[R * 3.0, R * 3.0, 1]}>
        <spriteMaterial
          map={glowTex}
          color={0x1a0033} // Very deep, dark indigo for the huge sprite glow
          transparent
          opacity={0.4} // Lowered opacity so it's not washed out
          depthWrite={false}
        />
      </sprite>

      {/* ——— 5. Satellite orbit ring 1 ——— */}
      <mesh geometry={orbitGeo}>
        <meshBasicMaterial color={ringColors[0]} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* ——— 6. Satellite orbit ring 2 (scaled + rotated) ——— */}
      <mesh geometry={orbitGeo} scale={[1.2, 1.2, 1.2]} rotation={[0, 0, Math.PI / 6]}>
        <meshBasicMaterial color={ringColors[1]} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* ——— 7. Satellite orbit ring 3 ——— */}
      <mesh geometry={orbitGeo} scale={[0.8, 0.8, 0.8]} rotation={[0, 0, -Math.PI / 6]}>
        <meshBasicMaterial color={ringColors[2]} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* ——— 8. Satellite balls ——— */}
      {satPositions.map((ring, ringIdx) =>
        ring.map((pos, i) => (
          <mesh key={`sat-${ringIdx}-${i}`} position={[pos.x, pos.y, pos.z]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color={ballColors[ringIdx]} />
          </mesh>
        ))
      )}
    </group>
  );
}
