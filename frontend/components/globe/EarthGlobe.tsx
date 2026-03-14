"use client";
// components/globe/EarthGlobe.tsx
// ============================================================
// Port dari globe.js asli — sama persis dengan Vibe Code Monitor!
//
// Menggunakan:
// 1. Custom GLSL ShaderMaterial dengan:
//    - earth.jpg texture
//    - Fresnel glow (tepi bola lebih terang)
//    - Scan line animation (garis cahaya bergerak naik)
// 2. Atmosphere Fresnel shader (glow biru di tepian)
// 3. glow.png Sprite overlay
// ============================================================

import { useRef, useEffect } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ——— GLSL: Vertex shader untuk earth ———
const earthVertexShader = `
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

// ——— GLSL: Fragment shader untuk earth (Fresnel + scan line + texture) ———
const earthFragmentShader = `
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
    // Fresnel glow: tepi bumi lebih terang (efek atmosfer dari luar)
    float a = pow(bias + scale * abs(dot(vNormal, vPositionNormal)), power);

    // Earth texture
    vec4 texColor = texture2D(map, vUv);

    // Scan line: garis cahaya berjalan naik (berganti warna cyan)
    vec4 glowEffect = vec4(0.0);
    if (vp.y > time && vp.y < time + 6.0) {
      float t = smoothstep(0.0, 0.8, (1.0 - abs(0.5 - (vp.y - time) / 6.0)) / 3.0);
      glowEffect = vec4(glowColor, 1.0) * t * t * 0.8;
    }

    // Gabungkan: texture + Fresnel glow + scan line
    gl_FragColor = texColor + vec4(glowColor, 1.0) * a * 0.6 + glowEffect;
  }
`;

// ——— GLSL: Vertex shader atmosphere ———
const atmosphereVertexShader = `
  varying vec3 vVertexWorldPosition;
  varying vec3 vVertexNormal;
  void main() {
    vVertexNormal = normalize(normalMatrix * normal);
    vVertexWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ——— GLSL: Fragment shader atmosphere (Fresnel rim glow) ———
const atmosphereFragmentShader = `
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

export function EarthGlobe({ radius = 1.0 }: { radius?: number }) {
  const earthRef   = useRef<THREE.Mesh>(null!);
  const groupRef   = useRef<THREE.Group>(null!);
  const timeRef    = useRef(-radius);          // Scan line start di bawah
  const uniformsRef = useRef<Record<string, THREE.IUniform> | null>(null);

  // Load textures
  const earthTex = useLoader(THREE.TextureLoader, "/textures/earth.jpg");
  const glowTex  = useLoader(THREE.TextureLoader, "/textures/glow.png");

  // Setup shader uniforms sekali saja
  useEffect(() => {
    earthTex.anisotropy = 4;
    uniformsRef.current = {
      glowColor: { value: new THREE.Color(0x0cd1eb) },
      scale:     { value: -1.0 },
      bias:      { value: 1.0 },
      power:     { value: 3.3 },
      time:      { value: -radius },
      map:       { value: earthTex },
    };
  }, [earthTex, radius]);

  // Animasi: rotasi bumi + update scan line time
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.04;

    // Update scan line posisi (bergerak dari bawah ke atas, loop)
    timeRef.current += delta * 0.5;
    if (timeRef.current > radius * 2) timeRef.current = -radius * 2;
    if (uniformsRef.current) {
      uniformsRef.current.time.value = timeRef.current;
    }
  });

  if (!uniformsRef.current) {
    // Pertama kali render sebelum useEffect jalan
    uniformsRef.current = {
      glowColor: { value: new THREE.Color(0x0cd1eb) },
      scale:     { value: -1.0 },
      bias:      { value: 1.0 },
      power:     { value: 3.3 },
      time:      { value: -radius },
      map:       { value: earthTex },
    };
  }

  return (
    <group ref={groupRef}>
      {/* ——— Earth Mesh dengan GLSL Shader ——— */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[radius, 50, 50]} />
        <shaderMaterial
          uniforms={uniformsRef.current}
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
        />
      </mesh>

      {/* ——— Atmosphere: Fresnel glow di tepian (BackSide) ——— */}
      <mesh>
        <sphereGeometry args={[radius, 50, 50]} />
        <shaderMaterial
          uniforms={{
            coeficient: { value: 1.0 },
            power:      { value: 3.0 },
            glowColor:  { value: new THREE.Color(0x4390d1) },
          }}
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          blending={THREE.NormalBlending}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* ——— glow.png Sprite: atmospheric halo ——— */}
      <sprite scale={[radius * 3.2, radius * 3.2, 1]}>
        <spriteMaterial
          map={glowTex}
          color={0x4390d1}
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}
