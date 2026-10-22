import React, { useState, useEffect } from 'react';
import { GraphNode } from '../../engine/types';
import {
  X,
  Trash2,
  Globe,
  Sliders,
  Clock,
  CheckSquare,
  Zap,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface InspectorPanelProps {
  node: GraphNode | null;
  onUpdateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  node,
  onUpdateNode,
  onDeleteNode,
  onClose,
}) => {
  if (!node) return null;

  // Local state for smooth editing
  const [name, setName] = useState(node.name || '');
  const [config, setConfig] = useState<Record<string, any>>(node.config || {});
  const [headersText, setHeadersText] = useState(
    JSON.stringify(node.config?.headers || {}, null, 2)
  );
  const [headersError, setHeadersError] = useState<string | null>(null);

  // Sync state whenever selected node changes
  useEffect(() => {
    setName(node.name || '');
    setConfig(node.config || {});
    setHeadersText(JSON.stringify(node.config?.headers || {}, null, 2));
    setHeadersError(null);
  }, [node.id, node.type]);

  const handleNameChange = (val: string) => {
    setName(val);
    onUpdateNode(node.id, { name: val });
  };

  const handleConfigChange = (key: string, val: any) => {
    const updated = { ...config, [key]: val };
    setConfig(updated);
    onUpdateNode(node.id, { config: updated });
  };

  const handleHeadersChange = (text: string) => {
    setHeadersText(text);
    try {
      if (!text.trim()) {
        setHeadersError(null);
        handleConfigChange('headers', {});
        return;
      }
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
        setHeadersError(null);
        handleConfigChange('headers', parsed);
      } else {
        setHeadersError('Headers must be a JSON object (key: value pairs)');
      }
    } catch (err: any) {
      setHeadersError('Invalid JSON syntax');
    }
  };

  const renderTypeIcon = () => {
    switch (node.type) {
      case 'trigger':
        return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'http':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'transform':
        return <Sliders className="w-4 h-4 text-amber-400" />;
      case 'delay':
        return <Clock className="w-4 h-4 text-purple-400" />;
      case 'output':
        return <CheckSquare className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-84 md:w-96 rounded-2xl border border-slate-800 bg-slate-900/98 p-5 shadow-2xl backdrop-blur flex flex-col max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
            {renderTypeIcon()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white capitalize">
              {node.type} Node
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              id: {node.id}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Fields */}
      <div className="mt-4 flex flex-col gap-4 text-xs">
        {/* Node Name */}
        <div>
          <label className="block text-[11px] font-medium text-slate-300 mb-1">
            Node Label / Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={`e.g. My ${node.type}`}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Trigger-Specific Fields */}
        {node.type === 'trigger' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Trigger Event Type
              </label>
              <select
                value={config.type || 'manual'}
                onChange={(e) => handleConfigChange('type', e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="manual">Manual (UI Trigger)</option>
                <option value="webhook">Webhook (HTTP POST)</option>
                <option value="cron">Cron Schedule</option>
              </select>
            </div>

            {config.type === 'cron' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Cron Expression
                </label>
                <input
                  type="text"
                  value={config.cron || '*/5 * * * *'}
                  onChange={(e) => handleConfigChange('cron', e.target.value)}
                  placeholder="*/5 * * * *"
                  className="w-full font-mono rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Trigger nodes have zero incoming dependencies and kick off DAG execution.
              </span>
            </div>
          </div>
        )}

        {/* HTTP-Specific Fields */}
        {node.type === 'http' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Method
                </label>
                <select
                  value={(config.method || 'GET').toUpperCase()}
                  onChange={(e) => handleConfigChange('method', e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  min="500"
                  max="60000"
                  step="500"
                  value={config.timeout ?? 5000}
                  onChange={(e) =>
                    handleConfigChange('timeout', parseInt(e.target.value, 10) || 5000)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Target URL
              </label>
              <input
                type="text"
                value={config.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                placeholder="https://api.example.com/data"
                className="w-full font-mono rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
              {config.url &&
                !config.url.startsWith('http://') &&
                !config.url.startsWith('https://') && (
                  <p className="text-amber-400 text-[10px] mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Must start with http:// or https://
                  </p>
                )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Headers (JSON)
                </label>
                {headersError && (
                  <span className="text-[10px] text-rose-400">{headersError}</span>
                )}
              </div>
              <textarea
                rows={3}
                value={headersText}
                onChange={(e) => handleHeadersChange(e.target.value)}
                placeholder='{ "Authorization": "Bearer token" }'
                className="w-full font-mono text-[10px] rounded-lg border border-slate-700 bg-slate-950 p-2 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {['POST', 'PUT'].includes((config.method || 'GET').toUpperCase()) && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Request Body (JSON or text)
                </label>
                <textarea
                  rows={3}
                  value={
                    typeof config.body === 'object'
                      ? JSON.stringify(config.body, null, 2)
                      : config.body || ''
                  }
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleConfigChange('body', parsed);
                    } catch {
                      handleConfigChange('body', e.target.value);
                    }
                  }}
                  placeholder='{ "key": "value" } or plain text'
                  className="w-full font-mono text-[10px] rounded-lg border border-slate-700 bg-slate-950 p-2 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Transform-Specific Fields */}
        {node.type === 'transform' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Template String
              </label>
              <textarea
                rows={3}
                value={config.template || ''}
                onChange={(e) => handleConfigChange('template', e.target.value)}
                placeholder='Order {{ trigger.orderId }} confirmed for ${{ http_fetch.total }}'
                className="w-full font-mono text-[11px] rounded-lg border border-slate-700 bg-slate-950 p-2 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Template Syntax:</p>
                <p>
                  Use <code className="font-mono text-amber-200">{"{{ nodeId.field }}"}</code> to safely interpolate upstream node output values.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delay-Specific Fields */}
        {node.type === 'delay' && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Delay Duration:
                </label>
                <span className="font-mono font-bold text-purple-400 text-xs">
                  {config.seconds ?? 5} seconds
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={config.seconds ?? 5}
                onChange={(e) =>
                  handleConfigChange('seconds', parseInt(e.target.value, 10))
                }
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1 sec</span>
                <span>30 sec</span>
                <span>60 sec</span>
              </div>
            </div>
          </div>
        )}

        {/* Output-Specific Fields */}
        {node.type === 'output' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Output Key / Label
              </label>
              <input
                type="text"
                value={config.key || config.name || ''}
                onChange={(e) => {
                  handleConfigChange('key', e.target.value);
                  handleConfigChange('name', e.target.value);
                }}
                placeholder="e.g. finalSummary or orderResult"
                className="w-full font-mono rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Output nodes collect workflow execution outputs for inspection.
              </span>
            </div>
          </div>
        )}

        {/* Delete Node Button */}
        <div className="pt-3 mt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Node</span>
          </button>
        </div>
      </div>
    </div>
  );
};
