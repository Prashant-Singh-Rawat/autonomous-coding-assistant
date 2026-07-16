"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, X, CheckCircle2, Loader2,
  Sparkles, Shield, FlaskConical,
  Zap, Code2, Search, Terminal, AlertTriangle
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Progress } from "@/components/ui";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const AGENT_TEMPLATES = [
  { id: "planner", name: "Planner", icon: Sparkles, color: "from-brand-600 to-indigo-600", description: "Breaks down user requests into actionable task checklists", runsTotal: 47, successRate: 96 },
  { id: "architect", name: "Architect", icon: Zap, color: "from-violet-600 to-purple-600", description: "Decides codebase design patterns and dependency maps", runsTotal: 38, successRate: 94 },
  { id: "coder", name: "Coder", icon: Code2, color: "from-blue-600 to-brand-600", description: "Generates high-performance, linted, structural code changes", runsTotal: 129, successRate: 91 },
  { id: "reviewer", name: "Reviewer", icon: CheckCircle2, color: "from-emerald-600 to-teal-600", description: "Performs deep automated code reviews and leaves line suggestions", runsTotal: 56, successRate: 89 },
  { id: "security", name: "Security", icon: Shield, color: "from-red-600 to-rose-600", description: "Runs static analysis scans looking for vulnerabilities", runsTotal: 23, successRate: 100 },
  { id: "testing", name: "Testing", icon: FlaskConical, color: "from-amber-600 to-orange-600", description: "Creates unit, integration, and end-to-end test cases", runsTotal: 78, successRate: 88 },
];

