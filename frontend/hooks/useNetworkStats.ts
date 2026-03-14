// hooks/useNetworkStats.ts
// ============================================================
// Hook ini membaca statistik jaringan Somnia secara realtime
// dari kontrak EventAggregator yang sudah di-deploy.
//
// Cara kerjanya:
// 1. Polling fungsi-fungsi view dari EventAggregator setiap 5 detik.
// 2. Juga listen event `StatsUpdated` agar update langsung setelah
//    ada transaksi baru (tanpa menunggu polling).
//
// Data yang dikembalikan dipakai oleh:
// - HUD Header (Total TX, Volume, Unique Wallets)
// - Dashboard charts (data historis harian)
// - Leaderboard Top 10 wallets
// ============================================================

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { EVENT_AGGREGATOR_ABI } from "@/lib/contracts/abis";

export interface NetworkStats {
  totalTransactions: number;
  totalVolumeSTT: number;
  uniqueAddressCount: number;
  largestTxEver: string;       // Dalam format STT
  largestTxSender: string;
  topAddresses: string[];
  todayTxCount: number;
  todayVolume: string;         // Dalam format STT
  lastUpdated: Date | null;
}

const SOMNIA_RPC = process.env.NEXT_PUBLIC_SOMNIA_RPC || "https://dream-rpc.somnia.network";
const CHAIN_ID = 50312;
const POLL_INTERVAL_MS = 5000; // Polling setiap 5 detik

export function useNetworkStats() {
  const [stats, setStats] = useState<NetworkStats>({
    totalTransactions: 0,
    totalVolumeSTT: 0,
    uniqueAddressCount: 0,
    largestTxEver: "0",
    largestTxSender: "",
    topAddresses: [],
    todayTxCount: 0,
    todayVolume: "0",
    lastUpdated: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const contractRef = useRef<ethers.Contract | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ——————————————————————————————————————————
  // Fungsi pengambil data (bisa dipanggil kapanpun)
  // ——————————————————————————————————————————
  const fetchStats = useCallback(async () => {
    const contract = contractRef.current;
    if (!contract) return;

    try {
      // Panggil beberapa view functions secara paralel via Promise.all
      const [
        totalTx,
        volumeSTT,
        uniqueAddr,
        largestTx,
        largestSender,
        topAddrs,
        todayStats,
      ] = await Promise.all([
        contract.totalTransactions(),
        contract.getTotalVolumeSTT(),
        contract.uniqueAddressCount(),
        contract.largestTransactionEver(),
        contract.largestTxSender(),
        contract.getTopAddresses(),
        contract.getTodayStats(),
      ]);

      setStats({
        totalTransactions: Number(totalTx),
        totalVolumeSTT: Number(volumeSTT),
        uniqueAddressCount: Number(uniqueAddr),
        largestTxEver: parseFloat(ethers.formatEther(largestTx)).toLocaleString(),
        largestTxSender: largestSender,
        topAddresses: topAddrs.filter((a: string) => a !== ethers.ZeroAddress),
        todayTxCount: Number(todayStats.txCount),
        todayVolume: parseFloat(ethers.formatEther(todayStats.volume)).toLocaleString(),
        lastUpdated: new Date(),
      });
      setIsLoading(false);
    } catch (err) {
      console.warn("[useNetworkStats] Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const contractAddress = CONTRACT_ADDRESSES[CHAIN_ID].EventAggregator;

    if (contractAddress === "0x0000000000000000000000000000000000000000") {
      setError("EventAggregator belum di-deploy.");
      setIsLoading(false);
      return;
    }

    const setup = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(SOMNIA_RPC);
        providerRef.current = provider;

        const contract = new ethers.Contract(contractAddress, EVENT_AGGREGATOR_ABI, provider);
        contractRef.current = contract;

        // Fetch pertama kali
        if (mounted) await fetchStats();

        // Polling berkala
        intervalRef.current = setInterval(() => {
          if (mounted) fetchStats();
        }, POLL_INTERVAL_MS);

        // Listen event StatsUpdated untuk update langsung
        contract.on("StatsUpdated", () => {
          if (mounted) fetchStats();
        });

      } catch (err) {
        if (mounted) {
          setError("Gagal connect ke EventAggregator.");
          setIsLoading(false);
        }
      }
    };

    setup();

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      contractRef.current?.removeAllListeners();
      providerRef.current?.destroy();
    };
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}
