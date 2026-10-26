import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { NodeCard } from './NodeCard';
import { NodeStatus } from '../../../engine/types';

export const TriggerNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const name = (data?.name as string) || 'Manual Trigger';
  const config = (data?.config as Record<string, any>) || {};
  const triggerType = config.type || 'manual';
  const status = data?.status as NodeStatus | undefined;

  return (
    <NodeCard
      id={id}
      type="trigger"
      name={name}
      status={status}
      selected={selected}
      icon={<Zap className="w-3.5 h-3.5 text-emerald-400" />}
      theme={{
        border: 'border-emerald-500/30',
        glow: 'shadow-emerald-500/20',
        badgeBg: 'bg-emerald-500/10',
        badgeText: 'text-emerald-400',
        iconBg: 'bg-emerald-500/15',
      }}
      hasInputHandle={false} // Triggers have zero incoming dependencies!
      hasOutputHandle={true}
    >
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>mode:</span>
        <span className="text-emerald-300 font-medium">{triggerType}</span>
      </div>
    </NodeCard>
  );
};
