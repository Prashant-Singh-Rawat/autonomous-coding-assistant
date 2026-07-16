"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  Mic,
  Sparkles,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Search,
  Pin,
  ChevronDown,
  Code2,
  FileText,
  GitBranch,
  Check,
  User,
  MessageSquare,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Badge, Separator } from "@/components/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const DEMO_SESSIONS = [
  { id: "1", title: "Build React calculator", preview: "I've created a fully functional...", time: new Date(Date.now() - 5 * 60 * 1000), pinned: true },
  { id: "2", title: "Fix authentication bug", preview: "The issue was in the JWT refresh...", time: new Date(Date.now() - 2 * 60 * 60 * 1000), pinned: false },
  { id: "3", title: "Generate unit tests", preview: "Here are 23 comprehensive test cases...", time: new Date(Date.now() - 8 * 60 * 60 * 1000), pinned: false },
];

const INITIAL_MESSAGES = [
  {
    id: "1",
    role: "user" as const,
    content: "Build me a React calculator component with keyboard support and a history panel",
    time: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: "2",
    role: "assistant" as const,
    content: `I'll build a comprehensive React calculator with full keyboard support and a history panel. Here's the implementation:

\`\`\`tsx
// Calculator.tsx
import { useState, useEffect, useCallback } from 'react';

interface HistoryItem {
  expression: string;
  result: string;
  timestamp: Date;
}

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const calculate = useCallback((expr: string): string => {
    try {
      const result = Function('"use strict"; return (' + expr + ')')();
      return String(Number(result.toFixed(10)));
    } catch {
      return 'Error';
    }
  }, []);

  const handleKey = useCallback((key: string) => {
    if (key === '=' || key === 'Enter') {
      const result = calculate(expression);
      setHistory(h => [...h, { expression, result, timestamp: new Date() }]);
      setDisplay(result);
      setExpression(result);
    } else if (key === 'Backspace') {
      setDisplay(d => d.length > 1 ? d.slice(0, -1) : '0');
    } else if (key === 'Escape') {
      setDisplay('0');
      setExpression('');
    } else if ('0123456789.+-*/()'.includes(key)) {
      setExpression(e => e + key);
      setDisplay(d => d === '0' ? key : d + key);
    }
  }, [expression, calculate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKey(e.key);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);
}
\`\`\`

The calculator features:
- **Full keyboard support** — numbers, operators, Enter, Backspace, Escape
- **History panel** — stores all calculations with timestamps
- **Error handling** — gracefully handles division by zero and invalid expressions
- **Responsive design** — works on mobile and desktop`,
    time: new Date(Date.now() - 14 * 60 * 1000),
    sources: [
      { title: "react-calculator patterns", file: "src/components/Calculator.tsx" },
    ],
  },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-none bg-white/5 border border-white/8">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace("language-", "") || "text";

  const copy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block my-3 group">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">{lang}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/10 transition-all">
            Apply to file
          </button>
          <button onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/10 transition-all">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className={`text-xs leading-relaxed text-white/85 font-mono ${className}`}>{children}</code>
      </pre>
    </div>
  );
}

