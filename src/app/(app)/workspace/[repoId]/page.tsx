"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Folder, File, MessageSquare, ShieldAlert, Cpu, 
  Settings, HelpCircle, Code2, Search, ArrowRight, 
  Send, Sparkles, AlertTriangle, Loader2 
} from "lucide-react";
import { Button, Input, Card, CardContent, Badge } from "@/components/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VisualizationCanvas from "@/components/workspace/VisualizationCanvas";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


interface RepoFile {
  path: string;
  language: string;
  size_chars: number;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agent_type?: string;
  source_citations?: string[];
  created_at: string;
}

interface Finding {
  id: string;
  finding_type: string;
  severity: string;
  file_path: string;
  title: string;
  description: string;
}

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.repoId as string;

  const [activeTab, setActiveTab] = useState<"explainer" | "diagram" | "findings">("explainer");
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [activeFile, setActiveFile] = useState<RepoFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileExplanation, setFileExplanation] = useState<string>("");
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!repoId) return;

    const initWorkspace = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        // Verify repository is ready
        const repoRes = await fetch(`${API}/repositories/${repoId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!repoRes.ok) throw new Error("Repository not found");
        const repoData = await repoRes.json();
        
        if (repoData.status !== "ready") {
          router.push(`/onboarding/indexing?repo_id=${repoId}`);
          return;
        }

        // Fetch files
        const filesRes = await fetch(`${API}/repositories/${repoId}/files`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          setFiles(filesData);
          if (filesData.length > 0) {
            selectFile(filesData[0]);
          }
        }

        // Fetch findings
        const findingsRes = await fetch(`${API}/workspace/${repoId}/findings`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (findingsRes.ok) {
          const findingsData = await findingsRes.json();
          setFindings(findingsData);
        }

        // Fetch past messages/conversations
        const convsRes = await fetch(`${API}/workspace/${repoId}/conversations`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (convsRes.ok) {
          const convsData = await convsRes.json();
          if (convsData.length > 0) {
            setConversationId(convsData[0].id);
            const msgsRes = await fetch(`${API}/workspace/conversations/${convsData[0].id}/messages`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (msgsRes.ok) {
              const msgsData = await msgsRes.json();
              setMessages(msgsData);
            }
          }
        }

      } catch (err: any) {
        setError(err.message || "Failed to initialize workspace.");
      } finally {
        setIsLoading(false);
      }
    };

    initWorkspace();
  }, [repoId]);

  const selectFile = async (file: RepoFile) => {
    setActiveFile(file);
    setFileContent("");
    setFileExplanation("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/repositories/${repoId}/file-content?path=${encodeURIComponent(file.path)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
      } else {
        setFileContent(`// Failed to fetch content for ${file.path}`);
      }
    } catch (err) {
      console.error(err);
      setFileContent(`// Error loading ${file.path}`);
    }
  };

  const handleExplainFile = async () => {
    if (!activeFile) return;
    setIsExplaining(true);
    setFileExplanation("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/workspace/${repoId}/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          scope: "file",
          path: activeFile.path
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFileExplanation(data.explanation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSendMessage = async () => {
    if (!prompt.trim()) return;
    setIsSending(true);
    
    // Add user message locally
    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: prompt,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setPrompt("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/workspace/${repoId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          query: userMsg.content,
          active_file_path: activeFile?.path || null,
          conversation_id: conversationId
        })
      });

      if (!res.ok) throw new Error("Failed to send chat message");
      const data = await res.json();
      
      setConversationId(data.conversation_id);
      
      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: "assistant",
        content: data.reply,
        agent_type: data.agent_type,
        source_citations: data.citations,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
        <p className="text-sm text-muted-foreground">Synchronizing developer workspace context...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-semibold text-white">Workspace Loading Failed</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <Button onClick={() => router.push("/onboarding/repositories")}>Back to Repositories</Button>
      </div>
    );
  }

  return (
    <div className="h-[85vh] -m-6 flex overflow-hidden border border-white/5 bg-neutral-950 rounded-xl relative">
      {/* 1. Left Explorer Bar */}
      <div className="w-64 border-r border-white/5 flex flex-col h-full bg-neutral-900 shrink-0">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">File Explorer</span>
          <Badge variant="blue" className="text-[9px]">Indexed</Badge>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {files.map(file => (
            <div 
              key={file.path}
              onClick={() => selectFile(file)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                activeFile?.path === file.path 
                  ? "bg-brand-500/10 text-white font-medium border-l-2 border-brand-500" 
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              <File className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.path}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Middle Panel (Dynamic Active Tabs) */}
      <div className="flex-1 flex flex-col h-full border-r border-white/5 bg-neutral-950 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-neutral-900">
          <div className="flex gap-2">
            {[
              { id: "explainer", label: "Explainer View" },
              { id: "diagram", label: "Visualization Canvas" },
              { id: "findings", label: "Code Health" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id 
                    ? "bg-white/10 text-white" 
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeFile && (
            <span className="text-[10px] font-mono text-brand-400">
              Active Focus: {activeFile.path}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "explainer" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-start">
              {/* Code viewer */}
              <div className="p-4 rounded-xl bg-black/50 border border-white/5 h-[65vh] overflow-auto font-mono text-xs text-white/80 leading-relaxed">
                <pre>{fileContent}</pre>
              </div>

              {/* Explainer pane */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">AI Explanations</h3>
                  <Button 
                    size="sm" 
                    onClick={handleExplainFile}
                    disabled={isExplaining || !activeFile}
                    loading={isExplaining}
                  >
                    Explain Active File
                  </Button>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 min-h-[45vh] leading-relaxed text-sm text-white/90">
                  {fileExplanation ? (
                    <div className="markdown-content prose prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {fileExplanation}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                      <Code2 className="w-8 h-8 opacity-25 mb-2" />
                      <p className="text-xs">Click explain to parse call scopes and modules context.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "diagram" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Codebase Dependency Diagram</h3>
              <VisualizationCanvas repoId={repoId} />
            </div>
          )}

          {activeTab === "findings" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Code Intelligence Findings</h3>
              
              <div className="space-y-2">
                {findings.map(finding => (
                  <Card key={finding.id} className="border-white/5 hover:border-white/10 transition-all">
                    <CardContent className="p-4 flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-[9px]">
                            {finding.severity.toUpperCase()}
                          </Badge>
                          <h4 className="text-xs font-semibold text-white">{finding.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {finding.description}
                        </p>
                        <span className="text-[9px] font-mono text-brand-400 block pt-1">
                          File: {finding.file_path}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {findings.length === 0 && (
                  <div className="text-center text-muted-foreground py-20">
                    No open security or quality smells reported.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Right Chat Assistant Sidepanel */}
      <div className="w-80 border-l border-white/5 flex flex-col h-full bg-neutral-900 shrink-0">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-brand-400" />
            AI Assistant
          </span>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.map((msg, index) => (
            <div 
              key={msg.id || index}
              className={`flex flex-col space-y-1.5 max-w-[85%] ${
                msg.role === "user" ? "ml-auto" : "mr-auto"
              }`}
            >
              <span className="text-[9px] font-semibold text-muted-foreground uppercase">
                {msg.role === "user" ? "You" : (msg.agent_type ? `${msg.agent_type} Agent` : "Assistant")}
              </span>
              <div 
                className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-brand-600 text-white rounded-tr-none" 
                    : "bg-white/5 border border-white/10 text-white/90 rounded-tl-none"
                }`}
              >
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {msg.source_citations && msg.source_citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-[9px] text-muted-foreground">
                    <span className="font-semibold block mb-0.5">Sources:</span>
                    {msg.source_citations.map(c => (
                      <span 
                        key={c} 
                        onClick={() => {
                          const matchedFile = files.find(f => f.path === c);
                          if (matchedFile) {
                            selectFile(matchedFile);
                            setActiveTab("explainer");
                          }
                        }}
                        className="block truncate font-mono text-brand-400 hover:underline cursor-pointer"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Sparkles className="w-8 h-8 opacity-20 mb-2 animate-pulse" />
              <p className="text-xs">Ask anything about codebase dependencies or refactoring ideas.</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/5 bg-neutral-950">
          {activeFile && (
            <div className="text-[9px] font-mono text-muted-foreground pb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              Context: {activeFile.path}
            </div>
          )}
          <div className="relative">
            <Input
              placeholder="Ask AI..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="pr-10 h-10 bg-white/5 border-white/10 text-xs rounded-xl"
            />
            <button 
              onClick={handleSendMessage}
              disabled={isSending || !prompt.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white disabled:opacity-30 transition-all"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
