"use client";

// components/layout/Sidebar.tsx
// ============================================================
// "Live Block Terminal" — Smart Queue System
//
// Solves real-time & missing block issues:
// 1. Unseen Blocks: New blocks prioritized, guaranteed to show.
// 2. History Blocks: Displayed randomly when network is idle.
// 3. No Duplicates: A block is never shown twice simultaneously.
// ============================================================

import { ProcessedBlock } from "@/hooks/useBlockStream";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTpsStore } from "@/hooks/useTpsStore";

const HEX = "0123456789abcdef";
const SLOT_COUNT = 8;
// Base tick rate removed, calculating dynamically inside component

function randomHex(len: number): string {
  let s = "0x";
  for (let i = 0; i < len; i++) s += HEX[Math.floor(Math.random() * 16)];
  return s;
}

function useLiveHex(length: number, speed = 80, active = true): string {
  const [text, setText] = useState(() => randomHex(length));
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setText(randomHex(length)), speed);
    return () => clearInterval(id);
  }, [length, speed, active]);
  return text;
}

function useDecodeText(target: string, duration = 700, active = true): string {
  const [display, setDisplay] = useState(target);
  const prev = useRef("");
  const raf = useRef<number>(0);
  const lastUpdate = useRef<number>(0);

  useEffect(() => {
    if (!active || prev.current === target) return;
    prev.current = target;
    const start = performance.now();
    const len = target.length;

    const tick = (now: number) => {
      // Throttle React state updates to ~25 FPS to save CPU
      if (now - lastUpdate.current < 40) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      lastUpdate.current = now;

      const p = Math.min((now - start) / duration, 1);
      const locked = Math.floor(p * len);
      let r = "";
      for (let i = 0; i < len; i++) {
        r += i < locked ? target[i] : HEX[Math.floor(Math.random() * 16)];
      }
      setDisplay(r);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setDisplay(target);
    };

    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, active]);

  return display;
}

// ——— Global Smart Queue Manager ———
let globalAccumulator = 0; // Tracks incoming TX bursts and decays smoothly

type QueueManager = {
  unseen: ProcessedBlock[];
  history: ProcessedBlock[];
  currentlyDisplaying: Map<number, number>; // block.number -> txCount
  totalProcessedHits: number;
};

