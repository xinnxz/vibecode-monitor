"use client";
// app/page.tsx
// ============================================================
// Dashboard utama SomniaScan — "Mission Control Center"
//
// Layout:
//   ┌─────────────────────────────────────────┐
//   │  Navbar (fixed top 56px)               │
//   ├──────────────────────────┬──────────────┤
//   │                          │   Sidebar   │
//   │    3D Globe (full bg)    │  (256px)    │
//   │                          │             │
//   ├──────────────────────────┴──────────────┤
//   │  Whale Alert Ticker (fixed bottom 32px) │
//   └─────────────────────────────────────────┘
//
// Komponen yang digunakan:
// - Navbar      → HUD header (TPS, Block, Wallet)
// - GlobeScene  → 3D globe dengan animasi laser + whale pulse
// - Sidebar     → Live block terminal di kanan
// - HUD Overlay → Stats cards di pojok kiri bawah globe
// - WhaleTicker → Scrolling ticker bar di bagian paling bawah
// ============================================================

import dynamic from "next/dynamic";
import { Navbar }  from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useBlockStream } from "@/hooks/useBlockStream";
import { useWhaleAlerts } from "@/hooks/useWhaleAlerts";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { formatCompact, shortAddress } from "@/lib/utils/geo";
import { motion, AnimatePresence } from "framer-motion";

// Dynamic import untuk GlobeScene agar tidak di-SSR
// (Three.js tidak bisa jalan di server-side)
const GlobeScene = dynamic(
  () => import("@/components/globe/GlobeScene").then((m) => ({ default: m.GlobeScene })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-purple-400 font-mono text-sm">Initializing Globe...</p>
        </div>
      </div>
    ),
  }
);

// ——— HUD Stat Card ———
function StatCard({ label, value, sub, color = "text-cyan-400" }: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <motion.div
      layout
      className="glass rounded-lg px-4 py-3 min-w-[110px]"
    >
      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">{label}</p>
      <motion.p
        key={String(value)}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-xl font-bold font-mono ${color}`}
      >
        {value}
      </motion.p>
      {sub && <p className="text-[10px] text-white/30 font-mono mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ——— Whale Alert Ticker Bar ———
function WhaleTicker() {
  const { alerts } = useWhaleAlerts();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-red-950/80 border-t border-red-500/30 backdrop-blur-md z-50 overflow-hidden flex items-center">
      {/* Label kiri */}
      <div className="shrink-0 px-3 border-r border-red-500/30 h-full flex items-center">
        <span className="text-red-400 text-xs font-mono font-bold animate-pulse">🐋 WHALE</span>
      </div>

      {/* Scrolling text */}
      <div className="flex-1 overflow-hidden">
        <div className="ticker-scroll flex gap-12 text-xs font-mono text-red-300/80">
          {[...alerts, ...alerts].map((a, i) => (
            <span key={i} className="shrink-0">
              {shortAddress(a.from)} → {shortAddress(a.to)}&nbsp;&nbsp;{a.amountFormatted} STT
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ——— Main Page ———
export default function DashboardPage() {
  const { latestBlock, tps, recentBlocks } = useBlockStream();
  const { stats } = useNetworkStats();
  const { alerts: whaleAlerts } = useWhaleAlerts();

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#020408]">

      {/* ——— Navbar fixed di atas ——— */}
      <Navbar />

      {/* ——— Main area: Globe full screen ——— */}
      <main className="absolute inset-0 pt-14 pr-64 pb-8">
        {/* Globe mengisi seluruh area */}
        <div className="w-full h-full">
          <GlobeScene />
        </div>

        {/* Vignette overlay (pojok gelap) */}
        <div className="absolute inset-0 vignette pointer-events-none" />

        {/* ——— HUD Stats Cards (pojok kiri bawah) ——— */}
        <div className="absolute bottom-6 left-6 flex flex-wrap gap-2 z-10">
          <StatCard
            label="Total TX"
            value={formatCompact(stats.totalTransactions)}
            sub="all time"
            color="text-purple-400"
          />
          <StatCard
            label="Live TPS"
            value={tps > 0 ? tps : "—"}
            sub="transactions/sec"
            color="text-cyan-400"
          />
          <StatCard
            label="Wallets"
            value={formatCompact(stats.uniqueAddressCount)}
            sub="unique"
            color="text-emerald-400"
          />
          <StatCard
            label="🐋 Whales"
            value={whaleAlerts.length}
            sub="detected"
            color="text-red-400"
          />
        </div>

        {/* ——— Block badge pojok kiri atas ——— */}
        {latestBlock && (
          <motion.div
            key={latestBlock.number}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 left-6 flex items-center gap-2 glass rounded-lg px-3 py-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-purple-400 font-mono text-sm font-bold">
              #{latestBlock.number.toLocaleString()}
            </span>
            <span className="text-white/30 text-xs font-mono">
              {latestBlock.txCount} tx
            </span>
          </motion.div>
        )}
      </main>

      {/* ——— Sidebar di kanan ——— */}
      <Sidebar />

      {/* ——— Whale Ticker di bawah ——— */}
      <WhaleTicker />
    </div>
  );
}
