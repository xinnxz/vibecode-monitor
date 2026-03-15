"use client";

// components/layout/Navbar.tsx
// ============================================================
// Header utama SomniaScan — Clean, spacious Sci-Fi navigation.
// NOTE: Using inline styles for spacing because Tailwind v4
// @layer utilities have lower specificity than unlayered CSS.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// DYNAMIC IMPORT: Bypasses SSR for wagmi hooks to prevent React hydration state mismatch warnings
const WalletButton = dynamic(
  () => import("@/components/ui/WalletButton").then(mod => mod.WalletButton), 
  { ssr: false, loading: () => <div style={{ width: 160, height: 48, background: "rgba(255,255,255,0.05)", borderRadius: 4 }} /> }
);

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/explorer", label: "Explorer" },
  { href: "/whales", label: "Whales" },
  { href: "/alerts", label: "Alerts" },
  { href: "/portfolio", label: "Portfolio" },
];

const HEX = "0123456789abcdef";

function SciFiNavLink({ item, isActive }: { item: { href: string; label: string }; isActive: boolean }) {
  const [displayText, setDisplayText] = useState(item.label);
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef<number>(0);

  const triggerHoverEffect = () => {
    setIsHovered(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const target = item.label;
    const duration = 250;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const lockedLength = Math.floor(p * target.length);

      let result = "";
      for (let i = 0; i < target.length; i++) {
        result += i < lockedLength ? target[i] : HEX[Math.floor(Math.random() * 16)];
      }

      setDisplayText(result);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayText(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setDisplayText(item.label);
  };

  return (
    <Link
      href={item.href}
      onMouseEnter={triggerHoverEffect}
      onMouseLeave={handleMouseLeave}
      className="relative group flex items-center justify-center p-2 isolate"
      style={{ textDecoration: "none" }}
    >
      {/* Sci-Fi Brackets (Only visible on hover or active) */}
      <motion.div
        initial={false}
        animate={{
          opacity: isActive || isHovered ? 1 : 0,
          scale: isActive || isHovered ? 1 : 0.9,
        }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-purple-500/80 rounded-tl-[2px]" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-purple-500/80 rounded-br-[2px]" />
      </motion.div>

      {/* Background glow on hover */}
      <motion.div
        initial={false}
        animate={{ opacity: isHovered && !isActive ? 1 : 0 }}
        className="absolute inset-0 bg-purple-500/5 blur-md -z-10"
      />

      <span
        className={`font-mono text-[13px] tracking-widest uppercase transition-colors duration-300 ${isActive
          ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          : isHovered
            ? "text-purple-300"
            : "text-white/40"
          }`}
      >
        {displayText}
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "28px 40px", // Aligned perfectly with Sidebar's 40px right margin
        pointerEvents: "none",
      }}
    >
      {/* ——— LEFT: Logo ——— */}
      <div style={{ pointerEvents: "auto", marginTop: "4px" }}>
        <Link href="/" className="block">
          <Image
            src="/somnia-logo.png"
            alt="SomniaScan Logo"
            width={120}
            height={50}
            className="object-contain drop-shadow-md"
            priority
          />
        </Link>
      </div>

      {/* ——— RIGHT: Navigation & Wallet ——— */}
      <div
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: "40px", 
        }}
      >
        {/* Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {NAV_LINKS.map((item) => (
            <SciFiNavLink key={item.href} item={item} isActive={pathname === item.href} />
          ))}
        </nav>

        {/* Divider placed exactly in the center of the gap */}
        <div style={{ height: "30px", width: "1px", backgroundColor: "rgba(255,255,255,0.1)" }} />

        {/* Wallet Pill Container */}
        <div
          style={{
            width: "220px", // Fixed container to isolate button jitter
            display: "flex",
            justifyContent: "flex-end", // Button expands outwards to the left instead of shifting the layout
          }}
        >
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
