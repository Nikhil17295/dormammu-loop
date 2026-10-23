import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  BackgroundVariant,
  Node,
  Edge,
} from '@xyflow/react';
import { fetchRun, triggerRun, RunDetail, NodeRunDetail } from '../api/runs';
import { nodeTypes } from '../components/canvas/nodes';
import { RunModal } from '../components/canvas/RunModal';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Ban,
  RefreshCw,
  Play,
  Workflow,
  Copy,
  Check,
  X,
  Terminal,
  Code,
  FileText,
  ExternalLink,
} from 'lucide-react';

export const RunDetailPageInner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isReRunning, setIsReRunning] = useState<boolean>(false);
  const [isReRunModalOpen, setIsReRunModalOpen] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  const loadRun = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await fetchRun(id);
        setRun(data);
      } catch (err: any) {
        setError(err.message || `Failed to load run details for "${id}"`);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  // Polling mechanism: While run is pending or running, poll every 1.5 seconds.
  // Stop polling when run reaches success or failed.
  useEffect(() => {
    if (!run) return;
    const isTerminal = run.status === 'success' || run.status === 'failed';
    if (isTerminal) return;

    const interval = setInterval(() => {
      loadRun(true);
    }, 1500);

    return () => clearInterval(interval);
  }, [run?.status, loadRun]);

  const handleCopy = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleTriggerReRun = async (payload: any) => {
    if (!run?.flowId) return;
    setIsReRunning(true);
    try {
      const res = await triggerRun(run.flowId, payload);
      setIsReRunModalOpen(false);
      navigate(`/runs/${res.runId}`);
    } catch (err: any) {
      alert(`Failed to launch re-run: ${err.message}`);
    } finally {
      setIsReRunning(false);
    }
  };

  // Build a lookup map of nodeId -> NodeRunDetail
  const nodeRunMap = useMemo(() => {
    const map = new Map<string, NodeRunDetail>();
    if (run?.nodeRuns) {
      for (const nr of run.nodeRuns) {
        map.set(nr.nodeId, nr);
      }
    }
    return map;
  }, [run?.nodeRuns]);

  // Map graph nodes to React Flow nodes with live execution statuses
  const nodes: Node[] = useMemo(() => {
    const rawNodes = run?.flowGraph?.nodes || [];
    return rawNodes.map((n) => {
      const nr = nodeRunMap.get(n.id);
      const nodeStatus = nr?.status || (run?.status === 'pending' ? 'pending' : 'pending');

      return {
        id: n.id,
        type: n.type,
        position: n.position || { x: 100, y: 100 },
        selected: selectedNodeId === n.id,
        data: {
          ...n.config,
          name: n.name || n.type,
          type: n.type,
          status: nodeStatus,
          durationMs: nr?.durationMs,
          attempt: nr?.attempt,
        },
      };
    });
  }, [run?.flowGraph?.nodes, nodeRunMap, selectedNodeId, run?.status]);

  // Map graph edges to React Flow edges with dynamic styling
  const edges: Edge[] = useMemo(() => {
    const rawEdges = run?.flowGraph?.edges || [];
    return rawEdges.map((e) => {
      const sourceNr = nodeRunMap.get(e.source);
      const targetNr = nodeRunMap.get(e.target);
      const isRunning = sourceNr?.status === 'running' || targetNr?.status === 'running';
      const isSuccess = sourceNr?.status === 'success' && targetNr?.status === 'success';

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: isRunning,
        style: {
          stroke: isRunning ? '#3b82f6' : isSuccess ? '#10b981' : '#64748b',
          strokeWidth: isRunning ? 2.5 : 2,
        },
      };
    });
  }, [run?.flowGraph?.edges, nodeRunMap]);

  // Active selected node execution detail
  const selectedNodeRun = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodeRunMap.get(selectedNodeId) || null;
  }, [selectedNodeId, nodeRunMap]);

  const selectedGraphNode = useMemo(() => {
    if (!selectedNodeId || !run?.flowGraph?.nodes) return null;
    return run.flowGraph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, run?.flowGraph?.nodes]);

  const filteredLogs = useMemo(() => {
    const logs = selectedNodeRun?.logs || [];
    if (logFilter === 'all') return logs;
    return logs.filter((l) => l.level === logFilter);
  }, [selectedNodeRun?.logs, logFilter]);

  const formatDuration = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Running</span>
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Success</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Ban className="w-3.5 h-3.5 text-slate-400" />
            <span>Skipped</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Pending</span>
          </span>
        );
    }
  };

  if (loading && !run) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-medium">Loading execution run inspector...</p>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Execution Run Not Found</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6">{error || 'Run does not exist'}</p>
        <button
          onClick={() => navigate('/runs')}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Run History</span>
        </button>
      </div>
    );
  }

  const isLivePolling = run.status === 'pending' || run.status === 'running';

  return (
    <div className="relative w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header Inspector Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 md:px-6 flex items-center justify-between z-20">
        {/* Left: Back & Run Information */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={() => navigate('/runs')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Back to Run History"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {run.flowName}
              </h2>
              <button
                onClick={() => navigate(`/flows/${run.flowId}`)}
                className="text-slate-400 hover:text-indigo-300 p-0.5 rounded transition"
                title="Open Workflow Canvas Editor"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
              <span>run: {run.id.slice(0, 8)}...</span>
              <span>•</span>
              <span className="capitalize">{run.triggerSource}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Polling Indicator */}
        {isLivePolling && (
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>Live polling every 1.5s...</span>
          </div>
        )}

        {/* Right: Status, Duration, Refresh, & Re-Run */}
        <div className="flex items-center space-x-3">
          {renderStatusBadge(run.status)}

          <div className="hidden sm:flex flex-col text-right font-mono text-[11px] text-slate-400">
            <span className="text-slate-200 font-semibold">{formatDuration(run.durationMs)}</span>
            <span className="text-[10px] text-slate-500">duration</span>
          </div>

          <button
            onClick={() => loadRun(false)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh Run State"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsReRunModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition"
            title="Re-execute this workflow"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Re-Run</span>
          </button>
        </div>
      </header>

      {/* Main Visual Canvas Area */}
      <div className="relative flex-1 w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={2}
          className="bg-slate-950"
        >
          <Background color="#334155" gap={24} size={1.5} variant={BackgroundVariant.Dots} />
          <Controls className="!bg-slate-900 !border !border-slate-800 !rounded-xl !overflow-hidden [&>button]:!bg-slate-900 [&>button]:!border-slate-800 [&>button]:!text-slate-300 hover:[&>button]:!bg-slate-800" />
          <MiniMap
            nodeColor={(n) => {
              const nr = nodeRunMap.get(n.id);
              if (nr?.status === 'success') return '#10b981';
              if (nr?.status === 'failed') return '#f43f5e';
              if (nr?.status === 'running') return '#3b82f6';
              if (nr?.status === 'skipped') return '#475569';
              return '#64748b';
            }}
            maskColor="rgba(15, 23, 42, 0.75)"
            className="!bg-slate-900 !border !border-slate-800 !rounded-xl"
          />
        </ReactFlow>

        {/* Canvas Bottom Legend / Instructions */}
        <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-800 text-[11px] text-slate-400 shadow-xl">
          <span className="font-semibold text-slate-300">Click any node</span>
          <span>to inspect step inputs, outputs, errors, and terminal logs.</span>
        </div>

        {/* Node Execution Drawer (Slide-Over from right) */}
        {selectedNodeId && (
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-slate-900/98 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-indigo-400">
                  <Workflow className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs font-bold text-white truncate">
                      {selectedGraphNode?.name || selectedNodeId}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedGraphNode?.type || 'node'}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 truncate">
                    nodeId: {selectedNodeId}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedNodeId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Execution Status & Metrics Summary */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Status
                </span>
                {renderStatusBadge(selectedNodeRun?.status || 'pending')}
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Duration
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {formatDuration(selectedNodeRun?.durationMs)}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Attempt
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {selectedNodeRun?.attempt || 0}
                </span>
              </div>
            </div>

            {/* Drawer Body Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Error Banner (if failed) */}
              {selectedNodeRun?.status === 'failed' && selectedNodeRun?.error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-200">
                  <div className="flex items-center space-x-2 font-bold text-rose-400 mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Execution Error</span>
                  </div>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap break-words bg-rose-950/60 p-2.5 rounded-lg border border-rose-900/50 mt-2">
                    {selectedNodeRun.error}
                  </pre>
                </div>
              )}

              {/* Timestamped Execution Log Terminal */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner flex flex-col">
                <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 ml-2">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      Execution Logs
                    </span>
                  </div>

                  {/* Log Filter Pills */}
                  <div className="flex items-center space-x-1 text-[10px] font-mono">
                    {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setLogFilter(lvl)}
                        className={`px-1.5 py-0.5 rounded transition ${
                          logFilter === lvl
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {lvl.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1.5">
                  {filteredLogs.length === 0 ? (
                    <div className="py-6 text-center text-slate-600 italic">
                      No log entries recorded for this node.
                    </div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                        <span className="text-slate-600 shrink-0">
                          {new Date(log.ts).toLocaleTimeString()}
                        </span>
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] uppercase font-bold shrink-0 ${
                            log.level === 'error'
                              ? 'bg-rose-500/20 text-rose-400'
                              : log.level === 'warn'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-slate-300 break-words flex-1">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Node Output Viewer */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-emerald-400" />
                    Node Output
                  </span>
                  {selectedNodeRun?.output !== undefined && selectedNodeRun?.output !== null && (
                    <button
                      onClick={() => handleCopy(selectedNodeRun.output, 'output')}
                      className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white transition"
                    >
                      {copiedSection === 'output' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="p-3">
                  {selectedNodeRun?.output !== undefined && selectedNodeRun?.output !== null ? (
                    <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap break-words max-h-56 overflow-y-auto">
                      {typeof selectedNodeRun.output === 'string'
                        ? selectedNodeRun.output
                        : JSON.stringify(selectedNodeRun.output, null, 2)}
                    </pre>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-600 italic">
                      No output data (node is pending, skipped, or failed)
                    </div>
                  )}
                </div>
              </div>

              {/* Node Input Context Viewer */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Node Input Context
                  </span>
                  {selectedNodeRun?.input && (
                    <button
                      onClick={() => handleCopy(selectedNodeRun.input, 'input')}
                      className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white transition"
                    >
                      {copiedSection === 'input' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="p-3">
                  {selectedNodeRun?.input ? (
                    <pre className="font-mono text-xs text-indigo-300 whitespace-pre-wrap break-words max-h-56 overflow-y-auto">
                      {JSON.stringify(selectedNodeRun.input, null, 2)}
                    </pre>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-600 italic">
                      No input context recorded
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Re-Run Modal */}
        <RunModal
          isOpen={isReRunModalOpen}
          flowName={run.flowName}
          onClose={() => setIsReRunModalOpen(false)}
          onRun={handleTriggerReRun}
          isRunning={isReRunning}
        />
      </div>
    </div>
  );
};

export const RunDetailPage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <RunDetailPageInner />
    </ReactFlowProvider>
  );
};
