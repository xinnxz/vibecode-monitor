// hooks/useAlertEngine.ts
// ============================================================
// Hook ini mengelola interaksi dengan AlertEngine smart contract.
// Memungkinkan user membuat, melihat, dan menonaktifkan alert rules
// langsung dari browser tanpa backend apapun.
//
// Operasi yang ada:
// - READ:  ambil semua rules milik wallet yang terhubung
// - WRITE: buat rule baru (amount/from address/to address alert)
// - WRITE: nonaktifkan rule yang ada
//
// Perbedaan dengan hooks sebelumnya:
// Hook ini butuh WALLET (signer) untuk operasi write,
// sedangkan read cukup pakai provider biasa.
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWalletClient, useAccount } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { ALERT_ENGINE_ABI } from "@/lib/contracts/abis";

export interface AlertRule {
  id: number;
  owner: string;
  conditionType: "AMOUNT_GREATER_THAN" | "AMOUNT_LESS_THAN" | "FROM_ADDRESS" | "TO_ADDRESS" | "ANY_TRANSFER";
  amountThreshold: string;  // Dalam STT (human-readable)
  targetAddress: string;
  message: string;
  isActive: boolean;
  triggerCount: number;
  createdAt: Date;
}

const SOMNIA_RPC = process.env.NEXT_PUBLIC_SOMNIA_RPC || "https://dream-rpc.somnia.network";
const CHAIN_ID = 50312;

const CONDITION_MAP: { [key: number]: AlertRule["conditionType"] } = {
  0: "AMOUNT_GREATER_THAN",
  1: "AMOUNT_LESS_THAN",
  2: "FROM_ADDRESS",
  3: "TO_ADDRESS",
  4: "ANY_TRANSFER",
};

export function useAlertEngine() {
  const [myRules, setMyRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTxPending, setIsTxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const contractAddress = CONTRACT_ADDRESSES[CHAIN_ID].AlertEngine;

  // ——————————————————————————————————————————
  // Buat ethers Signer dari wagmi walletClient
  // ——————————————————————————————————————————
  const getSigner = useCallback(async () => {
    if (!walletClient) throw new Error("Wallet tidak terhubung");
    const { account, chain, transport } = walletClient;
    const network = { chainId: chain.id, name: chain.name, ensAddress: undefined };
    const provider = new ethers.BrowserProvider(transport as ethers.Eip1193Provider, network);
    return provider.getSigner(account.address);
  }, [walletClient]);

  // ——————————————————————————————————————————
  // Ambil semua rules milik user (READ)
  // ——————————————————————————————————————————
  const fetchMyRules = useCallback(async () => {
    if (!address || !isConnected) return;
    if (contractAddress === "0x0000000000000000000000000000000000000000") return;

    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(SOMNIA_RPC);
      const contract = new ethers.Contract(contractAddress, ALERT_ENGINE_ABI, provider);

      const ruleIds: bigint[] = await contract.getUserRuleIds(address);
      const rulePromises = ruleIds.map((id) => contract.getRule(id));
      const rawRules = await Promise.all(rulePromises);

      const processedRules: AlertRule[] = rawRules.map((r) => ({
        id: Number(r.id),
        owner: r.owner,
        conditionType: CONDITION_MAP[Number(r.condition)] || "ANY_TRANSFER",
        amountThreshold: parseFloat(ethers.formatEther(r.amountThreshold)).toLocaleString(),
        targetAddress: r.targetAddress,
        message: r.message,
        isActive: r.isActive,
        triggerCount: Number(r.triggerCount),
        createdAt: new Date(Number(r.createdAt) * 1000),
      }));

      setMyRules(processedRules);
    } catch (err) {
      setError("Gagal mengambil alert rules.");
      console.error("[useAlertEngine] fetchMyRules error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, contractAddress]);

  useEffect(() => {
    fetchMyRules();
  }, [fetchMyRules]);

  // ——————————————————————————————————————————
  // Buat Amount Alert baru (WRITE)
  // ——————————————————————————————————————————
  const createAmountAlert = useCallback(async (thresholdSTT: number, message: string) => {
    setIsTxPending(true);
    setError(null);
    try {
      const signer = await getSigner();
      const contract = new ethers.Contract(contractAddress, ALERT_ENGINE_ABI, signer);
      const thresholdWei = ethers.parseEther(thresholdSTT.toString());
      const tx = await contract.createAmountAlert(thresholdWei, message);
      await tx.wait();
      await fetchMyRules(); // refresh setelah tx
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaksi gagal";
      setError(msg);
    } finally {
      setIsTxPending(false);
    }
  }, [getSigner, contractAddress, fetchMyRules]);

  // ——————————————————————————————————————————
  // Buat Address Watcher Alert baru (WRITE)
  // ——————————————————————————————————————————
  const createAddressAlert = useCallback(async (
    watchedAddress: string,
    direction: "from" | "to",
    message: string
  ) => {
    setIsTxPending(true);
    setError(null);
    try {
      const signer = await getSigner();
      const contract = new ethers.Contract(contractAddress, ALERT_ENGINE_ABI, signer);
      const tx = direction === "from"
        ? await contract.createFromAddressAlert(watchedAddress, message)
        : await contract.createToAddressAlert(watchedAddress, message);
      await tx.wait();
      await fetchMyRules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaksi gagal";
      setError(msg);
    } finally {
      setIsTxPending(false);
    }
  }, [getSigner, contractAddress, fetchMyRules]);

  // ——————————————————————————————————————————
  // Nonaktifkan rule (WRITE)
  // ——————————————————————————————————————————
  const deactivateRule = useCallback(async (ruleId: number) => {
    setIsTxPending(true);
    setError(null);
    try {
      const signer = await getSigner();
      const contract = new ethers.Contract(contractAddress, ALERT_ENGINE_ABI, signer);
      const tx = await contract.deactivateRule(ruleId);
      await tx.wait();
      await fetchMyRules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaksi gagal";
      setError(msg);
    } finally {
      setIsTxPending(false);
    }
  }, [getSigner, contractAddress, fetchMyRules]);

  return {
    myRules,
    isLoading,
    isTxPending,
    error,
    createAmountAlert,
    createAddressAlert,
    deactivateRule,
    refresh: fetchMyRules,
  };
}
