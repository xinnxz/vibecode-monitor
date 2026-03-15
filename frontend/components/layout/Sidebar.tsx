"use client";

// components/layout/Sidebar.tsx
// ============================================================
// Panel kanan — "Live Block Terminal".
// Redesigned as a floating glass panel with premium typography.
// ============================================================

import { useBlockStream, ProcessedBlock } from "@/hooks/useBlockStream";
import { useWhaleAlerts, WhaleAlertEvent } from "@/hooks/useWhaleAlerts";
import { shortAddress } from "@/lib/utils/geo";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

type FeedItem =
  | { type: "block"; data: ProcessedBlock; key: string }
  | { type: "whale"; data: WhaleAlertEvent; key: string };

// ——— Block Entry Redesigned ———
function BlockEntry({ block }: { block: ProcessedBlock }) {
  const time = new Date(block.timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group flex flex-col gap-1.5 px-4 py-3 mx-2 my-1 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/[0.05] transition-all cursor-default"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
          <span className="text-purple-300 text-xs font-mono font-bold tracking-wide">
            #{block.number.toLocaleString()}
          </span>
        </div>
        <span className="text-white/30 text-[10px] font-mono">{time}</span>
      </div>
      <div className="flex items-center justify-between pl-3.5">
        <span className="text-white/50 text-[10px] font-mono tracking-wider truncate max-w-[160px] group-hover:text-indigo-300 transition-colors">
          {block.hash.slice(0, 18)}...
        </span>
        <div className="flex items-center gap-1 bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-400 text-[9px] font-mono font-bold border border-indigo-500/30">
          {block.txCount} TX
        </div>
      </div>
    </motion.div>
  );
}

// ——— Whale Entry Redesigned ———
function WhaleEntry({ alert }: { alert: WhaleAlertEvent }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-1.5 px-4 py-3 mx-2 my-2 rounded-xl glass-red relative overflow-hidden"
    >
      {/* Side glow accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_#ef4444]" />
      
      <div className="flex items-center justify-between pl-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-red-400 tracking-widest animate-pulse">WHALE ALERT</span>
        </div>
        <span className="text-red-500/40 text-[9px] font-mono">#{alert.id}</span>
      </div>
      <div className="pl-1 text-red-200 text-sm font-mono font-bold tracking-wide">
        {alert.amountFormatted} <span className="text-[10px] text-red-400/60">STT</span>
      </div>
      <div className="pl-1 text-white/50 text-[10px] font-mono flex items-center gap-2">
        <span>{shortAddress(alert.from)}</span>
        <span className="text-red-500/50">→</span>
        <span>{shortAddress(alert.to)}</span>
      </div>
    </motion.div>
  );
}

export function Sidebar() {
  const { recentBlocks, isConnected } = useBlockStream();
  const { alerts: whaleAlerts } = useWhaleAlerts();

  const feedItems = useMemo((): FeedItem[] => {
    const blockItems: FeedItem[] = recentBlocks.slice().reverse()
      .map((b) => ({ type: "block", data: b, key: `block-${b.number}` }));
    const whaleItems: FeedItem[] = whaleAlerts
      .map((a) => ({ type: "whale", data: a, key: `whale-${a.id}` }));

    return [...blockItems, ...whaleItems]
      .sort((a, b) => {
        const ta = a.type === "block" ? (a.data as ProcessedBlock).timestamp : (a.data as WhaleAlertEvent).timestamp;
        const tb = b.type === "block" ? (b.data as ProcessedBlock).timestamp : (b.data as WhaleAlertEvent).timestamp;
        return tb - ta;
      })
      .slice(0, 50);
  }, [recentBlocks, whaleAlerts]);

  return (
    <aside className="fixed top-24 right-6 bottom-14 w-80 flex flex-col glass rounded-2xl z-40 overflow-hidden shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 font-mono text-xs animate-pulse">■</span>
          <span className="text-white/80 text-xs font-bold font-mono uppercase tracking-widest">
            Live Feed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-red-500"}`} />
          <span className={`text-[9px] font-bold font-mono tracking-wider ${isConnected ? "text-emerald-400" : "text-red-400"}`}>
            {isConnected ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin overflow-x-hidden py-1 relative">
        {/* Subtle top/bottom inner shadows for depth */}
        <div className="sticky top-0 h-4 bg-gradient-to-b from-[var(--color-bg-panel)] to-transparent z-10 pointer-events-none" />
        
        {feedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[80%] text-white/30 text-xs font-mono text-center px-6">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin mb-4" />
            <div>Awaiting telemetry from<br />Somnia Reactivity Engine...</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {feedItems.map((item) =>
              item.type === "block" ? (
                <BlockEntry key={item.key} block={item.data as ProcessedBlock} />
              ) : (
                <WhaleEntry key={item.key} alert={item.data as WhaleAlertEvent} />
              )
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
        <span className="text-white/30 text-[9px] font-mono tracking-widest uppercase">
          Cache: {recentBlocks.length} blk
        </span>
        <span className="text-red-400/60 text-[9px] font-mono tracking-widest uppercase">
          Whales: {whaleAlerts.length}
        </span>
      </div>
    </aside>
  );
}
