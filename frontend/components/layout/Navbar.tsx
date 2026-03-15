"use client";

// components/layout/Navbar.tsx
// ============================================================
// Header utama SomniaScan — Clean, spacious Sci-Fi navigation.
// ============================================================

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/ui/WalletButton";

const NAV_LINKS = [
  { href: "/", label: "Globe" },
  { href: "/explorer", label: "Explorer" },
  { href: "/whales", label: "Whales" },
  { href: "/alerts", label: "Alerts" },
  { href: "/portfolio", label: "Portfolio" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* 
        Navbar inner container:
        - py-6 = vertical breathing room
        - px-12 = generous horizontal padding
        - items-center = vertically aligned logo + nav
      */}
      <div className="flex items-center justify-between px-12 py-6">

        {/* ——— LEFT: Logo ——— */}
        <div className="pointer-events-auto ml-4 mt-2">
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
        <div className="pointer-events-auto flex items-center gap-16">

          {/* Nav Links — generous gap-16 for spacious feel */}
          <nav className="flex items-center gap-14">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-1 pt-1 pb-3 text-sm transition-colors ${
                    isActive
                      ? "text-white font-medium"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {/* Active indicator — top line */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-top"
                      className="absolute top-0 left-0 right-0 h-[3px] bg-[#9D00FF] shadow-[0_0_12px_#9D00FF]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Wallet Pill — separated by a subtle divider */}
          <div className="pl-8 border-l border-white/10">
            <WalletButton />
          </div>
        </div>

      </div>
    </header>
  );
}
