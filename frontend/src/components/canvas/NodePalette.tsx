import React, { useState } from 'react';
import { NodeType } from '../../engine/types';
import { Zap, Globe, Sliders, Clock, CheckSquare, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
}

interface PaletteItem {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  borderClass: string;
  bgClass: string;
  badgeClass: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Entry point (zero inputs)',
    icon: <Zap className="w-4 h-4 text-emerald-400" />,
    borderClass: 'hover:border-emerald-500/50',
    bgClass: 'bg-emerald-500/10 text-emerald-400',
    badgeClass: 'border-emerald-500/30 text-emerald-300',
  },
  {
    type: 'http',
    label: 'HTTP Request',
    description: 'Fetch or post REST API',
    icon: <Globe className="w-4 h-4 text-blue-400" />,
    borderClass: 'hover:border-blue-500/50',
    bgClass: 'bg-blue-500/10 text-blue-400',
    badgeClass: 'border-blue-500/30 text-blue-300',
  },
  {
    type: 'transform',
    label: 'Transform',
    description: 'JSON template string',
    icon: <Sliders className="w-4 h-4 text-amber-400" />,
    borderClass: 'hover:border-amber-500/50',
    bgClass: 'bg-amber-500/10 text-amber-400',
    badgeClass: 'border-amber-500/30 text-amber-300',
  },
  {
    type: 'delay',
    label: 'Delay Timer',
    description: 'Pause 1–60 seconds',
    icon: <Clock className="w-4 h-4 text-purple-400" />,
    borderClass: 'hover:border-purple-500/50',
    bgClass: 'bg-purple-500/10 text-purple-400',
    badgeClass: 'border-purple-500/30 text-purple-300',
  },
  {
    type: 'output',
    label: 'Output Sink',
    description: 'Workflow result collector',
    icon: <CheckSquare className="w-4 h-4 text-rose-400" />,
    borderClass: 'hover:border-rose-500/50',
    bgClass: 'bg-rose-500/10 text-rose-400',
    badgeClass: 'border-rose-500/30 text-rose-300',
  },
];

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const [collapsed, setCollapsed] = useState(false);

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  if (collapsed) {
    return (
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 shadow-xl backdrop-blur transition"
          title="Expand Node Palette"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-10 w-64 rounded-2xl border border-slate-800 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur transition-all">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Node Palette
          </h3>
          <p className="text-[10px] text-slate-400">Click or drag nodes to canvas</p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Collapse Palette"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            onClick={() => onAddNode(item.type)}
            className={`group cursor-grab active:cursor-grabbing rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex items-center justify-between transition-all duration-150 hover:bg-slate-850 hover:scale-[1.02] ${item.borderClass}`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`p-1.5 rounded-lg shrink-0 ${item.bgClass}`}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-medium text-slate-200 block truncate">
                  {item.label}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {item.description}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title={`Add ${item.label}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
