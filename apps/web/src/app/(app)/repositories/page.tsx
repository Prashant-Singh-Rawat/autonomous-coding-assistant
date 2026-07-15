"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  Plus,
  Search,
  Star,
  GitFork,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  GitPullRequest,
  Database,
} from "lucide-react";
import { cn, getLanguageColor, formatNumber } from "@/lib/utils";
import { Card, CardContent, Badge, Button, EmptyState, Progress } from "@/components/ui";
import Link from "next/link";

const REPOS = [
  {
    id: "1", name: "e-commerce-dashboard", owner: "prashant-singh", fullName: "prashant-singh/e-commerce-dashboard",
    description: "Full-stack e-commerce dashboard built with Next.js, Prisma, and Stripe integration",
    language: "TypeScript", stars: 127, forks: 23, isPrivate: false,
    status: "indexed" as const,
    openPRs: 3, openIssues: 7, size: "45.2 MB", files: 234,
  },
  {
    id: "2", name: "ai-chat-app", owner: "prashant-singh", fullName: "prashant-singh/ai-chat-app",
    description: "Real-time AI chat application with WebSocket support and multiple model integrations",
    language: "Python", stars: 89, forks: 14, isPrivate: true,
    status: "indexed" as const,
    openPRs: 1, openIssues: 4, size: "23.8 MB", files: 156,
  },
  {
    id: "3", name: "portfolio-website", owner: "prashant-singh", fullName: "prashant-singh/portfolio-website",
    description: "Personal developer portfolio with animations and dark mode",
    language: "React", stars: 45, forks: 8, isPrivate: false,
    status: "indexing" as const,
    openPRs: 0, openIssues: 2, size: "12.1 MB", files: 89,
    indexProgress: 67,
  },
];

const INDEX_STAGES = ["Cloning", "Reading Files", "Generating Embeddings", "Analyzing Architecture", "Ready"];

function IndexingProgress({ progress }: { progress: number }) {
  const currentStage = Math.min(INDEX_STAGES.length - 1, Math.floor((progress / 100) * INDEX_STAGES.length));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Indexing in progress...</span>
        <span className="font-mono text-brand-400">{progress}%</span>
      </div>
      <Progress value={progress} />
      <div className="flex items-center gap-1.5 flex-wrap">
        {INDEX_STAGES.map((stage, i) => (
          <React.Fragment key={stage}>
            <div className={cn(
              "flex items-center gap-1 text-[9px]",
              i < currentStage ? "text-emerald-400" : i === currentStage ? "text-brand-400" : "text-muted-foreground/40"
            )}>
              {i < currentStage ? <CheckCircle2 className="w-2.5 h-2.5" /> : i === currentStage ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <div className="w-2.5 h-2.5 rounded-full border border-current" />}
              <span>{stage}</span>
            </div>
            {i < INDEX_STAGES.length - 1 && <div className={cn("flex-1 h-px min-w-[4px]", i < currentStage ? "bg-emerald-400/40" : "bg-white/8")} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function RepoCard({ repo }: { repo: typeof REPOS[0] }) {
  const langColor = getLanguageColor(repo.language);

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card className="group cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600/20 to-purple-600/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                <GitBranch className="w-5 h-5 text-brand-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/repositories/${repo.id}`} className="text-sm font-semibold text-white hover:text-brand-400 transition-colors truncate">
                    {repo.name}
                  </Link>
                  {repo.isPrivate && <Badge variant="secondary" className="text-[10px] flex-shrink-0">Private</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">{repo.owner}</p>
              </div>
            </div>

            <Badge variant={repo.status === "indexed" ? "success" : "warning"} className="text-[10px]">
              {repo.status === "indexed" ? "✓ Indexed" : "Indexing..."}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mb-4 leading-relaxed line-clamp-2 h-8">{repo.description}</p>

          {repo.status === "indexing" && "indexProgress" in repo && repo.indexProgress && (
            <div className="mb-4">
              <IndexingProgress progress={repo.indexProgress} />
            </div>
          )}

          {repo.status === "indexed" && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "PRs", value: repo.openPRs, icon: GitPullRequest, color: "text-purple-400" },
                { label: "Issues", value: repo.openIssues, icon: AlertCircle, color: "text-amber-400" },
                { label: "Files", value: repo.files, icon: FileText, color: "text-brand-400" },
                { label: "Size", value: repo.size, icon: Database, color: "text-emerald-400" },
              ].map((m) => (
                <div key={m.label} className="p-2 rounded-lg bg-white/4 border border-white/6 text-center">
                  <m.icon className={cn("w-3.5 h-3.5 mx-auto mb-1", m.color)} />
                  <p className="text-xs font-semibold text-white">{typeof m.value === "number" ? formatNumber(m.value) : m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: langColor }} />
                {repo.language}
              </span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stars}</span>
              <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ConnectRepoModal({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const available = [
    { name: "task-manager-api", lang: "Node.js", stars: 34, private: false },
    { name: "ml-pipeline", lang: "Python", stars: 12, private: true },
  ].filter(r => r.name.includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-[#0d0d1a] border border-white/10 shadow-panel"
      >
        <div className="p-6 border-b border-white/8">
          <h2 className="text-base font-semibold text-white mb-1">Connect a Repository</h2>
          <p className="text-xs text-muted-foreground">Select a GitHub repository to give Tony AI access</p>
        </div>
        <div className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search repositories..."
              className="tony-input pl-10" />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
            {available.map(r => (
              <button key={r.name} onClick={() => setSelected(r.name)}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                  selected === r.name ? "border-brand-500/40 bg-brand-500/10" : "border-white/8 bg-white/4 hover:bg-white/8"
                )}>
                <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{r.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: getLanguageColor(r.lang) }} />{r.lang}</span>
                    <span className="flex items-center gap-1"><Star className="w-2.5 h-2.5" />{r.stars}</span>
                    {r.private && <Badge variant="secondary" className="text-[10px]">Private</Badge>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-white/8 flex items-center gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!selected}>Connect Repository</Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function RepositoriesPage() {
  const [search, setSearch] = useState("");
  const [showConnect, setShowConnect] = useState(false);
  const [filter, setFilter] = useState<"all" | "indexed" | "indexing">("all");

  const filtered = REPOS.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || r.status === filter)
  );

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showConnect && <ConnectRepoModal onClose={() => setShowConnect(false)} />}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title font-bold text-white">Repositories</h1>
          <p className="text-sm text-muted-foreground mt-1">{REPOS.length} repositories connected</p>
        </div>
        <Button onClick={() => setShowConnect(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Connect Repo
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search repositories..."
            className="tony-input pl-10" />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
          {(["all", "indexed", "indexing"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                filter === f ? "bg-brand-600 text-white" : "text-muted-foreground hover:text-white"
              )}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(repo => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
        {filtered.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState
              icon={<GitBranch className="w-6 h-6" />}
              title="No repositories found"
              description="Connect a GitHub repository to get started with Tony AI"
            />
          </div>
        )}
      </div>
    </div>
  );
}
