"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";

export default function RepoDetails() {
  const { id } = useParams();
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "Hi! I've analyzed this repository. Ask me anything about the architecture, security risks, or how specific modules work." }
  ]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { role: "user", content: query };
    setChatHistory((prev) => [...prev, userMessage]);
    setQuery("");

    // Simulate API call to FastAPI backend
    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: `(Simulated) Here is an explanation regarding your query about ${id}... The backend uses FAISS for semantic retrieval and LangGraph to synthesize this response.` }
      ]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-50 flex flex-col font-sans">
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="font-bold text-xl tracking-tight text-white hover:text-blue-400 transition-colors">
          &larr; Back to Dashboard
        </Link>
        <div className="text-sm text-gray-400">
          Viewing Repository: <span className="text-white font-mono">{id}</span>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Reports & Insights */}
        <aside className="w-1/3 border-r border-gray-800 bg-gray-900 overflow-y-auto p-6 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Architecture Summary</h2>
            <div className="bg-gray-800 p-4 rounded-lg text-sm text-gray-300">
              <p>This appears to be a Python/FastAPI backend with a Next.js frontend.</p>
              <ul className="list-disc list-inside mt-2 text-gray-400">
                <li>3 Services Detected</li>
                <li>Database: PostgreSQL</li>
                <li>Orchestration: LangGraph</li>
              </ul>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4">Security Audit</h2>
            <div className="bg-emerald-900/20 border border-emerald-800 p-4 rounded-lg text-sm text-emerald-400">
              <div className="flex items-center gap-2 font-bold mb-1">
                <span>&#10003;</span> No Critical Vulnerabilities
              </div>
              <p className="text-emerald-500/80">Code passes basic secret scanning and injection checks.</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4">AI Mentor Suggestions</h2>
            <div className="bg-gray-800 p-4 rounded-lg text-sm text-gray-300">
              <p className="mb-2">Consider reviewing the following patterns used in this codebase:</p>
              <div className="space-y-2">
                <button className="block w-full text-left px-3 py-2 bg-gray-700 hover:bg-blue-600 rounded text-gray-200 transition-colors">
                  Explain FAISS Vector Stores
                </button>
                <button className="block w-full text-left px-3 py-2 bg-gray-700 hover:bg-blue-600 rounded text-gray-200 transition-colors">
                  How does LangGraph state work?
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Panel: Chat Interface */}
        <main className="flex-1 flex flex-col bg-gray-950">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-800 border border-gray-700 text-gray-200"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-6 border-t border-gray-800 bg-gray-900">
            <form onSubmit={handleChat} className="flex gap-4">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about the codebase..."
                className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                Send
              </button>
            </form>
            <div className="text-center text-xs text-gray-500 mt-3">
              AI responses may include citations to specific file paths in the repository.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
