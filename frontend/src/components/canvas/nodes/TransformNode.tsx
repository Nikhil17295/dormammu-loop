import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Sliders } from 'lucide-react';
import { NodeCard } from './NodeCard';
import { NodeStatus } from '../../../engine/types';

export const TransformNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const name = (data?.name as string) || 'Transform';
  const config = (data?.config as Record<string, any>) || {};
  const template = (config.template as string) || '';
  const mapping = config.mapping;
  const status = data?.status as NodeStatus | undefined;

  return (
    <NodeCard
      id={id}
      type="transform"
      name={name}
      status={status}
      selected={selected}
      icon={<Sliders className="w-3.5 h-3.5 text-amber-400" />}
      theme={{
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/20',
        badgeBg: 'bg-amber-500/10',
        badgeText: 'text-amber-400',
        iconBg: 'bg-amber-500/15',
      }}
      hasInputHandle={true}
      hasOutputHandle={true}
    >
      <div className="text-[10px] text-slate-400 font-mono truncate" title={template || 'No template'}>
        {template ? (
          <span className="text-amber-300">"{template}"</span>
        ) : mapping ? (
          <span className="text-slate-400">custom mapping ({Object.keys(mapping).length} keys)</span>
        ) : (
          <span className="text-slate-500 italic">No template configured</span>
        )}
      </div>
    </NodeCard>
  );
};
