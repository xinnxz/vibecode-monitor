"use client";

// components/layout/Sidebar.tsx
// ============================================================
// Panel kanan — "Live Block Terminal" (Sci-Fi Hacker Style)
// Fixed card slots with character scramble text decode effect.
// No scrolling — cards are static, only text content updates.
// ============================================================

import { useBlockStream, ProcessedBlock } from "@/hooks/useBlockStream";
import { useState, useEffect, useRef, useCallback } from "react";

const SCRAMBLE_CHARS = "0123456789abcdef!@#$%^&*";
const SLOT_COUNT = 8; // Number of fixed visible slots

// ——— Character Scramble Hook ———
// Animates text from random characters to final value (hacker/sci-fi decode effect)
function useScrambleText(targetText: string, duration = 600): string {
  const [displayText, setDisplayText] = useState(targetText);
  const frameRef = useRef<number>(0);
  const prevTarget = useRef(targetText);

  useEffect(() => {
    // Only animate if the target changed
    if (prevTarget.current === targetText) return;
    prevTarget.current = targetText;

    const startTime = performance.now();
    const len = targetText.length;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Characters "lock in" from left to right as progress increases
      const lockedChars = Math.floor(progress * len);
      let result = "";

      for (let i = 0; i < len; i++) {
        if (i < lockedChars) {
          // This character is "decoded" — show the real value
          result += targetText[i];
        } else {
          // Still scrambling — show random character
          result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }

      setDisplayText(result);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(targetText);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [targetText, duration]);

  return displayText;
}

// ——— Single Block Slot (Fixed Position, Text Updates Only) ———
function BlockSlot({ block, index }: { block: ProcessedBlock | null; index: number }) {
  const blockNum = block ? `BLOCK #${block.number.toLocaleString()}` : "AWAITING...";
  const hash = block ? block.hash : "0x" + "·".repeat(40);
  const txCount = block ? `${block.txCount} TX` : "— TX";
  const time = block
    ? new Date(block.timestamp * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    })
    : "--:--:--";

  // Apply scramble effect to each text field (significantly faster)
  const displayBlock = useScrambleText(blockNum, 200);
  const displayHash = useScrambleText(hash, 300);
  const displayTx = useScrambleText(txCount, 150);
  const displayTime = useScrambleText(time, 180);

  const hasTx = block && block.txCount > 0;

  return (
    <div
      className="relative pointer-events-auto"
      style={{
        padding: "10px 14px 10px 14px",
        background: hasTx
          ? "rgba(168, 85, 247, 0.08)"
          : "rgba(0, 0, 0, 0.35)",
        border: hasTx
          ? "1px solid rgba(168, 85, 247, 0.3)"
          : "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "4px",
        overflow: "hidden",
        transition: "border-color 0.3s, background 0.3s",
      }}
    >
      {/* Vertical Status Bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "20%",
          bottom: "20%",
          width: "2px",
          background: hasTx ? "#a855f7" : "rgba(168, 85, 247, 0.3)",
          boxShadow: hasTx ? "0 0 8px rgba(168, 85, 247, 0.6)" : "none",
          borderRadius: "1px",
          transition: "all 0.3s",
        }}
      />

      {/* Row 1: Block number + Time */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          className="font-display"
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: hasTx ? "rgba(192, 132, 252, 1)" : "rgba(255, 255, 255, 0.8)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {displayBlock}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)" }}
        >
          {displayTime}
        </span>
      </div>

      {/* Row 2: Hash + TX Count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
        <span
          className="font-mono"
          style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.35)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "180px",
          }}
        >
          {displayHash}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: hasTx ? "#a855f7" : "rgba(129, 140, 248, 0.6)",
            flexShrink: 0,
          }}
        >
          {displayTx}
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { recentBlocks } = useBlockStream();

  // Take the latest SLOT_COUNT blocks (newest first)
  const displayBlocks = recentBlocks
    .slice()
    .reverse()
    .slice(0, SLOT_COUNT);

  // Pad with nulls if we don't have enough blocks yet
  const slots: (ProcessedBlock | null)[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    slots.push(displayBlocks[i] || null);
  }

  return (
    <aside
      className="absolute z-40 pointer-events-none"
      style={{
        top: "96px",
        right: "40px",
        width: "320px",
      }}
    >
      {/* Header */}
      <div style={{ padding: "0 4px 12px 4px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          className="font-mono"
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Terminal Feed
        </span>
        <div
          style={{
            flex: 1,
            height: "1px",
            background: "linear-gradient(to right, rgba(255,255,255,0.1), transparent)",
          }}
        />
      </div>

      {/* Fixed Slots — NO SCROLL */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {slots.map((block, i) => (
          <BlockSlot key={i} block={block} index={i} />
        ))}
      </div>
    </aside>
  );
}
