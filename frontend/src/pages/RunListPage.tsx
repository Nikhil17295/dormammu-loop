import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchRuns, RunSummary } from '../api/runs';
import {
  Workflow,
  Activity,
  History,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  ArrowRight,
  Zap,
  Radio,
  Timer,
  Copy,
  Check,
  Plus,
  Layers,
  X,
} from 'lucide-react';

export const RunListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFlowId = searchParams.get('flowId') || '';
  const initialStatus = searchParams.get('status') || '';

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedFlowId, setSelectedFlowId] = useState<string>(initialFlowId);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadRuns = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchRuns({
        flowId: selectedFlowId || undefined,
        status: selectedStatus || undefined,
      });
      setRuns(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load execution runs');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, [selectedStatus, selectedFlowId]);

  // Auto-refresh polling every 3 seconds for active runs
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadRuns(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedStatus, selectedFlowId]);

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        r.id.toLowerCase().includes(term) ||
        r.flowName.toLowerCase().includes(term) ||
        r.triggerSource.toLowerCase().includes(term);
      return matchesSearch;
    });
  }, [runs, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = runs.length;
    const success = runs.filter((r) => r.status === 'success').length;
    const failed = runs.filter((r) => r.status === 'failed').length;
    const running = runs.filter((r) => r.status === 'running' || r.status === 'pending').length;
    return { total, success, failed, running };
  }, [runs]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>Running</span>
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Success</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Pending</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  const renderTriggerBadge = (source: string) => {
    switch (source) {
      case 'webhook':
        return (
          <span className="inline-flex items-center space-x-1 text-xs text-sky-400 font-mono">
            <Radio className="w-3 h-3 text-sky-400" />
            <span>webhook</span>
          </span>
        );
      case 'cron':
        return (
          <span className="inline-flex items-center space-x-1 text-xs text-amber-400 font-mono">
            <Timer className="w-3 h-3 text-amber-400" />
            <span>cron</span>
          </span>
        );
      case 'manual':
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-xs text-purple-400 font-mono">
            <Zap className="w-3 h-3 text-purple-400" />
            <span>manual</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              The Dormammu Loop
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-normal">
                Phase 4 History
              </span>
            </h1>
            <p className="text-xs text-slate-400">Distributed DAG Workflow Engine</p>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Workflows</span>
          </button>

          <button
            onClick={() => navigate('/runs')}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Run History</span>
          </button>

          <button
            onClick={() => navigate('/health')}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Health</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={autoRefresh ? 'Live Polling Active (3s)' : 'Auto-refresh paused'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{autoRefresh ? 'Live' : 'Paused'}</span>
          </button>

          <button
            onClick={() => navigate('/flows/new')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Flow</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col space-y-6">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Executions</span>
              <History className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Successful Runs</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats.success}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Active / Running</span>
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            </div>
            <p className="text-2xl font-bold text-blue-400">{stats.running}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Failed Runs</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-rose-400">{stats.failed}</p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by Run ID, workflow name, or trigger..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['', 'running', 'success', 'failed'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedStatus === st
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {st === '' ? 'All Status' : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Active Flow Filter Badge */}
        {selectedFlowId && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">Filtering by Workflow ID:</span>
              <code className="font-mono bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60 text-indigo-200">
                {selectedFlowId}
              </code>
            </div>
            <button
              onClick={() => setSelectedFlowId('')}
              className="flex items-center space-x-1 text-slate-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-indigo-500/20"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="flex items-center space-x-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Runs Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
          {loading && runs.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs">Loading workflow execution history...</p>
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
                <History className="w-8 h-8 text-slate-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">No execution runs found</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  {searchTerm || selectedStatus
                    ? 'No runs match your search filters.'
                    : 'Execute a workflow from the canvas editor to inspect its step-by-step results.'}
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Go to Workflows</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 pl-6">Run ID</th>
                    <th className="py-3.5 px-4">Workflow</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Trigger</th>
                    <th className="py-3.5 px-4">Steps Completed</th>
                    <th className="py-3.5 px-4">Started At</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredRuns.map((run) => (
                    <tr
                      key={run.id}
                      onClick={() => navigate(`/runs/${run.id}`)}
                      className="hover:bg-slate-800/40 cursor-pointer transition group"
                    >
                      {/* Run ID */}
                      <td className="py-3.5 px-4 pl-6">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-300 font-semibold group-hover:text-indigo-400 transition">
                            {run.id.slice(0, 8)}...
                          </span>
                          <button
                            onClick={(e) => handleCopy(e, run.id)}
                            className="p-1 rounded text-slate-500 hover:text-slate-300 transition"
                            title="Copy Full UUID"
                          >
                            {copiedId === run.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Workflow */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <Workflow className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="font-semibold text-white group-hover:text-indigo-300 transition truncate max-w-xs">
                            {run.flowName}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(run.status)}
                      </td>

                      {/* Trigger */}
                      <td className="py-3.5 px-4">
                        {renderTriggerBadge(run.triggerSource)}
                      </td>

                      {/* Steps Progress */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                          <span>
                            {run.successCount} / {run.nodeCount}
                          </span>
                          {run.failedCount > 0 && (
                            <span className="text-rose-400 font-semibold">
                              ({run.failedCount} failed)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Started At */}
                      <td className="py-3.5 px-4 text-slate-400">
                        <div className="flex flex-col">
                          <span className="text-slate-200">{formatTimeAgo(run.startedAt)}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(run.startedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {formatDuration(run.durationMs)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 pr-6 text-right">
                        <span className="inline-flex items-center space-x-1 text-xs text-indigo-400 group-hover:text-indigo-300 font-medium">
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
