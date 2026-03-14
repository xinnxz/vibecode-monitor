// lib/contracts/addresses.ts
// ============================================================
// Alamat-alamat smart contract SomniaScan di Somnia Testnet.
// Diisi setelah menjalankan: npm run contracts:deploy
// ============================================================

export const CONTRACT_ADDRESSES = {
  // Chain ID 50312 = Somnia Testnet
  50312: {
    WhaleDetector: process.env.NEXT_PUBLIC_WHALE_DETECTOR_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000",
    AlertEngine: process.env.NEXT_PUBLIC_ALERT_ENGINE_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000",
    EventAggregator: process.env.NEXT_PUBLIC_EVENT_AGGREGATOR_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000",
    ScopeRegistry: process.env.NEXT_PUBLIC_SCOPE_REGISTRY_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000",
  },
} as const;

// Somnia Testnet chain definition (untuk wagmi)
export const somniaTestnet = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: {
    name: "Somnia Testnet Token",
    symbol: "STT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_SOMNIA_RPC || "https://dream-rpc.somnia.network"],
      webSocket: ["wss://dream-rpc.somnia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Shannon Explorer",
      url: "https://shannon.somnia.network",
    },
  },
  testnet: true,
} as const;
