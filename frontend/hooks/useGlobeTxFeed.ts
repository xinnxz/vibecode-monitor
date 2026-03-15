"use client";
// hooks/useGlobeTxFeed.ts
// ============================================================
// Centralized hook: converts raw block/whale data into globe events.
// Reads recentBlocks from the SHARED useBlockStream instance
// (via Sidebar's push to Zustand store) to avoid duplicate RPC.
//
// Outputs: pings, arcs, bursts, pulseRings, + remove callbacks.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useBlockStream } from "@/hooks/useBlockStream";
import { useWhaleAlerts } from "@/hooks/useWhaleAlerts";
import { hashToLatLng } from "@/lib/utils/geo";

// ——— Color System ———
function getArcColor(txCount: number): string {
  if (txCount >= 10) return "#f59e0b"; // gold - high throughput
  if (txCount >= 3)  return "#a855f7"; // purple - medium
  return "#22d3ee";                    // cyan - normal
}

function getIntensity(txCount: number): number {
  if (txCount >= 10) return 1.0;
  if (txCount >= 3)  return 0.7;
  return 0.4;
}

// ——— Types ———
export interface ActivePing {
  id: string;
  lat: number;
  lng: number;
  color: string;
  size: number;
}

export interface ActiveArc {
  id: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  color: string;
  speed: number;
  intensity: number;
}

export interface ActiveBurst {
  id: string;
  lat: number;
  lng: number;
  color: string;
}

export interface ActivePulse {
  id: string;
  lat: number;
  lng: number;
}

export interface FlashEvent {
  id: string;
  color: string;
}

export function useGlobeTxFeed() {
  const [pings, setPings]       = useState<ActivePing[]>([]);
  const [arcs, setArcs]         = useState<ActiveArc[]>([]);
  const [bursts, setBursts]     = useState<ActiveBurst[]>([]);
  const [pulses, setPulses]     = useState<ActivePulse[]>([]);
  const [flashes, setFlashes]   = useState<FlashEvent[]>([]);

  const { latestBlock } = useBlockStream();
  const { latestAlert } = useWhaleAlerts();
  const lastBlockRef = useRef<number | null>(null);

  // ——— New block → spawn pings + arcs + pulse flash ———
  useEffect(() => {
    if (!latestBlock || latestBlock.number === lastBlockRef.current) return;
    lastBlockRef.current = latestBlock.number;

    const txs = latestBlock.transactions.slice(0, 16);
    const ts = Date.now();
    const txCount = latestBlock.txCount;
    const color = getArcColor(txCount);
    const intensity = getIntensity(txCount);

    const newPings: ActivePing[] = [];
    const newArcs: ActiveArc[] = [];
    const newBursts: ActiveBurst[] = [];

    txs.forEach((hash, i) => {
      const from = hashToLatLng(hash);
      const to = hashToLatLng(hash.slice(0, 2) + hash.slice(4));
      const id = `${ts}-${i}`;

      // Ping at origin
      newPings.push({
        id: `p-${id}`,
        lat: from.lat,
        lng: from.lng,
        color,
        size: 0.6 + intensity * 0.8,
      });

      // Arc from origin to destination
      newArcs.push({
        id: `a-${id}`,
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: to.lat,
        toLng: to.lng,
        color,
        speed: 0.3 + intensity * 0.3 + Math.random() * 0.2,
        intensity,
      });

      // Impact burst at destination (spawned when arc starts,
      // but GlobeScene should delay spawning until arc reaches destination)
      newBursts.push({
        id: `b-${id}`,
        lat: to.lat,
        lng: to.lng,
        color,
      });
    });

    // Limit active items to prevent overload
    setPings(prev => [...prev, ...newPings].slice(-60));
    setArcs(prev => [...prev, ...newArcs].slice(-50));

    // Bursts are pre-registered; GlobeScene triggers them when arcs land
    setBursts(prev => [...prev, ...newBursts].slice(-50));

    // Globe pulse ring flash
    setFlashes(prev => [
      ...prev,
      { id: `flash-${ts}`, color: txCount >= 10 ? color : "#ffffff" },
    ].slice(-5));

  }, [latestBlock]);

  // ——— Whale Alert → spawn WhalePulse ———
  useEffect(() => {
    if (!latestAlert) return;
    const { lat, lng } = hashToLatLng(latestAlert.from);
    setPulses(prev => [
      ...prev.filter(p => p.id !== `pulse-${latestAlert.id}`),
      { id: `pulse-${latestAlert.id}`, lat, lng },
    ]);
  }, [latestAlert]);

  // ——— Remove callbacks ———
  const removePing   = useCallback((id: string) => setPings(prev => prev.filter(x => x.id !== id)), []);
  const removeArc    = useCallback((id: string) => setArcs(prev => prev.filter(x => x.id !== id)), []);
  const removeBurst  = useCallback((id: string) => setBursts(prev => prev.filter(x => x.id !== id)), []);
  const removePulse  = useCallback((id: string) => setPulses(prev => prev.filter(x => x.id !== id)), []);
  const removeFlash  = useCallback((id: string) => setFlashes(prev => prev.filter(x => x.id !== id)), []);

  return {
    pings, arcs, bursts, pulses, flashes,
    removePing, removeArc, removeBurst, removePulse, removeFlash,
  };
}
