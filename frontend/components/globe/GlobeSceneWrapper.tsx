"use client";

import dynamic from "next/dynamic";

export const GlobeSceneWrapper = dynamic(
  () => import("@/components/globe/GlobeScene").then((m) => ({ default: m.GlobeScene })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full bg-[#010306]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/5 border-t-purple-500 animate-spin mx-auto mb-6 shadow-[0_0_15px_#a855f7]" />
          <p className="text-purple-400 font-mono text-xs tracking-widest uppercase animate-pulse">Initializing Telemetry...</p>
        </div>
      </div>
    ),
  }
);
