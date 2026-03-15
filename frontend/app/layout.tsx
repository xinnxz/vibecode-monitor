import type { Metadata } from "next";
import { Rajdhani, Share_Tech_Mono } from "next/font/google";
import { Web3Provider } from "@/lib/providers/Web3Provider";
import "./globals.css";

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
    <html lang="en" className={`${rajdhani.variable} ${shareTechMono.variable} antialiased bg-black text-white`}>
      <body>
        {/* Web3Provider membungkus semua halaman agar bisa akses wallet + contract */}
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
