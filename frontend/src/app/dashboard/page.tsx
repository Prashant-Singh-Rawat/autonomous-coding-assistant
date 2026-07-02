"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LabelKey =
  | "improvement" | "easy" | "beginner" | "hard"
  | "bug-fix" | "feature" | "hotfix" | "needs-review"
  | "blocked" | "external" | "internal" | "performance" | "refresh";

type TaskStatus = "backlog" | "ready" | "in-progress" | "in-review" | "done";

interface Task {
  id: string;
  issueNumber: number;
  title: string;
  description: string;
  labels: LabelKey[];
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "critical";
  assignee: { name: string; initials: string };
  estimate: number;
  project: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface RepoEntry {
  id: string;
  name: string;
  status: string;
  score: number | null;
  lastRun: string;
  local_path?: string;
}

// ─── Label Config ─────────────────────────────────────────────────────────────

const LABEL_CONFIG: Record<
  LabelKey,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  improvement:    { label: "Improvement",         bg: "bg-sky-500/15",      text: "text-sky-300",      border: "border-sky-500/30",      icon: "⬆" },
  easy:           { label: "Easy Task",            bg: "bg-emerald-500/15",  text: "text-emerald-300",  border: "border-emerald-500/30",  icon: "✓" },
  beginner:       { label: "Beginner Level",       bg: "bg-teal-500/15",     text: "text-teal-300",     border: "border-teal-500/30",     icon: "🌱" },
  hard:           { label: "Hard",                 bg: "bg-rose-500/15",     text: "text-rose-300",     border: "border-rose-500/30",     icon: "🔥" },
  "bug-fix":      { label: "Bug Fix",              bg: "bg-red-500/15",      text: "text-red-300",      border: "border-red-500/30",      icon: "🐛" },
  feature:        { label: "Feature",              bg: "bg-violet-500/15",   text: "text-violet-300",   border: "border-violet-500/30",   icon: "✦" },
  hotfix:         { label: "Hot Fix",              bg: "bg-orange-500/15",   text: "text-orange-300",   border: "border-orange-500/30",   icon: "⚡" },
  "needs-review": { label: "Needs Review",         bg: "bg-yellow-500/15",   text: "text-yellow-300",   border: "border-yellow-500/30",   icon: "👁" },
  blocked:        { label: "Blocked",              bg: "bg-gray-500/15",     text: "text-gray-300",     border: "border-gray-500/30",     icon: "🚫" },
  external:       { label: "External Dependency",  bg: "bg-cyan-500/15",     text: "text-cyan-300",     border: "border-cyan-500/30",     icon: "🔗" },
  internal:       { label: "Internal Refactor",    bg: "bg-indigo-500/15",   text: "text-indigo-300",   border: "border-indigo-500/30",   icon: "🔄" },
  performance:    { label: "Performance",          bg: "bg-amber-500/15",    text: "text-amber-300",    border: "border-amber-500/30",    icon: "📈" },
  refresh:        { label: "Page Refresh",         bg: "bg-lime-500/15",     text: "text-lime-300",     border: "border-lime-500/30",     icon: "↺" },
};

// ─── Sample / Static Data ─────────────────────────────────────────────────────

