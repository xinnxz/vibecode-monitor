"use client";
// app/(dashboard)/explorer/page.tsx
// ============================================================
// Block Explorer — menampilkan live block feed dari Somnia Testnet.
//
// Fitur:
// - Live scrolling block list (dari useBlockStream)
// - Klik block → expand, lihat tx hashes
// - Search bar (by hash/address — disabled kalau belum ada contract)
// - Stats bar di atas: total TX, blok terbaru, TPS
// ============================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBlockStream } from "@/hooks/useBlockStream";
import { shortAddress, formatCompact } from "@/lib/utils/geo";

// ——— Satu baris block entry ———
function BlockRow({ block, index }: { block: ReturnType<typeof useBlockStream>["recentBlocks"][0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const timeAgo = Math.floor((Date.now() - block.timestamp * 1000) / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border border-white/5 rounded-lg overflow-hidden"
    >
      {/* Block header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        {/* Block number */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
          <span className="font-mono text-purple-300 font-bold text-sm">
            #{block.number.toLocaleString()}
          </span>
        </div>

        {/* TX count */}
        <div className="flex items-center gap-1.5 min-w-[80px]">
          <span className="text-xs text-white/40 font-mono">TX</span>
          <span className="text-cyan-400 font-mono text-sm font-bold">{block.txCount}</span>
        </div>

        {/* Gas */}
        <div className="flex-1 hidden sm:flex items-center gap-1.5">
          <span className="text-xs text-white/30 font-mono">gas</span>
          <span className="text-white/60 font-mono text-xs">{formatCompact(block.gasUsed)}</span>
        </div>

        {/* Time */}
        <div className="text-xs font-mono text-white/30">
          {timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`}
        </div>

        {/* Expand icon */}
        <div className={`text-white/30 transition-transform ${expanded ? "rotate-90" : ""}`}>▶</div>
      </button>

      {/* Expanded TX list */}
      <AnimatePresence>
        {expanded && block.transactions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 overflow-hidden"
          >
            <div className="px-4 py-3 max-h-64 overflow-y-auto space-y-1.5">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">
                Transactions ({block.transactions.length})
              </p>
              {block.transactions.map((hash, i) => (
                <div key={i} className="flex items-center gap-3 py-1 border-b border-white/5 last:border-0">
                  <span className="text-[10px] text-white/20 font-mono w-5">{i + 1}</span>
                  <span className="font-mono text-xs text-cyan-400/80 hover:text-cyan-400 cursor-pointer transition-colors truncate">
                    {hash}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ExplorerPage() {
  const { recentBlocks, latestBlock, tps, isConnected } = useBlockStream();

  return (
    <div className="p-6 pb-12">
      {/* ——— Page Header ——— */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🔍</span>
          <h1 className="text-2xl font-bold text-white">Block Explorer</h1>
          {isConnected && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              LIVE
            </span>
          )}
        </div>
        <p className="text-white/40 text-sm font-mono ml-11">
          Real-time blocks from Somnia Testnet via Reactivity Engine
        </p>
      </div>

      {/* ——— Stats Row ——— */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Latest Block", value: latestBlock ? `#${latestBlock.number.toLocaleString()}` : "—", color: "text-purple-400" },
          { label: "Live TPS", value: tps > 0 ? `${tps}` : "—", color: "text-cyan-400" },
          { label: "Blocks Cached", value: recentBlocks.length.toString(), color: "text-emerald-400" },
          { label: "Last TX Count", value: latestBlock?.txCount.toString() ?? "—", color: "text-yellow-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">{stat.label}</p>
            <motion.p
              key={stat.value}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-xl font-bold font-mono ${stat.color}`}
            >
              {stat.value}
            </motion.p>
          </div>
        ))}
      </div>

      {/* ——— Block List ——— */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-mono text-white/60 uppercase tracking-wider">Recent Blocks</h2>
          <span className="text-xs font-mono text-white/30">{recentBlocks.length} blocks</span>
        </div>

        {recentBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/30">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-mono text-sm">Waiting for blocks...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentBlocks.slice(0, 50).map((block, i) => (
              <BlockRow key={block.number} block={block} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
