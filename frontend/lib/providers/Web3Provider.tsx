// lib/providers/Web3Provider.tsx
// ============================================================
// Provider wrapper untuk wagmi + @tanstack/react-query.
// Ini HARUS membungkus seluruh aplikasi agar komponen apapun
// bisa menggunakan hook useAccount, useContractRead, dll.
// ============================================================
"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { metaMask } from "wagmi/connectors";
import { somniaTestnet } from "@/lib/contracts/addresses";

// Konfigurasi wagmi — hubungkan ke Somnia Testnet via MetaMask
const config = createConfig({
  chains: [somniaTestnet],
  connectors: [
    metaMask(),
  ],
  transports: {
    [somniaTestnet.id]: http(somniaTestnet.rpcUrls.default.http[0]),
  },
});

// QueryClient untuk data fetching dan caching on-chain data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 5, // Data dianggap stale setelah 5 detik
      refetchInterval: 1000 * 3, // Auto-refetch setiap 3 detik
    },
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
