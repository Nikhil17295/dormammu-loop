import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchRuns, fetchRun, fetchNodeRun, triggerRun } from '../api/runs';

describe('Frontend Runs API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchRuns should request /runs and parse response array', async () => {
    const mockRuns = [
      {
        id: 'run-1',
        flowId: 'flow-1',
        flowName: 'Test Flow',
        status: 'success',
        triggerSource: 'manual',
        startedAt: new Date().toISOString(),
        durationMs: 120,
        nodeCount: 3,
        successCount: 3,
        failedCount: 0,
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRuns,
    } as any);

    const result = await fetchRuns({ status: 'success' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('run-1');
    expect(result[0].status).toBe('success');
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:4000/runs?status=success');
  });

  it('fetchRun should request /runs/:id and return full run detail', async () => {
    const mockDetail = {
      id: 'run-123',
      flowId: 'flow-456',
      flowName: 'Order Flow',
      flowGraph: { nodes: [], edges: [] },
      status: 'success',
      triggerSource: 'webhook',
      startedAt: new Date().toISOString(),
      durationMs: 340,
      nodeRuns: [
        {
          id: 'nr-1',
          runId: 'run-123',
          nodeId: 'trigger_node',
          status: 'success',
          attempt: 1,
          output: { orderId: 99 },
          logs: [],
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDetail,
    } as any);

    const result = await fetchRun('run-123');
    expect(result.id).toBe('run-123');
    expect(result.flowName).toBe('Order Flow');
    expect(result.nodeRuns).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:4000/runs/run-123');
  });

  it('fetchNodeRun should request /runs/:id/nodes/:nodeId', async () => {
    const mockNodeRun = {
      id: 'nr-99',
      runId: 'run-123',
      nodeId: 'http_step',
      status: 'failed',
      attempt: 1,
      error: 'HTTP 500 Internal Server Error',
      logs: [
        { id: 'l1', nodeRunId: 'nr-99', level: 'error', message: 'Request failed', ts: new Date().toISOString() },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockNodeRun,
    } as any);

    const result = await fetchNodeRun('run-123', 'http_step');
    expect(result.id).toBe('nr-99');
    expect(result.status).toBe('failed');
    expect(result.error).toBe('HTTP 500 Internal Server Error');
    expect(result.logs).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:4000/runs/run-123/nodes/http_step');
  });

  it('triggerRun should send POST to /flows/:flowId/run with payload', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ runId: 'new-run-id', id: 'new-run-id', status: 'pending' }),
    } as any);

    const result = await triggerRun('flow-abc', { orderId: 1001 });
    expect(result.runId).toBe('new-run-id');
    expect(result.status).toBe('pending');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/flows/flow-abc/run',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 1001 }),
      })
    );
  });

  it('triggerRun should throw descriptive error on API failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: { message: 'Workflow graph contains cycles' },
      }),
    } as any);

    await expect(triggerRun('flow-abc')).rejects.toThrow('Workflow graph contains cycles');
  });
});
