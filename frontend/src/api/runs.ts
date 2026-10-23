import { Graph, NodeStatus } from '../engine/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type RunStatus = 'pending' | 'running' | 'success' | 'failed';

export interface LogLine {
  id: string;
  nodeRunId: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface NodeRunDetail {
  id: string;
  runId: string;
  nodeId: string;
  status: NodeStatus;
  attempt: number;
  input?: any;
  output?: any;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  logs?: LogLine[];
}

export interface RunSummary {
  id: string;
  flowId: string;
  flowName: string;
  status: RunStatus;
  triggerSource: string;
  startedAt: string;
  finishedAt?: string | null;
  durationMs: number;
  nodeCount: number;
  successCount: number;
  failedCount: number;
}

export interface RunDetail {
  id: string;
  flowId: string;
  flowName: string;
  flowGraph: Graph | null;
  status: RunStatus;
  triggerSource: string;
  payload?: any;
  startedAt: string;
  finishedAt?: string | null;
  durationMs: number;
  nodeRuns: NodeRunDetail[];
}

export interface TriggerRunResponse {
  runId: string;
  id: string;
  status: string;
}

/**
 * Fetch past workflow runs with optional filters for flowId and status.
 */
export async function fetchRuns(params?: {
  flowId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<RunSummary[]> {
  const query = new URLSearchParams();
  if (params?.flowId) query.set('flowId', params.flowId);
  if (params?.status) query.set('status', params.status);
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());

  const url = `${API_BASE}/runs${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch runs (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch a single run by UUID including full summary and all nodeRun records.
 */
export async function fetchRun(runId: string): Promise<RunDetail> {
  const res = await fetch(`${API_BASE}/runs/${runId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch run ${runId} (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch detailed record for an individual node run within a specific workflow run.
 */
export async function fetchNodeRun(runId: string, nodeId: string): Promise<NodeRunDetail> {
  const res = await fetch(`${API_BASE}/runs/${runId}/nodes/${nodeId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message ||
        `Failed to fetch nodeRun for node ${nodeId} in run ${runId} (HTTP ${res.status})`
    );
  }
  return await res.json();
}

/**
 * Trigger execution of a workflow with an optional JSON payload.
 */
export async function triggerRun(flowId: string, payload: any = {}): Promise<TriggerRunResponse> {
  const res = await fetch(`${API_BASE}/flows/${flowId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to trigger workflow run (HTTP ${res.status})`
    );
  }
  return await res.json();
}
