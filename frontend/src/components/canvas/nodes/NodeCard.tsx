import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Loader2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { NodeType, NodeStatus } from '../../../engine/types';

interface NodeCardProps {
  id: string;
  type: NodeType;
  name: string;
  status?: NodeStatus;
  selected?: boolean;
  icon: React.ReactNode;
  theme: {
    border: string;
    glow: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
  };
  hasInputHandle?: boolean;
  hasOutputHandle?: boolean;
  children?: React.ReactNode;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  id,
  type,
  name,
  status,
  selected = false,
  icon,
  theme,
  hasInputHandle = true,
  hasOutputHandle = true,
  children,
}) => {
  // Determine dynamic ring / glow according to run status
  const getStatusBorder = () => {
    if (status === 'running') {
      return 'border-amber-400 ring-2 ring-amber-400/60 shadow-amber-500/30 animate-pulse';
    }
    if (status === 'success') {
      return 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/20';
    }
    if (status === 'failed') {
      return 'border-rose-500 ring-2 ring-rose-500/60 shadow-rose-500/30';
    }
    if (status === 'skipped') {
      return 'border-slate-700 opacity-60';
    }
    if (selected) {
      return 'border-indigo-400 ring-2 ring-indigo-500/50 shadow-indigo-500/20 shadow-2xl';
    }
    return 'border-slate-800 hover:border-slate-700 hover:shadow-2xl';
  };

  return (
    <div
      className={`relative min-w-[210px] max-w-[280px] rounded-xl border bg-slate-900/95 p-3.5 shadow-xl backdrop-blur transition-all duration-200 ${getStatusBorder()}`}
    >
      {/* Target Handle (Incoming Dependency): NOT shown on trigger nodes */}
      {hasInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !-left-1.5 !bg-indigo-400 !border-2 !border-slate-900 hover:!scale-125 !transition-transform"
          title="Incoming dependency (upstream parent)"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center space-x-2 min-w-0">
          <div className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${theme.iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate" title={name}>
              {name || type}
            </h4>
            <span className="text-[10px] font-mono text-slate-500 truncate block">
              id: {id}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {status && status !== 'pending' && (
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border flex items-center space-x-1 ${
                status === 'running'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : status === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : status === 'failed'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {status === 'running' && <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />}
              {status === 'success' && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
              {status === 'failed' && <XCircle className="w-2.5 h-2.5 text-rose-400" />}
              {status === 'skipped' && <MinusCircle className="w-2.5 h-2.5 text-slate-400" />}
              <span>{status}</span>
            </span>
          )}

          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider shrink-0 border ${theme.badgeBg} ${theme.badgeText} ${theme.border}`}
          >
            {type}
          </span>
        </div>
      </div>

      {/* Type-Specific Preview Body */}
      {children && (
        <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
          {children}
        </div>
      )}

      {/* Source Handle (Outgoing Dependency) */}
      {hasOutputHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !-right-1.5 !bg-indigo-400 !border-2 !border-slate-900 hover:!scale-125 !transition-transform"
          title="Outgoing dependency (downstream child)"
        />
      )}
    </div>
  );
};
