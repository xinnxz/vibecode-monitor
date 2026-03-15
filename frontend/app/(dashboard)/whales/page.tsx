"use client";
// app/(dashboard)/whales/page.tsx

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWhaleAlerts } from "@/hooks/useWhaleAlerts";
import { shortAddress } from "@/lib/utils/geo";

function severity(amountWei: bigint): { label: string; color: string; bg: string } {
  const stt = Number(amountWei) / 1e18;
  if (stt > 100_000) return { label: "MEGA",  color: "text-red-400",    bg: "bg-red-500/20 border-red-500/40" };
  if (stt > 10_000)  return { label: "LARGE", color: "text-orange-400", bg: "bg-orange-500/20 border-orange-500/40" };
  if (stt > 1_000)   return { label: "MID",   color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/40" };
  return                    { label: "BASE",  color: "text-cyan-400",   bg: "bg-cyan-500/20 border-cyan-500/40" };
}

function fmtSTT(wei: bigint): string {
  const stt = Number(wei) / 1e18;
  if (stt >= 1_000_000) return `${(stt / 1_000_000).toFixed(2)}M`;
  if (stt >= 1_000)     return `${(stt / 1_000).toFixed(1)}K`;
  return stt.toFixed(2);
}

function WhaleCard({ alert, maxAmount, index }: {
  alert: ReturnType<typeof useWhaleAlerts>["alerts"][0];
  maxAmount: bigint;
  index: number;
}) {
  const sev = severity(alert.amount);
  const barPct = maxAmount > BigInt(0) ? (Number(alert.amount) / Number(maxAmount)) * 100 : 0;
  const timeAgo = Math.floor((Date.now() - alert.timestamp * 1000) / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`glass rounded-xl p-4 border ${sev.bg} relative overflow-hidden`}
    >
      {/* Background volume bar */}
      <div
        className="absolute bottom-0 left-0 h-1 opacity-30 transition-all duration-1000"
        style={{ width: `${barPct}%`, backgroundColor: "currentColor" }}
      />

      <div className="flex items-start gap-4">
        <div className="shrink-0 text-center">
          <div className="text-3xl">🐋</div>
          <span className={`text-[10px] font-mono font-bold ${sev.color}`}>{sev.label}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className={`text-2xl font-bold font-mono ${sev.color} mb-1`}>
            {fmtSTT(alert.amount)} <span className="text-sm text-white/40">STT</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs mb-2">
            <span className="text-white/50">from</span>
            <span className="text-cyan-300 font-bold">{shortAddress(alert.from)}</span>
            <span className="text-white/30">→</span>
            <span className="text-purple-300 font-bold">{shortAddress(alert.to)}</span>
          </div>
          <div className="text-[11px] font-mono text-white/30">
            {timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          <div className="w-2 bg-white/10 rounded-full h-16 overflow-hidden flex flex-col-reverse">
            <div
              className={`w-full rounded-full transition-all duration-1000 ${sev.color.replace("text-", "bg-")}`}
              style={{ height: `${barPct}%` }}
            />
          </div>
          <span className="text-[9px] text-white/20 font-mono">vol</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function WhalesPage() {
  const { alerts, latestAlert } = useWhaleAlerts();

  const bigZero = BigInt(0);
  const maxAmount = alerts.length > 0
    ? alerts.reduce((max, a) => a.amount > max ? a.amount : max, bigZero)
    : bigZero;

  const totalVolume = alerts.reduce((sum, a) => sum + Number(a.amount) / 1e18, 0);

  return (
    <div className="p-6 pb-12">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🐋</span>
          <h1 className="text-2xl font-bold text-white">Whale Tracker</h1>
          {latestAlert && (
            <motion.span key={latestAlert.id} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
              className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-mono animate-pulse">
              ALERT
            </motion.span>
          )}
        </div>
        <p className="text-white/40 text-sm font-mono ml-11">Large STT transfers detected via Somnia Reactivity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Detected",     value: alerts.length.toString(), color: "text-red-400",    icon: "🚨" },
          { label: "Total Volume", value: totalVolume >= 1000 ? `${(totalVolume/1000).toFixed(1)}K STT` : `${totalVolume.toFixed(0)} STT`, color: "text-orange-400", icon: "💰" },
          { label: "Largest",      value: maxAmount > bigZero ? `${fmtSTT(maxAmount)} STT` : "—", color: "text-yellow-400", icon: "🏆" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4 text-center">
            <div className="text-xl mb-1">{stat.icon}</div>
            <p className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Alert Feed */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="glass rounded-xl flex flex-col items-center justify-center py-20">
            <div className="text-5xl mb-4 opacity-30">🐋</div>
            <p className="text-white/30 font-mono text-sm">No whale alerts yet...</p>
            <p className="text-white/20 font-mono text-xs mt-1">Deploy WhaleDetector.sol to start detecting</p>
          </div>
        ) : (
          <AnimatePresence>
            {alerts.map((alert, i) => (
              <WhaleCard key={alert.id} alert={alert} maxAmount={maxAmount} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
