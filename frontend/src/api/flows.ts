import { Graph, ValidationError } from '../engine/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface FlowSummary {
  id: string;
  name: string;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Flow {
  id: string;
  name: string;
  graph: Graph;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationApiResponse {
  valid: boolean;
  errors: ValidationError[];
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: ValidationError[];

  constructor(message: string, status: number, code?: string, details?: ValidationError[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Local storage key for offline fallback persistence
const LOCAL_STORAGE_KEY = 'dormammu_local_flows';

function getStorage(): { getItem(key: string): string | null; setItem(key: string, value: string): void } | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // In restricted iframe or non-browser environments
  }
  return null;
}

function getLocalFlows(): Flow[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalFlows(flows: Flow[]): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flows));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return { success: true } as unknown as T;
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorObj = json?.error || {};
    const message =
      errorObj.message || json.message || `Request failed with status ${res.status}`;
    const code = errorObj.code || json.code;
    const details = errorObj.details || json.details || [];
    throw new ApiError(message, res.status, code, details);
  }

  return json as T;
}

/**
 * Fetch all saved flows.
 * Falls back to localStorage if backend is unreachable.
 */
export async function fetchFlows(): Promise<FlowSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/flows`, {
      headers: { credentials: 'omit' },
    });
    const data = await handleResponse<any[]>(res);
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      nodeCount: item.nodeCount ?? (item.graph?.nodes?.length || 0),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network / connection error: fallback to local storage
    console.warn('Backend API unreachable, loading from localStorage fallback');
    const local = getLocalFlows();
    return local.map((flow) => ({
      id: flow.id,
      name: flow.name,
      nodeCount: flow.graph?.nodes?.length || 0,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    }));
  }
}

/**
 * Fetch a single flow by ID with full graph payload.
 */
export async function fetchFlow(id: string): Promise<Flow> {
  try {
    const res = await fetch(`${API_BASE}/flows/${id}`);
    return await handleResponse<Flow>(res);
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 404) {
      throw err;
    }
    // Fallback to local storage
    const local = getLocalFlows();
    const found = local.find((f) => f.id === id);
    if (found) {
      return found;
    }
    throw new ApiError(`Flow with id "${id}" not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Create a new flow definition.
 */
export async function createFlow(data: { name: string; graph: Graph }): Promise<Flow> {
  try {
    const res = await fetch(`${API_BASE}/flows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleResponse<Flow>(res);
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network error: persist locally
    console.warn('Backend API unreachable, saving flow to localStorage');
    const local = getLocalFlows();
    const newFlow: Flow = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name,
      graph: data.graph,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    local.unshift(newFlow);
    saveLocalFlows(local);
    return newFlow;
  }
}

/**
 * Update an existing flow by ID.
 */
export async function updateFlow(
  id: string,
  data: { name: string; graph: Graph }
): Promise<Flow> {
  try {
    const res = await fetch(`${API_BASE}/flows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleResponse<Flow>(res);
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network error: update in local storage
    console.warn('Backend API unreachable, updating flow in localStorage');
    const local = getLocalFlows();
    const index = local.findIndex((f) => f.id === id);
    const updatedFlow: Flow = {
      id,
      name: data.name,
      graph: data.graph,
      createdAt: index >= 0 ? local[index].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      local[index] = updatedFlow;
    } else {
      local.unshift(updatedFlow);
    }
    saveLocalFlows(local);
    return updatedFlow;
  }
}

/**
 * Delete a flow by ID.
 */
export async function deleteFlow(id: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/flows/${id}`, {
      method: 'DELETE',
    });
    await handleResponse<{ success: boolean }>(res);
    // Also remove from local storage if present
    const local = getLocalFlows().filter((f) => f.id !== id);
    saveLocalFlows(local);
    return { success: true };
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network error: remove from local storage
    const local = getLocalFlows().filter((f) => f.id !== id);
    saveLocalFlows(local);
    return { success: true };
  }
}

/**
 * Dry-run validation of a graph payload via the backend endpoint.
 */
export async function validateGraphApi(graph: Graph): Promise<ValidationApiResponse> {
  try {
    const res = await fetch(`${API_BASE}/flows/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ graph }),
    });
    return await handleResponse<ValidationApiResponse>(res);
  } catch (err: any) {
    if (err instanceof ApiError) {
      return {
        valid: false,
        errors: err.details || [{ code: 'VALIDATION_ERROR', message: err.message }],
      };
    }
    // If backend is offline, return offline note
    return {
      valid: false,
      errors: [
        {
          code: 'BACKEND_OFFLINE',
          message: 'Backend server is not reachable on port 4000. Client-side validation only.',
        },
      ],
    };
  }
}