const INITIAL_TASKS: Task[] = [
  {
    id: "t1", issueNumber: 15, title: "Build Forgot Password Section", project: "auth-service",
    description: "Implement email retrieval flow and secure reset tokens.",
    labels: ["feature", "improvement"], status: "backlog",
    priority: "high", assignee: { name: "Lakshita", initials: "L" }, estimate: 3,
  },
  {
    id: "t2", issueNumber: 3, title: "Enhance Landing Page with FAQ, Reviews & Trust-Building Sections", project: "auth-service",
    description: "Add dynamic sections to improve user trust and clear onboarding answers.",
    labels: ["improvement", "easy"], status: "backlog",
    priority: "medium", assignee: { name: "Prashant", initials: "P" }, estimate: 2,
  },
  {
    id: "t3", issueNumber: 20, title: "Bug Report: Resume Template Preview Images Not Loading", project: "auth-service",
    description: "Fix CORS issue when fetching preview thumbnails from external S3 bucket.",
    labels: ["bug-fix", "hotfix"], status: "backlog",
    priority: "critical", assignee: { name: "Prashant", initials: "P" }, estimate: 1,
  },
  {
    id: "t4", issueNumber: 2, title: "Enhance Resume Matching using Semantic BERT Embeddings", project: "legacy-billing",
    description: "Integrate vector embeddings to compute dense cosine similarity metrics.",
    labels: ["performance", "hard"], status: "ready",
    priority: "high", assignee: { name: "Unassigned", initials: "U" }, estimate: 5,
  },
  {
    id: "t5", issueNumber: 4, title: "Enhance README", project: "legacy-billing",
    description: "Add screenshots, architecture diagrams, and docker local deployment instructions.",
    labels: ["beginner", "easy"], status: "in-review",
    priority: "low", assignee: { name: "Lakshita", initials: "L" }, estimate: 1,
  },
  {
    id: "t6", issueNumber: 11, title: "Integrate Stripe Webhook", project: "legacy-billing",
    description: "Receive and process payment events from Stripe external API.",
    labels: ["external", "feature"], status: "in-progress",
    priority: "high", assignee: { name: "Unassigned", initials: "U" }, estimate: 3,
  },
  {
    id: "t7", issueNumber: 19, title: "Create CONTRIBUTING.md Guidelines", project: "auth-service",
    description: "Document project conventions and git branch naming rules.",
    labels: ["beginner", "easy"], status: "done",
    priority: "low", assignee: { name: "Prashant", initials: "P" }, estimate: 1,
  },
];

const PROJECTS: Project[] = [
  { id: "auth-service",   name: "Auth Service",    color: "from-blue-600 to-indigo-600",   description: "Authentication services" },
  { id: "legacy-billing", name: "Legacy Billing",  color: "from-emerald-600 to-teal-600",  description: "Billing services" },
];

