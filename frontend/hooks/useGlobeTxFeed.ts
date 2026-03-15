"use client";
// hooks/useGlobeTxFeed.ts
// ============================================================
// Hub Routing Pattern — HIGH DENSITY MODE:
// - Syncs with sidebar: every block fires up to 20 arcs
// - Ambient arcs: every 2.5s if no new block, reuse recent hashes (sidebar-style)
// - Arc speed very slow (0.08-0.18) so many arcs overlap simultaneously
// - Ghost arcs: after arriving, path stays faded for 10s before removing
// - Normal TX → random city → Somnia Hub (cyan/purple)
// - Whale TX → Hub → random city outbound (gold)
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useBlockStream } from "@/hooks/useBlockStream";
import { useWhaleAlerts } from "@/hooks/useWhaleAlerts";
import { hashToLatLng } from "@/lib/utils/geo";
import { HUB_LAT, HUB_LNG } from "@/components/globe/SomniaHub";

// ——— Color System ———
function getArcColor(txCount: number): string {
  if (txCount >= 10) return "#f59e0b";
  if (txCount >= 3)  return "#a855f7";
  return "#22d3ee";
}
function getIntensity(txCount: number): number {
  if (txCount >= 10) return 0.9;
  if (txCount >= 3)  return 0.65;
  return 0.4;
}

// ——— Types ———
export interface ActivePing {
  id: string; lat: number; lng: number; color: string; size: number;
}
export interface ActiveArc {
  id: string;
  fromLat: number; fromLng: number;
  toLat: number; toLng: number;
  color: string; speed: number; intensity: number;
  isWhale?: boolean;
}
export interface ActiveBurst {
  id: string; lat: number; lng: number; color: string;
}
export interface ActivePulse {
  id: string; lat: number; lng: number;
}
export interface ActiveRipple {
  id: string; color: string;
}

// Pool of recent hashes to reuse for ambient arcs (sidebar-style reuse)
const hashPool: string[] = [];

