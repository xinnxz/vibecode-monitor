"use client";

// components/layout/Navbar.tsx
// ============================================================
// Header utama SomniaScan — Clean, spacious Sci-Fi navigation.
// NOTE: Using inline styles for spacing because Tailwind v4
// @layer utilities have lower specificity than unlayered CSS.
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
          gap: "56px",
          marginRight: "16px",
        }}
      >
        {/* Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "48px" }}>
          {NAV_LINKS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  position: "relative",
                  padding: "4px 4px 12px 4px",
                  fontSize: "14px",
                  transition: "color 0.2s",
                  color: isActive ? "white" : "rgba(255,255,255,0.5)",
                  fontWeight: isActive ? 500 : 400,
                  textDecoration: "none",
                }}
              >
                {/* Active indicator — top line */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-top"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "3px",
                      background: "#9D00FF",
                      boxShadow: "0 0 12px #9D00FF",
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
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
