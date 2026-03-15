// hooks/useTpsStore.ts
// (Note: Retaining filename for simplicity, but it stores network data globally)
import { create } from 'zustand';
import { ProcessedBlock } from './useBlockStream';

interface NetworkStore {
  visualTps: number;
  setVisualTps: (tps: number) => void;
  // Real on-chain TPS pushed by the app's root
  chainTps: number;
  setChainTps: (tps: number) => void;
  
  // Instant Session Accumulators (Bypass slow contract reads for the demo)
  sessionTotalTx: number;
  addSessionTx: (count: number) => void;
  
  sessionWallets: Set<string>;
  addSessionWallets: (addresses: string[]) => void;
  
  sessionWhales: number;
  incrementSessionWhales: () => void;

  // Shared global block state so Globe and Sidebar are 100% perfectly synced
  latestBlock: ProcessedBlock | null;
  setLatestBlock: (block: ProcessedBlock) => void;
  recentBlocks: ProcessedBlock[];
  setRecentBlocks: (blocks: ProcessedBlock[]) => void;

  // Globe synchronization queue
  globeActiveBlocks: ProcessedBlock[];
  pushGlobeBlock: (block: ProcessedBlock) => void;
  shiftGlobeBlock: () => void;
}

export const useTpsStore = create<NetworkStore>((set) => ({
  visualTps: 0,
  setVisualTps: (tps) => set({ visualTps: tps }),
  chainTps: 0,
  setChainTps: (tps) => set({ chainTps: tps }),

  sessionTotalTx: 0,
  addSessionTx: (count) => set((state) => ({ sessionTotalTx: state.sessionTotalTx + count })),
  
  sessionWallets: new Set(),
  addSessionWallets: (addresses) => set((state) => {
    const newSet = new Set(state.sessionWallets);
    addresses.forEach(a => newSet.add(a));
    return { sessionWallets: newSet };
  }),
  
  sessionWhales: 0,
  incrementSessionWhales: () => set((state) => ({ sessionWhales: state.sessionWhales + 1 })),
  
  latestBlock: null,
  setLatestBlock: (block) => set({ latestBlock: block }),
  recentBlocks: [],
  setRecentBlocks: (blocks) => set({ recentBlocks: blocks }),

  globeActiveBlocks: [],
  pushGlobeBlock: (block) => set((state) => ({ globeActiveBlocks: [...state.globeActiveBlocks, block] })),
  shiftGlobeBlock: () => set((state) => ({ globeActiveBlocks: state.globeActiveBlocks.slice(1) })),
}));
