// hooks/useBlockStream.ts
// ============================================================
// Hook ini bertugas subscribe ke blok-blok baru yang diproduksi
// oleh jaringan Somnia secara real-time.
//
// Cara kerjanya:
// 1. Buat ethers.js JsonRpcProvider ke Somnia Testnet RPC.
// 2. Panggil provider.on("block", handler) — ini polling setiap
//    ~1 detik (setara WebSocket tapi lebih stabil di browser).
// 3. Untuk setiap blok baru, ambil detail블록 (hash, tx list, dll).
// 4. Simpan 50 blok terakhir di state (sliding window).
// 5. Hitung TPS dari rata-rata tx count di 10 blok terakhir.
//
// Data yang dikembalikan dipakai oleh:
// - Globe (memicu animasi per transaksi)
// - Sidebar terminal (menampilkan hash blok baru)
// - HUD (TPS, Block Height)
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";

// Tipe data untuk satu blok yang sudah diolah
export interface ProcessedBlock {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  gasUsed: bigint;
  transactions: string[]; // Array tx hash (max 20 per blok)
}

// Tipe data yang dikembalikan hook
export interface UseBlockStreamReturn {
  latestBlock: ProcessedBlock | null;
  recentBlocks: ProcessedBlock[];  // 50 blok terakhir
  tps: number;                     // Transaksi per detik (estimasi)
  isConnected: boolean;
  error: string | null;
}

const SOMNIA_RPC = process.env.NEXT_PUBLIC_SOMNIA_RPC || "https://dream-rpc.somnia.network";
const MAX_BLOCKS = 50; // Simpan 50 blok terakhir
const TPS_WINDOW = 10; // Hitung TPS dari 10 blok terakhir

export function useBlockStream(): UseBlockStreamReturn {
  const [latestBlock, setLatestBlock] = useState<ProcessedBlock | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<ProcessedBlock[]>([]);
  const [tps, setTps] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gunakan ref untuk provider agar tidak trigger re-render saat cleanup
  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const blocksRef = useRef<ProcessedBlock[]>([]);

  // ——————————————————————————————————————————
  // Hitung TPS dari N blok terakhir
  // ——————————————————————————————————————————
  const calculateTPS = useCallback((blocks: ProcessedBlock[]): number => {
    if (blocks.length < 2) return 0;

    // Ambil N blok terakhir untuk kalkulasi
    const window = blocks.slice(-TPS_WINDOW);
    if (window.length < 2) return 0;

    const totalTx = window.reduce((sum, b) => sum + b.txCount, 0);
    const timespan = window[window.length - 1].timestamp - window[0].timestamp;

    if (timespan <= 0) return 0;
    return Math.round(totalTx / timespan);
  }, []);

  // ——————————————————————————————————————————
  // Setup koneksi dan listener
  // ——————————————————————————————————————————
  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(SOMNIA_RPC);
        providerRef.current = provider;

        // Tes koneksi
        await provider.getNetwork();
        if (mounted) setIsConnected(true);

        // ——— Listener utama: setiap blok baru ———
        provider.on("block", async (blockNumber: number) => {
          if (!mounted) return;

          try {
            // Ambil detail blok termasuk semua transaksi
            const block = await provider.getBlock(blockNumber, false);
            if (!block) return;

            const processed: ProcessedBlock = {
              number: block.number,
              hash: block.hash || "",
              timestamp: block.timestamp,
              txCount: block.transactions.length,
              gasUsed: block.gasUsed,
              // Batasi ke 20 tx pertama agar tidak terlalu berat
              transactions: block.transactions.slice(0, 20) as string[],
            };

            // Update sliding window
            blocksRef.current = [...blocksRef.current, processed].slice(-MAX_BLOCKS);

            if (mounted) {
              setLatestBlock(processed);
              setRecentBlocks([...blocksRef.current]);
              setTps(calculateTPS(blocksRef.current));
            }
          } catch (err) {
            // Abaikan error per-blok (mungkin RPC timeout sesekali)
            console.warn("[useBlockStream] Error fetching block:", err);
          }
        });

      } catch (err) {
        if (mounted) {
          setError("Gagal terhubung ke Somnia Testnet. Periksa koneksi internet.");
          setIsConnected(false);
          console.error("[useBlockStream] Connection error:", err);
        }
      }
    };

    setup();

    // ——— Cleanup: lepaskan listener saat komponen unmount ———
    return () => {
      mounted = false;
      if (providerRef.current) {
        providerRef.current.removeAllListeners();
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [calculateTPS]);

  return { latestBlock, recentBlocks, tps, isConnected, error };
}
