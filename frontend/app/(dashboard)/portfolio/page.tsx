"use client";
// app/(dashboard)/portfolio/page.tsx
// ============================================================
// Portfolio — tampilkan statistik wallet di Somnia Testnet.
//
// Fitur:
// - Input address wallet (atau auto-load dari connected wallet)
// - Stats: TX count, total volume, first seen, active since
// - SBT level badge (berdasarkan activity level dari ScopeRegistry)
// - Network stats overview
// ============================================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { useBlockStream } from "@/hooks/useBlockStream";
import { shortAddress, formatCompact } from "@/lib/utils/geo";

// ——— SBT Level berdasarkan tx count ———
function sbtLevel(txCount: number): { level: string; title: string; color: string; icon: string; minTx: number } {
  if (txCount >= 10000) return { level: "5",  title: "Omniscient",  color: "text-yellow-300",  icon: "👁️",  minTx: 10000 };
  if (txCount >= 1000)  return { level: "4",  title: "Oracle",      color: "text-purple-300",  icon: "🔮",  minTx: 1000 };
  if (txCount >= 100)   return { level: "3",  title: "Navigator",   color: "text-cyan-300",    icon: "🧭",  minTx: 100 };
  if (txCount >= 10)    return { level: "2",  title: "Explorer",    color: "text-emerald-300", icon: "🚀",  minTx: 10 };
  return                       { level: "1",  title: "Observer",    color: "text-white/60",    icon: "🔭",  minTx: 1 };
}

// ——— Stat Card ———
function StatCard({ label, value, icon, color = "text-white" }: {
  label: string; value: string; icon: string; color?: string;
}) {
  return (
    <div className="glass rounded-xl p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-xl font-bold font-mono ${color}`}
      >
        {value}
      </motion.p>
      <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

// ——— Wallet Search ———
function AddressSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [input, setInput] = useState(value);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.match(/^0x[a-fA-F0-9]{40}$/)) onChange(input);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="0x... Enter wallet address"
        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:border-purple-500/50 outline-none focus:ring-1 focus:ring-purple-500/30 placeholder:text-white/20"
      />
      <button
        type="submit"
        className="px-4 py-2.5 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 font-mono text-sm font-bold hover:bg-purple-600/50 transition-colors"
      >
        Look Up
      </button>
    </form>
  );
}

export default function PortfolioPage() {
  const { address: connectedAddress, isConnected } = useWallet();
  const { stats } = useNetworkStats();
  const { recentBlocks } = useBlockStream();
  const [targetAddress, setTargetAddress] = useState("");

  // Auto-load connected wallet
  useEffect(() => {
    if (isConnected && connectedAddress) {
      setTargetAddress(connectedAddress);
    }
  }, [isConnected, connectedAddress]);

  // Hitung tx count simulasi dari recentBlocks (karena belum ada indexer)
  const approxTxCount = recentBlocks.reduce((sum, b) => sum + b.txCount, 0);
  const sbr = sbtLevel(stats.totalTransactions > 0 ? Math.floor(stats.totalTransactions / 1000) : 0);

  return (
    <div className="p-6 pb-12">
      {/* ——— Header ——— */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">💼</span>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          {isConnected && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              {shortAddress(connectedAddress ?? "")}
            </span>
          )}
        </div>
        <p className="text-white/40 text-sm font-mono ml-11">
          Wallet activity & Soulbound Token level on Somnia Testnet
        </p>
      </div>

      {/* ——— Address Search ——— */}
      <div className="mb-6">
        <AddressSearch value={targetAddress} onChange={setTargetAddress} />
        {!isConnected && (
          <p className="text-xs font-mono text-white/30 mt-2 ml-1">
            💡 Connect wallet to auto-load your address
          </p>
        )}
      </div>

      {targetAddress ? (
        <>
          {/* ——— Wallet Header ——— */}
          <div className="glass rounded-xl p-5 mb-6 flex items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-2xl font-bold shrink-0">
              {targetAddress.slice(2, 4).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm text-white/60 mb-0.5">Wallet Address</p>
              <p className="font-mono text-white font-bold truncate">{targetAddress}</p>
              <p className="font-mono text-xs text-white/30 mt-0.5">Somnia Testnet</p>
            </div>
            {/* SBT Badge */}
            <div className="shrink-0 text-center glass-purple rounded-xl px-4 py-3">
              <div className="text-3xl mb-1">{sbr.icon}</div>
              <p className={`font-mono font-bold text-sm ${sbr.color}`}>{sbr.title}</p>
              <p className="text-[10px] font-mono text-white/30">SBT Lv.{sbr.level}</p>
            </div>
          </div>

          {/* ——— Network Stats (global, sebagai proxy sampai ada indexer) ——— */}
          <div className="mb-4">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">
              Somnia Testnet — Global Stats
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total TX" value={formatCompact(stats.totalTransactions)} icon="⚡" color="text-purple-400" />
              <StatCard label="Total Volume" value={`${formatCompact(Math.floor(Number(stats.totalVolume) / 1e18))} STT`} icon="💎" color="text-cyan-400" />
              <StatCard label="Unique Wallets" value={formatCompact(stats.uniqueAddressCount)} icon="👤" color="text-emerald-400" />
              <StatCard label="Avg TPS" value={stats.averageTps > 0 ? stats.averageTps.toFixed(1) : "—"} icon="🚀" color="text-yellow-400" />
            </div>
          </div>

          {/* ——— SBT Progress ——— */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-mono text-white/60 uppercase tracking-wider mb-4">
              SoulBound Token Progress
            </h3>
            <div className="space-y-3">
              {[
                { level: "1", title: "Observer",   icon: "🔭",  minTx: 1,     color: "bg-white/20" },
                { level: "2", title: "Explorer",   icon: "🚀",  minTx: 10,    color: "bg-emerald-500" },
                { level: "3", title: "Navigator",  icon: "🧭",  minTx: 100,   color: "bg-cyan-500" },
                { level: "4", title: "Oracle",     icon: "🔮",  minTx: 1000,  color: "bg-purple-500" },
                { level: "5", title: "Omniscient", icon: "👁️",  minTx: 10000, color: "bg-yellow-400" },
              ].map((lvl) => {
                const achieved = stats.totalTransactions >= lvl.minTx * 1000;
                return (
                  <div key={lvl.level} className="flex items-center gap-3">
                    <span className="text-lg w-7">{lvl.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className={achieved ? "text-white" : "text-white/40"}>
                          Lv.{lvl.level} — {lvl.title}
                        </span>
                        <span className="text-white/30">{formatCompact(lvl.minTx * 1000)} TX</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${achieved ? lvl.color : "bg-white/10"}`}
                          style={{ width: achieved ? "100%" : `${Math.min((stats.totalTransactions / (lvl.minTx * 1000)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    {achieved && <span className="text-emerald-400 text-xs font-mono">✓</span>}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] font-mono text-white/20 mt-4 text-center">
              * SBT levels based on global network activity until indexer is deployed
            </p>
          </div>
        </>
      ) : (
        <div className="glass rounded-xl flex flex-col items-center justify-center py-20 text-white/30">
          <div className="text-5xl mb-4 opacity-40">💼</div>
          <p className="font-mono text-sm">Enter a wallet address above</p>
          <p className="font-mono text-xs mt-1">or connect your wallet</p>
        </div>
      )}
    </div>
  );
}
