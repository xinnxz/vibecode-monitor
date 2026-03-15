"use client";

// components/ui/WalletButton.tsx
// ============================================================
// Tombol connect/disconnect wallet dengan desain floating pill.
// ============================================================

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { motion } from "framer-motion";

export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const {
    shortAddress,
    isConnected,
    isConnecting,
    isCorrectChain,
    isSwitching,
    connectWallet,
    disconnectWallet,
    switchToSomnia,
  } = useWallet();

  // Prevent SSR Hydration Error by rendering a fallback until mounted on client
  if (!mounted) {
    return (
      <button disabled className="flex items-center gap-2 px-5 py-3 glass-pill text-white/50 text-xs font-mono font-bold cursor-not-allowed">
        <span className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
        Syncing...
      </button>
    );
  }

  // ——— State: Menghubungkan ———
  if (isConnecting) {
    return (
      <button disabled className="flex items-center gap-2 px-5 py-3 glass-pill text-purple-300 text-xs font-mono font-bold cursor-not-allowed">
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_#a855f7]" />
        Connecting...
      </button>
    );
  }

  // ——— State: Connected tapi chain salah ———
  if (isConnected && !isCorrectChain) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={switchToSomnia}
        disabled={isSwitching}
        className="flex items-center gap-2 px-5 py-3 glass-pill bg-yellow-900/20 border-yellow-500/30 text-yellow-300 text-xs font-mono font-bold hover:bg-yellow-900/40 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_8px_#eab308]" />
        {isSwitching ? "Switching..." : "⚠ Switch to Somnia"}
      </motion.button>
    );
  }

  // ——— State: Connected di chain yang benar ———
  if (isConnected && shortAddress) {
    return (
      <div className="flex items-center glass-pill" style={{ padding: "6px 8px" }}>
        {/* Badge alamat */}
        <div className="flex items-center border-r border-white/5" style={{ gap: "12px", padding: "10px 20px" }}>
          <div className="relative flex items-center justify-center">
             <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
             <span className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-60" />
          </div>
          <span className="text-xs font-mono font-bold text-emerald-300">{shortAddress}</span>
        </div>

        {/* Tombol disconnect (Clean icon) */}
        <motion.button
          whileHover={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
          whileTap={{ scale: 0.95 }}
          onClick={disconnectWallet}
          className="px-3 py-2 rounded-full text-white/40 hover:text-red-400 transition-colors group"
          title="Disconnect"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
            <line x1="12" y1="2" x2="12" y2="12"></line>
          </svg>
        </motion.button>
      </div>
    );
  }

  // ——— State: Disconnected ———
  return (
    <motion.button
      whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(192, 132, 252, 0.3)" }}
      whileTap={{ scale: 0.98 }}
      onClick={connectWallet}
      className="flex items-center gap-2 px-5 py-3 glass-pill hover:bg-white/10 text-white text-xs font-mono font-bold transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
        <circle cx="16" cy="12" r="1"/>
      </svg>
      Connect Wallet
    </motion.button>
  );
}
