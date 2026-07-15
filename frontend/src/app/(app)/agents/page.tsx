"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot, Play, Clock, CheckCircle2, XCircle, Loader2,
  Sparkles, Shield, FlaskConical, BookOpen, GitBranch, Database,
  Bug, RefreshCw, Zap, Code2, Search, Cpu,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Progress } from "@/components/ui";

const AGENTS = [
  { id: "planner", name: "Planner", icon: Sparkles, color: "from-brand-600 to-indigo-600", description: "Breaks down user requests into actionable task checklists", status: "idle" as const, runsTotal: 47, successRate: 96 },
  { id: "architect", name: "Architect", icon: Zap, color: "from-violet-600 to-purple-600", description: "Decides codebase design patterns and dependency maps", status: "idle" as const, runsTotal: 38, successRate: 94 },
  { id: "coder", name: "Coder", icon: Code2, color: "from-blue-600 to-brand-600", description: "Generates high-performance, linted, structural code changes", status: "running" as const, runsTotal: 129, successRate: 91 },
  { id: "reviewer", name: "Reviewer", icon: CheckCircle2, color: "from-emerald-600 to-teal-600", description: "Performs deep automated code reviews and leaves line suggestions", status: "idle" as const, runsTotal: 56, successRate: 89 },
  { id: "security", name: "Security", icon: Shield, color: "from-red-600 to-rose-600", description: "Runs static analysis scans looking for vulnerabilities", status: "idle" as const, runsTotal: 23, successRate: 100 },
  { id: "testing", name: "Testing", icon: FlaskConical, color: "from-amber-600 to-orange-600", description: "Creates unit, integration, and end-to-end test cases", status: "running" as const, runsTotal: 78, successRate: 88 },
];

const RECENT_RUNS = [
  { id: "r1", agent: "Coder", repo: "e-commerce-dashboard", input: "Add Stripe checkout component", status: "running", progress: 45, tokens: 12400, startedAt: new Date(Date.now() - 5 * 60 * 1000) },
  { id: "r2", agent: "Testing", repo: "ai-chat-app", input: "Generate tests for UserService", status: "running", progress: 67, tokens: 8200, startedAt: new Date(Date.now() - 12 * 60 * 1000) },
];

function AgentCard({ agent }: { agent: typeof AGENTS[0] }) {
  const statusConfig = {
    idle: { label: "Ready", color: "secondary" as const, dot: "bg-neutral-500" },
    running: { label: "Running", color: "blue" as const, dot: "bg-brand-400 animate-pulse" },
  };
  const s = statusConfig[agent.status === "running" ? "running" : "idle"];

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card className="h-full group">
        <CardContent className="p-5 h-full flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", agent.color)}>
              <agent.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", s.dot)} />
              <Badge variant={s.color} className="text-[10px]">{s.label}</Badge>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-white mb-1">{agent.name} Agent</h3>
          <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4">{agent.description}</p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-2 rounded-lg bg-white/5 border border-white/8 text-center">
              <p className="text-sm font-bold text-white">{agent.runsTotal}</p>
              <p className="text-[10px] text-muted-foreground">Total Runs</p>
            </div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/8 text-center">
              <p className="text-sm font-bold text-emerald-400">{agent.successRate}%</p>
              <p className="text-[10px] text-muted-foreground">Success Rate</p>
            </div>
          </div>

          <Button
            size="sm"
            variant={agent.status === "running" ? "outline" : "default"}
            className="w-full"
            leftIcon={agent.status === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          >
            {agent.status === "running" ? "Running..." : "Run Agent"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RunRow({ run }: { run: typeof RECENT_RUNS[0] }) {
  const statusIcon = run.status === "running" ? <Loader2 className="w-4 h-4 text-brand-400 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
      {statusIcon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-white">{run.agent}</span>
          <span className="text-[10px] text-muted-foreground">on {run.repo}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{run.input}</p>
        {run.status === "running" && <Progress value={run.progress} className="mt-1.5 h-1" />}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-mono text-muted-foreground">{(run.tokens / 1000).toFixed(1)}K tokens</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeTime(run.startedAt)}</p>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const running = AGENTS.filter(a => a.status === "running").length;
  const filtered = AGENTS.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title font-bold text-white">AI Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">{running} agents active</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter agents..."
            className="tony-input pl-10 w-56" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Agent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {RECENT_RUNS.map(run => <RunRow key={run.id} run={run} />)}
        </CardContent>
      </Card>
    </div>
  );
}
