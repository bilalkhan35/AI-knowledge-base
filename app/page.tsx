"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-6">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m0 0h6M6 12a6 6 0 1112 0 6 6 0 01-12 0z"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Knowledge Base AI
          </h1>
          <p className="text-xl text-slate-400 mb-12">
            Upload your documents and ask intelligent questions powered by AI
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 mb-8 backdrop-blur">
          <h2 className="text-lg font-semibold text-white mb-4">
            How it works
          </h2>
          <div className="space-y-3 text-slate-300 text-sm">
            <p className="flex items-start gap-3">
              <span className="text-blue-400 font-bold flex-shrink-0">1</span>
              <span>Upload PDF documents containing your knowledge base</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-blue-400 font-bold flex-shrink-0">2</span>
              <span>Intelligent AI embeddings extract key information</span>
            </p>
            <p className="flex items-start gap-3">
              <span className="text-blue-400 font-bold flex-shrink-0">3</span>
              <span>Ask questions and get accurate answers with sources</span>
            </p>
          </div>
        </div>

        <Link
          href="/chat"
          className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          Go to Chat
        </Link>
      </div>
    </div>
  );
}
