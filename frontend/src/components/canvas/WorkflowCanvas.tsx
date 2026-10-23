import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import { nodeTypes } from './nodes';
import { NodePalette } from './NodePalette';
import { InspectorPanel } from './InspectorPanel';
import { CanvasActionBar } from './CanvasActionBar';
import { ToastContainer, ToastMessage } from './Toast';
import { RunModal } from './RunModal';
import { Graph, GraphNode, NodeType, ValidationError } from '../../engine/types';
import { canConnectEdge, validateGraph } from '../../engine/graph';
import { validateGraphApi } from '../../api/flows';

interface WorkflowCanvasProps {
  initialGraph?: Graph;
  flowName: string;
  onFlowNameChange: (name: string) => void;
  onSaveFlow: (graph: Graph) => Promise<void>;
  onBack: () => void;
  onRunFlow?: (graph: Graph, payload: any) => Promise<void>;
  isSaving: boolean;
  isExecuting?: boolean;
}

// Starter template graph definitions
export const TEMPLATES: Record<string, Graph> = {
  linear: {
    nodes: [
      {
        id: 'node_trigger',
        type: 'trigger',
        name: 'Manual Trigger',
        config: { type: 'manual' },
        position: { x: 100, y: 220 },
      },
      {
        id: 'node_http',
        type: 'http',
        name: 'Fetch Order',
        config: {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/todos/1',
          timeout: 5000,
        },
        position: { x: 380, y: 220 },
      },
      {
        id: 'node_transform',
        type: 'transform',
        name: 'Format Receipt',
        config: {
          template: 'Order {{ node_trigger.orderId }} confirmed: {{ node_http.title }}',
        },
        position: { x: 680, y: 220 },
      },
      {
        id: 'node_output',
        type: 'output',
        name: 'Final Result',
        config: { key: 'orderReceipt' },
        position: { x: 980, y: 220 },
      },
    ],
    edges: [
      { id: 'e_trigger_http', source: 'node_trigger', target: 'node_http' },
      { id: 'e_http_transform', source: 'node_http', target: 'node_transform' },
      { id: 'e_transform_output', source: 'node_transform', target: 'node_output' },
    ],
  },
  diamond: {
    nodes: [
      {
        id: 'node_trigger',
        type: 'trigger',
        name: 'Order Webhook',
        config: { type: 'webhook' },
        position: { x: 80, y: 250 },
      },
      {
        id: 'node_inv',
        type: 'http',
        name: 'Check Inventory',
        config: { method: 'GET', url: 'https://api.example.com/inventory/check' },
        position: { x: 380, y: 120 },
      },
      {
        id: 'node_pay',
        type: 'http',
        name: 'Process Payment',
        config: { method: 'POST', url: 'https://api.example.com/pay' },
        position: { x: 380, y: 380 },
      },
      {
        id: 'node_merge',
        type: 'transform',
        name: 'Merge Status',
        config: { template: 'Inventory: {{ node_inv.status }} | Payment: {{ node_pay.status }}' },
        position: { x: 720, y: 250 },
      },
      {
        id: 'node_out',
        type: 'output',
        name: 'Order Confirmation',
        config: { key: 'orderOutput' },
        position: { x: 1020, y: 250 },
      },
    ],
    edges: [
      { id: 'e_trig_inv', source: 'node_trigger', target: 'node_inv' },
      { id: 'e_trig_pay', source: 'node_trigger', target: 'node_pay' },
      { id: 'e_inv_merge', source: 'node_inv', target: 'node_merge' },
      { id: 'e_pay_merge', source: 'node_pay', target: 'node_merge' },
      { id: 'e_merge_out', source: 'node_merge', target: 'node_out' },
    ],
  },
  delayed: {
    nodes: [
      {
        id: 'node_trigger',
        type: 'trigger',
        name: 'Cron Trigger',
        config: { type: 'cron', cron: '*/15 * * * *' },
        position: { x: 100, y: 220 },
      },
      {
        id: 'node_delay',
        type: 'delay',
        name: 'Wait 10 Seconds',
        config: { seconds: 10 },
        position: { x: 380, y: 220 },
      },
      {
        id: 'node_http',
        type: 'http',
        name: 'Notify Service',
        config: { method: 'POST', url: 'https://api.example.com/notify' },
        position: { x: 680, y: 220 },
      },
      {
        id: 'node_output',
        type: 'output',
        name: 'Notification Log',
        config: { key: 'notifyResult' },
        position: { x: 980, y: 220 },
      },
    ],
    edges: [
      { id: 'e_trig_del', source: 'node_trigger', target: 'node_delay' },
      { id: 'e_del_http', source: 'node_delay', target: 'node_http' },
      { id: 'e_http_out', source: 'node_http', target: 'node_output' },
    ],
  },
  empty: {
    nodes: [],
    edges: [],
  },
};