const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string; text: string; bg: string }> = {
  backlog:       { label: "Backlog",      dot: "bg-gray-400",    text: "text-gray-400",    bg: "bg-gray-400/10" },
  ready:         { label: "Ready",        dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-400/10" },
  "in-progress": { label: "In Progress",  dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-400/10" },
  "in-review":   { label: "In Review",    dot: "bg-purple-400",  text: "text-purple-400",  bg: "bg-purple-400/10" },
  done:          { label: "Done",         dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/10" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ type }: { type: LabelKey }) {
  const c = LABEL_CONFIG[type];
  if (!c) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
}

function TaskCard({ task, onMove }: { task: Task; onMove: (id: string, status: TaskStatus) => void }) {
  return (
    <div className="bg-gray-900 border border-gray-800/80 rounded-lg p-3 hover:border-gray-700 transition-all group flex flex-col gap-2">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <span className="font-semibold">{task.project}</span>
          <span>#{task.issueNumber}</span>
        </div>
        <h4 className="text-xs font-medium text-gray-200 leading-snug group-hover:text-blue-400 transition-colors">
          {task.title}
        </h4>
      </div>

      {task.description && (
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
          {task.description}
        </p>
      )}

      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {task.labels.map((l) => <Label key={l} type={l} />)}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-800/50">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-[9px] font-bold text-white uppercase">
            {task.assignee.initials}
          </div>
          <span className="text-[10px] text-gray-500 font-medium">{task.assignee.name}</span>
        </div>
        {task.estimate > 0 && (
          <span className="text-[10px] text-gray-500 bg-gray-800/60 px-1.5 py-0.5 rounded border border-gray-700/50">
            Est: {task.estimate}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-800/30 opacity-0 group-hover:opacity-100 transition-all duration-150">
        {(["backlog", "ready", "in-progress", "in-review", "done"] as TaskStatus[]).map((status) => {
          if (status === task.status) return null;
          return (
            <button
              key={status}
              onClick={() => onMove(task.id, status)}
              className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors uppercase font-bold"
            >
              {status.replace("-", " ")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Repository Modal ─────────────────────────────────────────────────────

interface AddRepoModalProps {
  onClose: () => void;
  onAdd: (repo: RepoEntry) => void;
}

function AddRepoModal({ onClose, onAdd }: AddRepoModalProps) {
  const [name, setName]           = useState("");
  const [localPath, setLocalPath] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [mode, setMode]           = useState<"local" | "url">("local");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const overlayRef                = useRef<HTMLDivElement>(null);

  // Close on overlay click
  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Repository name is required."); return; }
    if (mode === "local" && !localPath.trim()) {
      setError("Please enter a local directory path.");
      return;
    }
    if (mode === "url" && !sourceUrl.trim()) {
      setError("Please enter a source URL.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const payload: Record<string, string | null> = {
        name: name.trim(),
        source_url: mode === "url" ? sourceUrl.trim() : null,
        local_path: mode === "local" ? localPath.trim() : null,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/repositories/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      onAdd({
        id: data.id,
        name: data.name,
        status: data.status,
        score: null,
        lastRun: "Just now",
        local_path: data.local_path,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-black text-white shadow">
              +
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Add Repository</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Ingest a project for AI analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg leading-none transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-3 px-6 bg-gray-950/50 border-b border-gray-800">
          <button
            onClick={() => setMode("local")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === "local"
                ? "bg-blue-600 text-white shadow"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            📁 Local Folder
          </button>
          <button
            onClick={() => setMode("url")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === "url"
                ? "bg-blue-600 text-white shadow"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            🔗 Remote URL
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-300" htmlFor="repo-name">
              Repository Name <span className="text-red-400">*</span>
            </label>
            <input
              id="repo-name"
              type="text"
              placeholder="e.g. my-awesome-app"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all"
            />
          </div>

          {/* Local path */}
          {mode === "local" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300" htmlFor="repo-local-path">
                Local Directory Path <span className="text-red-400">*</span>
              </label>
              <input
                id="repo-local-path"
                type="text"
                placeholder="e.g. C:\Users\prash\Documents\my-project"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all font-mono"
              />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Enter the absolute path to the project folder on the machine running the backend.
                The backend will recursively scan all source files (skipping{" "}
                <code className="text-gray-500 bg-gray-800 px-1 rounded">node_modules</code>,{" "}
                <code className="text-gray-500 bg-gray-800 px-1 rounded">.git</code>, etc.).
              </p>
            </div>
          )}

          {/* Source URL */}
          {mode === "url" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300" htmlFor="repo-source-url">
                Source URL <span className="text-red-400">*</span>
              </label>
              <input
                id="repo-source-url"
                type="url"
                placeholder="https://github.com/username/repo"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all"
              />
              <p className="text-[11px] text-gray-600">
                GitHub / GitLab URL. Cloning support coming soon — ensure the repo is publicly accessible.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400 flex items-start gap-2">
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              id="add-repo-submit"
              className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Ingesting…
                </>
              ) : (
                "Add Repository"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [tasks, setTasks]               = useState<Task[]>(INITIAL_TASKS);
  const [activeTab, setActiveTab]       = useState<"projects" | "repos">("projects");
  const [filterProject, setFilterProject] = useState<string | "all">("all");
  const [filterLabel, setFilterLabel]   = useState<LabelKey | "all">("all");
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [repos, setRepos]               = useState<RepoEntry[]>([
    { id: "repo-1", name: "auth-service",   status: "completed",  score: 85,   lastRun: "2 hours ago" },
    { id: "repo-2", name: "legacy-billing", status: "processing", score: null, lastRun: "Running..."  },
  ]);

  function handleMove(id: string, newStatus: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
  }

  function handleAddRepo(repo: RepoEntry) {
    setRepos((prev) => [...prev, repo]);
    setActiveTab("repos");
  }

  const filteredTasks = tasks.filter((t) => {
    const matchesProj  = filterProject === "all" || t.project === filterProject;
    const matchesLabel = filterLabel === "all" || t.labels.includes(filterLabel);
    return matchesProj && matchesLabel;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-50 font-sans">
      {/* Modal */}
      {isModalOpen && (
        <AddRepoModal
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddRepo}
        />
      )}

      {/* Navigation */}
      <nav className="border-b border-gray-800/60 bg-gray-900/60 backdrop-blur-md px-6 py-3 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-blue-500/20">
            A
          </div>
          <span className="font-bold text-base tracking-tight text-white">
            Autonomous Coding Assistant
          </span>
        </div>
        <div className="flex gap-4">
          <button
            id="nav-add-repo"
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow shadow-blue-500/20 flex items-center gap-1.5"
          >
            <span>+</span> Add Repository
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Project Board</h1>
            <p className="text-xs text-gray-400">Track milestones, priorities, backlogs, and workflows.</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-1 p-0.5 bg-gray-900 border border-gray-800 rounded-lg w-fit">
            <button
              id="tab-projects"
              onClick={() => setActiveTab("projects")}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "projects" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Projects &amp; Board
            </button>
            <button
              id="tab-repos"
              onClick={() => setActiveTab("repos")}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "repos" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Repositories
            </button>
          </div>
        </header>

        {/* ── Projects & Kanban Board ────────────────────────────────────────── */}
        {activeTab === "projects" && (
          <>
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-gray-900/40 border border-gray-800/80 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Project:</span>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Projects</option>
                  {PROJECTS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Label:</span>
                <select
                  value={filterLabel}
                  onChange={(e) => setFilterLabel(e.target.value as LabelKey | "all")}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Labels</option>
                  {(Object.keys(LABEL_CONFIG) as LabelKey[]).map((k) => (
                    <option key={k} value={k}>{LABEL_CONFIG[k].label}</option>
                  ))}
                </select>
              </div>

              {(filterProject !== "all" || filterLabel !== "all") && (
                <button
                  onClick={() => { setFilterProject("all"); setFilterLabel("all"); }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium ml-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
              {(["backlog", "ready", "in-progress", "in-review", "done"] as TaskStatus[]).map((status) => {
                const columnTasks = filteredTasks.filter((t) => t.status === status);
                const config = STATUS_CONFIG[status];
                return (
                  <div key={status} className="bg-gray-950 border border-gray-800/60 rounded-xl p-3 min-w-[220px] flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-900">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                        <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                          {config.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold bg-gray-900 text-gray-400 px-1.5 py-0.5 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-600 -mt-1.5 italic">
                      {status === "backlog"     && "This item hasn't been started"}
                      {status === "ready"       && "Ready to be picked up"}
                      {status === "in-progress" && "Actively being worked on"}
                      {status === "in-review"   && "Waiting for review"}
                      {status === "done"        && "Completed ✓"}
                    </p>

                    <div className="flex flex-col gap-2.5 min-h-[300px]">
                      {columnTasks.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center border border-dashed border-gray-900 rounded-lg p-4">
                          <span className="text-[10px] text-gray-700">No items</span>
                        </div>
                      ) : (
                        columnTasks.map((t) => (
                          <TaskCard key={t.id} task={t} onMove={handleMove} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Repositories ──────────────────────────────────────────────────── */}
        {activeTab === "repos" && (
          <div>
            {/* Empty state / Add prompt */}
            {repos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center text-3xl mb-4">📁</div>
                <h3 className="text-base font-semibold text-white mb-1">No repositories yet</h3>
                <p className="text-xs text-gray-500 mb-6 max-w-xs">
                  Add a local project folder to analyse its code with the AI assistant.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all"
                >
                  + Add your first repository
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs text-gray-500">{repos.length} repositor{repos.length !== 1 ? "ies" : "y"} ingested</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span>+</span> Add Repository
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {repos.map((repo) => (
                    <Link href={`/repo/${repo.id}`} key={repo.id} className="block group">
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {repo.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-[10px] rounded-full font-semibold ${
                              repo.status === "completed"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : repo.status === "failed"
                                ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {repo.status}
                          </span>
                        </div>

                        {repo.local_path && (
                          <p className="text-[11px] text-gray-600 font-mono truncate mb-3" title={repo.local_path}>
                            📁 {repo.local_path}
                          </p>
                        )}

                        <div className="text-xs text-gray-500 mb-5">Last analysed: {repo.lastRun}</div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                          <span className="text-sm font-medium text-gray-400">Health Score</span>
                          <span className="text-xl font-extrabold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                            {repo.score ? `${repo.score}/100` : "—"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
