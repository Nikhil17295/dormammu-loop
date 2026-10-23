import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Globe } from 'lucide-react';
import { NodeCard } from './NodeCard';

export const HttpNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const name = (data?.name as string) || 'HTTP Request';
  const config = (data?.config as Record<string, any>) || {};
  const method = (config.method as string) || 'GET';
  const url = (config.url as string) || 'https://api.example.com';
  const status = data?.status as string | undefined;
  const durationMs = data?.durationMs as number | undefined;

  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    POST: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    PUT: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    DELETE: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  return (
    <NodeCard
      id={id}
      type="http"
      name={name}
      selected={selected}
      status={status}
      durationMs={durationMs}
      icon={<Globe className="w-3.5 h-3.5 text-blue-400" />}
      theme={{
        border: 'border-blue-500/30',
        glow: 'shadow-blue-500/20',
        badgeBg: 'bg-blue-500/10',
        badgeText: 'text-blue-400',
        iconBg: 'bg-blue-500/15',
      }}
      hasInputHandle={true}
      hasOutputHandle={true}
    >
      <div className="flex items-center space-x-1.5 truncate">
        <span
          className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold border ${
            methodColors[method.toUpperCase()] || 'bg-slate-700 text-slate-300'
          }`}
        >
          {method.toUpperCase()}
        </span>
        <span className="truncate text-slate-400 font-mono text-[10px]" title={url}>
          {url}
        </span>
      </div>
    </NodeCard>
  );
};
