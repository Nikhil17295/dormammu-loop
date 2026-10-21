import React from "react";
import { useHealth } from "../hooks/useHealth";
import { StatusBadge } from "../components/StatusBadge";
import { RefreshCw, Server, Database, Layers, CheckCircle2 } from "lucide-react";

export const HomePage: React.FC = () => {
  const { state, refetch } = useHealth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            D
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Dormammu Loop</h1>
            <p className="text-xs text-slate-400">Distributed DAG Workflow Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <StatusBadge status={state.status} />
          <button
            onClick={() => refetch()}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition"
            title="Refresh backend status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${state.status === "loading" ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Banner Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Phase 1: Foundation & Scaffold</h2>
              <p className="text-sm text-slate-400 mt-1">
                PostgreSQL and Redis services are managed via Docker. The Express backend API and React + Tailwind frontend are connected.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                WEBSTER 2026
              </span>
            </div>
          </div>
        </div>

        {/* Backend Status Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <Server className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-white">Backend Health Check (`/health`)</h3>
            </div>
            <StatusBadge status={state.status} />
          </div>

          <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs border border-slate-800/80">
            {state.status === "loading" && (
              <p className="text-slate-400">Requesting GET /health...</p>
            )}
            {state.status === "ok" && (
              <div>
                <p className="text-emerald-400 font-semibold mb-1">HTTP 200 OK</p>
                <pre className="text-slate-300">{JSON.stringify(state.data, null, 2)}</pre>
              </div>
            )}
            {state.status === "error" && (
              <div>
                <p className="text-rose-400 font-semibold mb-1">Connection Error</p>
                <p className="text-rose-300">{state.error}</p>
                <p className="text-slate-500 mt-2">
                  Ensure the backend server is running with `npm run dev` in the `backend/` folder on port 4000.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Architecture Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
            <div className="flex items-center space-x-2 text-indigo-400 mb-2">
              <Database className="w-4 h-4" />
              <h4 className="text-sm font-semibold text-white">PostgreSQL + Prisma</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Schema migrated with 8 core models: Flow, Trigger, Run, NodeRun, LogLine, DeadLetter, IdempotencyRecord, WorkerHeartbeat.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
            <div className="flex items-center space-x-2 text-indigo-400 mb-2">
              <Layers className="w-4 h-4" />
              <h4 className="text-sm font-semibold text-white">Redis Container</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Running on port 6379 for BullMQ task queues, worker coordination, and pub/sub events.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
            <div className="flex items-center space-x-2 text-indigo-400 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <h4 className="text-sm font-semibold text-white">React Flow Ready</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              `@xyflow/react` and Tailwind CSS ready for visual workflow graph construction in Phase 2 &amp; 3.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        The Dormammu Loop &bull; Team The Time Keepers &bull; Problem Statement M1
      </footer>
    </div>
  );
};
