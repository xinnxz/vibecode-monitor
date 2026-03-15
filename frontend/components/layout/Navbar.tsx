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
import { WalletButton } from "@/components/ui/WalletButton";

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
        className={`font-mono text-[13px] tracking-widest uppercase transition-colors duration-300 ${
          isActive 
            ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
            : isHovered
            ? "text-purple-300"
            : "text-white/40"
        }`}
      >
        {displayText}
      </span>

      {/* Active Top Bar Indicator */}
      {isActive && (
        <motion.div
          layoutId="active-nav-top"
          className="absolute top-0 left-0 right-0 h-[2px] bg-purple-500 shadow-[0_0_12px_#a855f7]"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
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
        padding: "28px 48px",
        pointerEvents: "none",
      }}
    >
      {/* ——— LEFT: Logo ——— */}
      <div style={{ pointerEvents: "auto", marginLeft: "16px", marginTop: "4px" }}>
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
          gap: "40px", // slightly tighter gap to fit brackets
          marginRight: "16px",
        }}
      >
        {/* Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {NAV_LINKS.map((item) => (
            <SciFiNavLink key={item.href} item={item} isActive={pathname === item.href} />
          ))}
        </nav>

        {/* Wallet Pill — separated by a subtle divider */}
        <div
          style={{
            paddingLeft: "24px",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
