"use client";

// app/page.tsx
// ============================================================
// Dashboard utama SomniaScan — "Mission Control Center"
// Redesigned with premium Glassmorphism & Cyberpunk aesthetics.
// ============================================================

import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useBlockStream } from "@/hooks/useBlockStream";
import { useWhaleAlerts } from "@/hooks/useWhaleAlerts";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { formatCompact, shortAddress } from "@/lib/utils/geo";
import { motion } from "framer-motion";

// Dynamic import for GlobeScene to prevent SSR
const GlobeScene = dynamic(
  () => import("@/components/globe/GlobeScene").then((m) => ({ default: m.GlobeScene })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full bg-[#010306]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/5 border-t-purple-500 animate-spin mx-auto mb-6 shadow-[0_0_15px_#a855f7]" />
          <p className="text-purple-400 font-mono text-xs tracking-widest uppercase animate-pulse">Initializing Telemetry...</p>
        </div>
      </div>
    ),
  }
);

// ——— Premium HUD Stat Card (Corner Bracket Style) ———
function StatCard({ label, value, sub, colorClass = "text-cyan-400", borderColor = "#22d3ee" }: {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
  borderColor?: string;
}) {
  return (
    <motion.div
      layout
      className="relative min-w-[160px] group cursor-default pointer-events-auto"
      style={{
        background: "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.15), transparent)",
      }}
    >
      {/* Top-Left Corner Bracket ⌐ */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "12px",
          height: "12px",
          borderTop: `2px solid ${borderColor}`,
          borderLeft: `2px solid ${borderColor}`,
          opacity: 0.7,
          transition: "opacity 0.3s",
        }}
        className="group-hover:opacity-100"
      />

      {/* Bottom-Right Corner Bracket ¬ */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "12px",
          height: "12px",
          borderBottom: `2px solid ${borderColor}`,
          borderRight: `2px solid ${borderColor}`,
          opacity: 0.7,
          transition: "opacity 0.3s",
        }}
        className="group-hover:opacity-100"
      />

      {/* Content wrapper */}
      <div
        className="relative z-10 flex flex-col items-start text-left"
        style={{ padding: "14px 24px 14px 18px" }}
      >
        <p className="text-[9px] font-mono text-white/50 uppercase tracking-widest">{label}</p>
        <motion.p
          key={String(value)}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className={`text-xl font-bold font-display tracking-wider ${colorClass} mt-1`}
        >
          {value}
        </motion.p>
        {sub && <p className="text-[9px] text-white/30 font-mono tracking-wider mt-1 uppercase">{sub}</p>}
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
  const { tps } = useBlockStream();
  const { stats } = useNetworkStats();
  const { alerts: whaleAlerts } = useWhaleAlerts();

  return (
    <div className="fixed inset-0 bg-[#010204] overflow-hidden">

        {/* Corner Accents (screen edges) */}
        <div className="absolute top-0 left-0 w-40 h-40 border-t border-l border-red-500/30 z-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-40 h-40 border-b border-r border-red-500/30 z-30 pointer-events-none" />

        {/* ——— Vertical Telemetry (Left Edge) ——— */}
        <div className="absolute top-36 left-8 flex flex-col z-20 pointer-events-none opacity-50" style={{ gap: "56px" }}>
          <div className="flex flex-col items-center gap-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">Network Status</span>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${tps > 0 ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-red-500"}`} />
              <span className={`text-[11px] font-bold tracking-[0.2em] font-mono ${tps > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {tps > 0 ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">Block Hash</span>
            <span className="text-[11px] font-bold tracking-[0.2em] font-mono text-purple-400">
              {stats.totalTransactions > 0 ? `#${(stats.totalTransactions * 123).toString().substring(0, 6)}` : "AWAITING"}
            </span>
          </div>
        </div>

        {/* ——— Navbar ——— */}
        <Navbar />

        {/* ——— Main 3D Environment (Full Screen) ——— */}
        <main className="absolute inset-0 z-0">
          <div className="w-full h-full mix-blend-screen">
            <GlobeScene />
          </div>

          {/* Cinematic Vignette Overlay */}
          <div className="absolute inset-0 vignette pointer-events-none z-0" />
        </main>

        {/* ——— Foreground UI Elements ——— */}
        <div className="absolute inset-0 z-10 pointer-events-none">

          {/* HUD Stats Cards (Bottom Left) */}
          <div
            className="absolute pointer-events-auto"
            style={{ bottom: "40px", left: "40px", display: "flex", flexWrap: "wrap", gap: "24px" }}
          >
            <StatCard
              label="Total TX"
              value={formatCompact(stats.totalTransactions)}
              sub="All Time"
              colorClass="text-purple-400"
              borderColor="#a855f7"
            />
            <StatCard
              label="Live TPS"
              value={tps > 0 ? tps : "—"}
              sub="Transactions/Sec"
              colorClass="text-indigo-400"
              borderColor="#818cf8"
            />
            <StatCard
              label="Wallets"
              value={formatCompact(stats.uniqueAddressCount)}
              sub="Unique Tracking"
              colorClass="text-blue-400"
              borderColor="#3b82f6"
            />
            <StatCard
              label="Whales"
              value={whaleAlerts.length}
              sub="Detected Anomaly"
              colorClass="text-red-400"
              borderColor="#ef4444"
            />
          </div>

          {/* ——— Sidebar (Floating Panel Right) ——— */}
          <div className="pointer-events-auto">
            <Sidebar />
          </div>

          {/* ——— Whale Ticker (Bottom Edge) ——— */}
          <WhaleTicker />
        </div>

    </div>
  );
}
