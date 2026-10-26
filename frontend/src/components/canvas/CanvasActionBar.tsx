import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Save,
  Play,
  FileSpreadsheet,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react';
import { ValidationError } from '../../engine/types';

interface CanvasActionBarProps {
  flowName: string;
  onFlowNameChange: (name: string) => void;
  onValidate: () => void;
  onSave: () => void;
  onRun: () => void;
  isRunning?: boolean;
  onLoadTemplate: (templateKey: 'linear' | 'diamond' | 'delayed' | 'empty') => void;
  onBack: () => void;
  isSaving: boolean;
  isValidating: boolean;
  validationResult: { valid: boolean; errors: ValidationError[] } | null;
  onDismissValidation: () => void;
}

export const CanvasActionBar: React.FC<CanvasActionBarProps> = ({
  flowName,
  onFlowNameChange,
  onValidate,
  onSave,
  onRun,
  isRunning = false,
  onLoadTemplate,
  onBack,
  isSaving,
  isValidating,
  validationResult,
  onDismissValidation,
}) => {
  const [templateOpen, setTemplateOpen] = useState(false);

  return (
    <div className="relative z-30">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 md:px-6 flex items-center justify-between">
        {/* Left Section: Back button & Flow Name Input */}
        <div className="flex items-center space-x-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition"
            title="Back to Flows"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-500 uppercase">Workflow:</span>
            <input
              type="text"
              value={flowName}
              onChange={(e) => onFlowNameChange(e.target.value)}
              placeholder="Untitled Workflow"
              className="text-sm md:text-base font-bold bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-white px-1.5 py-0.5 focus:outline-none transition max-w-[200px] md:max-w-xs truncate"
            />
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Templates Dropdown */}
          <div className="relative">
            <button
              onClick={() => setTemplateOpen(!templateOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Load Starter Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Templates</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {templateOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-2xl z-40">
                <button
                  onClick={() => {
                    onLoadTemplate('linear');
                    setTemplateOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 transition"
                >
                  <p className="font-semibold">E-Commerce Pipeline</p>
                  <p className="text-[10px] text-slate-400">Trigger → HTTP → Transform → Output</p>
                </button>
                <button
                  onClick={() => {
                    onLoadTemplate('diamond');
                    setTemplateOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 transition"
                >
                  <p className="font-semibold">Diamond Parallel Branching</p>
                  <p className="text-[10px] text-slate-400">Trigger → [A, B] → Transform → Output</p>
                </button>
                <button
                  onClick={() => {
                    onLoadTemplate('delayed');
                    setTemplateOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 transition"
                >
                  <p className="font-semibold">Delayed Webhook Flow</p>
                  <p className="text-[10px] text-slate-400">Trigger → Delay (10s) → HTTP → Output</p>
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={() => {
                    onLoadTemplate('empty');
                    setTemplateOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-300 hover:bg-rose-500/10 transition"
                >
                  <p className="font-semibold">Clear Canvas</p>
                  <p className="text-[10px] text-slate-400">Start with a clean blank canvas</p>
                </button>
              </div>
            )}
          </div>

          {/* Validate Button */}
          <button
            onClick={onValidate}
            disabled={isValidating || isRunning}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Validate workflow DAG structure & configs"
          >
            {isValidating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>Validate</span>
          </button>

          {/* Save Button */}
          <button
            onClick={onSave}
            disabled={isSaving || isRunning}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            title="Save workflow definition to database"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save</span>
          </button>

          {/* Run Button */}
          <button
            onClick={onRun}
            disabled={isRunning || isSaving || isValidating}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
            title="Execute workflow run"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>
        </div>
      </header>

      {/* Validation Result Banner (if active) */}
      {validationResult && (
        <div
          className={`px-6 py-3 border-b text-xs flex items-center justify-between transition-all ${
            validationResult.valid
              ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-200'
              : 'bg-rose-950/80 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-start space-x-2.5">
            {validationResult.valid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">
                {validationResult.valid
                  ? 'Workflow is a valid Directed Acyclic Graph (DAG)!'
                  : `Validation Failed (${validationResult.errors.length} issue${
                      validationResult.errors.length > 1 ? 's' : ''
                    }):`}
              </p>
              {!validationResult.valid && (
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] opacity-90">
                  {validationResult.errors.map((err, idx) => (
                    <li key={idx}>
                      <span className="font-mono text-rose-300">[{err.code}]</span>{' '}
                      {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <button
            onClick={onDismissValidation}
            className="p-1 rounded hover:bg-black/20 text-current transition opacity-70 hover:opacity-100"
            title="Dismiss Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
