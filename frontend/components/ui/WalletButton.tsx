"use client";

// components/ui/WalletButton.tsx
// ============================================================
// Tombol connect/disconnect wallet dengan tampilan cyberpunk.
// Menampilkan 3 state berbeda:
// 1. Disconnected: tombol "Connect Wallet"
// 2. Wrong chain: tombol "Switch to Somnia" dengan warna kuning
// 3. Connected + correct chain: alamat pendek + tombol disconnect
// ============================================================

import { useWallet } from "@/hooks/useWallet";
import { motion } from "framer-motion";

export function WalletButton() {
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

  // ——— State: Menghubungkan ———
  if (isConnecting) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900/50 border border-purple-500/30 text-purple-300 text-sm font-mono cursor-not-allowed"
      >
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
        Connecting...
      </button>
    );
  }

  // ——— State: Connected tapi chain salah ———
  if (isConnected && !isCorrectChain) {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={switchToSomnia}
        disabled={isSwitching}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-900/50 border border-yellow-500/50 text-yellow-300 text-sm font-mono hover:bg-yellow-900/70 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        {isSwitching ? "Switching..." : "⚠ Switch to Somnia"}
      </motion.button>
    );
  }

  // ——— State: Connected di chain yang benar ———
  if (isConnected && shortAddress) {
    return (
      <div className="flex items-center gap-2">
        {/* Badge alamat */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-300">{shortAddress}</span>
        </div>

        {/* Tombol disconnect */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={disconnectWallet}
          className="px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-500/30 text-red-400 text-xs font-mono hover:bg-red-900/50 transition-colors"
        >
          Disconnect
        </motion.button>
      </div>
    );
  }

  // ——— State: Disconnected ———
  return (
    <motion.button
      whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)" }}
      whileTap={{ scale: 0.97 }}
      onClick={connectWallet}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors border border-purple-400/30"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
        <circle cx="16" cy="12" r="1"/>
      </svg>
      Connect Wallet
    </motion.button>
  );
}
