import type { Metadata } from "next";
import { Orbitron, Share_Tech_Mono } from "next/font/google";
import { Web3Provider } from "@/lib/providers/Web3Provider";
import { Navbar } from "@/components/layout/Navbar";
import { SidebarWrapper } from "@/components/layout/SidebarWrapper";
import { GlobeSceneWrapper } from "@/components/globe/GlobeSceneWrapper";
import { GlobalBlockStream } from "@/components/providers/GlobalBlockStream";
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
          <GlobalBlockStream />
          {/* ——— Global Persistent 3D Background ——— */}
          <div className="fixed inset-0 z-0">
            <div className="w-full h-full mix-blend-screen pointer-events-none">
              <GlobeSceneWrapper />
            </div>
            {/* Cinematic Vignette Overlay */}
            <div className="absolute inset-0 vignette pointer-events-none z-0" />
          </div>

          {/* ——— Persistent Global UI (Navbar & Sidebar) ——— */}
          <Navbar />
          <div className="pointer-events-auto">
            <SidebarWrapper />
          </div>

          {/* ——— Page Content Layer ——— */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {children}
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
