// lib/providers/Web3Provider.tsx
// ============================================================
// Provider wrapper untuk wagmi + @tanstack/react-query.
// Ini HARUS membungkus seluruh aplikasi agar komponen apapun
// bisa menggunakan hook useAccount, useContractRead, dll.
// ============================================================
"use client";

import { useState } from "react";
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

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // Store QueryClient in state to avoid React Hydration mismatch / CSR state bleeding
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 5, // Data dianggap stale setelah 5 detik
        refetchInterval: 1000 * 3, // Auto-refetch setiap 3 detik
      },
    },
  }));

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
