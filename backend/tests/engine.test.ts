import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/api/app';
import { prisma } from '../src/lib/prisma';
import { createRun, executeRun, waitForRun } from '../src/engine/runner';
import { Graph } from '../src/engine/types';

describe('In-Process DAG Execution Engine (Phase 4)', () => {
  // Clean up database tables before each test
  beforeEach(async () => {
    await prisma.logLine.deleteMany();
    await prisma.nodeRun.deleteMany();
    await prisma.run.deleteMany();
    await prisma.flow.deleteMany();
  });

  afterEach(async () => {
    await prisma.logLine.deleteMany();
    await prisma.nodeRun.deleteMany();
    await prisma.run.deleteMany();
    await prisma.flow.deleteMany();
    vi.restoreAllMocks();
  });

  it('createRun should initialize Run and NodeRun records with status pending', async () => {
    const graph: Graph = {
      nodes: [
        { id: 'node-trig', type: 'trigger', config: {} },
        { id: 'node-out', type: 'output', config: { key: 'done' } },
      ],
      edges: [{ id: 'e1', source: 'node-trig', target: 'node-out' }],
    };

    const flow = await prisma.flow.create({
      data: {
        name: 'Initialization Test Flow',
        graph: graph as any,
      },
    });

    const run = await createRun(flow.id, { test: 123 }, 'manual');

    expect(run).toBeDefined();
    expect(run.flowId).toBe(flow.id);
    expect(run.status).toBe('pending');
    expect(run.triggerSource).toBe('manual');

    const nodeRuns = await prisma.nodeRun.findMany({
      where: { runId: run.id },
      orderBy: { nodeId: 'asc' },
    });

    expect(nodeRuns.length).toBe(2);
    expect(nodeRuns[0].nodeId).toBe('node-out');
    expect(nodeRuns[0].idempotencyKey).toBe(`${run.id}:node-out`);
    expect(nodeRuns[1].nodeId).toBe('node-trig');
    expect(nodeRuns[1].idempotencyKey).toBe(`${run.id}:node-trig`);

    // Await background completion before cleanup
    await waitForRun(run.id);
  });

  it('should execute a linear DAG flow in exact topological order and record logs', async () => {
    const graph: Graph = {
      nodes: [
        { id: 'step-1-trig', type: 'trigger', config: {} },
        {
          id: 'step-2-tx',
          type: 'transform',
          config: {
            mapping: {
              greeting: 'Hello, {{ trigger.customer.name }}!',
              tier: '{{ trigger.customer.tier }}',
            },
          },
        },
        {
          id: 'step-3-out',
          type: 'output',
          config: {
            value: {
              result: '{{ nodes.step-2-tx.output.greeting }}',
              customerTier: '{{ nodes.step-2-tx.output.tier }}',
            },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'step-1-trig', target: 'step-2-tx' },
        { id: 'e2', source: 'step-2-tx', target: 'step-3-out' },
      ],
    };

    const flow = await prisma.flow.create({
      data: {
        name: 'Linear Execution Flow',
        graph: graph as any,
      },
    });

    const run = await prisma.run.create({
      data: {
        flowId: flow.id,
        status: 'pending',
        triggerSource: 'manual',
        payload: { customer: { name: 'Doctor Strange', tier: 'Sorcerer Supreme' } },
      },
    });

    await prisma.nodeRun.createMany({
      data: graph.nodes.map((n) => ({
        runId: run.id,
        nodeId: n.id,
        status: 'pending',
        attempt: 0,
        idempotencyKey: `${run.id}:${n.id}`,
      })),
    });

    // Execute run synchronously to test
    await executeRun(run.id);

    const updatedRun = await prisma.run.findUnique({
      where: { id: run.id },
    });
    expect(updatedRun?.status).toBe('success');
    expect(updatedRun?.finishedAt).not.toBeNull();

    const nodeRuns = await prisma.nodeRun.findMany({
      where: { runId: run.id },
      include: { logs: true },
    });

    const nodeMap = new Map(nodeRuns.map((nr) => [nr.nodeId, nr]));

    // Step 1: Trigger
    const nrTrig = nodeMap.get('step-1-trig')!;
    expect(nrTrig.status).toBe('success');
    expect(nrTrig.output).toEqual({
      customer: { name: 'Doctor Strange', tier: 'Sorcerer Supreme' },
    });
    expect(nrTrig.logs.length).toBeGreaterThanOrEqual(2);

    // Step 2: Transform
    const nrTx = nodeMap.get('step-2-tx')!;
    expect(nrTx.status).toBe('success');
    expect(nrTx.output).toEqual({
      greeting: 'Hello, Doctor Strange!',
      tier: 'Sorcerer Supreme',
    });

    // Step 3: Output
    const nrOut = nodeMap.get('step-3-out')!;
    expect(nrOut.status).toBe('success');
    expect(nrOut.output).toEqual({
      result: 'Hello, Doctor Strange!',
      customerTier: 'Sorcerer Supreme',
    });
  });

  it('should execute parallel branches concurrently in a diamond DAG', async () => {
    // Diamond structure:
    //      trig
    //     /    \
    // branchA  branchB
    //     \    /
    //      join
    const graph: Graph = {
      nodes: [
        { id: 'trig', type: 'trigger', config: {} },
        {
          id: 'branchA',
          type: 'transform',
          config: {
            mapping: {
              branch: 'A',
              valA: '{{ trigger.base }} + 10',
            },
          },
        },
        {
          id: 'branchB',
          type: 'transform',
          config: {
            mapping: {
              branch: 'B',
              valB: '{{ trigger.base }} + 20',
            },
          },
        },
        {
          id: 'join',
          type: 'output',
          config: {
            value: {
              fromA: '{{ nodes.branchA.output.branch }}',
              fromB: '{{ nodes.branchB.output.branch }}',
            },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trig', target: 'branchA' },
        { id: 'e2', source: 'trig', target: 'branchB' },
        { id: 'e3', source: 'branchA', target: 'join' },
        { id: 'e4', source: 'branchB', target: 'join' },
      ],
    };

    const flow = await prisma.flow.create({
      data: {
        name: 'Diamond Parallel Flow',
        graph: graph as any,
      },
    });

    const run = await createRun(flow.id, { base: 100 }, 'manual');

    // Wait for the in-process execution to finish
    await executeRun(run.id);

    const updatedRun = await prisma.run.findUnique({
      where: { id: run.id },
    });
    expect(updatedRun?.status).toBe('success');

    const nodeRuns = await prisma.nodeRun.findMany({
      where: { runId: run.id },
    });
    const map = new Map(nodeRuns.map((nr) => [nr.nodeId, nr]));

    expect(map.get('trig')?.status).toBe('success');
    expect(map.get('branchA')?.status).toBe('success');
    expect(map.get('branchB')?.status).toBe('success');
    expect(map.get('join')?.status).toBe('success');
    expect(map.get('join')?.output).toEqual({
      fromA: 'A',
      fromB: 'B',
    });
  });

  it('should skip descendants of a failed node while independent branches continue executing', async () => {
    // Topology:
    //      trig
    //     /    \
    // failNode  healthyNode
    //    |          |
    // childFail  healthyOut
    const graph: Graph = {
      nodes: [
        { id: 'trig', type: 'trigger', config: {} },
        {
          id: 'failNode',
          type: 'http',
          config: {
            url: 'https://api.example.com/fail-endpoint',
          },
        },
        {
          id: 'childFail',
          type: 'transform',
          config: {
            mapping: { msg: 'This should be skipped' },
          },
        },
        {
          id: 'healthyNode',
          type: 'transform',
          config: {
            mapping: { msg: 'Healthy branch processed' },
          },
        },
        {
          id: 'healthyOut',
          type: 'output',
          config: {
            value: { status: '{{ nodes.healthyNode.output.msg }}' },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trig', target: 'failNode' },
        { id: 'e2', source: 'failNode', target: 'childFail' },
        { id: 'e3', source: 'trig', target: 'healthyNode' },
        { id: 'e4', source: 'healthyNode', target: 'healthyOut' },
      ],
    };

    // Mock fetch to fail for failNode
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('fail-endpoint')) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ error: 'Simulated downstream server explosion' }),
          text: async () => 'Simulated downstream server explosion',
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ status: 'ok' }),
        text: async () => '{"status":"ok"}',
      };
    });

    const flow = await prisma.flow.create({
      data: {
        name: 'Cascading Skip Flow',
        graph: graph as any,
      },
    });

    const run = await createRun(flow.id, {}, 'manual');
    await executeRun(run.id);

    const updatedRun = await prisma.run.findUnique({
      where: { id: run.id },
    });
    // Overall run failed because failNode failed
    expect(updatedRun?.status).toBe('failed');

    const nodeRuns = await prisma.nodeRun.findMany({
      where: { runId: run.id },
    });
    const map = new Map(nodeRuns.map((nr) => [nr.nodeId, nr]));

    // Root succeeded
    expect(map.get('trig')?.status).toBe('success');

    // Failing node failed
    expect(map.get('failNode')?.status).toBe('failed');
    expect(map.get('failNode')?.error).toMatch(/500/);

    // Downstream child was skipped
    expect(map.get('childFail')?.status).toBe('skipped');
    expect(map.get('childFail')?.error).toMatch(/upstream failure/i);

    // Independent branch succeeded completely
    expect(map.get('healthyNode')?.status).toBe('success');
    expect(map.get('healthyOut')?.status).toBe('success');
    expect(map.get('healthyOut')?.output).toEqual({
      status: 'Healthy branch processed',
    });
  });

  it('should redact sensitive keys in stored node run inputs and logs', async () => {
    const graph: Graph = {
      nodes: [
        { id: 'trig', type: 'trigger', config: {} },
        {
          id: 'consumer',
          type: 'transform',
          config: {
            mapping: { receivedUser: '{{ trigger.user }}' },
          },
        },
      ],
      edges: [{ id: 'e1', source: 'trig', target: 'consumer' }],
    };

    const flow = await prisma.flow.create({
      data: {
        name: 'Redaction Test Flow',
        graph: graph as any,
      },
    });

    const sensitivePayload = {
      user: 'admin',
      password: 'super-secret-password-123',
      authorization: 'Bearer secret-jwt-token',
    };

    const run = await createRun(flow.id, sensitivePayload, 'manual');
    await executeRun(run.id);

    const consumerNodeRun = await prisma.nodeRun.findFirst({
      where: { runId: run.id, nodeId: 'consumer' },
    });

    expect(consumerNodeRun).toBeDefined();
    const storedInput = consumerNodeRun?.input as any;

    expect(storedInput.trigger.user).toBe('admin');
    expect(storedInput.trigger.password).toBe('[REDACTED]');
    expect(storedInput.trigger.authorization).toBe('[REDACTED]');
  });

  describe('Execution Trigger API (POST /flows/:id/run)', () => {
    it('should return HTTP 202 and runId when initiating a valid workflow', async () => {
      const graph: Graph = {
        nodes: [
          { id: 't1', type: 'trigger', config: {} },
          { id: 'o1', type: 'output', config: { key: 'done' } },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'o1' }],
      };

      const flow = await prisma.flow.create({
        data: {
          name: 'API Run Flow',
          graph: graph as any,
        },
      });

      const response = await request(app)
        .post(`/flows/${flow.id}/run`)
        .send({ customKey: 'customValue' });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('runId');
      expect(response.body.status).toBe('pending');

      const runInDb = await prisma.run.findUnique({
        where: { id: response.body.runId },
      });
      expect(runInDb).toBeDefined();
      expect(runInDb?.flowId).toBe(flow.id);

      await waitForRun(response.body.runId);
    });

    it('should return HTTP 404 if flow does not exist', async () => {
      const response = await request(app)
        .post('/flows/00000000-0000-0000-0000-000000000000/run')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return HTTP 422 if workflow graph is invalid (e.g. contains cycles)', async () => {
      const cyclicGraph: Graph = {
        nodes: [
          { id: 'a', type: 'transform', config: { template: 'loop' } },
          { id: 'b', type: 'transform', config: { template: 'loop' } },
        ],
        edges: [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'b', target: 'a' },
        ],
      };

      // Force insert invalid graph in DB directly
      const flow = await prisma.flow.create({
        data: {
          name: 'Cyclic Flow in DB',
          graph: cyclicGraph as any,
        },
      });

      const response = await request(app)
        .post(`/flows/${flow.id}/run`)
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('INVALID_GRAPH');
    });
  });
});
