import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeType, NodeStatus } from '../../../engine/types';
import { CheckCircle2, AlertTriangle, Loader2, Clock, Ban } from 'lucide-react';

interface NodeCardProps {
  id: string;
  type: NodeType;
  name: string;
  selected?: boolean;
  status?: NodeStatus | string;
  attempt?: number;
  durationMs?: number | null;
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
  selected = false,
  status,
  durationMs,
  icon,
  theme,
  hasInputHandle = true,
  hasOutputHandle = true,
  children,
}) => {
  // Determine dynamic border and shadow styling based on execution status
  let statusBorderClass = theme.border;
  let statusCardClass = 'bg-slate-900/95';

  if (status === 'running') {
    statusBorderClass = 'border-blue-500 ring-2 ring-blue-500/60 shadow-lg shadow-blue-500/30 animate-pulse';
    statusCardClass = 'bg-slate-900';
  } else if (status === 'success') {
    statusBorderClass = 'border-emerald-500/90 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-500/15';
    statusCardClass = 'bg-slate-900/95';
  } else if (status === 'failed') {
    statusBorderClass = 'border-rose-500/90 ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/25';
    statusCardClass = 'bg-slate-900/95';
  } else if (status === 'skipped') {
    statusBorderClass = 'border-slate-800 opacity-60';
    statusCardClass = 'bg-slate-950/80';
  } else if (status === 'pending') {
    statusBorderClass = 'border-slate-700/60';
    statusCardClass = 'bg-slate-900/75';
  } else if (selected) {
    statusBorderClass = 'border-indigo-400 ring-2 ring-indigo-500/50 shadow-indigo-500/20 shadow-2xl';
  }

  const renderStatusBadge = () => {
    if (!status) return null;

    switch (status) {
      case 'running':
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />
            <span>Running</span>
          </span>
        );
      case 'success':
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            <span>Success</span>
            {durationMs !== undefined && durationMs !== null && (
              <span className="text-emerald-400 font-mono font-normal">
                ({durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`})
              </span>
            )}
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'skipped':
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            <Ban className="w-2.5 h-2.5 text-slate-400" />
            <span>Skipped</span>
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-slate-800/80 text-slate-400 border border-slate-700/60">
            <Clock className="w-2.5 h-2.5 text-slate-400" />
            <span>Pending</span>
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div
      className={`relative min-w-[210px] max-w-[280px] rounded-xl border p-3.5 shadow-xl backdrop-blur transition-all duration-150 ${statusCardClass} ${statusBorderClass}`}
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

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider border ${theme.badgeBg} ${theme.badgeText} ${theme.border}`}
          >
            {type}
          </span>
          {renderStatusBadge()}
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
