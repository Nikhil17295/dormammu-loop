// Typed API client functions for Flow persistence and validation

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export type NodeType = "trigger" | "transform" | "http" | "delay" | "output";

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

export interface FlowSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
}

export interface FlowRecord {
  id: string;
  name: string;
  graph: Graph;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  code: string;
  message: string;
  nodeIds?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface CreateFlowData {
  name: string;
  graph: Graph;
}

export interface UpdateFlowData {
  name?: string;
  graph?: Graph;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any[];
  };
}

/**
 * Fetch all saved workflows (summaries with nodeCount).
 */
export async function fetchFlows(): Promise<FlowSummary[]> {
  const res = await fetch(`${API_BASE}/flows`);
  if (!res.ok) {
    const errorBody: ApiErrorResponse = await res.json().catch(() => null);
    throw new Error(
      errorBody?.error?.message || `Failed to fetch flows (HTTP ${res.status})`
    );
  }
  return res.json();
}

/**
 * Fetch a single workflow definition by ID (including full graph).
 */
export async function fetchFlow(id: string): Promise<FlowRecord> {
  const res = await fetch(`${API_BASE}/flows/${id}`);
  if (!res.ok) {
    const errorBody: ApiErrorResponse = await res.json().catch(() => null);
    throw new Error(
      errorBody?.error?.message || `Failed to fetch flow ${id} (HTTP ${res.status})`
    );
  }
  return res.json();
}

/**
 * Create and persist a new workflow.
 */
export async function createFlow(data: CreateFlowData): Promise<FlowRecord> {
  const res = await fetch(`${API_BASE}/flows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorBody: ApiErrorResponse = await res.json().catch(() => null);
    const err = new Error(
      errorBody?.error?.message || `Failed to create flow (HTTP ${res.status})`
    ) as Error & { details?: any[]; code?: string };
    err.details = errorBody?.error?.details;
    err.code = errorBody?.error?.code;
    throw err;
  }
  return res.json();
}

/**
 * Update an existing workflow name and/or graph.
 */
export async function updateFlow(
  id: string,
  data: UpdateFlowData
): Promise<FlowRecord> {
  const res = await fetch(`${API_BASE}/flows/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorBody: ApiErrorResponse = await res.json().catch(() => null);
    const err = new Error(
      errorBody?.error?.message || `Failed to update flow ${id} (HTTP ${res.status})`
    ) as Error & { details?: any[]; code?: string };
    err.details = errorBody?.error?.details;
    err.code = errorBody?.error?.code;
    throw err;
  }
  return res.json();
}

/**
 * Delete a workflow by ID.
 */
export async function deleteFlow(
  id: string
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/flows/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorBody: ApiErrorResponse = await res.json().catch(() => null);
    throw new Error(
      errorBody?.error?.message || `Failed to delete flow ${id} (HTTP ${res.status})`
    );
  }
  return res.json();
}

/**
 * Standalone dry-run graph validation (does not write to database).
 */
export async function validateGraphApi(graph: Graph): Promise<ValidationResult> {
  const res = await fetch(`${API_BASE}/flows/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graph }),
  });

  if (!res.ok) {
    const errorBody: ApiErrorResponse = await res.json().catch(() => null);
    throw new Error(
      errorBody?.error?.message ||
        `Failed to validate graph (HTTP ${res.status})`
    );
  }
  return res.json();
}
