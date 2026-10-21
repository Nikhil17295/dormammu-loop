export type NodeType = 'trigger' | 'transform' | 'http' | 'delay' | 'output';

export type NodeStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'retrying'
  | 'skipped'
  | 'dead';

export interface GraphNode {
  id: string;
  type: NodeType;
  name?: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ValidationError {
  code: string;
  message: string;
  nodeIds?: string[];
}

export interface TopologicalSortResult {
  order: string[];
  hasCycle: boolean;
}
