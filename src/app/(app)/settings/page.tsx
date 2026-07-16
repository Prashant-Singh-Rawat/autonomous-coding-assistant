"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import {
  Building2, Users, CreditCard, Rocket, Plug2, Shield,
  Plus, Check, Loader2, ChevronRight, Crown, Settings,
  Slack, Trash2, ClipboardList, AlertTriangle, Bell,
  Zap, Globe, Activity, Lock
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Org = { id: string; name: string; role: string; plan: string; created_at: string };
type Member = { user_id: string; email: string | null; role: string; joined_at: string };
type AuditEntry = { id: string; action: string; detail: string; user_id: string; created_at: string };

const PLANS = [
  {
    name: "free",
    label: "Free",
    price: "$0/mo",
    color: "text-white/60",
    features: ["1 Repository", "500k tokens/month", "2 Org seats", "Basic AI features"],
  },
  {
    name: "pro",
    label: "Pro",
    price: "$29/mo",
    color: "text-brand-400",
    features: ["10 Repositories", "5M tokens/month", "10 Org seats", "Deployment Center", "Advanced automation"],
  },
  {
    name: "enterprise",
    label: "Enterprise",
    price: "Custom",
    color: "text-amber-400",
    features: ["Unlimited repositories", "Unlimited tokens", "Unlimited seats", "SSO/SAML ready", "Priority support", "Audit exports"],
  },
];

const ROLE_COLORS: Record<string, string> = {
  owner: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  admin: "text-brand-400 border-brand-400/30 bg-brand-400/10",
  member: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  billing_only: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  read_only: "text-white/40 border-white/10 bg-white/5",
};

