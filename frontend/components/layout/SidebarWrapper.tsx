"use client";

import dynamic from "next/dynamic";

export const SidebarWrapper = dynamic(
  () => import("@/components/layout/Sidebar").then((m) => ({ default: m.Sidebar })),
  { ssr: false }
);
