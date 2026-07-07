"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileEntry {
  path: string;
  language: string;
  size_chars: number;
}

interface Report {
  report_type: string;
  data: Record<string, unknown>;
  score?: number | null;
}

interface RepoInfo {
  id: string;
  name: string;
  status: string;
  local_path?: string;
  source_url?: string;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  loading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function apiFetch(path: string, init?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Language badge colours ───────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  python:     "bg-blue-500/20 text-blue-300 border-blue-500/30",
  typescript: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  tsx:        "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  javascript: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  jsx:        "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  markdown:   "bg-gray-500/20 text-gray-300 border-gray-500/30",
  json:       "bg-orange-500/20 text-orange-300 border-orange-500/30",
  yaml:       "bg-pink-500/20 text-pink-300 border-pink-500/30",
  css:        "bg-purple-500/20 text-purple-300 border-purple-500/30",
  html:       "bg-red-500/20 text-red-300 border-red-500/30",
  bash:       "bg-green-500/20 text-green-300 border-green-500/30",
  dockerfile: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  sql:        "bg-amber-500/20 text-amber-300 border-amber-500/30",
  rust:       "bg-orange-500/20 text-orange-300 border-orange-500/30",
  go:         "bg-teal-500/20 text-teal-300 border-teal-500/30",
};
function langBadge(lang: string) {
  return LANG_COLORS[lang] || "bg-gray-700/40 text-gray-400 border-gray-600/30";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span className="inline-flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    processing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    failed:     "bg-red-500/15 text-red-400 border-red-500/30",
    pending:    "bg-gray-500/15 text-gray-400 border-gray-500/30",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-300 border-red-500/30",
    high:     "bg-orange-500/20 text-orange-300 border-orange-500/30",
    medium:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    low:      "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };
  return (
    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${map[severity] || map.low}`}>
      {severity}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RepoDetails() {
  const { id } = useParams<{ id: string }>();

  // ── State ─────────────────────────────────────────────────────────────────
  const [repo, setRepo]           = useState<RepoInfo | null>(null);
  const [files, setFiles]         = useState<FileEntry[]>([]);
  const [reports, setReports]     = useState<Report[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [chat, setChat]   = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I've loaded this repository. Ask me anything about its architecture, security risks, file structure, or how specific modules work.",
    },
  ]);
  const [query, setQuery]     = useState("");
  const sendingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<"architecture" | "security" | "files">("architecture");

  const chatEndRef   = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoadingData(true);
    setDataError(null);

    Promise.all([
      apiFetch(`/repositories/${id}`),
      apiFetch(`/repositories/${id}/reports`).catch(() => []),
      apiFetch(`/repositories/${id}/files`).catch(() => []),
    ])
      .then(([repoData, reportsData, filesData]) => {
        setRepo(repoData as RepoInfo);
        setReports(reportsData as Report[]);
        setFiles(filesData as FileEntry[]);
      })
      .catch((e: Error) => {
        setDataError(e.message);
      })
      .finally(() => setLoadingData(false));
  }, [id]);

  // ── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ── Chat submit ───────────────────────────────────────────────────────────
  const handleChat = async (e?: React.FormEvent, overrideQuery?: string) => {
    e?.preventDefault();
    const q = (overrideQuery ?? query).trim();
    if (!q || sendingRef.current) return;

    const userMsg: ChatMessage = { role: "user", content: q };
    const loadingMsg: ChatMessage = { role: "assistant", content: "", loading: true };

    setChat((prev) => [...prev, userMsg, loadingMsg]);
    setQuery("");
    sendingRef.current = true;

    try {
      const data = await apiFetch(`/chat/${id}`, {
        method: "POST",
        body: JSON.stringify({ query: q }),
      }) as { reply: string; citations?: string[] };

      setChat((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: data.reply,
          citations: data.citations || [],
          loading: false,
        };
        return updated;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setChat((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `❌ Could not reach the backend: **${msg}**\n\nMake sure the backend server is running at \`${API}\`.`,
          loading: false,
        };
        return updated;
      });
    } finally {
      sendingRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const archReport = reports.find((r) => r.report_type === "architecture");
  const secReport  = reports.find((r) => r.report_type === "security");

  const archData   = (archReport?.data || {}) as {
    summary?: string;
    total_files?: number;
    languages?: Record<string, number>;
    frameworks?: string[];
    services?: string[];
    top_languages?: string[];
  };
  const secData    = (secReport?.data || {}) as {
    summary?: string;
    total_issues?: number;
    critical_count?: number;
    high_count?: number;
    findings?: Array<{ file: string; issue: string; severity: string; occurrences: number }>;
  };

  // Language breakdown from real file list (fallback)
  const langBreakdown = files.reduce<Record<string, number>>((acc, f) => {
    acc[f.language] = (acc[f.language] || 0) + 1;
    return acc;
  }, {});
  const langs = Object.entries(
    Object.keys(archData.languages || {}).length ? archData.languages! : langBreakdown
  ).sort((a, b) => b[1] - a[1]);

  const QUICK_PROMPTS = [
    "List all the files in this repository",
    "Explain the architecture and project structure",
    "What security issues were found?",
    "What frameworks and technologies are used?",
    "How does the authentication system work?",
    "Show me the most important files",
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-gray-50 flex flex-col font-sans">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur px-6 py-3 flex justify-between items-center sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors">
          <span className="text-lg">←</span> Dashboard
        </Link>
        <div className="flex items-center gap-3">
          {repo && <StatusBadge status={repo.status} />}
          <span className="text-xs text-gray-500">
            {repo ? (
              <><span className="text-gray-300 font-semibold font-mono">{repo.name}</span></>
            ) : (
              <span className="text-gray-600">Loading…</span>
            )}
          </span>
        </div>
      </nav>

      {/* Loading / Error overlay */}
      {loadingData && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm text-gray-400">Loading repository data…</p>
          </div>
        </div>
      )}

      {dataError && !loadingData && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center space-y-2">
            <div className="text-2xl">⚠️</div>
            <p className="text-sm font-semibold text-red-400">Failed to load repository</p>
            <p className="text-xs text-gray-500">{dataError}</p>
            <p className="text-xs text-gray-600 mt-1">Make sure you&apos;re logged in and the backend is running at <code className="text-gray-400">{API}</code>.</p>
          </div>
        </div>
      )}

      {!loadingData && !dataError && (
        <div className="flex-1 flex overflow-hidden">
          {/* ── Left Panel ─────────────────────────────────────────────────── */}
          <aside className="w-80 shrink-0 border-r border-gray-800 bg-gray-900/60 overflow-y-auto flex flex-col">
            {/* Repo meta */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white">
                  {(repo?.name?.[0] || "R").toUpperCase()}
                </div>
                <span className="text-sm font-bold text-white truncate">{repo?.name}</span>
              </div>
              {repo?.local_path && (
                <p className="text-[10px] text-gray-600 font-mono truncate mt-1" title={repo.local_path}>
                  📁 {repo.local_path}
                </p>
              )}
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span><strong className="text-gray-200">{files.length}</strong> files</span>
                <span><strong className="text-gray-200">{langs.length}</strong> languages</span>
                <span><strong className="text-gray-200">{secData.total_issues ?? 0}</strong> issues</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 text-xs">
              {(["architecture", "security", "files"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 font-semibold capitalize transition-all ${
                    activeTab === tab
                      ? "text-blue-400 border-b-2 border-blue-500"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">

              {/* Architecture tab */}
              {activeTab === "architecture" && (
                <>
                  {archData.summary ? (
                    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-xs text-gray-300 leading-relaxed">
                      {archData.summary}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 italic">No architecture report yet.</div>
                  )}

                  {/* Frameworks */}
                  {archData.frameworks && archData.frameworks.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mb-2">Frameworks</p>
                      <div className="flex flex-wrap gap-1.5">
                        {archData.frameworks.map((fw) => (
                          <span key={fw} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            {fw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Services */}
                  {archData.services && archData.services.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mb-2">Services Detected</p>
                      <ul className="space-y-1">
                        {archData.services.map((svc) => (
                          <li key={svc} className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            {svc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Language breakdown */}
                  {langs.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mb-2">Languages</p>
                      <div className="space-y-1.5">
                        {langs.slice(0, 8).map(([lang, count]) => {
                          const pct = Math.round((count / (files.length || 1)) * 100);
                          return (
                            <div key={lang}>
                              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                <span>{lang}</span>
                                <span>{count} ({pct}%)</span>
                              </div>
                              <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Security tab */}
              {activeTab === "security" && (
                <>
                  <div className={`border rounded-xl p-3 text-xs leading-relaxed ${
                    (secData.critical_count ?? 0) > 0
                      ? "bg-red-500/10 border-red-500/30 text-red-300"
                      : (secData.total_issues ?? 0) > 0
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  }`}>
                    {secData.summary || "No security scan data available."}
                  </div>

                  {secData.findings && secData.findings.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
                        Findings ({secData.findings.length})
                      </p>
                      {secData.findings.map((f, i) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-2.5 space-y-1">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={f.severity} />
                            <span className="text-[10px] text-gray-300 font-medium">{f.issue}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono truncate" title={f.file}>
                            📄 {f.file}
                          </p>
                          {f.occurrences > 1 && (
                            <p className="text-[9px] text-gray-600">{f.occurrences} occurrences</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 italic">No findings to display.</p>
                  )}
                </>
              )}

              {/* Files tab */}
              {activeTab === "files" && (
                <>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
                    {files.length} file{files.length !== 1 ? "s" : ""} ingested
                  </p>
                  {files.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">No files have been ingested yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {files.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800/60 transition-colors cursor-default group"
                          title={f.path}
                        >
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${langBadge(f.language)}`}>
                            {f.language.substring(0, 3).toUpperCase()}
                          </span>
                          <span className="text-[11px] text-gray-400 group-hover:text-gray-200 transition-colors font-mono truncate flex-1">
                            {f.path}
                          </span>
                          <span className="shrink-0 text-[9px] text-gray-700">
                            {(f.size_chars / 1000).toFixed(1)}k
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>

          {/* ── Right Panel: Chat ───────────────────────────────────────────── */}
          <main className="flex-1 flex flex-col bg-gray-950 min-w-0">
            {/* Quick prompts */}
            <div className="px-4 py-2.5 border-b border-gray-800/60 bg-gray-900/30 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleChat(undefined, p)}
                    disabled={sendingRef.current}
                    className="px-3 py-1.5 text-[11px] rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/50 hover:border-gray-600 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white mt-0.5">
                      A
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-gray-800 border border-gray-700/60 text-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {msg.loading ? (
                      <Spinner />
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-gray-700/40 flex flex-wrap gap-1">
                            {msg.citations.map((c) => (
                              <span key={c} className="text-[10px] font-mono bg-gray-900 text-blue-400 px-1.5 py-0.5 rounded border border-gray-700/50">
                                📄 {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 shrink-0 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white mt-0.5">
                      U
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur">
              {repo?.status === "processing" && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
                  Repository is still processing… chat will be available shortly.
                </div>
              )}
              <form onSubmit={handleChat} className="flex gap-3">
                <input
                  ref={inputRef}
                  id="chat-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about the codebase…"
                  disabled={sendingRef.current || repo?.status === "processing"}
                  className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  id="chat-send"
                  disabled={sendingRef.current || !query.trim() || repo?.status === "processing"}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all flex items-center gap-2 min-w-[80px] justify-center"
                >
                  {sendingRef.current ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    "Send"
                  )}
                </button>
              </form>
              <p className="text-center text-[10px] text-gray-600 mt-2">
                AI responses cite specific file paths from the repository.
                {!process.env.NEXT_PUBLIC_API_URL && " · Backend: localhost:8000"}
              </p>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
