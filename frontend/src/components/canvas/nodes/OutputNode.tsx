import React from 'react';
import { NodeProps } from '@xyflow/react';
import { CheckSquare } from 'lucide-react';
import { NodeCard } from './NodeCard';
import { NodeStatus } from '../../../engine/types';

export const OutputNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const name = (data?.name as string) || 'Output Sink';
  const config = (data?.config as Record<string, any>) || {};
  const key = (config.key as string) || (config.name as string) || 'result';
  const status = data?.status as NodeStatus | undefined;

  return (
    <NodeCard
      id={id}
      type="output"
      name={name}
      status={status}
      selected={selected}
      icon={<CheckSquare className="w-3.5 h-3.5 text-rose-400" />}
      theme={{
        border: 'border-rose-500/30',
        glow: 'shadow-rose-500/20',
        badgeBg: 'bg-rose-500/10',
        badgeText: 'text-rose-400',
        iconBg: 'bg-rose-500/15',
      }}
      hasInputHandle={true}
      hasOutputHandle={true}
    >
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>output key:</span>
        <span className="text-rose-300 font-medium truncate max-w-[100px]" title={key}>
          {key}
        </span>
      </div>
    </NodeCard>
  );
};
