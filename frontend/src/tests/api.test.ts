import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchFlows,
  fetchFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  validateGraphApi,
} from '../api/flows';
import { Graph } from '../engine/types';

// Mock in-memory localStorage for Node.js test environment
const memoryStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => memoryStore[key] || null,
  setItem: (key: string, value: string) => {
    memoryStore[key] = value.toString();
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    for (const k in memoryStore) {
      delete memoryStore[k];
    }
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe('Client Flow API Layer', () => {
  const sampleGraph: Graph = {
    nodes: [
      { id: 't1', type: 'trigger', config: {} },
      { id: 'o1', type: 'output', config: { key: 'done' } },
    ],
    edges: [{ id: 'e1', source: 't1', target: 'o1' }],
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates and persists flow to localStorage fallback if backend is offline', async () => {
    // Mock fetch to simulate network error (backend server offline)
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const created = await createFlow({ name: 'Offline Flow', graph: sampleGraph });
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Offline Flow');
    expect(created.graph.nodes).toHaveLength(2);

    // Verify it is retrievable via fetchFlows
    const flows = await fetchFlows();
    expect(flows).toHaveLength(1);
    expect(flows[0].name).toBe('Offline Flow');

    // Verify it is retrievable via fetchFlow
    const single = await fetchFlow(created.id);
    expect(single.name).toBe('Offline Flow');
  });

  it('updates an existing flow in localStorage fallback', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const created = await createFlow({ name: 'Original Name', graph: sampleGraph });
    const updated = await updateFlow(created.id, {
      name: 'Updated Name',
      graph: sampleGraph,
    });

    expect(updated.name).toBe('Updated Name');

    const fetched = await fetchFlow(created.id);
    expect(fetched.name).toBe('Updated Name');
  });

  it('deletes a flow in localStorage fallback', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const created = await createFlow({ name: 'To Delete', graph: sampleGraph });
    expect(await fetchFlows()).toHaveLength(1);

    const result = await deleteFlow(created.id);
    expect(result.success).toBe(true);

    const remaining = await fetchFlows();
    expect(remaining).toHaveLength(0);
  });

  it('handles backend online responses correctly', async () => {
    const mockFlow = {
      id: 'server_flow_1',
      name: 'Server Flow',
      graph: sampleGraph,
      createdAt: '2026-10-22T00:00:00.000Z',
      updatedAt: '2026-10-22T00:00:00.000Z',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockFlow,
    } as Response);

    const result = await fetchFlow('server_flow_1');
    expect(result.id).toBe('server_flow_1');
    expect(result.name).toBe('Server Flow');
  });

  it('parses structured API validation errors (HTTP 422)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Graph contains cycles',
          details: [{ code: 'CYCLE_DETECTED', message: 'Cycle detected: A -> B -> A' }],
        },
      }),
    } as Response);

    await expect(
      createFlow({ name: 'Cyclic Flow', graph: sampleGraph })
    ).rejects.toThrow('Graph contains cycles');
  });

  it('returns structured validation result on validateGraphApi', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: true, errors: [] }),
    } as Response);

    const validation = await validateGraphApi(sampleGraph);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
