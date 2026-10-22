import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchFlow, createFlow, updateFlow, Flow } from '../api/flows';
import { WorkflowCanvas, TEMPLATES } from '../components/canvas/WorkflowCanvas';
import { Graph } from '../engine/types';
import { RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';

export const FlowEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isNew = !id || id === 'new';
  const [flow, setFlow] = useState<Flow | null>(null);
  const [flowName, setFlowName] = useState<string>(
    isNew ? 'E-Commerce Order Pipeline' : 'Loading...'
  );
  const [loading, setLoading] = useState<boolean>(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isNew) {
      setFlow({
        id: 'new',
        name: 'E-Commerce Order Pipeline',
        graph: TEMPLATES.linear,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setFlowName('E-Commerce Order Pipeline');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFlow(id!);
        setFlow(data);
        setFlowName(data.name || 'Untitled Workflow');
      } catch (err: any) {
        setError(err.message || `Failed to load workflow "${id}"`);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isNew]);

  const handleSaveFlow = async (graph: Graph): Promise<void> => {
    setIsSaving(true);
    try {
      if (isNew) {
        const created = await createFlow({
          name: flowName.trim() || 'Untitled Workflow',
          graph,
        });
        setFlow(created);
        // Seamlessly update URL to existing flow ID without reload
        navigate(`/flows/${created.id}`, { replace: true });
      } else {
        const updated = await updateFlow(id!, {
          name: flowName.trim() || 'Untitled Workflow',
          graph,
        });
        setFlow(updated);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Loading workflow canvas...</p>
      </div>
    );
  }

  if (error || !flow) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Workflow Not Found</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error || 'Unknown error'}</p>
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workflows</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950">
      <WorkflowCanvas
        key={flow.id}
        initialGraph={flow.graph}
        flowName={flowName}
        onFlowNameChange={setFlowName}
        onSaveFlow={handleSaveFlow}
        onBack={() => navigate('/')}
        isSaving={isSaving}
      />
    </div>
  );
};
