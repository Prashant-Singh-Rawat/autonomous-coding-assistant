"use client";

import React, { useState, useEffect } from "react";
import { 
  Cpu, ToggleLeft, ToggleRight, Plus, Trash2, 
  Settings, Link as LinkIcon, RefreshCw, CheckCircle2 
} from "lucide-react";
import { Button, Card, CardContent, Input, Badge } from "@/components/ui";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


interface Rule {
  id: string;
  trigger_event: string;
  action_type: string;
  is_enabled: boolean;
  auto_apply: boolean;
}

interface AutomationCenterProps {
  repoId: string;
}

export default function AutomationCenter({ repoId }: AutomationCenterProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [triggerEvent, setTriggerEvent] = useState("pull_request");
  const [actionType, setActionType] = useState("auto_review");
  const [autoApply, setAutoApply] = useState(false);
  const [n8nUrl, setN8nUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/workspace/${repoId}/automation-rules`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setRules(await res.json());
      } else {
        // Fallback stub rules
        setRules([
          { id: "r1", trigger_event: "pull_request", action_type: "auto_review", is_enabled: true, auto_apply: false },
          { id: "r2", trigger_event: "push", action_type: "auto_scan", is_enabled: true, auto_apply: true }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (repoId) {
      fetchRules();
    }
  }, [repoId]);

  const handleAddRule = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/workspace/${repoId}/automation-rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          trigger_event: triggerEvent,
          action_type: actionType,
          auto_apply: autoApply,
          condition: {}
        })
      });

      if (res.ok) {
        fetchRules();
      } else {
        // Local stub add
        const newRule: Rule = {
          id: Math.random().toString(),
          trigger_event: triggerEvent,
          action_type: actionType,
          is_enabled: true,
          auto_apply: autoApply
        };
        setRules(prev => [...prev, newRule]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_enabled: !currentStatus } : r));
  };

  const handleDeleteRule = async (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Rules Builder Form */}
        <div className="md:col-span-1 p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-400" />
            Create Custom Rule
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">When Event Occurs</label>
              <select 
                value={triggerEvent} 
                onChange={(e) => setTriggerEvent(e.target.value)}
                className="w-full mt-1 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="pull_request">PR Opened / Synchronize</option>
                <option value="push">Branch Commit Push</option>
                <option value="issues">Issue Created</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Then Perform Action</label>
              <select 
                value={actionType} 
                onChange={(e) => setActionType(e.target.value)}
                className="w-full mt-1 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              >
                <option value="auto_review">Auto AI PR Review</option>
                <option value="auto_scan">Auto Security Vulnerability Scan</option>
                <option value="auto_label">Auto Issue Classifier</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-white font-medium">Auto-Post to GitHub</span>
              <input 
                type="checkbox" 
                checked={autoApply} 
                onChange={(e) => setAutoApply(e.target.checked)}
                className="w-4 h-4 accent-brand-500"
              />
            </div>

            <Button onClick={handleAddRule} className="w-full pt-2">
              Activate Rule
            </Button>
          </div>
        </div>

        {/* Rules List View */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-white">Active Automation Rules</h3>
          <div className="space-y-3">
            {rules.map(rule => (
              <Card key={rule.id} className="border-white/5 bg-neutral-900/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                        {rule.trigger_event}
                      </span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <span className="text-xs font-semibold text-brand-400">
                        {rule.action_type}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Auto-apply: {rule.auto_apply ? "Enabled (Post directly)" : "Disabled (Draft only)"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button onClick={() => handleToggleRule(rule.id, rule.is_enabled)}>
                      {rule.is_enabled ? (
                        <ToggleRight className="w-8 h-8 text-brand-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* n8n integration builder widget */}
      <Card className="border-white/5 bg-neutral-900/50 mt-6">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-emerald-400" />
            n8n Outbound Pipeline Integration
          </h3>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Dispatch real-time payload signals directly into your custom n8n endpoints on event success.
          </p>
          <div className="flex gap-3">
            <Input 
              placeholder="e.g. https://primary-n8n.domain.com/webhook/..." 
              value={n8nUrl}
              onChange={(e) => setN8nUrl(e.target.value)}
              className="bg-neutral-950 border-white/10 text-xs rounded-xl"
            />
            <Button size="sm">Connect Outflow</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
