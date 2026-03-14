import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/lib/providers/Web3Provider";

// Font utama: Space Grotesk — modern, futuristik
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Font monospace untuk terminal/hash display
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "SomniaScan — Reactive Blockchain Intelligence Platform",
  description:
    "Real-time 3D blockchain visualizer and intelligence platform for the Somnia Network. Watch transactions fly across the globe, track whale movements, and build custom on-chain alerts.",
  keywords: ["Somnia", "blockchain", "explorer", "Web3", "3D globe", "DeFi"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${spaceMono.variable} antialiased bg-black text-white`}
      >
        {/* Web3Provider membungkus semua halaman agar bisa akses wallet + contract */}
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
