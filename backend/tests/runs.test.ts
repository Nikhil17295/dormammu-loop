import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/api/app';
import { prisma } from '../src/lib/prisma';
import { createRun, waitForRun } from '../src/engine/runner';
import { Graph } from '../src/engine/types';

describe('Run History API Integration Tests (/runs)', () => {
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
  });

  const sampleGraph: Graph = {
    nodes: [
      { id: 'trig', type: 'trigger', name: 'Trigger', config: {} },
      { id: 'trans', type: 'transform', name: 'Transformer', config: { template: 'User {{ trigger.name }}' } },
      { id: 'out', type: 'output', name: 'Output', config: { key: 'result' } },
    ],
    edges: [
      { id: 'e1', source: 'trig', target: 'trans' },
      { id: 'e2', source: 'trans', target: 'out' },
    ],
  };

  it('GET /runs should return empty array when no runs exist', async () => {
    const res = await request(app).get('/runs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
    expect(res.headers['x-total-count']).toBe('0');
  });

  it('GET /runs should list runs sorted newest first', async () => {
    const flow = await prisma.flow.create({
      data: { name: 'Workflow A', graph: sampleGraph as any },
    });

    const run1 = await prisma.run.create({
      data: {
        flowId: flow.id,
        status: 'success',
        triggerSource: 'manual',
        startedAt: new Date(Date.now() - 5000),
        finishedAt: new Date(Date.now() - 4000),
      },
    });

    const run2 = await prisma.run.create({
      data: {
        flowId: flow.id,
        status: 'running',
        triggerSource: 'webhook',
        startedAt: new Date(Date.now()),
      },
    });

    const res = await request(app).get('/runs');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].id).toBe(run2.id); // newest first
    expect(res.body[0].flowName).toBe('Workflow A');
    expect(res.body[0].triggerSource).toBe('webhook');
    expect(res.body[0].status).toBe('running');
    expect(res.body[1].id).toBe(run1.id);
    expect(res.body[1].status).toBe('success');
    expect(res.body[1].durationMs).toBe(1000);
  });

  it('GET /runs should filter runs by flowId', async () => {
    const flow1 = await prisma.flow.create({
      data: { name: 'Workflow 1', graph: sampleGraph as any },
    });
    const flow2 = await prisma.flow.create({
      data: { name: 'Workflow 2', graph: sampleGraph as any },
    });

    await prisma.run.create({
      data: { flowId: flow1.id, status: 'success', triggerSource: 'manual' },
    });
    await prisma.run.create({
      data: { flowId: flow2.id, status: 'failed', triggerSource: 'cron' },
    });

    const res = await request(app).get(`/runs?flowId=${flow1.id}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].flowId).toBe(flow1.id);
    expect(res.body[0].flowName).toBe('Workflow 1');
  });

  it('GET /runs should filter runs by status', async () => {
    const flow = await prisma.flow.create({
      data: { name: 'Workflow Status', graph: sampleGraph as any },
    });

    await prisma.run.create({
      data: { flowId: flow.id, status: 'success', triggerSource: 'manual' },
    });
    await prisma.run.create({
      data: { flowId: flow.id, status: 'failed', triggerSource: 'manual' },
    });

    const res = await request(app).get('/runs?status=failed');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].status).toBe('failed');
  });

  it('GET /runs should support pagination with limit and offset', async () => {
    const flow = await prisma.flow.create({
      data: { name: 'Pagination Flow', graph: sampleGraph as any },
    });

    for (let i = 0; i < 5; i++) {
      await prisma.run.create({
        data: {
          flowId: flow.id,
          status: 'success',
          triggerSource: 'manual',
          startedAt: new Date(Date.now() + i * 1000),
        },
      });
    }

    const res = await request(app).get('/runs?limit=2&offset=1');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.headers['x-total-count']).toBe('5');
  });

  it('GET /runs should reject invalid query parameters with 400', async () => {
    const res = await request(app).get('/runs?status=invalid_status');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /runs/:id should return 404 for non-existent run', async () => {
    const nonExistentId = '11111111-1111-1111-1111-111111111111';
    const res = await request(app).get(`/runs/${nonExistentId}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /runs/:id should return complete run summary and nodeRuns', async () => {
    const flow = await prisma.flow.create({
      data: { name: 'Detail Flow', graph: sampleGraph as any },
    });

    const run = await prisma.run.create({
      data: {
        flowId: flow.id,
        status: 'success',
        triggerSource: 'manual',
        payload: { userId: 42 },
        startedAt: new Date(Date.now() - 2000),
        finishedAt: new Date(Date.now() - 500),
      },
    });

    const nodeRun = await prisma.nodeRun.create({
      data: {
        runId: run.id,
        nodeId: 'trig',
        status: 'success',
        attempt: 1,
        idempotencyKey: `${run.id}:trig`,
        startedAt: new Date(Date.now() - 1900),
        finishedAt: new Date(Date.now() - 1800),
        input: { trigger: { userId: 42 } },
        output: { userId: 42 },
      },
    });

    await prisma.logLine.create({
      data: {
        nodeRunId: nodeRun.id,
        level: 'info',
        message: 'Trigger node started',
        ts: new Date(),
      },
    });

    const res = await request(app).get(`/runs/${run.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(run.id);
    expect(res.body.flowName).toBe('Detail Flow');
    expect(res.body.flowGraph).toEqual(sampleGraph);
    expect(res.body.payload).toEqual({ userId: 42 });
    expect(res.body.durationMs).toBeGreaterThan(0);
    expect(res.body.nodeRuns.length).toBe(1);
    expect(res.body.nodeRuns[0].nodeId).toBe('trig');
    expect(res.body.nodeRuns[0].status).toBe('success');
    expect(res.body.nodeRuns[0].durationMs).toBe(100);
    expect(res.body.nodeRuns[0].logs.length).toBe(1);
    expect(res.body.nodeRuns[0].logs[0].message).toBe('Trigger node started');
  });

  it('GET /runs/:id/nodes/:nodeId should return specific node execution detail', async () => {
    const flow = await prisma.flow.create({
      data: { name: 'Node Detail Flow', graph: sampleGraph as any },
    });

    const run = await prisma.run.create({
      data: {
        flowId: flow.id,
        status: 'success',
        triggerSource: 'manual',
      },
    });

    const nodeRun = await prisma.nodeRun.create({
      data: {
        runId: run.id,
        nodeId: 'trans',
        status: 'success',
        attempt: 1,
        idempotencyKey: `${run.id}:trans`,
        input: { trig: { name: 'Alice' } },
        output: 'User Alice',
        startedAt: new Date(Date.now() - 1000),
        finishedAt: new Date(Date.now() - 950),
      },
    });

    await prisma.logLine.create({
      data: {
        nodeRunId: nodeRun.id,
        level: 'info',
        message: 'Transform evaluated successfully',
      },
    });

    const res = await request(app).get(`/runs/${run.id}/nodes/trans`);
    expect(res.status).toBe(200);
    expect(res.body.nodeId).toBe('trans');
    expect(res.body.status).toBe('success');
    expect(res.body.output).toBe('User Alice');
    expect(res.body.durationMs).toBe(50);
    expect(res.body.logs.length).toBe(1);
    expect(res.body.logs[0].level).toBe('info');
  });

  it('GET /runs/:id/nodes/:nodeId should return 404 if nodeRun not found', async () => {
    const flow = await prisma.flow.create({
      data: { name: '404 Flow', graph: sampleGraph as any },
    });
    const run = await prisma.run.create({
      data: { flowId: flow.id, status: 'running', triggerSource: 'manual' },
    });

    const res = await request(app).get(`/runs/${run.id}/nodes/missing_node`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('End-to-End: POST /flows/:id/run triggers runner and runs API exposes the completed run', async () => {
    const flow = await prisma.flow.create({
      data: {
        name: 'End to End Workflow',
        graph: sampleGraph as any,
      },
    });

    // Trigger run via API
    const triggerRes = await request(app)
      .post(`/flows/${flow.id}/run`)
      .send({ name: 'Bob' });

    expect(triggerRes.status).toBe(202);
    const runId = triggerRes.body.runId;
    expect(runId).toBeDefined();

    // Await background execution
    const finishedRun = await waitForRun(runId, 5000);
    expect(finishedRun.status).toBe('success');

    // Verify GET /runs includes it
    const listRes = await request(app).get('/runs');
    expect(listRes.status).toBe(200);
    const listed = listRes.body.find((r: any) => r.id === runId);
    expect(listed).toBeDefined();
    expect(listed.status).toBe('success');
    expect(listed.flowName).toBe('End to End Workflow');
    expect(listed.nodeCount).toBe(3);
    expect(listed.successCount).toBe(3);

    // Verify GET /runs/:id
    const detailRes = await request(app).get(`/runs/${runId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.status).toBe('success');
    expect(detailRes.body.nodeRuns.length).toBe(3);
    for (const nr of detailRes.body.nodeRuns) {
      expect(nr.status).toBe('success');
      expect(nr.logs.length).toBeGreaterThan(0);
    }

    // Verify GET /runs/:id/nodes/trans has transformed output
    const nodeRes = await request(app).get(`/runs/${runId}/nodes/trans`);
    expect(nodeRes.status).toBe(200);
    expect(nodeRes.body.status).toBe('success');
    expect(nodeRes.body.output).toBe('User Bob');
  });
});
