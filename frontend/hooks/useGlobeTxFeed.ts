"use client";
// hooks/useGlobeTxFeed.ts
// ============================================================
// EXACT SYNC MODE:
//   - Arc count = EXACT txCount from each block (no padding!)
//   - Every TX in sidebar → exactly 1 arc on globe
//   - Ghost trails persist so globe stays visually busy
//   - Whale TX → outbound arc from hub
//   - No fake ambient arcs — only real data
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useBlockStream } from "@/hooks/useBlockStream";
import { useWhaleAlerts } from "@/hooks/useWhaleAlerts";
import { hashToLatLng } from "@/lib/utils/geo";
import { HUB_LAT, HUB_LNG } from "@/components/globe/SomniaHub";

// ——— Color System ———
function getArcColor(txCount: number): string {
  if (txCount >= 10) return "#f59e0b"; // gold
  if (txCount >= 3)  return "#a855f7"; // purple
  return "#22d3ee";                    // cyan
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

export function useGlobeTxFeed() {
  const [pings,   setPings]   = useState<ActivePing[]>([]);
  const [arcs,    setArcs]    = useState<ActiveArc[]>([]);
  const [bursts,  setBursts]  = useState<ActiveBurst[]>([]);
  const [pulses,  setPulses]  = useState<ActivePulse[]>([]);
  const [ripples, setRipples] = useState<ActiveRipple[]>([]);
  const [hubFlash, setHubFlash] = useState(false);

  const { latestBlock, tps } = useBlockStream();
  const { latestAlert } = useWhaleAlerts();
  const lastBlockRef = useRef<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ——— New block → EXACT number of arcs matching txCount ———
  useEffect(() => {
    if (!latestBlock || latestBlock.number === lastBlockRef.current) return;
    lastBlockRef.current = latestBlock.number;

    const ts = Date.now();
    const txCount = latestBlock.txCount;
    const color = getArcColor(txCount);
    const intensity = getIntensity(txCount);

    // EXACT: 1 arc per TX — no padding, no fakes
    const txHashes = latestBlock.transactions;
    const newPings: ActivePing[] = [];
    const newArcs: ActiveArc[] = [];

    txHashes.forEach((hash, i) => {
      const from = hashToLatLng(hash);
      const id = `${ts}-${i}`;

      newPings.push({
        id: `p-${id}`,
        lat: from.lat,
        lng: from.lng,
        color,
        size: 0.4 + intensity * 0.6,
      });

      newArcs.push({
        id: `a-${id}`,
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: HUB_LAT,
        toLng: HUB_LNG,
        color,
        // Speed: slow enough to see, with slight randomness
        speed: 0.10 + intensity * 0.06 + Math.random() * 0.04,
        intensity,
      });
    });

    // Ghost trails make old arcs persist — so we allow high limits
    setPings(prev => [...prev, ...newPings].slice(-100));
    setArcs(prev => [...prev, ...newArcs].slice(-150));

    // Flash hub
    setHubFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setHubFlash(false), 250);

  }, [latestBlock]);

  // ——— Whale Alert → outbound arc from hub (gold) ———
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
    }].slice(-150));

    setBursts(prev => [...prev, {
      id: `wb-${ts}`, lat: to.lat, lng: to.lng, color: "#ef4444",
    }].slice(-20));

  }, [latestAlert]);

  // ——— Remove callbacks ———
  const removePing   = useCallback((id: string) => setPings(p => p.filter(x => x.id !== id)), []);
  const removeArc    = useCallback((id: string) => setArcs(p => p.filter(x => x.id !== id)), []);
  const removeBurst  = useCallback((id: string) => setBursts(p => p.filter(x => x.id !== id)), []);
  const removePulse  = useCallback((id: string) => setPulses(p => p.filter(x => x.id !== id)), []);
  const removeRipple = useCallback((id: string) => setRipples(p => p.filter(x => x.id !== id)), []);

  // Arc landing at hub → hub ripple
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
