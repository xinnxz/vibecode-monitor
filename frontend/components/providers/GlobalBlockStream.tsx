"use client";

import { useEffect } from "react";
import { useBlockStream } from "@/hooks/useBlockStream";
import { useTpsStore } from "@/hooks/useTpsStore";

/**
 * An invisible global provider that runs ONE instance of useBlockStream
 * and pushes the new blocks/TPS into a global Zustand store.
 * 
 * This ensures that the Sidebar, Stat Cards, and Globe Scene receive
 * EXACTLY the same block objects at EXACTLY the same time, preventing
 * race conditions and UI desync where one component sees a block while another doesn't.
 */
export function GlobalBlockStream() {
  const { latestBlock, recentBlocks, tps } = useBlockStream();

  useEffect(() => {
    if (latestBlock) {
      useTpsStore.getState().setLatestBlock(latestBlock);
    }
  }, [latestBlock]);

  useEffect(() => {
    useTpsStore.getState().setRecentBlocks(recentBlocks);
  }, [recentBlocks]);

  useEffect(() => {
    useTpsStore.getState().setChainTps(tps);
  }, [tps]);

  return null;
}
