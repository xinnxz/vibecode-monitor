"use client";
// components/globe/NodeLabel.tsx
// ============================================================
// Cyberpunk-style floating HUD label for globe nodes.
// Inspired by the Neo-Kyoto District label style from the
// reference image: bent elbow connector line, glassmorphism
// background, neon glow border matching node color.
//
// Key props:
// - occlude: hides the label when behind the globe (no z-fighting)
// - distanceFactor: auto-scales with camera distance
// ============================================================

import { Html } from "@react-three/drei";
import { useMemo } from "react";

interface NodeLabelProps {
  name: string;
  region: string;
  color: string;       // CSS hex color e.g. "#3b82f6"
  isHub?: boolean;     // Larger premium label for Somnia HQ
  offsetY?: number;    // Vertical offset above node centre
  side?: "left" | "right"; // Which side the label floats to
}

export function NodeLabel({
  name,
  region,
  color,
  isHub = false,
  offsetY = 6,
  side = "right",
}: NodeLabelProps) {

  const wrapStyle = useMemo<React.CSSProperties>(() => ({
    position: "relative",
    pointerEvents: "none",
    userSelect: "none",
    // If label is on the left, flip the whole connector+card layout
    display: "flex",
    flexDirection: side === "right" ? "row" : "row-reverse",
    alignItems: "flex-end",
    gap: "0px",
  }), [side]);

  // Card sizes
  const cardW  = isHub ? 148 : 118;
  const fontSize = isHub ? 10 : 8.5;
  const subSize  = isHub ? 8  : 7;

  return (
    <Html
      position={[0, offsetY, 0]}
      // Billboard — always face camera
      center={false}
      // occlude hides label when obscured by the globe mesh
      occlude
      style={{ overflow: "visible" }}
      zIndexRange={[100, 0]}
    >
      <div style={wrapStyle}>
        {/* ——— Elbow Connector (L-shape) ——— */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: side === "right" ? "flex-end" : "flex-start",
          gap: 0,
        }}>
          {/* Vertical segment (drops from label bottom down to node level) */}
          <div style={{
            width: "1px",
            height: isHub ? "28px" : "22px",
            background: `linear-gradient(to bottom, ${color}cc, ${color}40)`,
            marginLeft: side === "right" ? "auto" : "0",
            marginRight: side === "right" ? "0" : "auto",
          }} />
          {/* Horizontal segment (runs sideways along the bottom) */}
          <div style={{
            height: "1px",
            width: isHub ? "28px" : "22px",
            background: `linear-gradient(${side === "right" ? "to left" : "to right"}, ${color}cc, ${color}40)`,
          }} />
          {/* End dot (at the node) */}
          <div style={{
            width: "5px", height: "5px",
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}, 0 0 12px ${color}60`,
            transform: side === "right" ? "translateX(2px)" : "translateX(-2px)",
          }} />
        </div>

        {/* ——— Main HUD Card ——— */}
        <div style={{
          width: `${cardW}px`,
          background: "rgba(3, 8, 20, 0.85)", // Solidified to restore readability without backdrop-filter
          border: `1px solid ${color}50`,
          borderLeft: side === "right" ? `3px solid ${color}` : `1px solid ${color}50`,
          borderRight: side === "left" ? `3px solid ${color}` : `1px solid ${color}50`,
          padding: isHub ? "8px 12px" : "6px 10px",
          position: "relative",
          boxShadow: `0 0 8px ${color}18`, // Reduced shadow

          // Offset card so connector meets the corner correctly
          transform: `translateY(calc(-100% + ${isHub ? "0px" : "0px"}))`,
        }}>
          {/* Corner accents */}
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: "8px", height: "8px",
            borderTop: `1.5px solid ${color}`,
            borderLeft: `1.5px solid ${color}`,
          }} />
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: "8px", height: "8px",
            borderBottom: `1.5px solid ${color}`,
            borderRight: `1.5px solid ${color}`,
          }} />

          {/* Icon + name row */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {isHub && (
              <div style={{
                width: "14px", height: "14px",
                border: `1px solid ${color}80`,
                borderRadius: "2px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "8px",
                color: color,
                flexShrink: 0,
              }}>⬡</div>
            )}
            <div style={{
              fontSize: `${fontSize}px`,
              fontWeight: 800,
              color: color,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              lineHeight: 1.3,
            }}>
              {name}
            </div>
          </div>

          {/* Divider */}
          <div style={{
            height: "1px",
            background: `linear-gradient(to right, ${color}40, transparent)`,
            margin: "4px 0",
          }} />

          {/* Region */}
          <div style={{
            fontSize: `${subSize}px`,
            color: "rgba(255,255,255,0.50)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            lineHeight: 1.4,
          }}>
            {isHub ? "REGION: " : ""}{region}
          </div>

          {/* Status */}
          <div style={{
            display: "flex", alignItems: "center", gap: "5px",
            marginTop: "4px",
          }}>
            <div style={{
              width: "5px", height: "5px",
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 5px #10b981",
              animation: "blink 2s ease-in-out infinite",
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: `${subSize}px`,
              color: "#10b981",
              letterSpacing: "0.15em",
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            }}>
              {isHub ? "NEXUS ONLINE" : "ACTIVE"}
            </span>
          </div>
        </div>
      </div>
    </Html>
  );
}