// ——— Single Slot Component ———
function SmartCycleSlot({
  index,
  queueManager,
  staggerDelay,
  currentTps,
}: {
  index: number;
  queueManager: React.MutableRefObject<QueueManager>;
  staggerDelay: number;
  currentTps: number;
}) {
  const [phase, setPhase] = useState<"scanning" | "locking">("scanning");
  const [currentBlock, setCurrentBlock] = useState<ProcessedBlock | null>(null);
  const [flash, setFlash] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let scanTimer: NodeJS.Timeout;
    let lockTimer: NodeJS.Timeout;

    const runCycle = () => {
      if (!mounted.current) return;
      setPhase("scanning");
      setCurrentBlock(null);
      setFlash(false);

      scanTimer = setTimeout(() => {
        if (!mounted.current) return;

        const q = queueManager.current;
        let selectedBlock: ProcessedBlock | null = null;

        // 1. PRIORITY: Get newest unseen block
        if (q.unseen.length > 0) {
          selectedBlock = q.unseen.shift()!;
        }
        // 2. IDLE: We no longer play historical blocks to fake activity.
        // It stays empty if there are no new blocks.

        if (selectedBlock) {
          // Track exactly how many txs are animating on screen right now!
          q.currentlyDisplaying.set(selectedBlock.number, selectedBlock.txCount);
          
          setCurrentBlock(selectedBlock);
          setPhase("locking");
          setFlash(true);

          // Add this block's TX strictly to the global visual accumulator
          globalAccumulator += selectedBlock.txCount;
          
          // PERFECT SYNC: Tell the Globe to render EXACTLY what the sidebar is rendering right now
          useTpsStore.getState().pushGlobeBlock(selectedBlock);

          setTimeout(() => { if (mounted.current) setFlash(false); }, 500);

          // Elastic Pacing: The feed speeds up if a backlog builds up.
          // If the queue has many blocks (burst), we drain it fast (min 150ms).
          // If the queue is almost empty, we stretch the display time up to ~1.2s.
          const unseenCount = q.unseen.length;
          let elasticTick = 1200; // Base slow rhythm
          if (unseenCount > 0) {
            // Get geometrically faster the larger the backlog
            elasticTick = Math.max(150, 1000 / unseenCount);
          }

          lockTimer = setTimeout(() => {
            if (selectedBlock) {
              q.currentlyDisplaying.delete(selectedBlock.number);
              // Move to history if it wasn't there already
              if (!q.history.some(b => b.number === selectedBlock!.number)) {
                // Keep history capped at 100 blocks
                if (q.history.length > 100) q.history.shift();
                q.history.push(selectedBlock!);
                // Increment our forever counter for the UI stat
                q.totalProcessedHits++;
              }
            }
            
            runCycle();
          }, elasticTick); 
        } else {
          // No blocks at all, keep scanning every 1 second anyway to maintain the tick
          scanTimer = setTimeout(runCycle, 1000);
        }
      }, 50); // tiny buffer before lock phase
    };

    const startDelay = setTimeout(runCycle, staggerDelay);

    return () => {
      mounted.current = false;
      clearTimeout(startDelay);
      clearTimeout(scanTimer);
      clearTimeout(lockTimer);
      if (currentBlock) {
        queueManager.current.currentlyDisplaying.delete(currentBlock.number);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  if (phase === "scanning" || !currentBlock) return <ScanningView index={index} />;
  return <LockedView block={currentBlock} flash={flash} />;
}

// ——— Scanning View ———
function ScanningView({ index }: { index: number }) {
  const liveBlock = useLiveHex(6, 90);
  const liveHash = useLiveHex(38, 50);

  return (
    <div
      className="relative pointer-events-auto"
      style={{
        padding: "10px 14px",
        background: "rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: "15%", bottom: "15%", width: "2px", background: "rgba(168,85,247,0.2)", borderRadius: "1px" }} />
      <div style={{ marginLeft: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="font-mono" style={{ fontSize: "11px", color: "rgba(168,85,247,0.5)", letterSpacing: "0.03em" }}>
            SCAN #{liveBlock.slice(2)}
          </span>
          <span className="font-mono" style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)" }}>
            SLOT {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <span className="font-mono" style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "190px" }}>
            {liveHash}
          </span>
          <span className="font-mono" style={{ fontSize: "10px", color: "rgba(255,255,255,0.12)", flexShrink: 0 }}>
            ··· TX
          </span>
        </div>
      </div>
    </div>
  );
}

// ——— Locked View ———
function LockedView({ block, flash }: { block: ProcessedBlock; flash: boolean }) {
  const blockLabel = `BLOCK #${block.number.toLocaleString()}`;
  const hash = block.hash.slice(0, 42);
  const tx = `${block.txCount} TX`;
  const time = new Date(block.timestamp * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const dBlock = useDecodeText(blockLabel, 200, true);
  const dHash = useDecodeText(hash, 300, true);
  const dTx = useDecodeText(tx, 100, true);
  const dTime = useDecodeText(time, 150, true);


  return (
    <a
      href={`https://shannon-explorer.somnia.network/block/${block.number}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block group/block"
      style={{ textDecoration: "none" }}
    >
      <div
        className="relative pointer-events-auto transition-all duration-200 cursor-pointer group-hover/block:brightness-125"
        style={{
          padding: "10px 14px",
          background: flash ? "rgba(168, 85, 247, 0.2)" : "rgba(168, 85, 247, 0.06)",
          border: flash ? "1px solid rgba(168, 85, 247, 0.6)" : "1px solid rgba(168, 85, 247, 0.25)",
          borderRadius: "4px",
          overflow: "hidden",
          transition: "all 0.5s ease-out",
          boxShadow: flash ? "0 0 20px rgba(168,85,247,0.3), inset 0 0 15px rgba(168,85,247,0.1)" : "none",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: "10%", bottom: "10%", width: "2px", background: "#a855f7", boxShadow: flash ? "0 0 12px #a855f7" : "0 0 6px rgba(168,85,247,0.4)", borderRadius: "1px", transition: "box-shadow 0.5s" }} />
        <div style={{ marginLeft: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-display" style={{ fontSize: "11px", fontWeight: 700, color: "#c084fc", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {dBlock}
            </span>
            <span className="font-mono" style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>
              {dTime}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
            <span className="font-mono" style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "190px" }}>
              {dHash}
            </span>
            <span className="font-mono" style={{ fontSize: "10px", fontWeight: 700, color: "#a855f7", flexShrink: 0 }}>
              {dTx}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

export function Sidebar() {
  const recentBlocks = useTpsStore((state) => state.recentBlocks);
  const chainTps = useTpsStore((state) => state.chainTps);

  // Shared state manager for all slots
  const queueManager = useRef<QueueManager>({
    unseen: [],
    history: [],
    currentlyDisplaying: new Map(),
    totalProcessedHits: 0,
  });

  // Share the currently displayed TPS visually backwards
  useEffect(() => {
    let lastEmitted = -1;

    const interval = setInterval(() => {
      // Smooth decay algorithm: Lose 3% of the accumulator per tick to create a gliding stop
      globalAccumulator = globalAccumulator * 0.95;
      
      // If it falls below 0.1, snap to 0 to stop micro-decimals
      if (globalAccumulator < 0.1) globalAccumulator = 0;

      // Calculate absolute real-time visible transactions with the accumulator
      const visualTps = Math.ceil(globalAccumulator);

      if (visualTps !== lastEmitted) {
        useTpsStore.getState().setVisualTps(visualTps);
        lastEmitted = visualTps;
      }
    }, 100); // Fast 100ms poll for smooth numerical countdown
    return () => clearInterval(interval);
  }, []);

  // Watch for new blocks from the stream and add active ones to `unseen` queue
  useEffect(() => {
    const activeBlocks = recentBlocks.filter(b => b.txCount > 0);
    const q = queueManager.current;

    // Sort oldest first, so we process them chronologically
    const sortedActive = [...activeBlocks].sort((a, b) => a.number - b.number);

    sortedActive.forEach(b => {
      // If we haven't seen this block anywhere yet, add to unseen queue
      if (
        !q.unseen.some(x => x.number === b.number) &&
        !q.history.some(x => x.number === b.number) &&
        !q.currentlyDisplaying.has(b.number)
      ) {
        // Unshift so the newest blocks are at index 0 (LIFO for faster display)
        q.unseen.unshift(b);
      }
    });

    // Prevent traffic jam backlog! If the queue gets too huge, drop the oldest ones.
    if (q.unseen.length > 20) {
      q.unseen.length = 20;
    }
  }, [recentBlocks]);

  const totalScanned = recentBlocks.length;
  // Calculate hits from our history + currently unseen
  const totalHits = queueManager.current.totalProcessedHits + queueManager.current.currentlyDisplaying.size;

  // Pre-calculate randomized stagger delays so they pop up organically, not top-to-bottom
  const staggerDelays = useMemo(() => {
    // Basic delays
    const delays = Array.from({ length: SLOT_COUNT }, (_, i) => i * 300 + Math.random() * 400);
    // Fisher-Yates shuffle the array
    for (let i = delays.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [delays[i], delays[j]] = [delays[j], delays[i]];
    }
    return delays;
  }, []);

  return (
    <aside
      className="absolute z-40 pointer-events-none"
      style={{ top: "120px", right: "40px", width: "320px" }}
    >
      {/* Header */}
      <div style={{ padding: "0 4px 10px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span className="font-mono" style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Terminal Feed
          </span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, rgba(255,255,255,0.1), transparent)" }} />
        </div>
        <span className="font-mono" style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>
          {totalScanned > 0
            ? `Active Queue: ${queueManager.current.unseen.length} pending · ${totalHits} total hits`
            : "Initializing scanner..."
          }
        </span>
      </div>

      {/* 8 Smart Slots */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {Array.from({ length: SLOT_COUNT }).map((_, i) => (
          <SmartCycleSlot
            key={i}
            index={i}
            queueManager={queueManager}
            staggerDelay={staggerDelays[i]} // Shuffled and randomized delays!
            currentTps={chainTps}
          />
        ))}
      </div>
    </aside>
  );
}
