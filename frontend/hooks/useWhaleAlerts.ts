// hooks/useWhaleAlerts.ts
// ============================================================
// Hook ini listen event `WhaleAlert` dari smart contract
// WhaleDetector yang sudah di-deploy di Somnia Testnet.
//
// Cara kerjanya:
// 1. Buat ethers.js Contract instance dari WhaleDetector address + ABI.
// 2. Panggil contract.on("WhaleAlert", handler) untuk subscribe events.
// 3. Setiap kali Somnia Reactivity memicu _onEvent() di WhaleDetector
//    dan emit WhaleAlert → handler kita dipanggil secara otomatis.
// 4. Simpan 20 alert terakhir di state.
//
// Output hook ini dipakai oleh:
// - Globe: memicu animasi Red Wave Pulse + Spatial Audio Siren
// - Whale Tracker page: menampilkan live feed whale movements
// ============================================================

"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { WHALE_DETECTOR_ABI } from "@/lib/contracts/abis";

// Tipe satu WhaleAlert event
export interface WhaleAlertEvent {
  id: string;          // alertId dari contract
  from: string;        // Alamat pengirim
  to: string;          // Alamat penerima
  amount: bigint;      // Jumlah dalam wei
  amountFormatted: string; // Jumlah dalam STT (human-readable)
  timestamp: number;   // Unix timestamp
  txHash?: string;     // Hash transaksi (opsional)
}

const SOMNIA_RPC = process.env.NEXT_PUBLIC_SOMNIA_RPC || "https://dream-rpc.somnia.network";
const CHAIN_ID = 50312;
const MAX_ALERTS = 20;

export function useWhaleAlerts() {
  const [alerts, setAlerts] = useState<WhaleAlertEvent[]>([]);
  const [latestAlert, setLatestAlert] = useState<WhaleAlertEvent | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const contractRef = useRef<ethers.Contract | null>(null);

  useEffect(() => {
    let mounted = true;

    const contractAddress = CONTRACT_ADDRESSES[CHAIN_ID].WhaleDetector;

    // Jika address masih zero (belum deploy), skip
    if (contractAddress === "0x0000000000000000000000000000000000000000") {
      setError("WhaleDetector contract belum di-deploy. Jalankan npm run contracts:deploy terlebih dahulu.");
      return;
    }

    const setup = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(SOMNIA_RPC);
        providerRef.current = provider;

        const contract = new ethers.Contract(
          contractAddress,
          WHALE_DETECTOR_ABI,
          provider
        );
        contractRef.current = contract;

        // ——— Listen event WhaleAlert ———
        // Event signature: WhaleAlert(address from, address to, uint256 amount, uint256 alertId, uint256 timestamp)
        contract.on(
          "WhaleAlert",
          (from: string, to: string, amount: bigint, alertId: bigint, timestamp: bigint) => {
            if (!mounted) return;

            const alert: WhaleAlertEvent = {
              id: alertId.toString(),
              from,
              to,
              amount,
              amountFormatted: parseFloat(ethers.formatEther(amount)).toLocaleString("en-US", {
                maximumFractionDigits: 2,
              }),
              timestamp: Number(timestamp),
            };

            setLatestAlert(alert);
            setAlerts((prev) => [alert, ...prev].slice(0, MAX_ALERTS));
          }
        );

        if (mounted) setIsListening(true);

      } catch (err) {
        if (mounted) {
          setError("Gagal connect ke WhaleDetector contract.");
          console.error("[useWhaleAlerts] Error:", err);
        }
      }
    };

    setup();

    return () => {
      mounted = false;
      contractRef.current?.removeAllListeners();
      providerRef.current?.destroy();
    };
  }, []);

  return { alerts, latestAlert, isListening, error };
}
