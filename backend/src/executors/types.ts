import { GraphNode } from '../engine/types';

export interface ExecutionContext {
  trigger: any;
  nodes: Record<string, { output: any }>;
}

export type NodeExecutor = (
  node: GraphNode,
  context: ExecutionContext
) => Promise<any>;