const WorkflowCanvasInner: React.FC<WorkflowCanvasProps> = ({
  initialGraph = TEMPLATES.linear,
  flowName,
  onFlowNameChange,
  onSaveFlow,
  onBack,
  onRunFlow,
  isSaving,
  isExecuting = false,
}) => {
  // Convert Graph to React Flow Node & Edge format
  const convertGraphToFlow = (graph: Graph) => {
    const flowNodes: Node[] = graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position || { x: 100, y: 100 },
      data: {
        name: n.name || n.type,
        config: n.config || {},
      },
    }));

    const flowEdges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: '#818cf8', strokeWidth: 2 },
    }));

    return { flowNodes, flowEdges };
  };

  const initial = convertGraphToFlow(initialGraph);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.flowEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: ValidationError[];
  } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, message: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Construct pure engine Graph from current canvas state
  const getCurrentGraph = useCallback((): Graph => {
    const engineNodes: GraphNode[] = nodes.map((n) => ({
      id: n.id,
      type: (n.type as NodeType) || 'trigger',
      name: (n.data?.name as string) || n.type,
      config: (n.data?.config as Record<string, any>) || {},
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    }));

    const engineEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    return { nodes: engineNodes, edges: engineEdges };
  }, [nodes, edges]);

  // Client-Side Edge Validation: Prevents cycles, self-loops, and invalid connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const graph = getCurrentGraph();
      const check = canConnectEdge(graph.nodes, graph.edges, params.source, params.target);

      if (!check.allowed) {
        // Flash prominent warning toast to user
        addToast(
          'warning',
          check.cycle ? 'Cycle Detected' : 'Connection Rejected',
          check.reason || 'Edge creation not allowed.'
        );
        return; // Edge rejected: do NOT add edge
      }

      // Valid connection: add edge with smooth animation
      const newEdge: Edge = {
        id: `e_${params.source}_${params.target}`,
        source: params.source,
        target: params.target,
        animated: true,
        style: { stroke: '#818cf8', strokeWidth: 2 },
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [getCurrentGraph, addToast, setEdges]
  );

  // Live validator for handle glow during user drag
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (!connection.source || !connection.target) return false;
      const graph = getCurrentGraph();
      const check = canConnectEdge(graph.nodes, graph.edges, connection.source, connection.target);
      return check.allowed;
    },
    [getCurrentGraph]
  );

  // Add a new node to canvas
  const handleAddNode = useCallback(
    (type: NodeType, positionOverride?: { x: number; y: number }) => {
      const id = `node_${type}_${Date.now().toString(36).substring(3, 7)}`;
      let position = positionOverride;

      if (!position) {
        // Place in a smart staggered position
        const count = nodes.length;
        position = { x: 120 + (count % 4) * 220, y: 150 + Math.floor(count / 4) * 160 };
      }

      // Default configs per type
      const defaultConfigs: Record<NodeType, Record<string, any>> = {
        trigger: { type: 'manual' },
        http: { method: 'GET', url: 'https://api.example.com/data', timeout: 5000 },
        transform: { template: 'Processed {{ trigger.id }}' },
        delay: { seconds: 5 },
        output: { key: `output_${type}` },
      };

      const defaultNames: Record<NodeType, string> = {
        trigger: 'Trigger Node',
        http: 'HTTP Request',
        transform: 'Transform Node',
        delay: 'Delay Timer',
        output: 'Output Sink',
      };

      const newNode: Node = {
        id,
        type,
        position,
        data: {
          name: defaultNames[type],
          config: defaultConfigs[type],
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
    },
    [nodes.length, setNodes]
  );

  // HTML5 Drag and drop from NodePalette onto canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      handleAddNode(type, position);
    },
    [screenToFlowPosition, handleAddNode]
  );

  // Inspector panel updates
  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<GraphNode>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                name: updates.name !== undefined ? updates.name : n.data?.name,
                config: updates.config !== undefined ? updates.config : n.data?.config,
              },
            };
          }
          return n;
        })
      );
    },
    [setNodes]
  );

  // Delete node and clean up its connected edges
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      addToast('info', 'Node Deleted', `Node "${nodeId}" was removed from the canvas.`);
    },
    [selectedNodeId, setNodes, setEdges, addToast]
  );

  // Template loader
  const handleLoadTemplate = useCallback(
    (templateKey: 'linear' | 'diamond' | 'delayed' | 'empty') => {
      const template = TEMPLATES[templateKey];
      if (!template) return;
      const { flowNodes, flowEdges } = convertGraphToFlow(template);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setSelectedNodeId(null);
      setValidationResult(null);
      setTimeout(() => fitView({ padding: 0.2 }), 50);
      addToast('info', 'Template Loaded', `Loaded preset: ${templateKey.toUpperCase()}`);
    },
    [setNodes, setEdges, fitView, addToast]
  );

  // Validate Graph (Local pure engine + Backend API check)
  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    const graph = getCurrentGraph();

    // 1. Run local client-side validation
    const localErrors = validateGraph(graph);

    // 2. Also check backend API if available
    let backendErrors: ValidationError[] = [];
    try {
      const apiRes = await validateGraphApi(graph);
      if (!apiRes.valid) {
        // filter out offline notification if client-side is fine
        backendErrors = apiRes.errors.filter((e) => e.code !== 'BACKEND_OFFLINE');
      }
    } catch {
      // API call failed, ignore backend error
    }

    // Combine unique errors
    const combined = [...localErrors];
    for (const be of backendErrors) {
      if (!combined.some((ce) => ce.code === be.code && ce.message === be.message)) {
        combined.push(be);
      }
    }

    setIsValidating(false);
    const valid = combined.length === 0;
    setValidationResult({ valid, errors: combined });

    if (valid) {
      addToast(
        'success',
        'Valid DAG',
        'Workflow graph has 0 cycles, valid node configurations, and passes all rules.'
      );
    } else {
      addToast(
        'error',
        'Validation Issues Detected',
        `Graph contains ${combined.length} issue(s). See banner above for details.`
      );
    }
  }, [getCurrentGraph, addToast]);

  // Save Flow
  const handleSave = useCallback(async () => {
    const graph = getCurrentGraph();
    const localErrors = validateGraph(graph);

    if (localErrors.length > 0) {
      setValidationResult({ valid: false, errors: localErrors });
      addToast(
        'error',
        'Cannot Save Invalid Workflow',
        'Fix validation errors before saving to PostgreSQL.'
      );
      return;
    }

    try {
      await onSaveFlow(graph);
      addToast('success', 'Workflow Saved', `"${flowName}" saved successfully.`);
      setValidationResult(null);
    } catch (err: any) {
      addToast('error', 'Save Failed', err.message || 'Could not save workflow to server.');
    }
  }, [getCurrentGraph, onSaveFlow, flowName, addToast]);

  const handleOpenRunModal = useCallback(() => {
    const graph = getCurrentGraph();
    const validationErrors = validateGraph(graph);
    if (validationErrors.length > 0) {
      setValidationResult({ valid: false, errors: validationErrors });
      addToast(
        'error',
        'Cannot Run Invalid Graph',
        'Please fix structural errors and cycles before running.'
      );
      return;
    }
    setIsRunModalOpen(true);
  }, [getCurrentGraph, addToast]);

  const handleExecuteRun = useCallback(
    async (payload: any) => {
      if (!onRunFlow) return;
      const graph = getCurrentGraph();
      try {
        await onRunFlow(graph, payload);
        setIsRunModalOpen(false);
      } catch (err: any) {
        addToast('error', 'Run Launch Failed', err.message || 'Failed to trigger run.');
      }
    },
    [onRunFlow, getCurrentGraph, addToast]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedGraphNode: GraphNode | null = selectedNode
    ? {
        id: selectedNode.id,
        type: (selectedNode.type as NodeType) || 'trigger',
        name: (selectedNode.data?.name as string) || selectedNode.type,
        config: (selectedNode.data?.config as Record<string, any>) || {},
      }
    : null;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Action Bar */}
      <CanvasActionBar
        flowName={flowName}
        onFlowNameChange={onFlowNameChange}
        onValidate={handleValidate}
        onSave={handleSave}
        onLoadTemplate={handleLoadTemplate}
        onBack={onBack}
        onRun={onRunFlow ? handleOpenRunModal : undefined}
        isSaving={isSaving}
        isValidating={isValidating}
        isExecuting={isExecuting}
        validationResult={validationResult}
        onDismissValidation={() => setValidationResult(null)}
      />

      {/* Main Canvas Area */}
      <div ref={reactFlowWrapper} className="relative flex-1 w-full h-full">
        {/* Node Palette */}
        <NodePalette onAddNode={handleAddNode} />

        {/* React Flow Viewport */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: '#818cf8', strokeWidth: 2 },
          }}
          className="bg-slate-950"
        >
          <Background color="#334155" gap={24} size={1.5} variant={BackgroundVariant.Dots} />
          <Controls className="!bg-slate-900 !border !border-slate-800 !rounded-xl !overflow-hidden [&>button]:!bg-slate-900 [&>button]:!border-slate-800 [&>button]:!text-slate-300 hover:[&>button]:!bg-slate-800" />
          <MiniMap
            nodeColor={(n) => {
              switch (n.type) {
                case 'trigger':
                  return '#10b981';
                case 'http':
                  return '#3b82f6';
                case 'transform':
                  return '#f59e0b';
                case 'delay':
                  return '#a855f7';
                case 'output':
                  return '#f43f5e';
                default:
                  return '#64748b';
              }
            }}
            maskColor="rgba(15, 23, 42, 0.75)"
            className="!bg-slate-900 !border !border-slate-800 !rounded-xl"
          />
        </ReactFlow>

        {/* Inspector Panel Slide-Over */}
        <InspectorPanel
          node={selectedGraphNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onClose={() => setSelectedNodeId(null)}
        />

        {/* Toast System */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* Run Modal */}
        <RunModal
          isOpen={isRunModalOpen}
          flowName={flowName}
          onClose={() => setIsRunModalOpen(false)}
          onRun={handleExecuteRun}
          isRunning={isExecuting}
        />
      </div>
    </div>
  );
};

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
