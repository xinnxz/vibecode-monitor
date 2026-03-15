"use client";

// app/page.tsx
// ============================================================
// Dashboard utama SomniaScan — "Mission Control Center"
// Redesigned with premium Glassmorphism & Cyberpunk aesthetics.
// ============================================================

// TPS data is shared via Zustand store from Sidebar's single RPC connection
import { useWhaleAlerts } from "@/hooks/useWhaleAlerts";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { useTpsStore } from "@/hooks/useTpsStore";
import { useState, useEffect, useRef, useCallback } from "react";
import { formatCompact, shortAddress } from "@/lib/utils/geo";
import { motion } from "framer-motion";

import { ReactNode } from "react";
import { ProcessedBlock } from "@/hooks/useBlockStream";

// ——— Premium HUD Stat Card (Corner Bracket Style with Live Sparkline) ———
const SPARKLINE_LENGTH = 16; // Number of bars in the sparkline

function StatCard({ label, value, sub, colorClass = "text-cyan-400", borderColor = "#22d3ee" }: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  colorClass?: string;
  borderColor?: string;
}) {
  const isIdle = value === 0 || value === "0" || value === "—";
  const isTps = label.toUpperCase().includes("TPS") || label.toUpperCase().includes("ACTIVE TX");
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glitchKey, setGlitchKey] = useState(0);

  // --- Rolling sparkline history ---
  // Stores normalized bar heights (0-1). Shifts left on each tick.
  const [bars, setBars] = useState<number[]>(() => Array(SPARKLINE_LENGTH).fill(0.05));
  const prevValueRef = useRef<string>(String(value));

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(prev => {
        const currentStr = String(value);
        const prevStr = prevValueRef.current;
        
        // Determine activity: did the value change since last tick?
        const changed = currentStr !== prevStr;
        prevValueRef.current = currentStr;

        let newBar: number;
        if (changed) {
          // BIG spike when data changed — randomize height between 0.5 and 1.0
          newBar = 0.5 + Math.random() * 0.5;
        } else {
          // No change this tick — completely flat baseline (datar)
          newBar = 0.02;
        }

        return [...prev.slice(1), newBar];
      });
    }, isHovered ? 150 : 600); // Much faster tick when hovered for dramatic wave

    return () => clearInterval(interval);
  }, [value, isIdle, isHovered]);

  // Specific TV Glitch effect ONLY for Live TPS card
  const [tpsGlitch, setTpsGlitch] = useState(false);

  useEffect(() => {
    if (!isTps) return;
    const interval = setInterval(() => {
      setTpsGlitch(true);
      setTimeout(() => setTpsGlitch(false), 250);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTps]);

  // Hover handlers
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setGlitchKey(prev => prev + 1);
  }, []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const displayValue = value;

  return (
    <motion.div
      layout
      className="relative min-w-[160px] group cursor-default pointer-events-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        overflow: "visible",
        background: isIdle
          ? "linear-gradient(to right, rgba(0,0,0,0.3), rgba(0,0,0,0.1), transparent)"
          : "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.15), transparent)",
      }}
    >
      {/* \u2014\u2014\u2014 TRON ENERGY BORDER (Neon Racing Light) \u2014\u2014\u2014 */}
      <div
        style={{
          position: "absolute",
          inset: "-1px",
          background: isHovered
            ? `conic-gradient(from var(--tron-angle, 0deg), transparent 50%, ${borderColor} 78%, transparent 100%)`
            : "transparent",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "2px",
          animation: isHovered ? "tron-spin 1.5s linear infinite" : "none",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
          zIndex: 20,
        }}
      />

      {/* Hover glow backdrop */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: borderColor,
          opacity: isHovered ? 0.06 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      />

      {/* Background Pulse for Idle */}
      {isIdle && (
        <motion.div
          animate={{ opacity: [0, 0.05, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, background: borderColor }}
        />
      )}

      {/* Top-Left Corner Bracket ⌐ */}
      <motion.div
        animate={isIdle ? { opacity: [0.4, 0.9, 0.4] } : { opacity: 0.8 }}
        transition={isIdle ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
        style={{
          position: "absolute", top: 0, left: 0, width: "12px", height: "12px",
          borderTop: `2px solid ${borderColor}`, borderLeft: `2px solid ${borderColor}`,
          transition: "opacity 0.3s",
        }}
        className="group-hover:opacity-100"
      />

      {/* Bottom-Right Corner Bracket ¬ */}
      <motion.div
        animate={isIdle ? { opacity: [0.4, 0.9, 0.4] } : { opacity: 0.8 }}
        transition={isIdle ? { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 } : {}}
        style={{
          position: "absolute", bottom: 0, right: 0, width: "12px", height: "12px",
          borderBottom: `2px solid ${borderColor}`, borderRight: `2px solid ${borderColor}`,
          transition: "opacity 0.3s",
        }}
        className="group-hover:opacity-100"
      />

      {/* Content wrapper */}
      <div
        className="relative z-10 flex flex-col items-start text-left"
        style={{ padding: "14px 24px 20px 18px" }}
      >
        <p
          className="text-[9px] font-mono uppercase tracking-widest"
          style={{
            color: isHovered ? borderColor : "rgba(255,255,255,0.5)",
            transition: "color 0.3s",
            textShadow: isHovered ? `0 0 8px ${borderColor}40` : "none",
          }}
        >
          {label}
        </p>

        <div className="flex items-baseline gap-2 mt-1">
          <motion.p
            key={`${String(value)}-${glitchKey}`}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-xl font-bold font-display tracking-wider relative inline-block
              ${isIdle && !tpsGlitch ? "text-white/80" : colorClass}
              ${tpsGlitch ? "tv-glitch" : ""}
              ${isHovered && !tpsGlitch ? "stat-glitch-active" : ""}
            `}
            data-text={displayValue}
            style={{
              textShadow: isHovered ? `0 0 12px ${borderColor}80, 0 0 24px ${borderColor}30` : "none",
              transition: "text-shadow 0.3s",
            }}
          >
            {displayValue}
          </motion.p>
          {isIdle && (
            <span className="text-[8px] font-mono text-white/60 uppercase tracking-widest">
              Awaiting
            </span>
          )}
        </div>

        {sub && (
          <p
            className="text-[9px] font-mono tracking-wider mt-1 uppercase"
            style={{
              color: isHovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)",
              transition: "color 0.3s",
            }}
          >
            {sub}
          </p>
        )}

        {/* ——— ALWAYS-ON REACTIVE SPARKLINE ——— */}
        <div
          className="absolute bottom-[6px] left-4 right-6 flex items-end gap-[2px] pointer-events-none"
          style={{ height: "14px" }}
        >
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(h * 100, 4)}%`,
                background: borderColor,
                opacity: isIdle ? 0.3 + h * 0.4 : 0.4 + h * 0.6,
                borderRadius: "1px",
                transition: "height 0.4s ease-out, opacity 0.4s ease-out",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ——— Whale Alert Ticker Bar ———
function WhaleTicker() {
  const { alerts } = useWhaleAlerts();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-10 bg-red-950/20 backdrop-blur-md border-t border-red-500/30 shadow-[0_-5px_20px_rgba(239,68,68,0.1)] z-50 flex items-center pointer-events-auto">
      {/* Label Kiri */}
      <div className="shrink-0 px-4 border-r border-red-500/30 h-full flex items-center bg-red-500/5">
        <span className="text-red-400 text-[10px] font-mono font-bold tracking-widest animate-pulse drop-shadow-[0_0_5px_#ef4444]">
          WHALE RADAR
        </span>
      </div>

      {/* Scrolling text */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-red-950/40 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-red-950/40 to-transparent z-10 pointer-events-none" />

        <div className="ticker-scroll flex gap-12 text-[11px] font-mono text-red-300/80 tracking-wide items-center h-full">
          {[...alerts, ...alerts].map((a, i) => (
            <span key={i} className="shrink-0 flex items-center gap-2">
              <span className="text-red-500">◆</span>
              <span className="text-white/50">{shortAddress(a.from)}</span>
              <span className="text-red-500/50">→</span>
              <span className="text-white/50">{shortAddress(a.to)}</span>
              <span className="font-bold text-red-400 ml-1">{a.amountFormatted} STT</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ——— Main Page ———
export default function DashboardPage() {
  const { stats } = useNetworkStats();
  const { alerts: whaleAlerts } = useWhaleAlerts();

  // Read INSTANT network state from global store (Bypassing slow contracts for the demo)
  const visualTps = useTpsStore((state) => state.visualTps);
  const recentBlocks = useTpsStore((state) => state.recentBlocks);
  const sessionTotalTx = useTpsStore((state) => state.sessionTotalTx);
  const sessionGasBurned = useTpsStore((state) => state.sessionGasBurned);
  const sessionWhales = useTpsStore((state) => state.sessionWhales);

  // --- DEBUG TOOL ---
  const injectMockBlock = () => {
    const mockBlock: ProcessedBlock = {
      number: 999000000 + Math.floor(Math.random() * 1000), // Fake high block number
      hash: "0x" + Math.random().toString(16).slice(2, 40) + "mock",
      txCount: Math.floor(Math.random() * 20) + 1, // Generate 1-20 TXs to test all 3 colors
      timestamp: Date.now(),
      gasUsed: BigInt(Math.floor(Math.random() * 20_000_000) + 1_000_000), // Fake 1M-21M gas
      transactions: Array.from({ length: 5 }, () => "0x" + Math.random().toString(16).slice(2, 40)),
    };

    // Inject directly into the store so the Sidebar picks it up as a "new" block
    const store = useTpsStore.getState();
    store.setRecentBlocks([mockBlock, ...store.recentBlocks].slice(0, 15));
  };
  // ------------------

  return (
    <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">


      {/* Corner Accents (screen edges) */}
      <div className="absolute top-0 left-0 w-40 h-40 border-t border-l border-red-500/30 z-30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-40 h-40 border-b border-r border-red-500/30 z-30 pointer-events-none" />

      {/* ——— Vertical Telemetry (Left Edge) ——— */}
      <div className="absolute top-36 left-8 flex flex-col z-30 pointer-events-none opacity-50" style={{ gap: "56px" }}>
        <div className="flex flex-col items-center gap-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">Network Status</span>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${recentBlocks.length > 0 ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-red-500"}`} />
            <span className={`text-[11px] font-bold tracking-[0.2em] font-mono ${recentBlocks.length > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {recentBlocks.length > 0 ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">Session TX</span>
          <span className="text-[11px] font-bold tracking-[0.2em] font-mono text-purple-400">
            {sessionTotalTx > 0 ? `#${(sessionTotalTx * 123).toString().substring(0, 6)}` : "AWAITING"}
          </span>
        </div>
      </div>

      {/* ——— Foreground UI Elements ——— */}
      <div className="absolute inset-0 z-30 pointer-events-none">

        {/* HUD Stats Cards (Bottom Left) */}
        <div
          className="absolute pointer-events-auto"
          style={{ bottom: "24px", left: "40px", display: "flex", flexWrap: "wrap", gap: "24px" }}
        >
          <StatCard
            label="Total TX"
            value={formatCompact(sessionTotalTx)}
            sub="Current Session"
            colorClass="text-purple-400"
            borderColor="#a855f7"
          />
          <StatCard
            label="Active TX"
            value={
              visualTps > 0
                ? visualTps
                : "—"
            }
            sub="On-Chain TX"
            colorClass="text-indigo-400"
            borderColor="#818cf8"
          />
          <StatCard
            label="Gas Burned"
            value={formatCompact(Number(sessionGasBurned))}
            sub="Total Computation"
            colorClass="text-yellow-400"
            borderColor="#eab308"
          />
          <StatCard
            label="Whales"
            value={whaleAlerts.length + sessionWhales}
            sub="Detected Activity"
            colorClass="text-red-400"
            borderColor="#ef4444"
          />
        </div>

        {/* ——— Whale Ticker (Bottom Edge) ——— */}
        <WhaleTicker />

        {/* DEBUG BUTTONS */}
        <div className="absolute right-8 bottom-[520px] pointer-events-auto flex flex-col gap-2">
          <button
            onClick={injectMockBlock}
            className="px-4 py-2 bg-purple-600/30 border border-purple-500/50 text-purple-200 text-xs font-mono rounded hover:bg-purple-500/50 transition-colors backdrop-blur-sm"
          >
            [DEBUG] Inject Mock Block
          </button>
          <button
            onClick={() => useTpsStore.getState().incrementSessionWhales()}
            className="px-4 py-2 bg-red-600/30 border border-red-500/50 text-red-200 text-xs font-mono rounded hover:bg-red-500/50 transition-colors backdrop-blur-sm"
          >
            🐋 [DEBUG] Inject Whale Alert
          </button>
        </div>
      </div>

    </div>
  );
}
