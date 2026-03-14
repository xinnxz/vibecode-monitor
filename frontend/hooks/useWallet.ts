// hooks/useWallet.ts
// ============================================================
// Hook wrapper di atas wagmi untuk memudahkan wallet management.
//
// Menggabungkan: useAccount + useConnect + useDisconnect + useChainId
// menjadi satu interface yang bersih, dan menambahkan logika
// tambahan seperti:
// - Cek apakah user berada di jaringan Somnia yang benar
// - Request switch chain otomatis jika chain salah
// - Format address untuk tampilan (0x1234...abcd)
// ============================================================

"use client";

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { useCallback } from "react";
import { somniaTestnet } from "@/lib/contracts/addresses";

export function useWallet() {
  const { address, isConnected, isConnecting, status } = useAccount();
  const { connect, connectors, isPending: isConnecting2 } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // ——— Cek apakah user di Somnia Testnet ———
  const isCorrectChain = chainId === somniaTestnet.id;

  // ——— Format address: 0x1234...abcd ———
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  // ——— Connect dengan MetaMask ———
  const connectWallet = useCallback(() => {
    const metaMaskConnector = connectors.find((c) => c.name === "MetaMask");
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector });
    } else {
      // Fallback ke connector pertama yang ada
      connect({ connector: connectors[0] });
    }
  }, [connect, connectors]);

  // ——— Switch ke Somnia Testnet ———
  const switchToSomnia = useCallback(() => {
    switchChain({ chainId: somniaTestnet.id });
  }, [switchChain]);

  // ——— Disconnect wallet ———
  const disconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return {
    address,
    shortAddress,
    isConnected,
    isConnecting: isConnecting || isConnecting2,
    isCorrectChain,
    isSwitching,
    chainId,
    status,
    connectWallet,
    disconnectWallet,
    switchToSomnia,
  };
}
