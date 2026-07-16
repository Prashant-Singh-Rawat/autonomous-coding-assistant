"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { 
  Activity, Server, Database, ShieldAlert, Cpu, HardDrive, 
  RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, Play 
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface SubsystemsHealth {
  frontend: string;
  backend: Record<string, string>;
  database: string;
  redis: string;
  github_connectivity: string;
  ai_model_connectivity: string;
  automation_queue_depth: number;
  worker_pool_status: string;
  running_jobs: number;
  cpu_percent: number;
  memory_percent: number;
}

interface DiagnosticRecord {
  id: string;
  symptom: string;
  subsystem: string;
  severity: string;
  correlation_id?: string;
  diagnosis?: string;
  proposed_action?: string;
  pull_request_ref?: string;
  status: string;
  created_at: string;
  resolved_at?: string;
}

export default function HealthDashboardPage() {
  const [health, setHealth] = useState<SubsystemsHealth | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchHealthData() {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (!token) return;
    try {
      const hRes = await fetch(`${API}/health/subsystems`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (hRes.ok) {
        const hData = await hRes.json();
        setHealth(hData);
      }

      const dRes = await fetch(`${API}/health/diagnostics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (dRes.ok) {
        const dData = await dRes.json();
        setDiagnostics(dData);
      }
    } catch (e) {
      console.error("Health fetching failed:", e);
    }
  }

  useEffect(() => {
    fetchHealthData().then(() => setLoading(false));
  }, []);

  const triggerManualDiagnostics = async () => {
    setIsRefreshing(true);
    await fetchHealthData();
    setIsRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    if (status === "operational" || status === "active" || status === "resolved") {
      return <Badge variant="success">Operational</Badge>;
    }
    return <Badge variant="destructive">Degraded</Badge>;
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-400" />
              Application Health &amp; Self-Healing Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live synthetic checks and automated code fix propositions
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={triggerManualDiagnostics} 
            disabled={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
          >
            Run Diagnostics
          </Button>
        </div>

        {/* Resource summary widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white/[0.01] border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CPU Utilization</p>
              <h4 className="text-lg font-bold text-white mt-1">{health?.cpu_percent}%</h4>
            </div>
            <Cpu className="w-8 h-8 text-brand-400/40" />
          </Card>
          <Card className="p-4 bg-white/[0.01] border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Memory Utilization</p>
              <h4 className="text-lg font-bold text-white mt-1">{health?.memory_percent}%</h4>
            </div>
            <HardDrive className="w-8 h-8 text-violet-400/40" />
          </Card>
          <Card className="p-4 bg-white/[0.01] border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Running Jobs</p>
              <h4 className="text-lg font-bold text-white mt-1">{health?.running_jobs} active</h4>
            </div>
            <Play className="w-8 h-8 text-emerald-400/40 animate-pulse" />
          </Card>
          <Card className="p-4 bg-white/[0.01] border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Queue Backlog</p>
              <h4 className="text-lg font-bold text-white mt-1">{health?.automation_queue_depth} tasks</h4>
            </div>
            <HardDrive className="w-8 h-8 text-amber-400/40" />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subsystem health list */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-white/[0.01] border-white/5">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Subsystems Health Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-semibold text-white">Frontend Workspace</span>
                  {getStatusBadge(health?.frontend || "operational")}
                </div>

                <div className="space-y-2 border-b border-white/5 pb-3">
                  <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Backend Gateway Services</p>
                  {health && Object.entries(health.backend).map(([name, status]) => (
                    <div key={name} className="flex items-center justify-between text-xs pl-2">
                      <span className="text-white/80">{name}</span>
                      {getStatusBadge(status)}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-semibold text-white">Database Cluster (SQLite)</span>
                  {getStatusBadge(health?.database || "operational")}
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-semibold text-white">Redis Cache Broker</span>
                  {getStatusBadge(health?.redis || "operational")}
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-semibold text-white">GitHub API Relay</span>
                  {getStatusBadge(health?.github_connectivity || "operational")}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">AI LLM Provider Relay</span>
                  {getStatusBadge(health?.ai_model_connectivity || "operational")}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Diagnostics and proposed PR code fixes logs */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-white/[0.01] border-white/5">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Diagnostic &amp; Self-Healing Action Log</span>
                  <Badge variant="blue">{diagnostics.length} Active Records</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {diagnostics.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/50 mx-auto mb-3" />
                    All subsystems are green. Self-healing agent is idle.
                  </div>
                ) : diagnostics.map(d => (
                  <div key={d.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        {d.subsystem} Problem Detected
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        d.status === "resolved" 
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                      }`}>
                        {d.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-white/90 font-medium">Symptom:</p>
                      <pre className="p-2 bg-black/40 border border-white/5 rounded text-[11px] font-mono text-rose-300 whitespace-pre-wrap">
                        {d.symptom}
                      </pre>
                    </div>

                    {d.diagnosis && (
                      <div className="space-y-1">
                        <p className="text-xs text-white/90 font-medium">AI Agent Diagnosis:</p>
                        <p className="text-xs text-muted-foreground">{d.diagnosis}</p>
                      </div>
                    )}

                    {d.proposed_action && (
                      <div className="space-y-1">
                        <p className="text-xs text-white/90 font-medium">Proposed Resolution:</p>
                        <p className="text-xs text-brand-300 font-semibold">{d.proposed_action}</p>
                      </div>
                    )}

                    {d.pull_request_ref && (
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Self-healing generated PR Fix:</span>
                        <a 
                          href={d.pull_request_ref} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-brand-400 flex items-center gap-1 hover:underline font-semibold"
                        >
                          Review Draft PR <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
