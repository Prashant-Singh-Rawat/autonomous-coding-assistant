"use client";

import { AppShell } from "@/components/layout/AppShell";

const DEMO_USER = {
  name: "Prashant Singh",
  email: "prashant@example.com",
  avatarUrl: null,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
