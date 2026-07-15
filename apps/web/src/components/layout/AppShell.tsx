"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  GitBranch,
  Bot,
  Settings,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  User,
  Shield,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, Badge, Button } from "../ui";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Chat", href: "/chat", icon: MessageSquare, badge: "New" },
  { label: "Repositories", href: "/repositories", icon: GitBranch },
  { label: "AI Agents", href: "/agents", icon: Bot, badge: "12" },
];

export function AppShell({
  children,
  user = { name: "Prashant Singh", email: "prashant@example.com", avatarUrl: null },
}: {
  children: React.ReactNode;
  user?: { name: string; email: string; avatarUrl?: string | null };
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#0A0A0F] font-sans">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "bg-[#07070a] border-r border-white/8 flex flex-col transition-all duration-300 relative z-30",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Sidebar Header Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/8 justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
              <Sparkles className="w-4 h-4 text-white animate-pulse-slow" />
            </div>
            {!collapsed && (
              <span className="font-bold text-sm text-white tracking-wide uppercase transition-all duration-200">
                Tony <span className="text-gradient">AI</span>
              </span>
            )}
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("sidebar-item group relative", isActive && "active")}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge && (
                  <Badge variant="default" className="ml-auto text-[8px] px-1.5 py-0">
                    {item.badge}
                  </Badge>
                )}
                {collapsed && (
                  <div className="absolute left-14 bg-popover border border-white/10 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-white/8 space-y-1.5">
          <Link href="/settings" className={cn("sidebar-item", pathname === "/settings" && "active")}>
            <Settings className="w-4 h-4" />
            {!collapsed && <span>Settings</span>}
          </Link>
          <button className="sidebar-item w-full text-left text-red-400/80 hover:text-red-400 hover:bg-red-500/5">
            <LogOut className="w-4 h-4 text-red-400/80" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Collapse Toggle Trigger */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#0d0d15] border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:border-white/20 transition-all shadow-md z-40"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* ── Main Layout Body ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Header */}
        <header className="h-16 border-b border-white/8 bg-[#07070a]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3 max-w-md w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search files, commits, actions..."
                className="tony-input pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative w-9 h-9 rounded-xl hover:bg-white/5 border border-white/8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_#4F6BFF]" />
            </button>

            <button className="w-9 h-9 rounded-xl hover:bg-white/5 border border-white/8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
              <HelpCircle className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-l border-white/8 pl-4">
              <Avatar src={user.avatarUrl} fallback={user.name[0]} className="h-9 w-9 border border-white/10" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-white leading-none">{user.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{user.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
