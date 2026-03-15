"use client";
// app/(dashboard)/alerts/page.tsx

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAlertEngine, AlertRule } from "@/hooks/useAlertEngine";
import { useWallet } from "@/hooks/useWallet";
import { shortAddress } from "@/lib/utils/geo";

// ——— Form Create Alert ———
function CreateAlertForm({ onCreate }: { onCreate: () => void }) {
  const { createAmountAlert, createAddressAlert, isTxPending } = useAlertEngine();
  const [type, setType]     = useState<"amount" | "address">("amount");
  const [amount, setAmount]   = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    try {
      if (type === "amount") {
        await createAmountAlert(parseFloat(amount), `Alert > ${amount} STT`);
      } else {
        await createAddressAlert(address, "from", `Watching ${shortAddress(address)}`);
      }
      setStatus("success");
      setAmount("");
      setAddress("");
      onCreate();
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-mono text-white/60 uppercase tracking-wider">Create New Alert Rule</h3>

      {/* Type selector */}
      <div className="flex rounded-lg overflow-hidden border border-white/10">
        {(["amount", "address"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wide transition-colors ${
              type === t
                ? "bg-purple-600/40 text-purple-300"
                : "bg-transparent text-white/30 hover:text-white/60"
            }`}
          >
            {t === "amount" ? "💰 Amount Threshold" : "📍 Address Watch"}
          </button>
        ))}
      </div>

      {/* Input */}
      {type === "amount" ? (
        <div>
          <label className="text-xs font-mono text-white/40 mb-1.5 block">Alert when transfer exceeds (STT)</label>
          <div className="flex gap-2">
            <input
              type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1000" min="0" step="any" required
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-purple-500/50 outline-none focus:ring-1 focus:ring-purple-500/30"
            />
            <span className="text-white/40 font-mono text-sm flex items-center px-2">STT</span>
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs font-mono text-white/40 mb-1.5 block">Watch address for any activity</label>
          <input
            type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..." pattern="0x[a-fA-F0-9]{40}" required
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-purple-500/50 outline-none focus:ring-1 focus:ring-purple-500/30"
          />
        </div>
      )}

      <button
        type="submit" disabled={isTxPending}
        className="w-full py-2.5 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 font-mono text-sm font-bold hover:bg-purple-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isTxPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            Creating on-chain...
          </span>
        ) : "⚡ Create Alert Rule"}
      </button>

      <AnimatePresence>
        {status === "success" && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-emerald-400 text-xs font-mono text-center">
            ✅ Alert rule created on-chain!
          </motion.p>
        )}
        {status === "error" && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-red-400 text-xs font-mono text-center">
            ❌ Transaction failed. Check your wallet.
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

// ——— Rule Card ———
function RuleCard({ rule, onDeactivate }: { rule: AlertRule; onDeactivate: () => void }) {
  const { deactivateRule, isTxPending } = useAlertEngine();
  const [confirming, setConfirming] = useState(false);

  async function handleDeactivate() {
    if (!confirming) { setConfirming(true); return; }
    await deactivateRule(rule.id);
    onDeactivate();
    setConfirming(false);
  }

  const isAmount = rule.conditionType === "AMOUNT_GREATER_THAN" || rule.conditionType === "AMOUNT_LESS_THAN";

  return (
    <motion.div layout
      className={`glass rounded-xl p-4 border ${rule.isActive ? "border-white/10" : "border-white/5 opacity-50"}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">{isAmount ? "💰" : "📍"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-white font-bold">{isAmount ? "Amount Threshold" : "Address Watch"}</span>
            <span className={`text-[10px] font-mono px-1.5 rounded-full border ${
              rule.isActive
                ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                : "text-white/30 border-white/20 bg-white/5"
            }`}>
              {rule.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          {isAmount && (
            <p className="text-xs font-mono text-cyan-400">Alert &gt; {rule.amountThreshold} STT</p>
          )}
          {!isAmount && rule.targetAddress && (
            <p className="text-xs font-mono text-purple-400">Watching: {shortAddress(rule.targetAddress)}</p>
          )}
          <p className="text-[10px] font-mono text-white/20 mt-1">Rule ID: {rule.id} · {rule.message}</p>
          <p className="text-[10px] font-mono text-white/20">Triggered: {rule.triggerCount}x</p>
        </div>

        {rule.isActive && (
          <button onClick={handleDeactivate} disabled={isTxPending}
            className={`shrink-0 px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
              confirming
                ? "border-red-500/60 bg-red-500/20 text-red-300"
                : "border-white/10 bg-white/5 text-white/40 hover:text-white/70 hover:border-white/20"
            }`}
          >
            {confirming ? "Confirm?" : "Deactivate"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function AlertsPage() {
  const { address, isConnected } = useWallet();
  const { myRules, isLoading, refresh } = useAlertEngine();

  if (!isConnected) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full min-h-[60vh]">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
        <p className="text-white/40 font-mono text-sm text-center">
          Connect your wallet to create and manage alert rules on-chain.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-12">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">⚡</span>
          <h1 className="text-2xl font-bold text-white">Alert Builder</h1>
        </div>
        <p className="text-white/40 text-sm font-mono ml-11">Custom on-chain alerts powered by Somnia Reactivity Engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreateAlertForm onCreate={refresh} />
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-mono text-white/60 uppercase tracking-wider">Your Rules</h3>
            <span className="text-xs font-mono text-white/30">{shortAddress(address ?? "")}</span>
          </div>
          {isLoading ? (
            <div className="glass rounded-xl flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myRules.length === 0 ? (
            <div className="glass rounded-xl flex flex-col items-center justify-center py-12 text-white/30">
              <div className="text-4xl mb-3 opacity-40">📭</div>
              <p className="font-mono text-sm">No rules yet</p>
              <p className="font-mono text-xs mt-1">Create your first alert rule →</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {myRules.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} onDeactivate={refresh} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
