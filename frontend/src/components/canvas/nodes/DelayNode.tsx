import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';
import { NodeCard } from './NodeCard';
import { NodeStatus } from '../../../engine/types';

export const DelayNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const name = (data?.name as string) || 'Delay';
  const config = (data?.config as Record<string, any>) || {};
  const seconds = config.seconds ?? 5;
  const status = data?.status as NodeStatus | undefined;

  return (
    <NodeCard
      id={id}
      type="delay"
      name={name}
      status={status}
      selected={selected}
      icon={<Clock className="w-3.5 h-3.5 text-purple-400" />}
      theme={{
        border: 'border-purple-500/30',
        glow: 'shadow-purple-500/20',
        badgeBg: 'bg-purple-500/10',
        badgeText: 'text-purple-400',
        iconBg: 'bg-purple-500/15',
      }}
      hasInputHandle={true}
      hasOutputHandle={true}
    >
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>wait:</span>
        <span className="text-purple-300 font-bold">{seconds}s</span>
      </div>
    </NodeCard>
  );
};
