"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, GitBranch, Star, GitFork, Users, FileCode2, Folder,
  Shield, GitPullRequest, AlertCircle, GitCommitHorizontal, ArrowRight,
  Loader2, AlertTriangle, Github, CheckCircle2, Lock, Zap, BookOpen,
  BarChart3, Network, Cpu, Clock, ExternalLink, RefreshCw, ChevronRight,
  Activity, Code2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Progress } from "@/components/ui";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashStats {
  file_count: number; folder_count: number;
  language_breakdown: Record<string, number>;
  repo_name: string; repo_branch: string; repo_visibility: string; repo_status: string;
  stars: number; forks: number; watchers: number;
  open_prs: number; open_issues: number; contributors: number; size_kb: number;
  description: string | null; primary_language: string | null; topics: string[];
  arch_summary: string; arch_languages: string[]; arch_frameworks: string[];
  security_issues: number; security_critical: number; security_high: number;
  security_medium: number; security_scanned_files: number;
  recent_commits: Commit[]; recent_events: RepoEvent[]; active_jobs: Job[];
}

interface Commit {
  sha: string; message: string; author: string;
  author_avatar: string | null; date: string | null; url: string;
}
interface RepoEvent {
  stage: string; event_type: string; detail: string;
  progress_current: number; progress_total: number; created_at: string;
}
interface Job { id: string; job_type: string; status: string; created_at: string | null; }

// ── Language colour palette ────────────────────────────────────────────────────
const LANG_COLORS: Record<string, string> = {
  typescript: "#3178c6", javascript: "#f7df1e", python: "#3572A5",
  tsx: "#61dafb", jsx: "#61dafb", go: "#00ADD8", rust: "#dea584",
  java: "#b07219", css: "#563d7c", html: "#e34c26", json: "#292929",
  markdown: "#6e7681", yaml: "#cb171e", bash: "#89e051",
  csharp: "#178600", ruby: "#701516", php: "#4F5D95", swift: "#ffac45",
  kotlin: "#A97BFF", sql: "#e38c00", graphql: "#e10098", text: "#8b949e",
};

