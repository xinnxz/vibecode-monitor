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

// ——— Block Entry Redesigned (Mass Effect Style) ———
function BlockEntry({ block }: { block: ProcessedBlock }) {
  const time = new Date(block.timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group flex items-center px-4 py-3 mx-2 my-2 bg-black/40 border border-white/10 hover:border-purple-500/50 hover:bg-white/5 transition-all cursor-default rounded-md pointer-events-auto relative overflow-hidden"
      style={{ gap: "12px" }}
    >
      {/* Vertical Status Bar (left edge) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "20%",
          bottom: "20%",
          width: "2px",
          background: "#a855f7",
          boxShadow: "0 0 6px rgba(168, 85, 247, 0.5)",
          borderRadius: "1px",
        }}
      />

      {/* Text Content */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: "8px" }}>
        <div className="flex items-center justify-between">
          <span className="text-white/90 text-[11px] font-bold font-display tracking-widest uppercase truncate max-w-[120px]">
            Block #{block.number.toLocaleString()}
          </span>
          <span className="text-white/30 text-[9px] font-mono shrink-0">{time}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-white/40 text-[10px] font-mono truncate max-w-[110px] group-hover:text-indigo-300 transition-colors">
            {block.hash}
          </span>
          <span className="text-indigo-400 text-[10px] font-mono font-bold shrink-0">
            {block.txCount} TX
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ——— Whale Entry Redesigned (Mass Effect Style) ———
function WhaleEntry({ alert }: { alert: WhaleAlertEvent }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group flex items-center px-4 py-3 mx-2 my-2 bg-red-950/20 border border-red-500/30 hover:border-red-500/60 transition-all rounded-md relative overflow-hidden pointer-events-auto"
      style={{ gap: "12px" }}
    >
      {/* Vertical Status Bar (left edge - red for whale) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "15%",
          bottom: "15%",
          width: "2px",
          background: "#ef4444",
          boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
          borderRadius: "1px",
        }}
      />

      {/* Text Content */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: "8px" }}>
        <div className="flex items-center justify-between">
          <span className="text-red-100 text-[11px] font-bold font-display tracking-widest uppercase">
            Whale Anomaly
          </span>
          <span className="text-red-500/40 text-[9px] font-mono shrink-0">#{alert.id}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-white/50 text-[10px] font-mono truncate max-w-[100px]">
            {shortAddress(alert.from)} → {shortAddress(alert.to)}
          </span>
          <span className="text-red-400 text-[10px] font-mono font-bold shrink-0">
            {alert.amountFormatted} STT
          </span>
        </div>
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
    <aside className="absolute top-24 right-10 bottom-20 w-80 flex flex-col z-40 pointer-events-none">

      {/* Top Header removed to match reference (bare cards) OR keep a subtle one */}
      <div className="flex items-center justify-between px-5 py-2 mb-4">
        <span className="text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest">
          Terminal Feed
        </span>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin overflow-x-hidden relative">
        {/* Subtle top/bottom inner shadow fades removed to keep it completely flat */}

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
    </aside>
  );
}
