"use client";
// components/globe/NodeLabel.tsx
// ============================================================
// Cyberpunk-style floating HUD label for globe nodes.
// Highly optimized for WebGL performance.
// - No heavy CSS filters (backdrop-filter)
// - No Three.js <Html occlude> raycasting (which kills FPS)
// - Uses pure JS useFrame math to calculate scale and opacity
//   based on the camera's angle and distance.
// ============================================================

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface NodeLabelProps {
  name: string;
  region: string;
  color: string;
  isHub?: boolean;
  offsetY?: number;
  side?: "left" | "right";
  nodePos: THREE.Vector3; // Position of the node on the globe surface
}

const GLOBE_CENTER = new THREE.Vector3(0, 0, 0);

export function NodeLabel({
  name,
  region,
  color,
  isHub = false,
  offsetY = 6,
  side = "right",
  nodePos,
}: NodeLabelProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  // We manually calculate occlusion (hiding behind the globe) and scale
  // because <Html occlude distanceFactor> causes massive FPS drops natively.
  useFrame(() => {
    if (!containerRef.current || !groupRef.current) return;

    // Get the exact world position after all parent group rotations
    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);

    // 1. Calculate Occlusion (is the node behind the earth from camera view?)
    // Using a dot product between (camera -> globe center) and (globe center -> node world position)
    const camDir = camera.position.clone().normalize();
    const nodeDir = worldPos.clone().normalize();
    const dotProduct = camDir.dot(nodeDir);

    // Fade out smoothly as it rounds the horizon edge
    // Because this is a perspective camera, the true horizon is NOT at dotProduct = 0 (90 degrees).
    // The horizon angle depends on the camera distance: cos(theta) = R / D.
    const R = 50; 
    const camDist = camera.position.length();
    const horizonDot = camDist > R ? R / camDist : 0; // The exact edge of visibility
    
    let targetOpacity = 0;
    const fadeStart = horizonDot + 0.15; // Starts fading slightly before the edge
    const fadeEnd = horizonDot - 0.05;   // Fully invisible just past the visual edge

    if (dotProduct > fadeStart) {
      targetOpacity = 1; // Front and center
    } else if (dotProduct > fadeEnd) {
      // Smoothly transition from 1 to 0
      targetOpacity = Math.max(0, (dotProduct - fadeEnd) / (fadeStart - fadeEnd));
    }

    // 2. Calculate Distance Scale
    // How far is the camera?
    const dist = camera.position.distanceTo(worldPos);
    
    // As `dist` gets larger (zoomed out), we want `targetScale` to get smaller.
    // Base scale is smaller now so they don't dominate the screen.
    const baseScale = isHub ? 0.60 : 0.42;
    
    // 120 is an arbitrary tuning distance where scale = baseScale.
    // If distance > 120 (zoomed out), scale < baseScale.
    // If distance < 120 (zoomed in), scale > baseScale.
    // clamp between 0.2 (min size) and 1.2 (max size so it doesn't get huge).
    const scaleFactor = 120 / dist;
    const targetScale = Math.max(0.2, Math.min(1.2, scaleFactor * baseScale));

    // Apply via direct CSS transform (no React state re-renders = fast)
    containerRef.current.style.opacity = targetOpacity.toFixed(2);
    containerRef.current.style.pointerEvents = targetOpacity < 0.1 ? "none" : "auto";
    // Scale from the exact 0,0 anchor point
    containerRef.current.style.transform = `scale(${targetScale.toFixed(3)}) translate3d(0,0,0)`;
  });

  const cardW  = isHub ? 200 : 160;
  const fontSize = isHub ? 20 : 18;
  const subSize  = isHub ? 10 : 9;
  const dotRadius = isHub ? 3.5 : 2.5;

  // SVG Line dimensions
  const dx = isHub ? 40 : 25; // Diagonal X distance
  const dy = isHub ? 40 : 25; // Diagonal Y distance (upwards)
  const cx = isHub ? 40 : 30; // Horizontal line extension
  
  const sign = side === "right" ? 1 : -1;
  const endX = (dx + cx) * sign;
  const endY = -dy;

  // Build the SVG path (M = Move to, L = Line to)
  const pathD = `M 0 0 L ${dx * sign} ${-dy} L ${endX} ${endY}`;

  // Find the exact bounding box for the SVG so it doesn't get clipped
  const svgWidth = dx + cx + 4; // Add padding for stroke
  const svgHeight = dy + 4;

  return (
    <group ref={groupRef}>
      <Html
      // Position exactly at the center of the node sphere!
      position={[0, 0, 0]}
      center={false}
      style={{ overflow: "visible" }}
      zIndexRange={[100, 0]}
    >
      {/* Container scaled dynamically by useFrame.
          Origin is 0,0 (the literal node center), so scaling never shifts the anchor point. */}
      <div 
        ref={containerRef} 
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "0 0",
          opacity: 0,
          willChange: "transform, opacity",
          pointerEvents: "none",
          userSelect: "none"
        }}
      >
        
        {/* ——— SVG Connector Line ——— */}
        {/* We absolutely position the SVG so its 0,0 aligns with the parent 0,0 */}
        <svg 
          style={{ 
            position: "absolute", 
            top: -dy - 2, 
            left: side === "right" ? -2 : -svgWidth + 2, 
            width: svgWidth, 
            height: svgHeight,
            overflow: "visible",
            pointerEvents: "none"
          }}
        >
          {/* Faked Glow (fat semi-transparent stroke) avoids WebGL drop-shadow lag */}
          <path 
            d={`M ${side === "right" ? 0 : svgWidth} ${dy} L ${side === "right" ? dx : svgWidth - dx} 0 L ${side === "right" ? dx + cx : svgWidth - dx - cx} 0`} 
            fill="none" 
            stroke={color} 
            strokeWidth="4"
            opacity={0.3}
          />
          {/* Main solid line */}
          <path 
            d={`M ${side === "right" ? 0 : svgWidth} ${dy} L ${side === "right" ? dx : svgWidth - dx} 0 L ${side === "right" ? dx + cx : svgWidth - dx - cx} 0`} 
            fill="none" 
            stroke={color} 
            strokeWidth="1.5"
          />
        </svg>

        {/* ——— Anchor Dot (Exactly at 0,0) ——— */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${dotRadius * 2}px`, 
          height: `${dotRadius * 2}px`,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}, 0 0 16px ${color}80`,
          transform: "translate(-50%, -50%)", // perfectly center on the 3D coord
        }} />

        {/* ——— Main HUD Card ——— */}
        <div style={{
          position: "absolute",
          // Anchor the card exactly at the end of the SVG line
          top: `${endY}px`,
          ...(side === "right" ? { left: `${endX}px` } : { right: `${-endX}px` }),
          // Center vertically relative to the line end, and add a tiny gap horizontally
          transform: `translate(${side === "right" ? "2px" : "-2px"}, -50%)`,
          width: `${cardW}px`,
          background: "rgba(2, 6, 14, 0.85)", // Slightly more transparent
          border: `1px solid ${color}40`,
          borderLeft: side === "right" ? `3px solid ${color}` : `1px solid ${color}40`,
          borderRight: side === "left" ? `3px solid ${color}` : `1px solid ${color}40`,
          padding: isHub ? "8px 12px" : "6px 10px", // Tighter padding
          boxShadow: `0 0 10px ${color}15`,
        }}>
          {/* Corner accents */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "10px", height: "10px",
            borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`,
          }} />
          <div style={{
            position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px",
            borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}`,
          }} />

          {/* Title Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isHub && (
              <div style={{
                width: "18px", height: "18px",
                border: `1.5px solid ${color}80`, borderRadius: "3px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", color: color,
              }}>⬡</div>
            )}
            <div style={{
              fontSize: `${fontSize}px`,
              fontWeight: 800,
              color: color,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}>
              {name}
            </div>
          </div>

          <div style={{ height: "2px", background: `linear-gradient(to right, ${color}60, transparent)`, margin: "6px 0" }} />

          <div style={{
            fontSize: `${subSize}px`,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            whiteSpace: "nowrap",
          }}>
            {isHub ? "REGION: " : ""}{region}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "#10b981", boxShadow: "0 0 8px #10b981", animation: "blink 2s ease-in-out infinite",
            }} />
            <span style={{
              fontSize: `${subSize}px`, color: "#10b981", letterSpacing: "0.15em",
              fontWeight: 700, fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            }}>
              {isHub ? "NEXUS ONLINE" : "ACTIVE"}
            </span>
          </div>
        </div>
      </div>
    </Html>
  </group>
  );
}
