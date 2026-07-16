"use client";

import React, { useEffect, useState } from "react";
import { Search, Star, Lock, Globe, ArrowRight, Database, ChevronDown, Check, AlertTriangle, RefreshCw, Wifi, Server, Github, Terminal, ShieldAlert, ExternalLink, HelpCircle, Activity, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input } from "@/components/ui";
import { useRouter } from "next/navigation";

interface GithubOrg {
  id: number;
  login: string;
  avatar_url: string | null;
}

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

interface GithubBranch {
  name: string;
  commit_sha: string;
}

export interface ErrorDetail {
  message: string;
  status?: number;
  possibleCauses: string[];
  technicalDetails?: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
}

export default function RepositoriesPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<GithubOrg[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>(""); // "" means personal repos
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [branches, setBranches] = useState<GithubBranch[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<ErrorDetail | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recovery UI states
  const [showLogs, setShowLogs] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    internetOnline: boolean | null;
    backendReachable: boolean | null;
    githubReachable: boolean | null;
  }>({
    internetOnline: null,
    backendReachable: null,
    githubReachable: null
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    const online = typeof window !== "undefined" ? navigator.onLine : true;
    
    let backendUp = false;
    try {
      const res = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(3000) });
      if (res.ok) backendUp = true;
    } catch (e) {
      backendUp = false;
    }

    let githubUp = false;
    try {
      const res = await fetch("https://api.github.com/", { signal: AbortSignal.timeout(3000) });
      if (res.status === 200 || res.status === 403 || res.status === 401) githubUp = true;
    } catch (e) {
      githubUp = false;
    }

    setDiagnostics({
      internetOnline: online,
      backendReachable: backendUp,
      githubReachable: githubUp
    });
    setIsDiagnosing(false);
  };

  const triggerAutoReconnect = () => {
    let count = 5;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        const connectUrl = token
          ? `http://localhost:8000/auth/github/connect?token=${encodeURIComponent(token)}`
          : "http://localhost:8000/auth/github/connect";
        window.location.href = connectUrl;
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const fetchRateLimitDetails = async (token: string | null, errDetail: ErrorDetail) => {
    try {
      const res = await fetch("http://localhost:8000/github/rate_limit", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // GitHub returns core limit rate
        const core = data.resources?.core || data.rate;
        if (core) {
          errDetail.rateLimit = {
            limit: core.limit,
            remaining: core.remaining,
            resetTime: new Date(core.reset * 1000)
          };
          setErrorDetail({ ...errDetail });
        }
      }
    } catch (e) {
      console.error("Failed to load rate limits:", e);
    }
  };

  const fetchOrgs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/repositories/github/orgs", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrgs(data);
      }
    } catch (err) {
      console.error("Failed to load orgs:", err);
    }
  };

  const fetchRepos = async () => {
    setIsLoading(true);
    setError(null);
    setErrorDetail(null);
    try {
      const token = localStorage.getItem("token");
      const url = selectedOrg 
        ? `http://localhost:8000/repositories/github/list?org=${selectedOrg}`
        : "http://localhost:8000/repositories/github/list";

      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) {
        let errorMsg = "Failed to fetch repositories.";
        let detail = "";
        try {
          const errorJson = await res.json();
          detail = errorJson.detail || JSON.stringify(errorJson);
          errorMsg = detail || errorMsg;
        } catch (e) {
          detail = await res.text();
          errorMsg = detail || errorMsg;
        }
        
        const errDetail: ErrorDetail = {
          message: errorMsg,
          status: res.status,
          possibleCauses: [],
          technicalDetails: `URL: ${url}\nHTTP Status: ${res.status}\nResponse Detail: ${detail}`
        };
        
        // Parse causes and triggers based on status and details
        if (res.status === 401 || res.status === 403) {
          if (detail.toLowerCase().includes("token") || detail.toLowerCase().includes("expired") || detail.toLowerCase().includes("credentials")) {
            errDetail.possibleCauses = [
              "Your GitHub OAuth access token has expired or was revoked.",
              "The application was disconnected from your GitHub account.",
              "Session credentials are invalid or expired."
            ];
            setErrorDetail(errDetail);
            setError(errorMsg);
            triggerAutoReconnect();
            return;
          } else if (detail.toLowerCase().includes("rate limit") || detail.toLowerCase().includes("quota") || detail.toLowerCase().includes("rate_limit")) {
            errDetail.possibleCauses = [
              "You have exceeded the GitHub API rate limits for your IP/account.",
              "Too many repository requests within a short timeframe."
            ];
            await fetchRateLimitDetails(token, errDetail);
          } else {
            errDetail.possibleCauses = [
              "Insufficient repository permissions (e.g., trying to access private repo without scope).",
              "GitHub token is missing the required OAuth scopes."
            ];
          }
        } else if (res.status >= 500) {
          errDetail.possibleCauses = [
            "The backend server encountered an internal error.",
            "Database connection or Celery worker is down.",
            "A temporary outage in the backend server."
          ];
        } else {
          errDetail.possibleCauses = [
            "Invalid request parameters.",
            "GitHub API is returning an unexpected response format."
          ];
        }
        
        setErrorDetail(errDetail);
        setError(errorMsg);
        runDiagnostics();
        return;
      }
      
      const data = await res.json();
      setRepos(data);
      setErrorDetail(null);
      setError(null);
    } catch (err: any) {
      console.error("Fetch repos failed:", err);
      const errDetail: ErrorDetail = {
        message: "Unable to reach the backend server.",
        status: 0,
        possibleCauses: [
          "The backend server is not running or is down.",
          "Local network offline or DNS resolution failure.",
          "CORS block or incorrect backend server port configuration (should be port 8000)."
        ],
        technicalDetails: err.stack || err.message || String(err)
      };
      setErrorDetail(errDetail);
      setError(err.message || "Failed to connect to backend");
      runDiagnostics();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Call standard refresh endpoint on backend
      const res = await fetch(`http://localhost:8000/auth/refresh?refresh_token=${token}`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);
        }
      }
      await runDiagnostics();
      await fetchRepos();
    } catch (err) {
      console.error("Token refresh failed:", err);
      await runDiagnostics();
      await fetchRepos();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [selectedOrg]);

  const selectRepo = async (repo: GithubRepo) => {
    setSelectedRepo(repo);
    setSelectedBranch("");
    setBranches([]);
    setIsLoadingBranches(true);
    try {
      const token = localStorage.getItem("token");
      const [owner, name] = repo.full_name.split("/");
      const res = await fetch(`http://localhost:8000/repositories/github/${owner}/${name}/branches`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
        const defaultBranchExists = data.some((b: any) => b.name === repo.default_branch);
        setSelectedBranch(defaultBranchExists ? repo.default_branch : (data[0]?.name || "main"));
      } else {
        setSelectedBranch(repo.default_branch || "main");
      }
    } catch (err) {
      setSelectedBranch(repo.default_branch || "main");
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedRepo || !selectedBranch) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/repositories/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: selectedRepo.name,
          source_url: selectedRepo.html_url,
          default_branch: selectedRepo.default_branch,
          selected_branch: selectedBranch,
          visibility: selectedRepo.private ? "private" : "public"
        })
      });
      if (!res.ok) throw new Error("Failed to create repository integration");
      const data = await res.json();
      localStorage.setItem("active_repo_id", data.id);
      router.push(`/onboarding/indexing?repo_id=${data.id}`);
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(search.toLowerCase()) || 
    (repo.description && repo.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">Select Repository</h1>
            <p className="text-muted-foreground">Choose a GitHub repository and branch to index into Tony AI.</p>
          </div>
          
          {/* Org Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account:</span>
            <select 
              value={selectedOrg}
              onChange={(e) => {
                setSelectedOrg(e.target.value);
                setSelectedRepo(null);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="" className="bg-neutral-900">Personal Repositories</option>
              {orgs.map(org => (
                <option key={org.id} value={org.login} className="bg-neutral-900">{org.login}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search repositories..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 bg-white/5 border-white/10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative subtle ambient lights */}
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          {/* Header & Main Reason */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 pb-6 border-b border-white/10 relative z-10">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Connection / API Fetch Error
                {errorDetail?.status ? (
                  <span className="text-xs bg-white/10 text-muted-foreground px-2 py-0.5 rounded-full font-mono font-semibold">
                    HTTP {errorDetail.status}
                  </span>
                ) : null}
              </h2>
              <p className="text-sm text-red-400 font-medium font-sans">
                {errorDetail?.message || error}
              </p>
            </div>
          </div>

          {/* Automatic Redirection Indicator */}
          {countdown !== null && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 flex items-center justify-between gap-4 relative z-10"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-brand-400 animate-spin" />
                <div className="text-sm">
                  <span className="font-semibold text-white">OAuth Authentication Expired.</span>
                  <p className="text-muted-foreground text-xs mt-0.5">Redirecting you to reconnect GitHub in <span className="text-white font-bold">{countdown}</span> seconds...</p>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => {
                  const t = localStorage.getItem("token") || localStorage.getItem("access_token");
                  window.location.href = t ? `http://localhost:8000/auth/github/connect?token=${encodeURIComponent(t)}` : "http://localhost:8000/auth/github/connect";
                }}
                className="shrink-0"
              >
                Redirect Now
              </Button>
            </motion.div>
          )}

          {/* Diagnostics Section */}
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Network & Service Diagnostics</h3>
              <button 
                onClick={runDiagnostics} 
                disabled={isDiagnosing}
                className="text-[11px] text-brand-400 hover:text-white flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isDiagnosing ? 'animate-spin' : ''}`} /> Re-run Checks
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Local network */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wifi className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-white">Your Connection</span>
                </div>
                {diagnostics.internetOnline === null ? (
                  <span className="text-xs text-muted-foreground">Checking...</span>
                ) : diagnostics.internetOnline ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Offline
                  </span>
                )}
              </div>

              {/* Backend status */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-white">Tony AI Backend</span>
                </div>
                {diagnostics.backendReachable === null ? (
                  <span className="text-xs text-muted-foreground">Checking...</span>
                ) : diagnostics.backendReachable ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Reachable
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Offline
                  </span>
                )}
              </div>

              {/* GitHub API status */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-white">GitHub API Service</span>
                </div>
                {diagnostics.githubReachable === null ? (
                  <span className="text-xs text-muted-foreground">Checking...</span>
                ) : diagnostics.githubReachable ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Reachable
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rate Limit Info */}
          {errorDetail?.rateLimit && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3 relative z-10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-400 font-medium flex items-center gap-1.5">
                  <Activity className="w-4 h-4 animate-pulse" /> GitHub Rate Limit Quota Exceeded
                </span>
                <span className="text-xs text-muted-foreground">
                  Resets at: {errorDetail.rateLimit.resetTime.toLocaleTimeString()}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${(errorDetail.rateLimit.remaining / errorDetail.rateLimit.limit) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Remaining quota: {errorDetail.rateLimit.remaining} / {errorDetail.rateLimit.limit} requests</span>
                <span>Retry available in: {Math.max(0, Math.ceil((errorDetail.rateLimit.resetTime.getTime() - Date.now()) / 1000))}s</span>
              </div>
            </div>
          )}

          {/* Possible Causes List */}
          {errorDetail?.possibleCauses && errorDetail.possibleCauses.length > 0 && (
            <div className="bg-white/5 border border-white/5 rounded-xl p-5 space-y-3 relative z-10">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Possible Causes</h4>
              <ul className="space-y-2">
                {errorDetail.possibleCauses.map((cause, idx) => (
                  <li key={idx} className="text-sm text-white/80 flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    {cause}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Backend Diagnostics Help Card */}
          {diagnostics.backendReachable === false && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 space-y-2 relative z-10">
              <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" /> Backend Diagnostics Guidance
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The local application backend server seems to be stopped or unreachable at <code className="bg-white/5 px-1 py-0.5 rounded text-white text-[11px]">http://localhost:8000</code>.
              </p>
              <div className="pt-2">
                <p className="text-xs font-medium text-white mb-1">To start the backend server locally, run:</p>
                <pre className="bg-black/40 border border-white/5 rounded p-2.5 font-mono text-[11px] text-brand-300">cd backend&#10;python main.py</pre>
              </div>
            </div>
          )}

          {/* Action Panel Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/10 relative z-10">
            <Button 
              onClick={fetchRepos}
              className="w-full"
              variant="default"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Retry Connection
            </Button>
            
            <Button 
              onClick={() => {
                const t = localStorage.getItem("token") || localStorage.getItem("access_token");
                window.location.href = t ? `http://localhost:8000/auth/github/connect?token=${encodeURIComponent(t)}` : "http://localhost:8000/auth/github/connect";
              }}
              className="w-full"
              variant="outline"
              leftIcon={<Github className="w-4 h-4" />}
            >
              Reconnect GitHub
            </Button>

            <Button 
              onClick={handleRefreshToken}
              className="w-full"
              variant="outline"
              leftIcon={<Key className="w-4 h-4" />}
            >
              Refresh Session
            </Button>

            <Button 
              onClick={() => setShowLogs(!showLogs)}
              className="w-full text-muted-foreground hover:text-white"
              variant="ghost"
              leftIcon={<Terminal className="w-4 h-4" />}
            >
              {showLogs ? "Hide Technical Logs" : "View Technical Logs"}
            </Button>
          </div>

          {/* Diagnostic Log Details Panel */}
          <AnimatePresence>
            {showLogs && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative z-10"
              >
                <div className="bg-black/50 border border-white/10 rounded-xl p-4 font-mono text-xs text-brand-300 overflow-x-auto max-h-64 space-y-2 mt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-sans">
                      <Terminal className="w-3.5 h-3.5" /> Technical Diagnostics Log Output
                    </span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(errorDetail?.technicalDetails || error || "")}
                      className="text-[10px] text-muted-foreground hover:text-white border border-white/10 rounded px-1.5 py-0.5 transition-all"
                    >
                      Copy Logs
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-[11px]">
                    {errorDetail?.technicalDetails || `Error Stack:\n${error}`}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : filteredRepos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-white/10 border-dashed rounded-xl bg-white/5">
          <Database className="w-12 h-12 text-white/20 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No repositories found</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            {search ? "We couldn't find any repositories matching your search." : "This account doesn't have any repositories yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
            {filteredRepos.map((repo) => (
              <div 
                key={repo.id}
                onClick={() => selectRepo(repo)}
                className={`group flex flex-col justify-between p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  selectedRepo?.id === repo.id 
                    ? "border-brand-500 bg-brand-500/5" 
                    : "bg-white/5 border-white/10 hover:border-brand-500/50 hover:bg-white/10"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 to-purple-500/0 group-hover:from-brand-500/5 group-hover:to-purple-500/5 transition-all" />
                
                <div className="space-y-3 relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-white truncate" title={repo.full_name}>
                      {repo.name}
                    </h3>
                    {repo.private ? (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3" /> Private
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-medium flex items-center gap-1 shrink-0">
                        <Globe className="w-3 h-3" /> Public
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                    {repo.description || "No description provided."}
                  </p>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10 relative z-10">
                  {repo.language && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-brand-400" />
                      {repo.language}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3.5 h-3.5" />
                    {repo.stargazers_count}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Branch Selection Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 p-6 rounded-xl bg-white/5 border border-white/10 space-y-6">
              <h2 className="text-lg font-semibold text-white">Connection Settings</h2>
              
              {selectedRepo ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Selected Repository</span>
                    <p className="text-sm font-medium text-white mt-1">{selectedRepo.full_name}</p>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground">Select Branch</span>
                    {isLoadingBranches ? (
                      <div className="h-10 mt-1 bg-white/5 border border-white/10 rounded-lg animate-pulse" />
                    ) : (
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full mt-1 bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                      >
                        {branches.map(branch => (
                          <option key={branch.name} value={branch.name}>{branch.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <Button 
                    onClick={handleConnect} 
                    className="w-full h-11"
                    disabled={isSubmitting || !selectedBranch}
                    loading={isSubmitting}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Index and Connect
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Database className="w-8 h-8 opacity-20 mb-3" />
                  <p className="text-sm">Select a repository from the list to configure branch settings.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
