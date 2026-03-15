"use client";
// hooks/useGlobeTxFeed.ts
// ============================================================
// Hub Routing Pattern (Idea 4):
//   Normal TX → random world city → Somnia Hub (cyan/purple)
//   Whale TX  → Somnia Hub → random world city (gold, outbound)
//
// On arc landing at hub → trigger HubRipple
// On new block → flash SomniaHub
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useBlockStream } from "@/hooks/useBlockStream";
import { useWhaleAlerts } from "@/hooks/useWhaleAlerts";
import { hashToLatLng } from "@/lib/utils/geo";
import { HUB_LAT, HUB_LNG } from "@/components/globe/SomniaHub";

// ——— Color System ———
function getArcColor(txCount: number): string {
  if (txCount >= 10) return "#f59e0b"; // gold - high throughput
  if (txCount >= 3)  return "#a855f7"; // purple - medium
  return "#22d3ee";                    // cyan - normal
}

function getIntensity(txCount: number): number {
  if (txCount >= 10) return 0.9;
  if (txCount >= 3)  return 0.6;
  return 0.35;
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

// ——— Hook ———
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

  // ——— New block → arcs fly TO hub from random world cities ———
  useEffect(() => {
    if (!latestBlock || latestBlock.number === lastBlockRef.current) return;
    lastBlockRef.current = latestBlock.number;

    const txs = latestBlock.transactions.slice(0, 12);
    const ts = Date.now();
    const txCount = latestBlock.txCount;
    const color = getArcColor(txCount);
    const intensity = getIntensity(txCount);

    const newPings: ActivePing[] = [];
    const newArcs: ActiveArc[] = [];

    txs.forEach((hash, i) => {
      // Origin: random city derived from tx hash
      const from = hashToLatLng(hash);
      const id = `${ts}-${i}`;

      // Ping at origin city
      newPings.push({
        id: `p-${id}`,
        lat: from.lat,
        lng: from.lng,
        color,
        size: 0.5 + intensity * 0.7,
      });

      // Arc: origin → Somnia Hub at Singapore
      newArcs.push({
        id: `a-${id}`,
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: HUB_LAT,
        toLng: HUB_LNG,
        color,
        speed: 0.25 + intensity * 0.2 + Math.random() * 0.15,
        intensity,
      });
    });

    // Stagger arc departure slightly for visual depth (not all at once)
    setPings(prev => [...prev, ...newPings].slice(-60));
    setArcs(prev => [...prev, ...newArcs].slice(-50));

    // Flash hub on new block
    setHubFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setHubFlash(false), 300);

  }, [latestBlock]);

  // ——— Whale Alert → arc fires OUTBOUND from hub → random city ———
  useEffect(() => {
    if (!latestAlert) return;
    const to = hashToLatLng(latestAlert.from);
    const ts = Date.now();

    // WhalePulse at destination
    setPulses(prev => [
      ...prev.filter(p => p.id !== `pulse-${latestAlert.id}`),
      { id: `pulse-${latestAlert.id}`, lat: to.lat, lng: to.lng },
    ]);

    // Outbound arc: Hub → whale destination (GOLD)
    setArcs(prev => [...prev, {
      id: `whale-${ts}`,
      fromLat: HUB_LAT,
      fromLng: HUB_LNG,
      toLat: to.lat,
      toLng: to.lng,
      color: "#f59e0b",  // Gold for whale
      speed: 0.18,       // Slower = more dramatic
      intensity: 1.0,    // Maximum intensity
    }].slice(-50));

    // Impact burst at whale destination
    setBursts(prev => [...prev, {
      id: `wb-${ts}`,
      lat: to.lat,
      lng: to.lng,
      color: "#ef4444",  // Red for whale impact
    }].slice(-20));

  }, [latestAlert]);

  // ——— Remove callbacks ———
  const removePing   = useCallback((id: string) => setPings(p => p.filter(x => x.id !== id)), []);
  const removeArc    = useCallback((id: string) => setArcs(p => p.filter(x => x.id !== id)), []);
  const removeBurst  = useCallback((id: string) => setBursts(p => p.filter(x => x.id !== id)), []);
  const removePulse  = useCallback((id: string) => setPulses(p => p.filter(x => x.id !== id)), []);

  // Arc landing callback: trigger hub ripple
  const onArcLanded = useCallback((arcId: string, isWhale: boolean) => {
    removeArc(arcId);
    if (!isWhale) {
      // Normal TX lands at hub → ripple
      const rippleId = `ripple-${Date.now()}-${Math.random()}`;
      setRipples(prev => [...prev, {
        id: rippleId,
        color: "#a855f7",
      }].slice(-8));
    }
  }, [removeArc]);

  const removeRipple = useCallback((id: string) => setRipples(p => p.filter(x => x.id !== id)), []);

  return {
    pings, arcs, bursts, pulses, ripples,
    hubFlash, tps,
    removePing, removeArc, onArcLanded,
    removeBurst, removePulse, removeRipple,
  };
}
