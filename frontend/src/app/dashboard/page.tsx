import Link from "next/link";

export default function Dashboard() {
  // In a real app, fetch these from FastAPI backend
  const repos = [
    { id: "repo-1", name: "auth-service", status: "completed", score: 85 },
    { id: "repo-2", name: "legacy-billing", status: "processing", score: null },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-50 font-sans">
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl tracking-tight text-white">
          Autonomous Coding Assistant
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
            Add Repository
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Manage your repositories and view AI intelligence reports.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo) => (
            <Link href={`/repo/${repo.id}`} key={repo.id} className="block">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {repo.name}
                  </h2>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    repo.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {repo.status}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mb-6">
                  Analyzed 2 hours ago
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                  <span className="text-sm font-medium text-gray-300">Health Score</span>
                  <span className="text-lg font-bold text-white">
                    {repo.score ? `${repo.score}/100` : '--'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
