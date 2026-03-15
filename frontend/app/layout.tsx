import type { Metadata } from "next";
import { Orbitron, Share_Tech_Mono } from "next/font/google";
import { Web3Provider } from "@/lib/providers/Web3Provider";
import dynamic from "next/dynamic";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-display',
});

const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
});

// Dynamic import for persistent GlobeScene background
const GlobeScene = dynamic(
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

// Dynamic import for Sidebar to avoid SSR polling issues
const Sidebar = dynamic(
  () => import("@/components/layout/Sidebar").then((m) => ({ default: m.Sidebar })),
  { ssr: false }
);

import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: 'SomniaScan | Pulse',
  description: 'Mission Control interface for Somnia Testnet.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${shareTechMono.variable} antialiased bg-[#010204] text-white`}>
      <body>
        <Web3Provider>
          {/* ——— Global Persistent 3D Background ——— */}
          <div className="fixed inset-0 z-0">
            <div className="w-full h-full mix-blend-screen pointer-events-none">
              <GlobeScene />
            </div>
            {/* Cinematic Vignette Overlay */}
            <div className="absolute inset-0 vignette pointer-events-none z-0" />
          </div>

          {/* ——— Persistent Global UI (Navbar & Sidebar) ——— */}
          <Navbar />
          <div className="pointer-events-auto">
            <Sidebar />
          </div>

          {/* ——— Page Content Layer ——— */}
          <div className="relative z-10 w-full h-full pointer-events-none">
            {children}
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
