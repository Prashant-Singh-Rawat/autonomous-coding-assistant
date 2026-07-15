"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  GitBranch,
  Play,
  TrendingUp,
  Cpu,
  ArrowRight,
  Plus,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  Folder,
  MessageSquare,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Progress,
  Skeleton,
  Avatar,
  StatusDot,
  EmptyState,
} from "@/components/ui";
import { cn, formatRelativeTime, formatNumber, getLanguageColor } from "@/lib/utils";

// ─── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_PROJECTS = [
  { id: "1", name: "e-commerce-dashboard", lang: "TypeScript", stars: 127, forks: 23, status: "indexed" },
  { id: "2", name: "ai-chat-app", lang: "Python", stars: 89, forks: 14, status: "indexed" },
  { id: "3", name: "portfolio-website", lang: "React", stars: 45, forks: 8, status: "indexing" },
];

const DEMO_RUNS = [
  { id: "1", agent: "Coder", action: "Implementing Stripe checkout", status: "running", progress: 45 },
  { id: "2", agent: "Testing", action: "Generating unit tests for API", status: "running", progress: 80 },
  { id: "3", agent: "Security", action: "Scanning node_modules for CVEs", status: "success", progress: 100 },
];

export default function DashboardPage() {
  const [prompt, setPrompt] = useState("");

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      {/* ── Welcome Header ── */}
      <motion.div variants={cardVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Welcome back, <span className="gradient-text">Prashant</span>
            <Sparkles className="w-5 h-5 text-brand-400 animate-pulse-slow" />
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tony AI is fully synced and ready to deploy agents to your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2.5 py-1 text-[10px]">
            <StatusDot status="success" />
            <span className="ml-1.5 font-medium text-white/80">API connected</span>
          </Badge>
          <Badge variant="secondary" className="px-2.5 py-1 text-[10px]">
            <StatusDot status="success" />
            <span className="ml-1.5 font-medium text-white/80">Redis active</span>
          </Badge>
        </div>
      </motion.div>

      {/* ── AI Prompt Box (The Hero Widget) ── */}
      <motion.div variants={cardVariants}>
        <Card className="shadow-glow border-brand-500/20 bg-gradient-to-r from-brand-600/5 via-transparent to-purple-600/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-white mb-2">Prompt to Production</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Describe what code changes, tests, or features you want to build. Tony will automatically delegate tasks to specialized agents.
            </p>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Add Google OAuth provider to current authentication routes and generate unit tests..."
                rows={3}
                className="w-full bg-white/[0.03] border border-white/8 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 resize-none leading-relaxed transition-all focus:outline-none"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <Button
                  disabled={!prompt.trim()}
                  className="rounded-xl shadow-glow-sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Deploy Agents
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Stats Widget Grid ── */}
      <motion.div variants={cardVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Connected Repos", value: 3, icon: GitBranch, change: "+1 this week", color: "text-brand-400" },
          { title: "Background tasks", value: 2, icon: Play, change: "Running active runs", color: "text-emerald-400" },
          { title: "Agent success rate", value: "93%", icon: CheckCircle2, change: "Target >90%", color: "text-purple-400" },
          { title: "SaaS tokens used", value: "142.3K", icon: Cpu, change: "Monthly usage limit", color: "text-amber-400" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                <h3 className="text-xl font-bold text-white mt-1">{stat.value}</h3>
                <span className="text-[10px] text-emerald-400 font-medium block mt-1.5">{stat.change}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/6 flex items-center justify-center flex-shrink-0">
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ── Main Dashboard Content Columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Projects */}
        <motion.div variants={cardVariants} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Folder className="w-4 h-4 text-brand-400" />
              Connected Repositories
            </h3>
            <Link href="/repositories">
              <Button size="sm" variant="ghost" className="h-7 text-xs" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Add Repository
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {DEMO_PROJECTS.map((proj) => (
              <Card key={proj.id} className="hover:border-white/12 transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600/10 to-purple-600/10 border border-brand-500/20 flex items-center justify-center">
                      <GitBranch className="w-4.5 h-4.5 text-brand-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">{proj.name}</h4>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: getLanguageColor(proj.lang) }}
                          />
                          {proj.lang}
                        </span>
                        <span>⭐ {proj.stars}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={proj.status === "indexed" ? "success" : "warning"} className="text-[9px]">
                      {proj.status === "indexed" ? "Indexed" : "Indexing"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Active Runs */}
        <motion.div variants={cardVariants} className="space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" />
            Active Agent Runs
          </h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              {DEMO_RUNS.map((run) => (
                <div key={run.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={run.status === "running" ? "default" : "success"} className="text-[9px]">
                        {run.agent}
                      </Badge>
                      <span className="text-white/80 font-medium truncate max-w-[140px]">{run.action}</span>
                    </div>
                    <span className="font-mono text-brand-400 text-[10px]">{run.progress}%</span>
                  </div>
                  <Progress value={run.progress} />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
