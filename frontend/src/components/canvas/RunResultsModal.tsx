import React from 'react';
import {
  CheckCircle2,
  XCircle,
  X,
  Clock,
  Code2,
  Zap,
  Globe,
  Sliders,
  CheckSquare,
} from 'lucide-react';
import { NodeType, NodeStatus } from '../../engine/types';

export interface RunStepResult {
  nodeId: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  durationMs: number;
  output?: any;
  error?: string;
}

export interface RunResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowName: string;
  runId: string;
  status: 'success' | 'failed' | 'running';
  totalDurationMs: number;
  steps: RunStepResult[];
}

export const RunResultsModal: React.FC<RunResultsModalProps> = ({
  isOpen,
  onClose,
  flowName,
  runId,
  status,
  totalDurationMs,
  steps,
}) => {
  if (!isOpen) return null;

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'trigger':
        return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
      case 'http':
        return <Globe className="w-3.5 h-3.5 text-blue-400" />;
      case 'transform':
        return <Sliders className="w-3.5 h-3.5 text-amber-400" />;
      case 'delay':
        return <Clock className="w-3.5 h-3.5 text-purple-400" />;
      case 'output':
        return <CheckSquare className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                status === 'success'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {status === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">Execution Finished</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    status === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Run ID: <span className="text-slate-300">{runId}</span> • Flow:{' '}
                <span className="text-indigo-400">{flowName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">
                Total Time
              </span>
              <span className="text-xs font-semibold text-slate-200 font-mono">
                {(totalDurationMs / 1000).toFixed(2)}s
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close results"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Steps List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            <span>Executed Steps ({steps.length})</span>
            <span>Order of Execution (Topological)</span>
          </div>

          {steps.map((step, idx) => (
            <div
              key={step.nodeId}
              className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="p-1.5 rounded-lg bg-slate-850 border border-slate-800 shrink-0">
                    {getNodeIcon(step.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{step.name}</p>
                    <p className="text-[10px] font-mono text-slate-500 truncate">
                      nodeId: {step.nodeId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400">
                    {step.durationMs}ms
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      step.status === 'success'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : step.status === 'failed'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
              </div>

              {/* Output preview */}
              {step.output && (
                <div className="mt-2 pt-2 border-t border-slate-850">
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono mb-1">
                    <Code2 className="w-3 h-3 text-indigo-400" />
                    <span>Output Payload:</span>
                  </div>
                  <pre className="p-2 rounded-lg bg-slate-950/80 border border-slate-850 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-24">
                    {typeof step.output === 'object'
                      ? JSON.stringify(step.output, null, 2)
                      : String(step.output)}
                  </pre>
                </div>
              )}

              {step.error && (
                <div className="mt-2 text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 font-mono">
                  {step.error}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Kahn's Topological Sort verified execution order with zero cycles.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
