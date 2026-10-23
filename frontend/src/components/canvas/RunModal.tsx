import React, { useState } from 'react';
import { Play, X, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

interface RunModalProps {
  isOpen: boolean;
  flowName: string;
  onClose: () => void;
  onRun: (payload: any) => Promise<void>;
  isRunning?: boolean;
}

export const RunModal: React.FC<RunModalProps> = ({
  isOpen,
  flowName,
  onClose,
  onRun,
  isRunning = false,
}) => {
  const [payloadStr, setPayloadStr] = useState<string>('{\n  \n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(payloadStr || '{}');
      setPayloadStr(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (e: any) {
      setJsonError('Invalid JSON: Cannot format.');
    }
  };

  const handleInsertSample = () => {
    const sample = {
      orderId: 'ORD-2026-99',
      userId: 'usr_8821',
      customer: {
        name: 'Sarah Connor',
        email: 'sarah@example.com',
      },
      items: [
        { id: 'item_1', name: 'Flux Capacitor', price: 199.99 },
        { id: 'item_2', name: 'Time Stone', price: 999.0 },
      ],
    };
    setPayloadStr(JSON.stringify(sample, null, 2));
    setJsonError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsed = {};
    if (payloadStr.trim()) {
      try {
        parsed = JSON.parse(payloadStr);
      } catch (err: any) {
        setJsonError(`JSON Syntax Error: ${err.message}`);
        return;
      }
    }

    setJsonError(null);
    await onRun(parsed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Play className="w-4 h-4 fill-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Execute Workflow Run</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{flowName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Trigger Input Payload (JSON)
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                id="sample-data-btn"
                onClick={handleInsertSample}
                className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition"
              >
                <Sparkles className="w-3 h-3" />
                <span>Sample Data</span>
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={handleFormatJson}
                className="text-[11px] text-slate-400 hover:text-slate-300 transition"
              >
                Prettify
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={4}
              value={payloadStr}
              onChange={(e) => {
                setPayloadStr(e.target.value);
                if (jsonError) setJsonError(null);
              }}
              placeholder="{}"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 resize-none shadow-inner"
              spellCheck={false}
            />
          </div>

          {jsonError && (
            <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{jsonError}</span>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-300">Data Flow Note:</span> Accessible via <code className="text-indigo-300 font-mono">{'{{ trigger.orderId }}'}</code> in downstream nodes.
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="execute-workflow-btn"
              disabled={isRunning}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Launching Run...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Execute Workflow</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
