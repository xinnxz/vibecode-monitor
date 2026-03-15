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
      className="relative bg-gradient-to-r from-black/60 via-black/20 to-transparent min-w-[160px] group hover:from-white/10 hover:to-transparent transition-all cursor-default pointer-events-auto"
    >
      {/* Edge Accent Glow */}
      <div
        className={`absolute left-0 top-0 bottom-0 ${bgAccent} opacity-80 group-hover:opacity-100 transition-opacity`}
        style={{ width: '2px' }}
      />

      {/* Content wrapper */}
      <div
        className="relative z-10 flex flex-col items-start text-left py-3"
        style={{ paddingLeft: '8px', paddingRight: '20px' }}
      >
        <p className="text-[9px] font-mono text-white/50 uppercase tracking-widest">{label}</p>
        <motion.p
          key={String(value)}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className={`text-xl font-bold font-display tracking-wider ${colorClass} text-shadow-glow mt-0.5`}
        >
          {value}
        </motion.p>
        {sub && <p className="text-[9px] text-white/30 font-mono tracking-wider mt-0.5 uppercase">{sub}</p>}
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
    <div className="fixed inset-0 bg-[#010204] p-2 md:p-6 lg:p-8">

      {/* ——— HUD Viewfinder Frame (Mass Effect Style) ——— */}
      <div className="relative w-full h-full rounded-[2rem] border border-white/10 overflow-hidden bg-black/50 shadow-[0_0_50px_rgba(0,0,0,0.5)_inset,0_0_0_1px_rgba(255,255,255,0.02)]">

        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-32 h-32 border-t border-l border-red-500/30 rounded-tl-[2rem] z-0 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b border-r border-red-500/30 rounded-br-[2rem] z-0 pointer-events-none" />

        {/* ——— Vertical Telemetry (Left Edge) ——— */}
        <div className="absolute top-32 left-6 flex flex-col gap-12 z-20 pointer-events-none opacity-50">
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

        {/* ——— Navbar (Absolute within Frame) ——— */}
        <Navbar />

        {/* ——— Main 3D Environment ——— */}
        <main className="absolute inset-0 z-0">
          <div className="w-full h-full mix-blend-screen">
            <GlobeScene />
          </div>

          {/* Cinematic Vignette Overlay */}
          <div className="absolute inset-0 vignette pointer-events-none z-0" />
        </main>

        {/* ——— Foreground UI Elements ——— */}
        <div className="absolute inset-0 z-10 pointer-events-none">

          {/* HUD Stats Cards (Bottom Left inside frame) */}
          <div className="absolute bottom-6 left-6 flex flex-wrap gap-4 pointer-events-auto">
            <StatCard
              label="Total TX"
              value={formatCompact(stats.totalTransactions)}
              sub="All Time"
              colorClass="text-purple-400"
              bgAccent="bg-purple-500"
            />
            <StatCard
              label="Live TPS"
              value={tps > 0 ? tps : "—"}
              sub="Transactions/Sec"
              colorClass="text-indigo-400"
              bgAccent="bg-indigo-500"
            />
            <StatCard
              label="Wallets"
              value={formatCompact(stats.uniqueAddressCount)}
              sub="Unique Tracking"
              colorClass="text-blue-400"
              bgAccent="bg-blue-600"
            />
            <StatCard
              label="Whales"
              value={whaleAlerts.length}
              sub="Detected Anomaly"
              colorClass="text-red-400"
              bgAccent="bg-red-500"
            />
          </div>

          {/* ——— Sidebar (Floating Panel Right) ——— */}
          <div className="pointer-events-auto">
            <Sidebar />
          </div>

          {/* ——— Whale Ticker (Bottom Edge inside frame) ——— */}
          <WhaleTicker />
        </div>

      </div>
    </div>
  );
}
