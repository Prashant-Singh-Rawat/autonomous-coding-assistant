import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-50 flex flex-col items-center justify-center p-8 font-sans">
      <main className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Autonomous Coding Assistant
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">
          Your elite multi-agent repository intelligence platform. Understand, audit, document, and learn from entire codebases at scale.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link href="/dashboard" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/25">
            Go to Dashboard
          </Link>
          <a href="#features" className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-semibold transition-all border border-gray-700">
            Explore Features
          </a>
        </div>
        
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pt-16 border-t border-gray-800 text-left">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h3 className="text-xl font-bold text-blue-400 mb-2">Code Intelligence</h3>
            <p className="text-gray-400">Map repositories, trace dependencies, and get AI-powered explanations for complex modules.</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h3 className="text-xl font-bold text-purple-400 mb-2">Security & Audits</h3>
            <p className="text-gray-400">Detect bugs, secrets, and anti-patterns with specialized LangGraph agents.</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h3 className="text-xl font-bold text-emerald-400 mb-2">AI Mentorship</h3>
            <p className="text-gray-400">Learn from real code. Generate quizzes, interview prep, and simplified explanations.</p>
          </div>
        </div>
      </main>
      <footer className="mt-24 text-gray-600 text-sm">
        Built with Next.js, FastAPI, LangGraph, and PostgreSQL.
      </footer>
    </div>
  );
}