function langColor(lang: string) {
  return LANG_COLORS[lang.toLowerCase()] ?? "#8b949e";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── No GitHub screen ───────────────────────────────────────────────────────────
function NoGitHubScreen() {
  const UNLOCK_FEATURES = [
    { icon: MessageSquare, label: "AI Chat" },
    { icon: Network, label: "Knowledge Graph" },
    { icon: Shield, label: "Security Scanner" },
    { icon: GitPullRequest, label: "PR Assistant" },
    { icon: BookOpen, label: "Documentation" },
    { icon: Zap, label: "Automation" },
    { icon: BarChart3, label: "Analytics" },
    { icon: Code2, label: "Performance Review" },
  ] as const;

  return (
    <div className="min-h-[calc(100vh-56px)] grid lg:grid-cols-[1fr_360px]">
      {/* Left — hero */}
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-48 h-48 mb-8"
        >
          {/* Pulsing rings */}
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-brand-500/20 animate-ping"
              style={{ animationDelay: `${i * 0.4}s`, animationDuration: "2.5s" }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-36 h-36 rounded-full bg-gradient-to-br from-brand-600/20 to-purple-600/20 border border-white/10 flex items-center justify-center backdrop-blur">
              <Github className="w-16 h-16 text-white/30" />
            </div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-white mb-3"
        >
          No GitHub Account Connected
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-white/50 max-w-sm leading-relaxed mb-8"
        >
          Connect your GitHub account to unlock Tony AI. Tony analyses your repositories,
          reviews pull requests, fixes bugs, explains projects, and automates engineering workflows.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <a
            href={`${API}/auth/github/login`}
            className="flex items-center justify-center gap-2.5 h-12 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-glow-sm"
          >
            <Github className="w-4 h-4" />
            Connect GitHub
          </a>
          <button className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/8 hover:text-white transition-all">
            Learn More
          </button>
        </motion.div>

        {/* Features unlock grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 w-full max-w-lg"
        >
          <p className="text-[10px] uppercase tracking-widest text-white/30 mb-4 font-semibold">
            What you'll unlock
          </p>
          <div className="grid grid-cols-4 gap-3">
            {UNLOCK_FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-white/30" />
                </div>
                <span className="text-[10px] text-white/30 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right — Getting Started panel */}
      <div className="border-l border-white/5 bg-black/10 p-8 flex flex-col gap-6">
        <div>
          <h2 className="text-sm font-semibold text-white mb-4">Getting Started</h2>
          {[
            { step: 1, label: "Connect GitHub", desc: "Authorize and connect your account", done: false },
            { step: 2, label: "Select Repository", desc: "Choose a repository to analyze", done: false },
            { step: 3, label: "Index Repository", desc: "We'll analyze and build knowledge", done: false },
            { step: 4, label: "Start Chatting", desc: "Chat with AI and explore insights", done: false },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3 mb-5">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5",
                s.done
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-white/30 border border-white/10"
              )}>
                {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
              </div>
              <div>
                <p className={cn("text-xs font-medium", s.done ? "text-white" : "text-white/40")}>{s.label}</p>
                <p className="text-[11px] text-white/25 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  title, value, icon: Icon, color, subtitle, href,
}: {
  title: string; value: string | number; icon: React.ElementType;
  color: string; subtitle?: string; href?: string;
}) {
  const inner = (
    <Card className="hover:border-white/10 hover:bg-white/[0.025] transition-all cursor-pointer group">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <h3 className="text-xl font-bold text-white mt-1">{value}</h3>
          {subtitle && <span className="text-[10px] text-white/30 mt-1 block">{subtitle}</span>}
        </div>
        <div className={cn("w-10 h-10 rounded-xl bg-white/[0.03] border border-white/6 flex items-center justify-center flex-shrink-0 group-hover:border-white/12 transition-all")}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Language bar ───────────────────────────────────────────────────────────────
function LanguageBar({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const sorted = Object.entries(breakdown).sort(([, a], [, b]) => b - a).slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
        {sorted.map(([lang, count]) => (
          <div
            key={lang}
            style={{ width: `${(count / total) * 100}%`, backgroundColor: langColor(lang) }}
            title={`${lang}: ${Math.round((count / total) * 100)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {sorted.map(([lang, count]) => (
          <div key={lang} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: langColor(lang) }} />
            <span className="text-[11px] text-white/60">{lang}</span>
            <span className="text-[11px] text-white/30">{Math.round((count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
function RealDashboard({ stats, repoId, onRefresh }: {
  stats: DashStats; repoId: string; onRefresh: () => void;
}) {
  const [prompt, setPrompt] = useState("");

  const securityColor = stats.security_critical > 0
    ? "text-red-400" : stats.security_high > 0
    ? "text-amber-400" : "text-emerald-400";

  const totalFiles = stats.file_count;

  const statCards = [
    { title: "Files Indexed",    value: totalFiles,             icon: FileCode2,           color: "text-brand-400",   subtitle: `${stats.folder_count} folders` },
    { title: "Open PRs",         value: stats.open_prs,         icon: GitPullRequest,      color: "text-violet-400",  href: `/github/${repoId}` },
    { title: "Open Issues",      value: stats.open_issues,      icon: AlertCircle,         color: "text-amber-400",   href: `/github/${repoId}` },
    { title: "Security Alerts",  value: stats.security_issues,  icon: Shield,              color: securityColor,      subtitle: stats.security_critical > 0 ? `${stats.security_critical} critical` : "Clean" },
    { title: "Contributors",     value: stats.contributors,     icon: Users,               color: "text-sky-400" },
    { title: "Stars",            value: stats.stars,            icon: Star,                color: "text-yellow-400" },
    { title: "Forks",            value: stats.forks,            icon: GitFork,             color: "text-emerald-400" },
    { title: "Repo Size",        value: `${Math.round(stats.size_kb / 1024 * 10) / 10 || stats.size_kb} ${stats.size_kb > 1024 ? "MB" : "KB"}`, icon: Activity, color: "text-pink-400" },
  ];

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-white truncate">{stats.repo_name}</h1>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 flex-shrink-0">
              <GitBranch className="w-2.5 h-2.5 mr-1" />
              {stats.repo_branch}
            </Badge>
            {stats.repo_visibility && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 flex-shrink-0">
                <Lock className="w-2.5 h-2.5 mr-1" />
                {stats.repo_visibility}
              </Badge>
            )}
            {stats.primary_language && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 flex-shrink-0">
                <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: langColor(stats.primary_language) }} />
                {stats.primary_language}
              </Badge>
            )}
          </div>
          {stats.description && (
            <p className="text-xs text-white/40 mt-1.5 truncate max-w-xl">{stats.description}</p>
          )}
          {stats.topics.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {stats.topics.slice(0, 6).map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Link href={`/github/${repoId}`}>
            <Button size="sm" variant="outline">
              <GitPullRequest className="w-3.5 h-3.5 mr-1.5" />
              GitHub Center
            </Button>
          </Link>
          <Link href={`/workspace/${repoId}`}>
            <Button size="sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI Workspace
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {statCards.map(c => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>

      {/* Main body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-5">

          {/* AI Prompt */}
          <Card className="border-brand-500/20 bg-gradient-to-br from-brand-600/5 via-transparent to-purple-600/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/8 rounded-full blur-[80px] pointer-events-none" />
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-white">Prompt to Production</h3>
              </div>
              <p className="text-xs text-white/40 mb-3">
                Describe what you want to build or fix. Tony delegates to specialized agents automatically.
              </p>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder='e.g., "Fix the login bug on the OAuth callback" or "Add unit tests for the payment service"'
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/8 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 rounded-xl p-4 text-sm text-white placeholder:text-white/20 resize-none leading-relaxed transition-all focus:outline-none"
                />
                <div className="absolute bottom-3 right-3">
                  <Link href={`/workspace/${repoId}`}>
                    <Button size="sm" disabled={!prompt.trim()} className="rounded-lg shadow-glow-sm">
                      Deploy Agents
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Repository Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-400" />
                Repository Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Language breakdown */}
              {Object.keys(stats.language_breakdown).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Languages</p>
                  <LanguageBar breakdown={stats.language_breakdown} />
                </div>
              )}

              {/* Counts grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Files",       value: stats.file_count,   icon: FileCode2 },
                  { label: "Folders",     value: stats.folder_count, icon: Folder },
                  { label: "Contributors",value: stats.contributors,  icon: Users },
                ].map(item => (
                  <div key={item.label} className="flex flex-col items-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <item.icon className="w-4 h-4 text-white/30 mb-1" />
                    <span className="text-lg font-bold text-white">{item.value}</span>
                    <span className="text-[10px] text-white/30">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Architecture summary */}
              {stats.arch_summary && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">Architecture Summary</p>
                  <p className="text-xs text-white/70 leading-relaxed">{stats.arch_summary}</p>
                </div>
              )}

              {/* Framework / Tech detected */}
              {stats.arch_frameworks.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Detected Frameworks</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.arch_frameworks.map(f => (
                      <span key={f} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/8 text-white/60">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-5">

          {/* Security */}
          <Card className={cn(
            "border",
            stats.security_critical > 0 ? "border-red-500/20 bg-red-500/[0.02]"
              : stats.security_high > 0 ? "border-amber-500/20 bg-amber-500/[0.02]"
              : "border-emerald-500/20 bg-emerald-500/[0.02]"
          )}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-400" />
                  Security
                </span>
                <Link href={`/workspace/${repoId}`}>
                  <ChevronRight className="w-4 h-4 text-white/20 hover:text-white/60 transition-colors" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: "Critical",   value: stats.security_critical, color: "text-red-400" },
                { label: "High",       value: stats.security_high,     color: "text-amber-400" },
                { label: "Medium",     value: stats.security_medium,   color: "text-yellow-400" },
                { label: "Total Issues",value: stats.security_issues,  color: stats.security_issues > 0 ? "text-rose-400" : "text-emerald-400" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-white/50">{row.label}</span>
                  <span className={cn("font-semibold tabular-nums", row.color)}>{row.value}</span>
                </div>
              ))}
              {stats.security_scanned_files > 0 && (
                <div className="pt-2 border-t border-white/5 text-[10px] text-white/25">
                  Scanned {stats.security_scanned_files} files
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Commits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <GitCommitHorizontal className="w-4 h-4 text-brand-400" />
                  Recent Commits
                </span>
                <Link href={`/github/${repoId}`}>
                  <ChevronRight className="w-4 h-4 text-white/20 hover:text-white/60 transition-colors" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {stats.recent_commits.length === 0 ? (
                <p className="text-xs text-white/30 py-4 text-center">No commits loaded — GitHub token may lack repo scope.</p>
              ) : stats.recent_commits.slice(0, 6).map((c, i) => (
                <a
                  key={c.sha}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-start gap-3 py-2.5 hover:bg-white/[0.015] rounded-lg px-2 -mx-2 transition-all group",
                    i !== 0 && "border-t border-white/[0.04]"
                  )}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10 flex-shrink-0 mt-0.5">
                    {c.author_avatar
                      ? <img src={c.author_avatar} alt={c.author} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[8px] text-white/40">{c.author[0]}</div>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/80 truncate group-hover:text-white transition-colors">{c.message}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-brand-400">{c.sha}</span>
                      <span className="text-[10px] text-white/25">·</span>
                      <span className="text-[10px] text-white/30">{c.author}</span>
                      {c.date && (
                        <>
                          <span className="text-[10px] text-white/25">·</span>
                          <span className="text-[10px] text-white/25">{timeAgo(c.date)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-white/10 group-hover:text-white/40 flex-shrink-0 mt-1 transition-colors" />
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Background Jobs */}
          {stats.active_jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-brand-400 animate-pulse" />
                  Background Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.active_jobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between text-xs">
                    <span className="text-white/60 capitalize">{job.job_type}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] border font-medium",
                      job.status === "done" || job.status === "success" ? "text-emerald-400 border-emerald-400/25 bg-emerald-400/10"
                        : job.status === "failed" ? "text-red-400 border-red-400/25 bg-red-400/10"
                        : "text-amber-400 border-amber-400/25 bg-amber-400/10"
                    )}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type AuthState =
  | "loading"
  | "no_token"
  | "no_github"
  | "no_repo"
  | "loading_stats"
  | "ready"
  | "error";

function MessageSquare(p: React.SVGProps<SVGSVGElement>) {
  return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [stats, setStats] = useState<DashStats | null>(null);
  const [repoId, setRepoId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const run = useCallback(async () => {
    setAuthState("loading");

    const token = getToken();
    if (!token) { setAuthState("no_token"); router.push("/auth/login"); return; }

    // 1. Check auth
    const meRes = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => null);
    if (!meRes || !meRes.ok) { router.push("/auth/login"); return; }
    const me = await meRes.json();

    // 2. Check GitHub connected
    if (!me.github_connected) { setAuthState("no_github"); return; }

    // 3. Check active repo
    const storedId = localStorage.getItem("active_repo_id");
    if (!storedId) { setAuthState("no_repo"); return; }
    setRepoId(storedId);

    // 4. Check repo status
    const repoRes = await fetch(`${API}/repositories/${storedId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => null);
    if (!repoRes || !repoRes.ok) {
      localStorage.removeItem("active_repo_id");
      setAuthState("no_repo");
      return;
    }
    const repo = await repoRes.json();
    if (repo.status !== "ready") {
      router.push(`/onboarding/indexing?repo_id=${storedId}`);
      return;
    }

    // 5. Fetch real dashboard stats
    setAuthState("loading_stats");
    const statsRes = await fetch(`${API}/repositories/${storedId}/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => null);
    if (!statsRes || !statsRes.ok) {
      setErrorMsg("Failed to load dashboard data.");
      setAuthState("error");
      return;
    }
    const data = await statsRes.json();
    setStats(data);
    setAuthState("ready");
  }, [router]);

  useEffect(() => { run(); }, [run]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authState === "loading" || authState === "loading_stats") {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-sm text-white/40">
          {authState === "loading_stats" ? "Loading repository analytics…" : "Verifying authentication…"}
        </p>
      </div>
    );
  }

  // ── No GitHub ──────────────────────────────────────────────────────────────
  if (authState === "no_github") return <NoGitHubScreen />;

  // ── No Repo ────────────────────────────────────────────────────────────────
  if (authState === "no_repo") {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-2">
          <GitBranch className="w-8 h-8 text-brand-400" />
        </div>
        <h2 className="text-lg font-bold text-white">No Repository Selected</h2>
        <p className="text-sm text-white/40 max-w-sm">
          Choose a GitHub repository to analyse. Tony will clone it, index all files, and build a knowledge graph.
        </p>
        <Link href="/onboarding/repositories">
          <Button className="mt-2">
            Select Repository
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (authState === "error") {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-4 text-center p-8">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <h2 className="text-lg font-bold text-white">Something went wrong</h2>
        <p className="text-sm text-white/40">{errorMsg}</p>
        <Button onClick={() => run()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // ── Real dashboard ─────────────────────────────────────────────────────────
  if (authState === "ready" && stats && repoId) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <RealDashboard stats={stats} repoId={repoId} onRefresh={run} />
      </motion.div>
    );
  }

  return null;
}
