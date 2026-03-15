"use client";

// app/page.tsx
// ============================================================
// Dashboard utama SomniaScan — "Mission Control Center"
// Redesigned with premium Glassmorphism & Cyberpunk aesthetics.
// ============================================================

import dynamic from "next/dynamic";
import { Navbar }  from "@/components/layout/Navbar";
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

// ——— Premium HUD Stat Card ———
function StatCard({ label, value, sub, colorClass = "text-cyan-400", bgAccent = "bg-cyan-500" }: {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
  bgAccent?: string;
}) {
  return (
    <motion.div
      layout
      className="relative glass rounded-2xl px-5 py-4 min-w-[130px] overflow-hidden group hover:bg-white/[0.02] transition-colors"
    >
      {/* Decorative top thick border glow */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] opacity-70 ${bgAccent} shadow-[0_0_12px_currentColor]`} />
      
      {/* Soft background radial glow */}
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none ${bgAccent}`} />

      <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1.5">{label}</p>
      <motion.p
        key={String(value)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`text-2xl font-bold font-mono tracking-tight ${colorClass} drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}
      >
        {value}
      </motion.p>
      {sub && <p className="text-[9px] text-white/30 font-mono tracking-wider mt-1 uppercase">{sub}</p>}
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
    <div className="relative w-full h-dvh overflow-hidden bg-[var(--color-bg)]">

      {/* ——— Navbar (Floating Dynamic Islands) ——— */}
      <Navbar />

      {/* ——— Main 3D Environment ——— */}
      <main className="absolute inset-0">
        
        <div className="w-full h-full mix-blend-screen">
          <GlobeScene />
        </div>

        {/* Cinematic Vignette Overlay to darken edges for UI focus */}
        <div className="absolute inset-0 vignette pointer-events-none z-0" />

        {/* ——— HUD Stats Cards (Bottom Left) ——— */}
        <div className="absolute bottom-16 left-6 flex flex-wrap gap-4 z-10 pointer-events-auto">
          <StatCard
            label="Total TX"
            value={formatCompact(stats.totalTransactions)}
            sub="all time"
            colorClass="text-purple-300"
            bgAccent="bg-purple-500"
          />
          <StatCard
            label="Live TPS"
            value={tps > 0 ? tps : "—"}
            sub="transactions/sec"
            colorClass="text-cyan-300"
            bgAccent="bg-cyan-500"
          />
          <StatCard
            label="Wallets"
            value={formatCompact(stats.uniqueAddressCount)}
            sub="unique tracking"
            colorClass="text-emerald-300"
            bgAccent="bg-emerald-500"
          />
          <StatCard
            label="Whales"
            value={whaleAlerts.length}
            sub="detected anomaly"
            colorClass="text-red-300"
            bgAccent="bg-red-500"
          />
        </div>
      </main>

      {/* ——— Sidebar (Floating Panel Right) ——— */}
      {/* Pointer events bound automatically inside the component */}
      <div className="pointer-events-auto">
        <Sidebar />
      </div>

      {/* ——— Whale Ticker (Bottom Edge) ——— */}
      <WhaleTicker />
      
    </div>
  );
}