interface AgentRun {
  id: string;
  repository_id: string;
  agent_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  result_summary: string | null;
  error_message: string | null;
}

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const [repoId, setRepoId] = useState<string | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [activeLogsAgent, setActiveLogsAgent] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRepoId(localStorage.getItem("active_repo_id"));
    }
  }, []);

  const fetchRecentRuns = async () => {
    if (!repoId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/agents/runs?repository_id=${repoId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setRuns(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (repoId) {
      fetchRecentRuns();
      const interval = setInterval(fetchRecentRuns, 4000);
      return () => clearInterval(interval);
    }
  }, [repoId]);

  const handleStartAgent = async (agentId: string) => {
    if (!repoId) return;
    setActionInProgress(agentId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/agents/${agentId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ repository_id: repoId })
      });
      if (res.ok) {
        await fetchRecentRuns();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStopAgent = async (agentId: string) => {
    if (!repoId) return;
    setActionInProgress(agentId);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/agents/${agentId}/stop?repository_id=${repoId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      await fetchRecentRuns();
    } catch (err) {
      console.error(err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePauseAgent = async (agentId: string) => {
    if (!repoId) return;
    setActionInProgress(agentId);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/agents/${agentId}/pause?repository_id=${repoId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      await fetchRecentRuns();
    } catch (err) {
      console.error(err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResumeAgent = async (agentId: string) => {
    if (!repoId) return;
    setActionInProgress(agentId);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/agents/${agentId}/resume?repository_id=${repoId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      await fetchRecentRuns();
    } catch (err) {
      console.error(err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleViewLogs = async (agentId: string) => {
    if (!repoId) return;
    setActiveLogsAgent(agentId);
    setIsLoadingLogs(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/agents/${agentId}/logs?repository_id=${repoId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Poll logs if the modal is active and the agent is running
  useEffect(() => {
    if (!activeLogsAgent || !repoId) return;
    const activeRun = runs.find(r => r.agent_type === activeLogsAgent && r.status === "running");
    if (!activeRun) return;

    const interval = setInterval(() => {
      handleViewLogs(activeLogsAgent);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeLogsAgent, runs, repoId]);

  const getAgentStatus = (agentId: string) => {
    const run = runs.find(r => r.agent_type === agentId);
    return run ? run.status : "idle";
  };

  const getAgentProgress = (agentId: string) => {
    const run = runs.find(r => r.agent_type === agentId);
    if (!run || run.status !== "running") return 0;
    if (run.result_summary && run.result_summary.includes("%")) {
      const match = run.result_summary.match(/(\d+)%/);
      if (match) return parseInt(match[1]);
    }
    return 30;
  };

  const runningCount = runs.filter(r => r.status === "running").length;
  const filtered = AGENT_TEMPLATES.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title font-bold text-white">AI Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">{runningCount} active runs</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Filter agents..."
            className="tony-input pl-9 w-56 text-xs h-9" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(agent => {
          const status = getAgentStatus(agent.id);
          const progress = getAgentProgress(agent.id);
          const config = {
            idle: { label: "Ready", variant: "secondary" as const, dot: "bg-neutral-500" },
            running: { label: "Running", variant: "blue" as const, dot: "bg-brand-400 animate-pulse" },
            failed: { label: "Failed", variant: "destructive" as const, dot: "bg-rose-500" },
            success: { label: "Success", variant: "success" as const, dot: "bg-emerald-500" }
          };
          const current = config[status as keyof typeof config] || config.idle;

          return (
            <motion.div key={agent.id} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
              <Card className="h-full group">
                <CardContent className="p-5 h-full flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", agent.color)}>
                        <agent.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", current.dot)} />
                        <Badge variant={current.variant} className="text-[10px]">{current.label}</Badge>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-white mb-1">{agent.name} Agent</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">{agent.description}</p>
                  </div>

                  <div className="space-y-4">
                    {status === "running" && (
                      <div className="space-y-1">
                        <Progress value={progress} className="h-1.5" />
                        <span className="text-[10px] text-muted-foreground block text-right font-mono">{progress}%</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/8">
                        <p className="text-xs font-bold text-white">{agent.runsTotal}</p>
                        <p className="text-[9px] text-muted-foreground">Total Runs</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/8">
                        <p className="text-xs font-bold text-emerald-400">{agent.successRate}%</p>
                        <p className="text-[9px] text-muted-foreground">Success Rate</p>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      {status === "running" ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 text-[11px]"
                            onClick={() => handlePauseAgent(agent.id)}
                            disabled={actionInProgress !== null}
                          >
                            Pause
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1 text-[11px]"
                            onClick={() => handleStopAgent(agent.id)}
                            disabled={actionInProgress !== null}
                          >
                            Stop
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1 text-[11px]"
                          onClick={() => handleStartAgent(agent.id)}
                          disabled={actionInProgress !== null || !repoId}
                          leftIcon={<Play className="w-3 h-3" />}
                        >
                          Run Agent
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[11px]"
                        onClick={() => handleViewLogs(agent.id)}
                      >
                        Logs
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground pb-2">
                  <th className="py-2">Agent</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Run Details</th>
                  <th className="py-2">Started At</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 font-semibold text-white capitalize">{run.agent_type}</td>
                    <td className="py-3">
                      <Badge variant={run.status === "success" ? "success" : run.status === "failed" ? "destructive" : "blue"}>
                        {run.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground max-w-xs truncate">{run.result_summary || run.error_message || "-"}</td>
                    <td className="py-3 text-muted-foreground font-mono">{formatRelativeTime(new Date(run.started_at))}</td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No agent run logs detected for this repository.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Logs Modal */}
      <AnimatePresence>
        {activeLogsAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-brand-400" />
                  <span className="text-sm font-semibold text-white capitalize">{activeLogsAgent} Agent Logs</span>
                </div>
                <button 
                  onClick={() => setActiveLogsAgent(null)}
                  className="text-muted-foreground hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-black font-mono text-[11px] text-emerald-400 space-y-1.5 min-h-[300px] leading-relaxed scrollbar-thin">
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center h-full py-20 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                    <span>Loading logs...</span>
                  </div>
                ) : (
                  logs.map((log, i) => <div key={i} className="whitespace-pre-wrap">{log}</div>)
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
