"use client";

import React, { useEffect, useState } from "react";
import { GitBranch, Trash2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";

interface GithubStatus {
  connected: boolean;
  username?: string;
  scopes?: string[];
  connected_at?: string;
}

export default function IntegrationsSettingsPage() {
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/integrations/github/status", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:8000/integrations/github", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      setStatus({ connected: false });
      setShowConfirm(false);
    } catch (err) {
      console.error("Failed to disconnect", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Integrations</h2>
          <p className="text-sm text-muted-foreground">Manage your connected accounts and services.</p>
        </div>
        <div className="h-48 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Integrations</h2>
        <p className="text-sm text-muted-foreground">Manage your connected accounts and services.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between relative z-10">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/10">
              <GitBranch className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                GitHub 
                {status?.connected ? (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                    Not Connected
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Connect your GitHub account to import repositories and enable autonomous code generation.
              </p>

              {status?.connected && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="text-muted-foreground">Connected as:</div>
                    <div className="text-white font-medium">@{status.username}</div>
                    
                    <div className="text-muted-foreground">Scopes granted:</div>
                    <div className="text-white flex flex-wrap gap-1">
                      {status.scopes?.map(scope => (
                        <span key={scope} className="px-1.5 py-0.5 bg-white/10 rounded text-xs">{scope}</span>
                      ))}
                    </div>

                    <div className="text-muted-foreground">Connected on:</div>
                    <div className="text-white">
                      {status.connected_at ? new Date(status.connected_at).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {status?.connected ? (
              <Button 
                variant="outline" 
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
                onClick={() => setShowConfirm(true)}
              >
                Disconnect
              </Button>
            ) : (
              <a href={(() => {
                if (typeof window === "undefined") return "http://localhost:8000/auth/github/connect";
                const t = localStorage.getItem("token") || localStorage.getItem("access_token");
                return t ? `http://localhost:8000/auth/github/connect?token=${encodeURIComponent(t)}` : "http://localhost:8000/auth/github/connect";
              })()}>
                <Button>Connect GitHub</Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0A0A0F] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Disconnect GitHub?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Disconnecting GitHub will revoke Tony AI's access to your repositories. Any existing ingested repositories will become stale and automated agents will no longer be able to push code on your behalf.
                </p>
                <div className="flex items-center gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
                  <Button 
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white border-transparent"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? "Disconnecting..." : "Yes, Disconnect"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
