"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, Terminal } from "lucide-react";
import { Button } from "@/components/ui";

interface EventPayload {
  id?: string;
  stage: "cloning" | "scanning" | "embedding";
  event_type: "started" | "progress" | "completed" | "failed";
  progress_current?: number;
  progress_total?: number;
  detail?: {
    message?: string;
    error?: string;
  };
  created_at?: string;
  status?: string;
}

function IndexingProgressHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repoId = searchParams.get("repo_id");

  const [repoName, setRepoName] = useState("Repository");
  const [stageStates, setStageStates] = useState({
    cloning: { status: "pending", message: "Waiting to start..." },
    scanning: { status: "pending", message: "Waiting to start..." },
    embedding: { status: "pending", message: "Waiting to start..." }
  });
  
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial repo details to get the name
  useEffect(() => {
    if (!repoId) return;
    const fetchRepo = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:8000/repositories/${repoId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRepoName(data.name);
          // If already ready, redirect immediately
          if (data.status === "ready") {
            router.push("/dashboard");
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRepo();
  }, [repoId]);

  const connectSSE = () => {
    if (!repoId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    const url = `http://localhost:8000/repositories/${repoId}/events${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    setLogs(prev => [...prev, "[System] Establishing real-time event pipeline..."]);

    es.onmessage = (event) => {
      try {
        const payload: EventPayload = JSON.parse(event.data);
        
        // Handle termination status
        if (payload.status === "ready") {
          es.close();
          setLogs(prev => [...prev, "[System] Indexing complete! Unlocking workspace dashboard..."]);
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
          return;
        }

        if (payload.status === "failed") {
          es.close();
          setStageStates(prev => {
            const copy = { ...prev };
            // Mark any non-completed stage as failed
            Object.keys(copy).forEach(k => {
              const key = k as "cloning" | "scanning" | "embedding";
              if (copy[key].status !== "completed") {
                copy[key].status = "failed";
              }
            });
            return copy;
          });
          return;
        }

        const { stage, event_type, progress_current, progress_total, detail } = payload;
        if (!stage) return;

        const msg = detail?.message || detail?.error || "";

        // Append to logs
        if (msg) {
          setLogs(prev => [...prev, `[${stage.toUpperCase()}] ${msg}`]);
        }

        // Update stage states
        setStageStates(prev => {
          const copy = { ...prev };
          if (event_type === "started") {
            copy[stage] = { status: "active", message: msg || "Processing..." };
          } else if (event_type === "completed") {
            copy[stage] = { status: "completed", message: msg || "Done." };
          } else if (event_type === "failed") {
            copy[stage] = { status: "failed", message: msg || "Failed." };
            setErrorDetails(msg || "An unexpected error occurred during indexing.");
          } else if (event_type === "progress") {
            copy[stage] = { status: "active", message: msg || "In progress..." };
            if (progress_current !== undefined && progress_total !== undefined) {
              setProgress({ current: progress_current, total: progress_total });
            }
          }
          return copy;
        });

      } catch (err) {
        console.error("SSE Parse Error", err);
      }
    };

    es.onerror = (err) => {
      console.error("SSE Connection Error", err);
    };
  };

  useEffect(() => {
    connectSSE();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [repoId]);

  const handleRetry = async () => {
    if (!repoId) return;
    setIsRetrying(true);
    setErrorDetails(null);
    setProgress(null);
    setLogs([]);
    setStageStates({
      cloning: { status: "pending", message: "Waiting to start..." },
      scanning: { status: "pending", message: "Waiting to start..." },
      embedding: { status: "pending", message: "Waiting to start..." }
    });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/repositories/${repoId}/retry`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to trigger retry indexing pipeline");
      
      // Re-connect SSE
      connectSSE();
    } catch (err: any) {
      setErrorDetails(err.message);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />;
      case "active":
        return <Loader2 className="w-6 h-6 text-brand-400 animate-spin shrink-0" />;
      case "failed":
        return <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />;
      default:
        return <div className="w-6 h-6 rounded-full border-2 border-white/10 shrink-0" />;
    }
  };

  const hasFailed = Object.values(stageStates).some(s => s.status === "failed");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 min-h-[80vh] flex flex-col justify-center">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Indexing {repoName}
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          We are analyzing your repository, scanning codebase structures, and storing vectors for semantic AI assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Stages Stepper */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-6">
          <h2 className="text-lg font-semibold text-white">Indexing Stages</h2>
          
          <div className="space-y-6 relative">
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-white/10 -z-10" />

            {/* Stage: Clone */}
            <div className="flex gap-4 items-start">
              {getStageIcon(stageStates.cloning.status)}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">1. Fetching Repository Contents</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {stageStates.cloning.message}
                </p>
              </div>
            </div>

            {/* Stage: Scan */}
            <div className="flex gap-4 items-start">
              {getStageIcon(stageStates.scanning.status)}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">2. Scanning & Code Analysis</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {stageStates.scanning.message}
                </p>
                {stageStates.scanning.status === "active" && progress && (
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                    <div 
                      className="bg-brand-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Stage: Embed */}
            <div className="flex gap-4 items-start">
              {getStageIcon(stageStates.embedding.status)}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">3. Vector Database Embeddings</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {stageStates.embedding.message}
                </p>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {hasFailed && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="pt-4 border-t border-white/10 space-y-4"
              >
                <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Indexing Interrupted</p>
                    <p className="text-xs text-rose-300/80 leading-relaxed">
                      {errorDetails || "Review logs for trace details."}
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleRetry} 
                  className="w-full" 
                  disabled={isRetrying}
                  leftIcon={<RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />}
                >
                  Retry Failed Stage
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Logs Terminal */}
        <div className="flex flex-col h-[350px] p-4 rounded-xl bg-black border border-white/10 font-mono text-xs text-emerald-400 overflow-hidden relative">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10 text-muted-foreground">
            <Terminal className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Live Logs Output</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
            {logs.map((log, index) => (
              <div key={index} className="leading-relaxed break-all">
                {log}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-muted-foreground italic text-center py-20">
                Awaiting connection signal...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IndexingProgressPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading indexing state...</p>
      </div>
    }>
      <IndexingProgressHandler />
    </Suspense>
  );
}