const TAB_ITEMS = [
  { id: "org",         label: "Organization", icon: Building2 },
  { id: "team",        label: "Team",         icon: Users },
  { id: "billing",     label: "Billing",      icon: CreditCard },
  { id: "deployments", label: "Deployments",  icon: Rocket },
  { id: "integrations",label: "Integrations", icon: Plug2 },
  { id: "audit",       label: "Audit Logs",   icon: Shield },
];

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("org");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackChannel, setSlackChannel] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [slackChannelInput, setSlackChannelInput] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [vercelProjectId, setVercelProjectId] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  useEffect(() => {
    fetch(`${API}/enterprise/organizations`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrgs(data);
          if (data.length > 0) setSelectedOrg(data[0]);
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedOrg) return;
    fetch(`${API}/enterprise/team/${selectedOrg.id}/members`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setMembers(d)).catch(() => {});
    fetch(`${API}/enterprise/integrations/slack/${selectedOrg.id}`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => {
        setSlackConnected(d.connected ?? false);
        setSlackChannel(d.channel ?? "");
      }).catch(() => {});
    fetch(`${API}/enterprise/audit/${selectedOrg.id}`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setAuditLogs(d)).catch(() => {});
  }, [selectedOrg]);

  async function createOrg() {
    if (!newOrgName.trim()) return;
    setIsBusy(true);
    const r = await fetch(`${API}/enterprise/organizations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ name: newOrgName.trim() })
    });
    const data = await r.json();
    if (r.ok) {
      const newOrg: Org = { id: data.id, name: data.name, role: data.role, plan: data.plan, created_at: new Date().toISOString() };
      setOrgs(prev => [...prev, newOrg]);
      setSelectedOrg(newOrg);
      setNewOrgName("");
      flash("Organization created!");
    }
    setIsBusy(false);
  }

  async function connectSlack() {
    if (!selectedOrg || !slackWebhook.trim()) return;
    setIsBusy(true);
    const r = await fetch(`${API}/enterprise/integrations/slack`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ org_id: selectedOrg.id, webhook_url: slackWebhook, channel: slackChannelInput || null })
    });
    if (r.ok) {
      setSlackConnected(true);
      setSlackChannel(slackChannelInput || "default");
      setSlackWebhook("");
      flash("Slack connected!");
    }
    setIsBusy(false);
  }

  async function testSlack() {
    if (!selectedOrg) return;
    await fetch(`${API}/enterprise/integrations/slack/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ org_id: selectedOrg.id })
    });
    flash("Test notification sent!");
  }

  async function connectVercel() {
    if (!selectedOrg || !vercelToken.trim() || !vercelProjectId.trim()) return;
    setIsBusy(true);
    const r = await fetch(`${API}/enterprise/deployments/providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        org_id: selectedOrg.id,
        provider_type: "vercel",
        credentials: { token: vercelToken, project_id: vercelProjectId }
      })
    });
    if (r.ok) {
      setVercelToken("");
      setVercelProjectId("");
      flash("Vercel connected!");
    }
    setIsBusy(false);
  }

  async function changePlan(plan: string) {
    if (!selectedOrg) return;
    setIsBusy(true);
    const r = await fetch(`${API}/enterprise/billing/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ org_id: selectedOrg.id, plan })
    });
    if (r.ok) {
      setSelectedOrg(prev => prev ? { ...prev, plan } : prev);
      setOrgs(prev => prev.map(o => o.id === selectedOrg.id ? { ...o, plan } : o));
      flash(`Switched to ${plan} plan!`);
    }
    setIsBusy(false);
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/20 backdrop-blur px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Enterprise Settings</h1>
            <p className="text-xs text-white/40 mt-0.5">Manage your organization, team, billing, and integrations</p>
          </div>
          {successMsg && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400">{successMsg}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 space-y-1">
          {TAB_ITEMS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-brand-500/15 text-brand-300 border border-brand-500/25"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}

          {/* Org switcher */}
          {orgs.length > 1 && (
            <div className="pt-4 border-t border-white/5 mt-4">
              <p className="text-[10px] uppercase tracking-wider text-white/30 px-3 mb-2">Organizations</p>
              {orgs.map(org => (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                    selectedOrg?.id === org.id ? "bg-white/8 text-white" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{org.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-5">

          {/* ── Organization Tab ─────────────────────────────────────────────── */}
          {activeTab === "org" && (
            <div className="space-y-5">
              <Card className="border-white/5 bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-400" />
                    Your Organizations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orgs.length === 0 ? (
                    <p className="text-xs text-white/40 py-4 text-center">No organizations yet. Create one below.</p>
                  ) : orgs.map(org => (
                    <div
                      key={org.id}
                      onClick={() => setSelectedOrg(org)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedOrg?.id === org.id
                          ? "border-brand-500/30 bg-brand-500/5"
                          : "border-white/5 hover:border-white/10 hover:bg-white/3"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-xs font-bold">
                          {org.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{org.name}</p>
                          <p className="text-[10px] text-white/40">
                            Created {new Date(org.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] border px-2 py-0.5 rounded-full ${ROLE_COLORS[org.role] || "text-white/40"}`}>
                          {org.role}
                        </span>
                        <span className="text-[10px] text-white/30">{org.plan}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/5 bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-brand-400" />
                    Create New Organization
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <input
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    placeholder="Organization name…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                    onKeyDown={e => e.key === "Enter" && createOrg()}
                  />
                  <Button size="sm" onClick={createOrg} disabled={isBusy || !newOrgName.trim()}>
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Team Tab ──────────────────────────────────────────────────────── */}
          {activeTab === "team" && (
            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-400" />
                  Team Members
                  {selectedOrg && <span className="text-white/30 font-normal">— {selectedOrg.name}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {members.length === 0 ? (
                  <p className="text-xs text-white/40 py-8 text-center">No members loaded. Select an organization first.</p>
                ) : members.map(m => (
                  <div key={m.user_id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:border-white/8 bg-white/[0.015] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/70">
                        {m.email?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{m.email ?? m.user_id}</p>
                        <p className="text-[10px] text-white/30">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] || "text-white/40"}`}>
                      {m.role}
                    </span>
                  </div>
                ))}

                <div className="pt-4 border-t border-white/5 flex gap-2">
                  <input
                    placeholder="user_id or email (invite)…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                  />
                  <Button size="sm" variant="outline">Invite</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Billing Tab ───────────────────────────────────────────────────── */}
          {activeTab === "billing" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {PLANS.map(plan => {
                  const active = selectedOrg?.plan === plan.name;
                  return (
                    <div
                      key={plan.name}
                      className={`rounded-xl border p-4 space-y-3 transition-all ${
                        active
                          ? "border-brand-500/40 bg-brand-500/5"
                          : "border-white/5 bg-white/[0.02] hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${plan.color}`}>{plan.label}</span>
                        {active && <Check className="w-4 h-4 text-brand-400" />}
                      </div>
                      <p className="text-lg font-bold text-white">{plan.price}</p>
                      <ul className="space-y-1">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-center gap-1.5 text-[11px] text-white/50">
                            <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        variant={active ? "secondary" : "default"}
                        className="w-full"
                        disabled={active || isBusy}
                        onClick={() => changePlan(plan.name)}
                      >
                        {active ? "Current Plan" : `Switch to ${plan.label}`}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Card className="border-white/5 bg-white/[0.02]">
                <CardContent className="p-4 flex items-center gap-4">
                  <Activity className="w-8 h-8 text-brand-400" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white mb-1">Token Usage this Month</p>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[34%] rounded-full bg-gradient-to-r from-brand-500 to-violet-500" />
                    </div>
                    <p className="text-[10px] text-white/40 mt-1">340k / 500k tokens used</p>
                  </div>
                  <span className="text-xs text-white/30">68%</span>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Deployments Tab ───────────────────────────────────────────────── */}
          {activeTab === "deployments" && (
            <div className="space-y-5">
              <Card className="border-white/5 bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-brand-400" />
                    Connect Vercel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-white/40">
                    Tony AI orchestrates deployments through your existing Vercel account. 
                    We recommend creating a deploy-only API token with minimal scope.
                  </p>
                  <div className="space-y-2">
                    <input
                      value={vercelToken}
                      onChange={e => setVercelToken(e.target.value)}
                      type="password"
                      placeholder="Vercel API Token…"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                    />
                    <input
                      value={vercelProjectId}
                      onChange={e => setVercelProjectId(e.target.value)}
                      placeholder="Vercel Project ID…"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-amber-300/80">
                      Use a deploy-only scoped token. Never paste a root-access Vercel API key.
                    </p>
                  </div>
                  <Button size="sm" onClick={connectVercel} disabled={isBusy || !vercelToken.trim() || !vercelProjectId.trim()}>
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Rocket className="w-3.5 h-3.5 mr-1" />}
                    Connect Vercel
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-white/5 bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand-400" />
                    Coming Soon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {["Render", "Railway", "AWS", "Azure", "GCP", "Docker"].map(p => (
                      <div key={p} className="flex items-center gap-2 p-3 rounded-lg border border-white/5 bg-white/[0.015]">
                        <Lock className="w-3 h-3 text-white/20" />
                        <span className="text-xs text-white/30">{p}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Integrations Tab ──────────────────────────────────────────────── */}
          {activeTab === "integrations" && (
            <div className="space-y-5">
              <Card className={`border ${slackConnected ? "border-emerald-500/30 bg-emerald-500/[0.03]" : "border-white/5 bg-white/[0.02]"}`}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Slack className="w-4 h-4 text-[#E01E5A]" />
                      Slack Notifications
                    </span>
                    {slackConnected && (
                      <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Connected {slackChannel && `· #${slackChannel}`}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {slackConnected ? (
                    <div className="flex gap-3">
                      <Button size="sm" variant="outline" onClick={testSlack}>
                        <Bell className="w-3.5 h-3.5 mr-1.5" />
                        Send Test Notification
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40">
                        Create a Slack Incoming Webhook in your workspace and paste it below.
                      </p>
                      <input
                        value={slackWebhook}
                        onChange={e => setSlackWebhook(e.target.value)}
                        type="password"
                        placeholder="https://hooks.slack.com/services/…"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                      />
                      <input
                        value={slackChannelInput}
                        onChange={e => setSlackChannelInput(e.target.value)}
                        placeholder="#channel (optional)"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/50"
                      />
                      <Button size="sm" onClick={connectSlack} disabled={isBusy || !slackWebhook.trim()}>
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Slack className="w-3.5 h-3.5 mr-1" />}
                        Connect Slack
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming integrations */}
              <Card className="border-white/5 bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-sm text-white/50">Upcoming Integrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {["Discord", "Notion", "Jira", "Linear", "Trello", "Figma", "n8n", "VS Code"].map(name => (
                      <div key={name} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                        <span className="text-xs text-white/30">{name}</span>
                        <span className="text-[10px] text-white/20 border border-white/10 px-2 py-0.5 rounded-full">Soon</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Audit Logs Tab ────────────────────────────────────────────────── */}
          {activeTab === "audit" && (
            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-brand-400" />
                    Audit Log
                    {selectedOrg && <span className="text-white/30 font-normal">— {selectedOrg.name}</span>}
                  </span>
                  <Button size="sm" variant="outline">Export CSV</Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {auditLogs.length === 0 ? (
                  <div className="py-12 text-center">
                    <ClipboardList className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/30">No audit events recorded yet.</p>
                    <p className="text-[11px] text-white/20 mt-1">Actions like role changes, billing updates, and integration configs will appear here.</p>
                  </div>
                ) : auditLogs.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-white/5 hover:border-white/8 bg-white/[0.01] transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-brand-300">{entry.action}</span>
                        <span className="text-[10px] text-white/30">{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                      {entry.detail && <p className="text-[11px] text-white/40 mt-0.5 truncate">{entry.detail}</p>}
                    </div>
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
