"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { 
  Zap, Play, ArrowRight, CheckCircle2, RefreshCw, Plus, 
  Terminal, ShieldCheck, GitPullRequest, Code2, Sparkles 
} from "lucide-react";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: string[];
  active: boolean;
}

export default function AutomationCenterPage() {
  const [isBusy, setIsBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([
    {
      id: "wf-1",
      name: "Issue Opened Auto-Resolution",
      description: "Triggered when a developer opens a bug issue. Reads traceback, locates files, tests patch and drafts PR.",
      trigger: "GitHub Issue Opened",
      steps: ["Bug Detection Agent", "Context Builder Retrieval", "Testing Agent (Pytest)", "Draft Pull Request Fix"],
      active: true
    },
    {
      id: "wf-2",
      name: "Reflexive Pull Request Quality Gate",
      description: "Triggered on every Pull Request. Performs security scanning, code quality check, and posts an AI review comment.",
      trigger: "GitHub Pull Request Opened",
      steps: ["Security Monitor Scan", "Code Quality Lint", "AI Review Generator", "Submit PR Review Comment"],
      active: true
    },
    {
      id: "wf-3",
      name: "Documentation Drift Sync",
      description: "Checks code files daily against last doc-gen commit. Automatically updates developer guide & README.",
      trigger: "Scheduled (Daily)",
      steps: ["Documentation Agent", "Context Retrieval", "Generate README & Swagger Specs", "Create Doc-update PR"],
      active: false
    }
  ]);

  const toggleWorkflow = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));
    flashMessage("Workflow rules updated!");
  };

  const flashMessage = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const runAdhocSimulation = async (id: string) => {
    setIsBusy(true);
    // Simulate pipeline run
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsBusy(false);
    flashMessage("Simulation succeeded! Diagnostic PR enqueued.");
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-400" />
              Automation Center (Engineering Workflows)
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reflexive CI/CD automation rules for Tony AI's own development cycle
            </p>
          </div>
          {successMsg && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-1.5 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400">{successMsg}</span>
            </div>
          )}
        </div>

        {/* Templates list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Active Automation Rules</h2>

            {templates.map(wf => (
              <Card key={wf.id} className="bg-white/[0.01] border-white/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-white">{wf.name}</CardTitle>
                    <p className="text-[10px] text-muted-foreground mt-1">Trigger: <span className="text-brand-300 font-semibold">{wf.trigger}</span></p>
                  </div>
                  <Badge variant={wf.active ? "success" : "secondary"}>
                    {wf.active ? "Active" : "Disabled"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">{wf.description}</p>
                  
                  {/* Pipeline Steps visualization */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {wf.steps.map((step, idx) => (
                      <React.Fragment key={step}>
                        <div className="flex items-center gap-1.5 p-2 bg-white/5 border border-white/5 rounded-lg text-[10px] font-semibold text-white/80">
                          {idx === 3 ? <GitPullRequest className="w-3 h-3 text-brand-400" /> : <Code2 className="w-3 h-3 text-muted-foreground" />}
                          {step}
                        </div>
                        {idx < wf.steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <Button 
                      size="sm" 
                      onClick={() => runAdhocSimulation(wf.id)}
                      disabled={isBusy}
                    >
                      Simulate Pipeline Run
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toggleWorkflow(wf.id)}
                    >
                      {wf.active ? "Disable Rule" : "Enable Rule"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick builder panel */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Rule Builder</h2>
            <Card className="bg-white/[0.01] border-white/5">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-white">Create New Workflow Rule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Trigger Event</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white">
                    <option value="issue">GitHub Issue Created</option>
                    <option value="pr">Pull Request Opened</option>
                    <option value="push">Branch Commit Push</option>
                    <option value="schedule">Scheduled (Hourly)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Action Subsystem</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white">
                    <option value="self-healing">Propose Self-Healing Code Patch PR</option>
                    <option value="review">Scan Dependency Vulnerabilities</option>
                    <option value="docs">Update System Documentation</option>
                  </select>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                    Guaranteed Human Review Gate
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    Tony AI always targets a draft Pull Request with explanations. Auto-merge to main is disabled by default for safety.
                  </p>
                </div>

                <Button size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-1" />
                  Save Workflow Rule
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
