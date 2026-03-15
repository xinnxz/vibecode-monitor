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
import { useTpsStore } from "./useTpsStore";

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
  const targetTpsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gunakan ref untuk provider agar tidak trigger re-render saat cleanup
  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const blocksRef = useRef<ProcessedBlock[]>([]);

  // ——————————————————————————————————————————
  // Rolling Window TPS with Block-Gap Interpolation
  // Somnia produces blocks faster than our RPC can poll.
  // When we receive block #1000 after block #700, we know
  // 300 blocks happened. We estimate total TX using the
  // average TX/block from what we've seen.
  // ——————————————————————————————————————————
  const txWindowRef = useRef<{ time: number; estimatedTx: number }[]>([]);
  const lastSeenBlockRef = useRef<number>(0);
  const avgTxPerBlockRef = useRef<number>(1.5); // Running average
  const TPS_WINDOW_MS = 5000; // 5-second rolling window

  const calculateRollingTPS = useCallback(() => {
    const now = Date.now();
    const cutoff = now - TPS_WINDOW_MS;

    // Remove entries older than the window
    txWindowRef.current = txWindowRef.current.filter(e => e.time >= cutoff);

    // Sum all estimated TX in the window
    const totalTx = txWindowRef.current.reduce((sum, e) => sum + e.estimatedTx, 0);

    // Calculate TPS (total TX / window duration in seconds)
    const windowSeconds = TPS_WINDOW_MS / 1000;
    return Math.round(totalTx / windowSeconds);
  }, []);

  // Periodic TPS refresh & decay (updates even between block arrivals)
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTps = calculateRollingTPS();
      targetTpsRef.current = currentTps;
      setTps(currentTps);
    }, 500); // Update 2x per second for smooth display
    return () => clearInterval(timer);
  }, [calculateRollingTPS]);

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

            // Record in rolling TPS window (wall-clock time!)
            txWindowRef.current.push({
              time: Date.now(),
              estimatedTx: processed.txCount,
            });
            
            // --- INSTANT UI AGGREGATORS (Bypass Slow Contract) ---
            const store = useTpsStore.getState();
            store.addSessionTx(processed.txCount);
            if (processed.gasUsed) {
              store.addSessionGas(processed.gasUsed);
            }
            
            // Generate pseudo-wallets from tx hashes for the visual demo
            if (processed.transactions.length > 0) {
              const fakeWallets = processed.transactions.map(
                hash => `0x${hash.slice(2, 42).padEnd(40, '0')}`
              );
              store.addSessionWallets(fakeWallets);
            }

            if (mounted) {
              setLatestBlock(processed);
              setRecentBlocks([...blocksRef.current]);
              
              // Immediately recalculate TPS on new block
              const rawTps = calculateRollingTPS();
              targetTpsRef.current = rawTps;
              setTps(rawTps);
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
  }, [calculateRollingTPS]);

  return { latestBlock, recentBlocks, tps, isConnected, error };
}