function Message({ message }: { message: typeof INITIAL_MESSAGES[0] }) {
  const [showSources, setShowSources] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex gap-3 group", isUser && "flex-row-reverse")}
    >
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
        isUser ? "bg-gradient-to-br from-brand-600 to-purple-600" : "bg-gradient-to-br from-brand-600 to-purple-600"
      )}>
        {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Sparkles className="w-3.5 h-3.5 text-white" />}
      </div>

      <div className={cn("flex-1 max-w-[80%]", isUser && "flex flex-col items-end")}>
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-gradient-to-br from-brand-600/80 to-purple-600/80 text-white rounded-tr-none border border-brand-500/30"
            : "bg-white/5 border border-white/8 text-white/90 rounded-tl-none"
        )}>
          {isUser ? (
            <p className="leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean; node?: unknown }) {
                    return inline ? (
                      <code className="bg-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-brand-300" {...props}>{children}</code>
                    ) : (
                      <CodeBlock className={className}>{String(children).replace(/\n$/, "")}</CodeBlock>
                    );
                  },
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-white/85">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                  li: ({ children }) => <li className="text-white/80">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {"sources" in message && message.sources && message.sources.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-white/70 transition-colors"
            >
              <GitBranch className="w-3 h-3" />
              {message.sources.length} sources used
              <ChevronDown className={cn("w-3 h-3 transition-transform", showSources && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showSources && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-1.5 space-y-1"
                >
                  {message.sources.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-[10px]">
                      <FileText className="w-3 h-3 text-brand-400 flex-shrink-0" />
                      <span className="text-muted-foreground">{s.title}</span>
                      <code className="ml-auto text-white/40 font-mono truncate max-w-[140px]">{s.file}</code>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className={cn(
          "flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
          isUser && "flex-row-reverse"
        )}>
          <span className="text-[10px] text-muted-foreground mr-1">{formatRelativeTime(message.time)}</span>
          {!isUser && (
            <>
              <ActionBtn icon={Copy} label="Copy" onClick={() => navigator.clipboard.writeText(message.content)} />
              <ActionBtn icon={RotateCcw} label="Regenerate" onClick={() => {}} />
              <ActionBtn icon={ThumbsUp} label="Good" active={feedback === "up"} onClick={() => setFeedback("up")} />
              <ActionBtn icon={ThumbsDown} label="Bad" active={feedback === "down"} onClick={() => setFeedback("down")} />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, active }: { icon: React.ElementType; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label}
      className={cn(
        "w-6 h-6 rounded-md flex items-center justify-center transition-colors",
        active ? "text-brand-400 bg-brand-500/15" : "text-muted-foreground hover:text-white hover:bg-white/10"
      )}>
      <Icon className="w-3 h-3" />
    </button>
  );
}

function SessionItem({ session, active }: { session: typeof DEMO_SESSIONS[0]; active: boolean }) {
  return (
    <button className={cn(
      "w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group",
      active ? "bg-brand-500/15 border border-brand-500/20" : "hover:bg-white/5"
    )}>
      <div className={cn("w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5",
        session.pinned ? "bg-amber-500/20 text-amber-400" : "bg-white/8 text-muted-foreground"
      )}>
        {session.pinned ? <Pin className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-medium truncate", active ? "text-white" : "text-white/70")}>{session.title}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{session.preview}</p>
      </div>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatRelativeTime(session.time)}</span>
    </button>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const activeSession = "1";
  const [repoContext, setRepoContext] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = {
      id: String(Date.now()),
      role: "user" as const,
      content: input.trim(),
      time: new Date(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 1800));
    setIsTyping(false);
    setMessages((m) => [...m, {
      id: String(Date.now() + 1),
      role: "assistant" as const,
      content: "I understand your request. Let me analyze the code and provide a comprehensive solution. Based on the context from your repository, I can see several optimization opportunities...\n\nHere's what I'll do:\n1. **Analyze** the existing codebase structure\n2. **Generate** the required implementation\n3. **Run tests** in a sandboxed environment\n4. **Create a PR** with the changes\n\nShall I proceed?",
      time: new Date(),
      sources: [],
    }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  }, [input]);

  return (
    <div className="flex h-[calc(100vh-64px)] -mt-6 -mx-6 overflow-hidden">
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-shrink-0 h-full border-r border-white/8 overflow-hidden bg-white/[0.01] flex flex-col"
          >
            <div className="p-4 border-b border-white/8 flex-shrink-0">
              <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            <div className="p-3 border-b border-white/8 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input placeholder="Search chats..." className="tony-input py-2 pl-9 text-xs h-8" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1">
              <p className="px-3 py-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Pinned</p>
              {DEMO_SESSIONS.filter(s => s.pinned).map(s => (
                <SessionItem key={s.id} session={s} active={activeSession === s.id} />
              ))}
              <p className="px-3 py-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest mt-3">Recent</p>
              {DEMO_SESSIONS.filter(s => !s.pinned).map(s => (
                <SessionItem key={s.id} session={s} active={activeSession === s.id} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-3 px-6 h-14 border-b border-white/8 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-all"
            aria-label="Toggle chat sidebar">
            <MessageSquare className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Build React calculator</h2>
            <Badge variant="secondary" className="text-[10px]">Session #1</Badge>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setRepoContext(!repoContext)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
              repoContext
                ? "border-brand-500/30 bg-brand-500/10 text-brand-400"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"
            )}
          >
            <GitBranch className="w-3.5 h-3.5" />
            {repoContext ? "Repo context: ON" : "Repo context: OFF"}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-brand-400" />
            <span>Gemini 1.5 Pro</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-white/8 flex-shrink-0">
          <div className="relative rounded-2xl bg-white/5 border border-white/12 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/25 transition-all">
            <textarea
              ref={textareaRef}
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build, fix, or improve..."
              rows={1}
              className="w-full bg-transparent resize-none px-5 pt-4 pb-12 text-sm text-white placeholder:text-white/30 focus:outline-none leading-relaxed max-h-[200px]"
              aria-label="Chat message input"
            />

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button aria-label="Attach file" className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button aria-label="Voice input" className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
                  <Mic className="w-3.5 h-3.5" />
                </button>
                <Separator orientation="vertical" className="h-4 mx-1" />
                <span className="text-[10px] text-muted-foreground">Shift+Enter for newline</span>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                id="chat-send-btn"
                aria-label="Send message"
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                  input.trim()
                    ? "bg-gradient-to-br from-brand-600 to-purple-600 text-white hover:opacity-90 shadow-glow-sm"
                    : "bg-white/8 text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {["Add tests for this", "Generate a PR", "Explain the code", "Optimize performance"].map((chip) => (
              <button
                key={chip}
                onClick={() => setInput(chip)}
                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground bg-white/5 border border-white/10 hover:text-white hover:bg-white/8 transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