export function useGlobeTxFeed() {
  const [pings,   setPings]   = useState<ActivePing[]>([]);
  const [arcs,    setArcs]    = useState<ActiveArc[]>([]);
  const [bursts,  setBursts]  = useState<ActiveBurst[]>([]);
  const [pulses,  setPulses]  = useState<ActivePulse[]>([]);
  const [ripples, setRipples] = useState<ActiveRipple[]>([]);
  const [hubFlash, setHubFlash] = useState(false);

  const { latestBlock, recentBlocks, tps } = useBlockStream();
  const { latestAlert } = useWhaleAlerts();
  const lastBlockRef = useRef<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ambientTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to build arcs from a list of tx hashes
  const buildArcsFromHashes = useCallback((
    hashes: string[], txCount: number, ts: number, limit = 20
  ) => {
    const color = getArcColor(txCount);
    const intensity = getIntensity(txCount);
    const newPings: ActivePing[] = [];
    const newArcs: ActiveArc[] = [];

    hashes.slice(0, limit).forEach((hash, i) => {
      const from = hashToLatLng(hash);
      const id = `${ts}-${i}`;
      newPings.push({
        id: `p-${id}`, lat: from.lat, lng: from.lng,
        color, size: 0.4 + intensity * 0.6,
      });
      newArcs.push({
        id: `a-${id}`,
        fromLat: from.lat, fromLng: from.lng,
        toLat: HUB_LAT, toLng: HUB_LNG,
        color,
        // Very slow speed = more arcs visible simultaneously
        speed: 0.08 + intensity * 0.08 + Math.random() * 0.04,
        intensity,
      });
    });
    return { newPings, newArcs, color };
  }, []);

  // ——— New block → fire HIGH DENSITY arcs to hub ———
  useEffect(() => {
    if (!latestBlock || latestBlock.number === lastBlockRef.current) return;
    lastBlockRef.current = latestBlock.number;

    const ts = Date.now();
    const txCount = latestBlock.txCount;

    // Add to hash pool for ambient reuse (sidebar-style)
    latestBlock.transactions.forEach(h => {
      hashPool.push(h);
      if (hashPool.length > 200) hashPool.shift();
    });

    // Build arcs — use ALL tx hashes + pad with shifted variants to reach 20
    const baseHashes = latestBlock.transactions.slice(0, 20);
    // Pad to 20 with hash variants (same trick as sidebar recycle)
    const padded = [...baseHashes];
    while (padded.length < 12 && baseHashes.length > 0) {
      const h = baseHashes[padded.length % baseHashes.length];
      padded.push(h.slice(0, 32) + padded.length.toString(16).padStart(10, "0"));
    }

    const { newPings, newArcs, color } = buildArcsFromHashes(padded, txCount, ts, 20);

    setPings(prev => [...prev, ...newPings].slice(-80));
    setArcs(prev => [...prev, ...newArcs].slice(-120));

    // Hub flash on every block
    setHubFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setHubFlash(false), 250);

  }, [latestBlock, buildArcsFromHashes]);

  // ——— Ambient arcs every 2.5s — reuse sidebar hash pool ———
  useEffect(() => {
    ambientTimerRef.current = setInterval(() => {
      if (hashPool.length < 3) return;
      const ts = Date.now();
      // Pick 4–6 random hashes from pool
      const count = 4 + Math.floor(Math.random() * 3);
      const picked: string[] = [];
      for (let i = 0; i < count; i++) {
        picked.push(hashPool[Math.floor(Math.random() * hashPool.length)]);
      }
      const { newPings, newArcs } = buildArcsFromHashes(picked, 1, ts, count);
      // Ambient arcs are reused — make them faint
      const faintArcs = newArcs.map(a => ({ ...a, intensity: a.intensity * 0.4, color: "#22d3ee" }));
      const faintPings = newPings.map(p => ({ ...p, size: p.size * 0.5 }));

      setPings(prev => [...prev, ...faintPings].slice(-80));
      setArcs(prev => [...prev, ...faintArcs].slice(-120));
    }, 2500);

    return () => {
      if (ambientTimerRef.current) clearInterval(ambientTimerRef.current);
    };
  }, [buildArcsFromHashes]);

  // ——— Whale Alert → outbound arc from hub → destination (gold) ———
  useEffect(() => {
    if (!latestAlert) return;
    const to = hashToLatLng(latestAlert.from);
    const ts = Date.now();

    setPulses(prev => [
      ...prev.filter(p => p.id !== `pulse-${latestAlert.id}`),
      { id: `pulse-${latestAlert.id}`, lat: to.lat, lng: to.lng },
    ]);

    setArcs(prev => [...prev, {
      id: `whale-${ts}`,
      fromLat: HUB_LAT, fromLng: HUB_LNG,
      toLat: to.lat, toLng: to.lng,
      color: "#f59e0b", speed: 0.12, intensity: 1.0, isWhale: true,
    }].slice(-120));

    setBursts(prev => [...prev, {
      id: `wb-${ts}`, lat: to.lat, lng: to.lng, color: "#ef4444",
    }].slice(-20));

  }, [latestAlert]);

  // ——— Remove callbacks ———
  const removePing  = useCallback((id: string) => setPings(p => p.filter(x => x.id !== id)), []);
  const removeArc   = useCallback((id: string) => setArcs(p => p.filter(x => x.id !== id)), []);
  const removeBurst = useCallback((id: string) => setBursts(p => p.filter(x => x.id !== id)), []);
  const removePulse = useCallback((id: string) => setPulses(p => p.filter(x => x.id !== id)), []);
  const removeRipple= useCallback((id: string) => setRipples(p => p.filter(x => x.id !== id)), []);

  // Arc landing → hub ripple (for non-whale arcs landing at hub)
  const onArcLanded = useCallback((arcId: string, isWhale: boolean) => {
    removeArc(arcId);
    if (!isWhale) {
      const rippleId = `ripple-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setRipples(prev => [...prev, { id: rippleId, color: "#a855f7" }].slice(-10));
    }
  }, [removeArc]);

  return {
    pings, arcs, bursts, pulses, ripples,
    hubFlash, tps,
    removePing, removeArc, onArcLanded,
    removeBurst, removePulse, removeRipple,
  };
}
