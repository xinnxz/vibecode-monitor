// app/(dashboard)/layout.tsx
// ============================================================
// Shared layout untuk semua halaman di balik globe dashboard.
// Route group (dashboard) tidak memengaruhi URL.
//
// Semua halaman /explorer, /whales, /alerts, /portfolio
// berbagi Navbar dan Sidebar yang sama dengan halaman utama /.
// ============================================================

import { Navbar }  from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#020408]">
      {/* Subtle grid overlay — cyberpunk feel */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Ambient radial highlight di tengah */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 70% 70% at 40% 50%, rgba(168,85,247,0.06) 0%, transparent 70%)" }}
      />

      <Navbar />

      {/* Main content scroll area */}
      <main className="absolute inset-0 pt-14 pr-64 overflow-y-auto">
        {children}
      </main>

      <Sidebar />
    </div>
  );
}
