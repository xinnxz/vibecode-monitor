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
  isHubBound?: boolean;
}
export interface ActiveBurst {
  id: string; lat: number; lng: number; color: string;
}
export interface ActivePulse {
  id: string; lat: number; lng: number;
}
export interface ActiveNodePulse { // New: Mempool gossip ring
  id: string; lat: number; lng: number; color: string;
}
export interface ActiveRipple {
  id: string; color: string;
}

export function useGlobeTxFeed() {
  const [pings,   setPings]   = useState<ActivePing[]>([]);
  const [arcs,    setArcs]    = useState<ActiveArc[]>([]);
  const [bursts,  setBursts]  = useState<ActiveBurst[]>([]);
  const [pulses,  setPulses]  = useState<ActivePulse[]>([]);
  const [nodePulses, setNodePulses] = useState<ActiveNodePulse[]>([]); // New state
  const [ripples, setRipples] = useState<ActiveRipple[]>([]);
  const [hubFlash, setHubFlash] = useState(false);

  const { latestBlock, tps } = useBlockStream();
  const { latestAlert } = useWhaleAlerts();
  const lastBlockRef = useRef<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ——— STAGED ANIMATION QUEUE (The Pulse of the Network) ———
  useEffect(() => {
    if (!latestBlock || latestBlock.number === lastBlockRef.current) return;
    lastBlockRef.current = latestBlock.number;

    const ts = Date.now();
    const txCount = latestBlock.txCount;
    const color = getArcColor(txCount);
    const intensity = getIntensity(txCount);
    const txHashes = latestBlock.transactions;
    const isBurst = txCount >= 50;

    // Phase 1 arrays (T = 0s)
    const newPings: ActivePing[] = [];
    
    // Arrays for Phase 2 & 3 closures
    const hashesData = txHashes.map((hash, i) => {
      const from = hashToLatLng(hash);
      const isHubBound = Math.random() < 0.2;
      const to = isHubBound ? { lat: HUB_LAT, lng: HUB_LNG } : hashToLatLng(hash + "destination");
      return { id: `${ts}-${i}`, from, to, isHubBound };
    });

    // === PHASE 1: INITIATION (Sender Broadcast) T=0s ===
    hashesData.forEach((data) => {
      newPings.push({
        id: `p-${data.id}`,
        lat: data.from.lat,
        lng: data.from.lng,
        color,
        size: 0.4 + intensity * 0.6,
      });
    });
    // Immediately show pings
    setPings(prev => [...prev, ...newPings].slice(-100));

    // === PHASE 2: MEMPOOL GOSSIP PROTOCOL T=500ms ===
    // (Only if not a giant burst to save performance)
    if (!isBurst) {
      setTimeout(() => {
        const newGossip: ActiveNodePulse[] = hashesData.map(data => ({
          id: `gossip-${data.id}`,
          lat: data.from.lat,
          lng: data.from.lng,
          color: "#4ade80", // Greenish for gossip spread
        }));
        setNodePulses(prev => [...prev, ...newGossip].slice(-50));
      }, 500);
    }

    // === PHASE 3 & 4: VALIDATION ARC (Sucked to Hub/Target) T=1000ms ===
    setTimeout(() => {
      const newArcs: ActiveArc[] = hashesData.map(data => {
        const baseSpeed = isBurst ? 0.5 : (0.10 + intensity * 0.06);
        const speedSpread = isBurst ? 0.4 : 0.04;
        const arcSpeed = baseSpeed + Math.random() * speedSpread;

        return {
          id: `a-${data.id}`,
          fromLat: data.from.lat,
          fromLng: data.from.lng,
          toLat: data.to.lat,
          toLng: data.to.lng,
          color,
          speed: arcSpeed,
          intensity,
          isHubBound: data.isHubBound,
        };
      });

      setArcs(prev => [...prev, ...newArcs].slice(-150));
      
      // Flash hub when huge blocks arrive (representing massive validation effort)
      if (isBurst || Math.random() < 0.3) {
        setHubFlash(true);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setHubFlash(false), 250);
      }
    }, 1000);

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
  const removePing      = useCallback((id: string) => setPings(p => p.filter(x => x.id !== id)), []);
  const removeArc       = useCallback((id: string) => setArcs(p => p.filter(x => x.id !== id)), []);
  const removeBurst     = useCallback((id: string) => setBursts(p => p.filter(x => x.id !== id)), []);
  const removePulse     = useCallback((id: string) => setPulses(p => p.filter(x => x.id !== id)), []);
  const removeNodePulse = useCallback((id: string) => setNodePulses(p => p.filter(x => x.id !== id)), []);
  const removeRipple    = useCallback((id: string) => setRipples(p => p.filter(x => x.id !== id)), []);

  // Arc landing at destination → ripple if it lands at hub
  const onArcLanded = useCallback((arcId: string, isWhale: boolean, isHubBound?: boolean) => {
    removeArc(arcId);
    if (isHubBound && !isWhale) {
      const rippleId = `ripple-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setRipples(prev => [...prev, { id: rippleId, color: "#a855f7" }].slice(-10));
    }
  }, [removeArc]);

  return {
    pings, arcs, bursts, pulses, ripples, nodePulses,
    hubFlash, tps,
    removePing, removeArc, onArcLanded,
    removeBurst, removePulse, removeRipple, removeNodePulse,
  };
}
