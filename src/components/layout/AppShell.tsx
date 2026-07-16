"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, GitBranch, Bot, Settings, Bell,
  Search, ChevronLeft, ChevronRight, LogOut, Sparkles, HelpCircle,
  GitPullRequest, AlertCircle, GitCommitHorizontal, Network, Shield,
  Zap, BarChart3, BookOpen, Rocket, Plug2, Users, Code2, ChevronDown,
  Plus, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, Badge } from "../ui";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

interface UserProfile {
  email: string;
  github_username: string | null;
  github_avatar_url: string | null;
  github_connected: boolean;
}

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { label: "Dashboard",      href: "/dashboard",    icon: LayoutDashboard },
      { label: "AI Workspace",   href: "/workspace",    icon: MessageSquare,   badge: "New" },
      { label: "AI Agents",      href: "/agents",       icon: Bot },
    ],
  },
  {
    label: "Repository",
    items: [
      { label: "Repositories",   href: "/repositories", icon: GitBranch },
      { label: "Code Explorer",  href: "/workspace",    icon: Code2 },
      { label: "Knowledge Graph",href: "/workspace",    icon: Network },
    ],
  },
  {
    label: "GitHub",
    items: [
      { label: "Pull Requests",  href: "/github", repoAware: true, tab: "prs",     icon: GitPullRequest,  liveCount: "prs" },
      { label: "Issues",         href: "/github", repoAware: true, tab: "issues",  icon: AlertCircle,     liveCount: "issues" },
      { label: "Commits",        href: "/github", repoAware: true, tab: "commits", icon: GitCommitHorizontal },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Security Center",href: "/workspace",    icon: Shield },
      { label: "Automation Center", href: "/automation-center", icon: Zap },
      { label: "Analytics",      href: "/workspace",    icon: BarChart3 },
      { label: "Documentation",  href: "/workspace",    icon: BookOpen },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Deployments",    href: "/workspace",    icon: Rocket },
      { label: "Integrations",   href: "/settings",     icon: Plug2 },
      { label: "Health Ops",     href: "/health",       icon: Activity },
    ],
  },
];

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeRepoName, setActiveRepoName] = useState<string | null>(null);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load live user profile
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setUser(data))
      .catch(() => {});

    // Load active repo from localStorage — re-read on every pathname change
    const repoId = localStorage.getItem("active_repo_id");
    if (repoId) {
      setActiveRepoId(repoId);
      fetch(`${API}/repositories/${repoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => data && setActiveRepoName(data.name))
        .catch(() => {});
    }
  }, [pathname]); // Re-run when pathname changes so switching repos updates the sidebar

  function handleSignOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("active_repo_id");
    router.push("/auth/login");
  }

  const displayName = user?.github_username
    ? `@${user.github_username}`
    : user?.email?.split("@")[0] ?? "User";
  const displayEmail = user?.email ?? "";
  const avatarSrc = user?.github_avatar_url ?? null;
  const avatarFallback = displayName[0]?.toUpperCase() ?? "U";

  return (
    <div className="min-h-screen flex bg-[#0A0A0F] font-sans">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "bg-[#07070a] border-r border-white/8 flex flex-col transition-all duration-300 relative z-30",
          collapsed ? "w-[54px]" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-3.5 border-b border-white/8 justify-between flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            {!collapsed && (
              <span className="font-bold text-sm text-white tracking-wide truncate">
                Tony <span className="text-gradient">AI</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => router.push("/onboarding/repositories")}
              className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all flex-shrink-0"
              title="Switch repository"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Active repo badge */}
        {!collapsed && activeRepoName && (
          <div className="px-3 pt-2.5 pb-0">
            <button
              onClick={() => router.push("/onboarding/repositories")}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/15 transition-all group"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-[11px] font-medium text-brand-300 truncate flex-1 text-left">
                {activeRepoName}
              </span>
              <ChevronDown className="w-3 h-3 text-brand-400/50 group-hover:text-brand-300 flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto no-scrollbar space-y-0.5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <p className="text-[9px] uppercase tracking-widest text-white/20 font-semibold px-2 py-1.5 mt-1">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                // Build the href dynamically for repo-aware links
                const resolvedHref = (item as any).repoAware && activeRepoId
                  ? `/github/${activeRepoId}`
                  : item.href;
                const isActive =
                  pathname === resolvedHref ||
                  (resolvedHref !== "/workspace" && pathname?.startsWith(resolvedHref + "/")) ||
                  // Also highlight if on the github page even without repoId resolved
                  (pathname?.startsWith("/github") && item.href === "/github");
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={resolvedHref}
                    className={cn(
                      "sidebar-item group relative text-[12px]",
                      isActive && "active"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                    {collapsed && (
                      <div className="absolute left-[50px] bg-[#111118] border border-white/10 text-white text-[11px] rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/8 p-2 space-y-0.5">
          <Link
            href="/settings"
            className={cn("sidebar-item text-[12px]", pathname?.startsWith("/settings") && "active")}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="w-3.5 h-3.5 flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
          <Link
            href="/settings"
            className="sidebar-item text-[12px]"
            title={collapsed ? "Team" : undefined}
          >
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            {!collapsed && <span>Team</span>}
          </Link>
          <button
            onClick={handleSignOut}
            className="sidebar-item w-full text-left text-red-400/70 hover:text-red-300 hover:bg-red-500/5 text-[12px]"
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-[#0d0d15] border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:border-white/20 transition-all shadow-md z-40"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-white/8 bg-[#07070a]/80 backdrop-blur-md flex items-center justify-between px-5 sticky top-0 z-20 flex-shrink-0">
          <div className="flex items-center gap-3 max-w-sm w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files, commits, PRs… ⌘/"
                className="tony-input pl-9 h-8 text-xs w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative w-8 h-8 rounded-lg hover:bg-white/5 border border-white/8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
              <Bell className="w-3.5 h-3.5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500" />
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-white/5 border border-white/8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-white/8 pl-3">
              <Avatar
                src={avatarSrc}
                fallback={avatarFallback}
                className="h-8 w-8 border border-white/10"
              />
              <div className="hidden md:block text-left">
                <p className="text-[11px] font-semibold text-white leading-none">{displayName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">{displayEmail}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
