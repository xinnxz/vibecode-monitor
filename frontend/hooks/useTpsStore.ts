import { create } from 'zustand';

interface TpsStore {
  visualTps: number;
  setVisualTps: (tps: number) => void;
  // Real on-chain TPS pushed by the Sidebar's useBlockStream connection
  chainTps: number;
  setChainTps: (tps: number) => void;
}

export const useTpsStore = create<TpsStore>((set) => ({
  visualTps: 0,
  setVisualTps: (tps) => set({ visualTps: tps }),
  chainTps: 0,
  setChainTps: (tps) => set({ chainTps: tps }),
}));
