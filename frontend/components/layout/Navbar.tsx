"use client";

// components/layout/Navbar.tsx
// ============================================================
// Header utama SomniaScan — tampilan "Mission Control HUD".
//
// Menampilkan:
// - Logo SomniaScan + tagline
// - Live network stats (TPS, Block Height, Gas Price)
// - Indikator status koneksi ke Somnia
// - Tombol connect wallet (WalletButton)
//
// Data diambil langsung dari useBlockStream hook,
// sehingga semua angka bergerak secara realtime.
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { WalletButton } from "@/components/ui/WalletButton";
import { useBlockStream } from "@/hooks/useBlockStream";
import { formatCompact } from "@/lib/utils/geo";

// Satu unit stat di HUD (misal: "TPS: 1.2K")
function HudStat({ label, value, color = "text-cyan-400" }: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center px-3 border-r border-white/10 last:border-0">
      <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">{label}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={String(value)}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className={`text-sm font-bold font-mono ${color}`}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  const { latestBlock, tps, isConnected } = useBlockStream();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 h-14">

        {/* ——— LEFT: Logo ——— */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {/* Animated logo dot */}
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <div className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-50" />
          </div>
          <span className="font-bold text-white tracking-tight text-lg">
            Somnia<span className="text-purple-400">Scan</span>
          </span>
          <span className="hidden sm:block text-[10px] text-white/30 font-mono border border-white/10 px-1.5 py-0.5 rounded">
            TESTNET
          </span>
        </Link>

        {/* ——— CENTER: Live HUD Stats ——— */}
        <div className="hidden md:flex items-center bg-white/5 rounded-lg border border-white/10 px-1 py-1">
          {/* Status koneksi */}
          <div className="flex items-center gap-1.5 px-3 border-r border-white/10">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
            <span className={`text-[10px] font-mono ${isConnected ? "text-emerald-400" : "text-red-400"}`}>
              {isConnected ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          <HudStat
            label="Block"
            value={latestBlock ? `#${latestBlock.number.toLocaleString()}` : "—"}
            color="text-purple-400"
          />
          <HudStat
            label="TPS"
            value={tps > 0 ? formatCompact(tps) : "—"}
            color="text-cyan-400"
          />
          <HudStat
            label="TX/Block"
            value={latestBlock ? latestBlock.txCount : "—"}
            color="text-emerald-400"
          />
        </div>

        {/* ——— RIGHT: Nav Links + Wallet ——— */}
        <div className="flex items-center gap-3">
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            {[
              { href: "/", label: "Globe" },
              { href: "/explorer", label: "Explorer" },
              { href: "/whales", label: "Whales" },
              { href: "/alerts", label: "Alerts" },
              { href: "/portfolio", label: "Portfolio" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <WalletButton />
        </div>
      </div>
    </header>
  );
}
