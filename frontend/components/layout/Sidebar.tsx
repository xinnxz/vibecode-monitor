"use client";

// components/layout/Sidebar.tsx
// ============================================================
// Panel kanan — "Live Block Terminal".
// Menampilkan stream blok dan transaksi terbaru bergaya terminal
// hacker (scrolling ke bawah, font monospace, warna hijau/cyan).
//
// Setiap kali blok baru masuk dari useBlockStream:
// 1. Entry baru ditambahkan di bagian atas daftar
// 2. List auto-scroll ke atas (newest first)
// 3. Animasi slide-in dari kanan
//
// Jika ada Whale Alert, entry ditampilkan dengan warna merah
// dan ikon peringatan khusus.
// ============================================================

import { useBlockStream, ProcessedBlock } from "@/hooks/useBlockStream";
import { useWhaleAlerts, WhaleAlertEvent } from "@/hooks/useWhaleAlerts";
import { shortAddress } from "@/lib/utils/geo";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

// ——— Tipe union untuk semua item di feed ———
type FeedItem =
  | { type: "block"; data: ProcessedBlock; key: string }
  | { type: "whale"; data: WhaleAlertEvent; key: string };

// ——— Komponen satu baris block entry ———
function BlockEntry({ block }: { block: ProcessedBlock }) {
  const time = new Date(block.timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-0.5 px-3 py-2 hover:bg-white/5 border-b border-white/5 cursor-default"
    >
      <div className="flex items-center justify-between">
        <span className="text-purple-400 text-xs font-mono font-bold">
          #{block.number.toLocaleString()}
        </span>
        <span className="text-white/30 text-[10px] font-mono">{time}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-[10px] font-mono truncate max-w-[140px]">
          {block.hash.slice(0, 18)}...
        </span>
        <span className="text-emerald-400 text-[10px] font-mono shrink-0">
          {block.txCount} tx
        </span>
      </div>
    </motion.div>
  );
}

// ——— Komponen satu baris whale alert entry ———
function WhaleEntry({ alert }: { alert: WhaleAlertEvent }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-1 px-3 py-2 bg-red-950/40 border-b border-red-500/20"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-red-400 text-[10px]">🐋 WHALE ALERT</span>
        <span className="text-red-500/50 text-[10px] font-mono">#{alert.id}</span>
      </div>
      <div className="text-red-300 text-xs font-mono font-bold">
        {alert.amountFormatted} STT
      </div>
      <div className="text-white/40 text-[10px] font-mono">
        {shortAddress(alert.from)} → {shortAddress(alert.to)}
      </div>
    </motion.div>
  );
}

export function Sidebar() {
  const { recentBlocks, isConnected } = useBlockStream();
  const { alerts: whaleAlerts } = useWhaleAlerts();

  // ——— Gabungkan blok dan whale alerts, urutkan terbaru dulu ———
  const feedItems = useMemo((): FeedItem[] => {
    const blockItems: FeedItem[] = recentBlocks
      .slice()
      .reverse()
      .map((b) => ({ type: "block", data: b, key: `block-${b.number}` }));

    const whaleItems: FeedItem[] = whaleAlerts.map((a) => ({
      type: "whale",
      data: a,
      key: `whale-${a.id}`,
    }));

    // Gabungkan dan sort by timestamp terbaru
    return [...blockItems, ...whaleItems]
      .sort((a, b) => {
        const ta = a.type === "block" ? a.data.timestamp : a.data.timestamp;
        const tb = b.type === "block" ? b.data.timestamp : b.data.timestamp;
        return tb - ta;
      })
      .slice(0, 60); // Tampilkan max 60 item
  }, [recentBlocks, whaleAlerts]);

  return (
    <aside className="fixed top-14 right-0 bottom-0 w-64 flex flex-col bg-black/90 border-l border-white/10 backdrop-blur-md z-40">

      {/* ——— Header Sidebar ——— */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          {/* Blinking cursor — khas terminal */}
          <span className="text-emerald-400 font-mono text-xs animate-pulse">▶</span>
          <span className="text-white/70 text-xs font-mono uppercase tracking-widest">
            Live Feed
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className={`text-[10px] font-mono ${isConnected ? "text-emerald-400" : "text-red-400"}`}>
            {isConnected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* ——— Feed list (scrollable) ——— */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {feedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/20 text-xs font-mono text-center px-4">
            <div className="text-2xl mb-2">📡</div>
            <div>Menunggu blok dari<br />Somnia Testnet...</div>
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

      {/* ——— Footer: total count ——— */}
      <div className="px-3 py-2 border-t border-white/10 shrink-0">
        <span className="text-white/20 text-[10px] font-mono">
          {recentBlocks.length} blocks · {whaleAlerts.length} whale alerts
        </span>
      </div>
    </aside>
  );
}
