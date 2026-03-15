"use client";

// components/layout/Navbar.tsx
// ============================================================
// Header utama SomniaScan — tampilan "Mission Control HUD".
// Redesigned with a floating "Dynamic Island" glassmorphism style.
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
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
    <header className="fixed top-0 left-0 right-0 z-50 flex items-start justify-between px-10 py-8 pointer-events-none">

      {/* ——— LEFT: Logo Brand & Live HUD ——— */}
      <div className="flex flex-col gap-6 pointer-events-auto">
        <Link href="/">
          <div className="flex items-center gap-4">
            {/* User Custom Logo */}
            <div className="flex items-center" style={{ marginLeft: "28px", marginTop: "12px" }}>
              <Image
                src="/somnia-logo.png"
                alt="SomniaScan Logo"
                width={120}
                height={50}
                className="object-contain pointer-events-none drop-shadow-md"
                priority
              />
            </div>
          </div>
        </Link>
      </div>

      {/* ——— RIGHT: Navigation & Wallet ——— */}
      <div className="pointer-events-auto flex items-center gap-12">

        {/* Nav Links (Mass Effect Style - Top Red Line Active) */}
        <nav className="flex items-center gap-12">
          {NAV_LINKS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-2 py-4 text-[15px] transition-colors font-sans ${isActive ? "text-white font-medium" : "text-white/60 hover:text-white"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-top"
                    className="absolute top-0 left-0 right-0 h-[3px] bg-[#9D00FF] shadow-[0_0_12px_#9D00FF]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="capitalize">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Wallet Pill - Kept minimal on far right */}
        <div className="pl-4 border-l border-white/10">
          <WalletButton />
        </div>

      </div>
    </header>
  );
}
