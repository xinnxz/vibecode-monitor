import { create } from 'zustand';

interface TpsStore {
  visualTps: number;
  setVisualTps: (tps: number) => void;
}

export const useTpsStore = create<TpsStore>((set) => ({
  visualTps: 0,
  setVisualTps: (tps) => set({ visualTps: tps }),
}));
