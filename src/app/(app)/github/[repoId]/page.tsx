"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  GitPullRequest, GitBranch, AlertCircle, CheckCircle2, 
  RotateCw, Plus, ArrowRight, Play, Info, Check, 
  MessageSquare, ShieldCheck, Cpu, RefreshCw, Terminal, 
  Calendar, Layers, Filter 
} from "lucide-react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import AutomationCenter from "@/components/github/AutomationCenter";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


interface PullRequest {
  id: string;
  github_pr_number: number;
  title: string;
  author: string;
  state: string;
  base_branch: string;
  head_branch: string;
  mergeable_state: string | null;
  last_synced_at: string;
}

interface Issue {
  id: string;
  github_issue_number: number;
  title: string;
  author: string;
  state: string;
  labels: string[];
}

interface Commit {
  id: string;
  sha: string;
  author: string;
  message: string;
  branch: string;
  ai_summary: string | null;
}

export default function GitHubManagementPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.repoId as string;

  const [activeTab, setActiveTab] = useState<"prs" | "issues" | "commits" | "automation">("prs");
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPr, setSelectedPr] = useState<PullRequest | null>(null);
  const [reviewDraft, setReviewDraft] = useState<string>("");
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);

  const fetchRepoData = async () => {
    setIsLoading(true);
    // Clear previous repo's data immediately to avoid showing stale data
    setPrs([]);
    setIssues([]);
    setCommits([]);
    setSelectedPr(null);
    setReviewDraft("");

    try {
      const token = localStorage.getItem("token");
      
      // Fetch Pull Requests
      const prsRes = await fetch(`${API}/repositories/${repoId}/pull-requests`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (prsRes.ok) {
        setPrs(await prsRes.json());
      } else {
        const errText = await prsRes.text();
        console.error("Failed to fetch PRs:", errText);
        alert(`Failed to sync Pull Requests from GitHub: ${errText}`);
      }

      // Fetch Issues
      const issuesRes = await fetch(`${API}/repositories/${repoId}/issues`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (issuesRes.ok) {
        setIssues(await issuesRes.json());
      } else {
        const errText = await issuesRes.text();
        console.error("Failed to fetch issues:", errText);
        alert(`Failed to sync Issues from GitHub: ${errText}`);
      }

      // Fetch Commits
      const commitsRes = await fetch(`${API}/repositories/${repoId}/commits`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (commitsRes.ok) {
        setCommits(await commitsRes.json());
      } else {
        const errText = await commitsRes.text();
        console.error("Failed to fetch commits:", errText);
        alert(`Failed to sync Commits from GitHub: ${errText}`);
      }
    } catch (err) {
      console.error(err);
      alert("A network error occurred while syncing with GitHub.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (repoId) {
      // Store the newly active repoId so sidebar links stay up to date
      localStorage.setItem("active_repo_id", repoId);
      fetchRepoData();
    }
  }, [repoId]);


  const handleManualSync = async () => {
    setIsSyncing(true);
    // Simulate GitHub webhook trigger sync request
    setTimeout(() => {
      setIsSyncing(false);
      fetchRepoData();
    }, 1500);
  };

  const handleGenerateAIReview = async (pr: PullRequest) => {
    setSelectedPr(pr);
    setIsGeneratingReview(true);
    setReviewDraft("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/pull-requests/${pr.id}/review/generate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReviewDraft(data.summary || "Auto review completed.");
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to generate review: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      alert("Network error generating AI review.");
    } finally {
      setIsGeneratingReview(false);
    }
  };

  const handlePostReviewDraft = async () => {
    if (!selectedPr) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/pull-requests/${selectedPr.id}/review/post`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ summary: reviewDraft })
      });
      if (res.ok) {
        alert("Review draft successfully posted to GitHub!");
        setReviewDraft("");
      } else {
        alert("Failed to post review to GitHub.");
      }
    } catch (e) {
      alert("Network error while posting review.");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4">
      {/* Upper Sync Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">GitHub Management Center</h1>
            <Badge variant="blue" className="text-[10px]">Connected</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Synchronized with remote repo. State updates live via hooks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground font-mono">
            Last sync: {prs[0]?.last_synced_at ? new Date(prs[0].last_synced_at).toLocaleTimeString() : "Just now"}
          </span>
          <Button 
            size="sm" 
            onClick={handleManualSync}
            disabled={isSyncing}
            leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />}
          >
            {isSyncing ? "Syncing..." : "Sync GitHub State"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        {[
          { id: "prs", label: "Pull Requests", icon: GitPullRequest },
          { id: "issues", label: "Issues Kanban", icon: Info },
          { id: "commits", label: "Commit Summaries", icon: Layers },
          { id: "automation", label: "Automation Rules", icon: Cpu }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id 
                ? "bg-brand-500/10 text-white border border-brand-500/30" 
                : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Main Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-xs text-muted-foreground">Fetching GitHub branches state...</p>
        </div>
      ) : (
        <div className={activeTab === "automation" ? "w-full" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
          {/* Main content list */}
          <div className={activeTab === "automation" ? "w-full" : "lg:col-span-2 space-y-4"}>
            {activeTab === "automation" && (
              <AutomationCenter repoId={repoId} />
            )}

            {activeTab === "prs" && (
              <div className="space-y-3">
                {prs.map(pr => (
                  <Card key={pr.id} className="hover:border-white/10 transition-all">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">#{pr.github_pr_number}</span>
                          <h4 className="text-xs font-semibold text-white hover:text-brand-400 cursor-pointer">{pr.title}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                          <span>by {pr.author}</span>
                          <span>•</span>
                          <span className="text-brand-400">{pr.head_branch}</span>
                          <span>→</span>
                          <span>{pr.base_branch}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={pr.mergeable_state === "clean" ? "success" : "warning"} className="text-[9px]">
                          {pr.mergeable_state === "clean" ? "Mergeable" : "Conflicting"}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleGenerateAIReview(pr)}
                        >
                          Generate AI Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "issues" && (
              <div className="space-y-3">
                {issues.map(issue => (
                  <Card key={issue.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">#{issue.github_issue_number}</span>
                          <h4 className="text-xs font-semibold text-white">{issue.title}</h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {issue.labels.map(l => (
                            <Badge key={l} variant="secondary" className="text-[9px] px-1.5">
                              {l}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant={issue.state === "open" ? "default" : "secondary"}>
                        {issue.state.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "commits" && (
              <div className="space-y-4">
                {commits.map(commit => (
                  <Card key={commit.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-[9px]">
                            {commit.sha}
                          </Badge>
                          <span className="text-xs font-semibold text-white">{commit.message}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">by {commit.author}</span>
                      </div>
                      {commit.ai_summary && (
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-brand-400 block text-[9px] uppercase tracking-wider mb-1">AI Commit Summary</span>
                          {commit.ai_summary}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right AI actions details view */}
          {activeTab !== "automation" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Review Draft Hub</h3>
              <Card className="border-brand-500/20 bg-brand-500/[0.02]">
                <CardContent className="p-4 space-y-4">
                  {selectedPr ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="text-xs font-bold text-white">Drafting PR #{selectedPr.github_pr_number}</span>
                        <Badge variant="warning" className="text-[9px]">Draft</Badge>
                      </div>
                      {isGeneratingReview ? (
                        <div className="py-10 flex flex-col items-center justify-center space-y-2">
                          <Cpu className="w-6 h-6 text-brand-400 animate-pulse" />
                          <span className="text-xs text-muted-foreground">Analysing change files diffs...</span>
                        </div>
                      ) : reviewDraft ? (
                        <div className="space-y-4">
                          <div className="p-3 rounded-lg bg-black text-xs font-mono text-emerald-400 h-[220px] overflow-y-auto leading-relaxed whitespace-pre-wrap">
                            {reviewDraft}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1" onClick={handlePostReviewDraft}>Post Draft to GitHub</Button>
                            <Button size="sm" variant="ghost" onClick={() => setReviewDraft("")}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-10 text-xs text-muted-foreground">
                          Click "Generate AI Review" on a Pull Request to begin codebase diff reviews.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-xs text-muted-foreground">
                      Select a pull request to review details and draft releases.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
