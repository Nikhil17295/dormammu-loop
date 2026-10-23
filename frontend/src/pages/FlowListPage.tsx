import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFlows, deleteFlow, FlowSummary } from '../api/flows';
import {
  Plus,
  Layers,
  Trash2,
  Calendar,
  Search,
  RefreshCw,
  Activity,
  ArrowRight,
  Workflow,
  Sparkles,
  History,
} from 'lucide-react';

export const FlowListPage: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFlows = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFlows();
      setFlows(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load flows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete workflow "${name}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteFlow(id);
      setFlows((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredFlows = flows.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              The Dormammu Loop
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-normal">
                Phase 3 Canvas
              </span>
            </h1>
            <p className="text-xs text-slate-400">Distributed DAG Workflow Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/runs')}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="View Workflow Run History"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Run History</span>
          </button>

          <button
            onClick={() => navigate('/health')}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="System Health & Infrastructure"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">System Health</span>
          </button>

          <button
            onClick={loadFlows}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Flows"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/flows/new')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Flow</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Banner Section */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Visual Workflow Designer
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Construct resilient Directed Acyclic Graphs (DAGs) visually with real-time client-side cycle rejection, configure nodes with type-specific inspectors, and persist workflows to PostgreSQL.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/flows/new')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
              >
                <span>Launch Canvas Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar: Search and Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter workflows by name..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-900/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <span>Total Workflows:</span>
            <span className="font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
              {flows.length}
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Flows Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
            <p className="text-sm">Loading workflows from database...</p>
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Workflow className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              {searchTerm ? 'No matching workflows found' : 'No workflows yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6">
              {searchTerm
                ? `No workflows matched "${searchTerm}". Clear search or create a new one.`
                : 'Get started by creating your first workflow with our interactive React Flow canvas builder.'}
            </p>
            <button
              onClick={() => navigate('/flows/new')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Workflow</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFlows.map((flow) => (
              <div
                key={flow.id}
                onClick={() => navigate(`/flows/${flow.id}`)}
                className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/50 p-5 shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-white group-hover:text-indigo-300 transition truncate text-sm">
                      {flow.name || 'Untitled Workflow'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 shrink-0">
                      <Layers className="w-3 h-3" />
                      {flow.nodeCount} node{flow.nodeCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-slate-500 truncate mb-4">
                    id: {flow.id}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {flow.updatedAt
                        ? new Date(flow.updatedAt).toLocaleDateString()
                        : 'Recently'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/runs?flowId=${flow.id}`);
                      }}
                      className="flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition text-[11px]"
                      title="View Runs for this Workflow"
                    >
                      <History className="w-3 h-3" />
                      <span>Runs</span>
                    </button>

                    <button
                      onClick={(e) => handleDelete(e, flow.id, flow.name)}
                      disabled={deletingId === flow.id}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                      title="Delete Workflow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white transition text-[11px] font-medium"
                      title="Open in Visual Editor"
                    >
                      <span>Edit</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        The Dormammu Loop &bull; Team The Time Keepers &bull; Problem Statement M1
      </footer>
    </div>
  );
};
