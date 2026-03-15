"use client";
// components/globe/EarthGlobe.tsx
// ============================================================
// Earth Globe + Keplerian Lunar Orbit
//
// Features:
// 1. Earth sphere + earth.jpg texture + GLSL shader (Fresnel glow + scan line)
// 2. Point border (titik-titik transparan mengelilingi bumi)
// 3. Atmospheric glow sprite + Fresnel atmosphere shader
// 4. Moon orbiting Earth on Keplerian elliptical orbit:
//    - e = 0.0549 (Moon's actual eccentricity)
//    - i = 5.145° (Moon's orbital inclination)
//    - Kepler's equation solved via Newton-Raphson
//    - Period = 120s (accelerated for visual effect)
// ============================================================

import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

const R = 50;

export function EarthGlobe() {
  const earthRef = useRef<THREE.Group>(null!);
  const moonRef = useRef<THREE.Mesh>(null!);
  const scanTimeRef = useRef(100);

  // ——— Load textures ———
  const earthTex = useLoader(THREE.TextureLoader, "/textures/earth.jpg");
  const glowTex = useLoader(THREE.TextureLoader, "/textures/glow.png");
  const moonTex = useLoader(THREE.TextureLoader, "/textures/moon.jpg");

  // ——— GLSL Shader Uniforms ———
  const uniforms = useMemo(() => ({
    glowColor: { value: new THREE.Color(0x4b0082) },
    scale: { value: -1.0 },
    bias: { value: 1.0 },
    power: { value: 3.3 },
    time: { value: 100.0 },
    isHover: { value: false },
    map: { value: earthTex },
  }), [earthTex]);

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
      float a = pow(bias + scale * abs(dot(vNormal, vPositionNormal)), power);
      if (vp.y > time && vp.y < time + 20.0) {
        float t = smoothstep(0.0, 0.8, (1.0 - abs(0.5 - (vp.y - time) / 20.0)) / 3.0);
        gl_FragColor = mix(gl_FragColor, vec4(glowColor, 1.0), t * t);
      }
      gl_FragColor = mix(gl_FragColor, vec4(glowColor, 1.0), a);
      gl_FragColor = gl_FragColor + texture2D(map, vUv);
    }
  `;

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

  // ============================================================
  // KEPLERIAN LUNAR ORBIT — Real Physics
  // ============================================================
  const ORBIT_A = R + 80;                        // Visually pleasing 'agak jauh' distance (not real 60x ratio)
  const ORBIT_E = 0.0549;                        // Moon's actual eccentricity
  const ORBIT_I = 5.145 * Math.PI / 180;         // Orbital inclination (rad)
  const ORBIT_PERIOD = 120;                       // Period in seconds (visual)
  const orbitTimeRef = useRef(Math.random() * ORBIT_PERIOD);

  // Solve Kepler's Equation: M = E - e·sin(E) → find E
  // Uses Newton-Raphson iteration (converges in ~4 steps for e < 0.1)
  function solveKepler(M: number, e: number): number {
    let E = M; // Initial guess (good for low eccentricity)
    for (let i = 0; i < 6; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }

  // Calculate moon position at given time using Kepler's laws
  function getMoonPos(t: number): [number, number, number] {
    // Mean anomaly (increases uniformly with time)
    const M = (2 * Math.PI * t) / ORBIT_PERIOD;

    // Eccentric anomaly (via Kepler's equation — non-uniform!)
    const E = solveKepler(M, ORBIT_E);

    // True anomaly: the ACTUAL angle of the moon around its orbit
    // Moon moves faster at perigee (closest), slower at apogee (farthest)
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + ORBIT_E) * Math.sin(E / 2),
      Math.sqrt(1 - ORBIT_E) * Math.cos(E / 2)
    );

    // Orbital radius (distance from Earth center = focus of ellipse)
    // r = a(1 - e·cos(E))  — not uniform! Changes with position
    const r = ORBIT_A * (1 - ORBIT_E * Math.cos(E));

    // Position in orbital plane (flat ellipse in XZ)
    const xFlat = r * Math.cos(nu);
    const zFlat = r * Math.sin(nu);

    // Apply orbital inclination: rotate around X-axis by i
    // This tilts the orbit 5.145° out of the equatorial plane
    const x = xFlat;
    const y = zFlat * Math.sin(ORBIT_I);
    const z = zFlat * Math.cos(ORBIT_I);

    return [x, y, z];
  }

  // Pre-compute elliptical orbit trail for the visible ring
  const orbitTrailGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * ORBIT_PERIOD;
      const M = (2 * Math.PI * t) / ORBIT_PERIOD;
      let E = M;
      for (let j = 0; j < 6; j++) E = E - (E - ORBIT_E * Math.sin(E) - M) / (1 - ORBIT_E * Math.cos(E));
      const nu = 2 * Math.atan2(
        Math.sqrt(1 + ORBIT_E) * Math.sin(E / 2),
        Math.sqrt(1 - ORBIT_E) * Math.cos(E / 2)
      );
      const r = ORBIT_A * (1 - ORBIT_E * Math.cos(E));
      const xF = r * Math.cos(nu);
      const zF = r * Math.sin(nu);
      pts.push(new THREE.Vector3(xF, zF * Math.sin(ORBIT_I), zF * Math.cos(ORBIT_I)));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    return geometry;
  }, []);

  // ——— Animation Loop ———
  useFrame((_, delta) => {
    // Scan line
    scanTimeRef.current -= delta * 15;
    if (scanTimeRef.current < -R - 20) scanTimeRef.current = R + 20;
    uniforms.time.value = scanTimeRef.current;

    // Moon: advance along Kepler orbit
    orbitTimeRef.current = (orbitTimeRef.current + delta) % ORBIT_PERIOD;
    if (moonRef.current) {
      const [mx, my, mz] = getMoonPos(orbitTimeRef.current);
      moonRef.current.position.set(mx, my, mz);
      // Tidally locked: one face always toward Earth (like the real Moon)
      moonRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <group ref={earthRef}>
      {/* ——— 1. Point border ——— */}
      <points>
        <sphereGeometry args={[R + 10, 32, 32]} />
        <pointsMaterial
          color={0x2e0094}
          transparent
          sizeAttenuation
          opacity={0.25}
          size={0.04}
        />
      </points>

      {/* ——— 2. Earth sphere ——— */}
      <mesh>
        <sphereGeometry args={[R, 32, 32]} />
        <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
      </mesh>

      {/* ——— 3. Atmosphere Fresnel glow ——— */}
      <mesh>
        <sphereGeometry args={[R, 32, 32]} />
        <shaderMaterial
          uniforms={{
            coeficient: { value: 1.0 },
            power: { value: 3 },
            glowColor: { value: new THREE.Color(0x4b0082) },
          }}
          vertexShader={atmoVertexShader}
          fragmentShader={atmoFragmentShader}
          blending={THREE.NormalBlending}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* ——— 4. Glow sprite ——— */}
      <sprite scale={[R * 3.0, R * 3.0, 1]}>
        <spriteMaterial map={glowTex} color={0x1a0033} transparent opacity={0.4} depthWrite={false} />
      </sprite>

      {/* ——— 5. Lunar orbit trail (Keplerian ellipse with 5.145° tilt) ——— */}
      <line geometry={orbitTrailGeo}>
        <lineBasicMaterial color={0x4b0082} transparent opacity={0.2} />
      </line>

      {/* ——— 6. Moon (travels along Keplerian orbit) ——— */}
      <mesh ref={moonRef}>
        <sphereGeometry args={[R * 0.2, 32, 32]} />
        <meshStandardMaterial
          map={moonTex}
          roughness={0.45}
          metalness={0.4}
          color={0xffffff}
          emissive={new THREE.Color(0x0a1526)}
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}
