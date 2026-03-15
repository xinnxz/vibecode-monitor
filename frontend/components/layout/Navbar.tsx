"use client";

// components/layout/Navbar.tsx
// ============================================================
// Header utama SomniaScan — tampilan "Mission Control HUD".
// Redesigned with a floating "Dynamic Island" glassmorphism style.
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/ui/WalletButton";
import { useBlockStream } from "@/hooks/useBlockStream";
import { formatCompact } from "@/lib/utils/geo";

const NAV_LINKS = [
  { href: "/", label: "Globe" },
  { href: "/explorer", label: "Explorer" },
  { href: "/whales", label: "Whales" },
  { href: "/alerts", label: "Alerts" },
  { href: "/portfolio", label: "Portfolio" },
];

function HudStat({ label, value, color = "text-cyan-400" }: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col flex-1 items-center px-4 border-r border-white/10 last:border-0 min-w-[80px]">
      <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono mb-0.5">{label}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={String(value)}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
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
  const pathname = usePathname();

  return (
    <header className="fixed top-6 left-6 right-6 z-50 flex items-start justify-between pointer-events-none">
      
      {/* ——— LEFT: Logo Brand Pill ——— */}
      <div className="pointer-events-auto">
        <Link href="/">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 glass-pill px-5 py-3"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]" />
              <div className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-50" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-tight text-base leading-none">
                Somnia<span className="neon-purple">Scan</span>
              </span>
              <span className="text-[9px] text-white/40 font-mono tracking-widest mt-1">TESTNET</span>
            </div>
          </motion.div>
        </Link>
      </div>

      {/* ——— CENTER: Navigation & Live HUD ——— */}
      <div className="pointer-events-auto hidden font-mono lg:flex flex-col items-center gap-3">
        
        {/* Nav Links */}
        <nav className="flex items-center gap-1 glass-pill p-1">
          {NAV_LINKS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative block px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors"
                style={{ letterSpacing: "0.1em" }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-indigo-500/30 border border-purple-500/50 rounded-full shadow-[inset_0_0_15px_rgba(156,0,255,0.2)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Live HUD Dashboard */}
        <div className="flex items-center glass-pill px-2 py-2">
          {/* Live Indicator matched to stat height */}
          <div className="flex flex-col items-center justify-center px-4 border-r border-white/10 min-w-[60px] h-full gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"}`} />
            <span className={`text-[9px] font-bold tracking-widest ${isConnected ? "text-emerald-400" : "text-red-400"}`}>
              {isConnected ? "LIVE" : "OFF"}
            </span>
          </div>
          <HudStat label="Block" value={latestBlock ? `#${latestBlock.number.toLocaleString()}` : "—"} color="text-purple-400" />
          <HudStat label="TPS" value={tps > 0 ? formatCompact(tps) : "—"} color="text-cyan-400" />
          <HudStat label="TX/Block" value={latestBlock ? latestBlock.txCount : "—"} color="text-emerald-400" />
        </div>
      </div>

      {/* ——— RIGHT: Wallet Pill ——— */}
      <div className="pointer-events-auto">
        <WalletButton />
      </div>

    </header>
  );
}
