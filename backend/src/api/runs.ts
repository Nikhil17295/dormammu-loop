import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { runQuerySchema } from './schemas';

export const runsRouter = Router();

/**
 * GET /runs
 * List past workflow runs with query parameters (flowId, status, limit, offset),
 * sorted newest first by startedAt desc.
 */
runsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const parsedQuery = runQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters for runs list',
          details: parsedQuery.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const { flowId, status, limit, offset } = parsedQuery.data;

    const where: any = {};
    if (flowId) {
      where.flowId = flowId;
    }
    if (status) {
      where.status = status;
    }

    const [runs, totalCount] = await Promise.all([
      prisma.run.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          flow: {
            select: {
              id: true,
              name: true,
            },
          },
          nodeRuns: {
            select: {
              id: true,
              nodeId: true,
              status: true,
              startedAt: true,
              finishedAt: true,
            },
          },
        },
      }),
      prisma.run.count({ where }),
    ]);

    const runSummaries = runs.map((run) => {
      const startedAtTime = new Date(run.startedAt).getTime();
      const finishedAtTime = run.finishedAt ? new Date(run.finishedAt).getTime() : null;
      const durationMs = finishedAtTime
        ? Math.max(0, finishedAtTime - startedAtTime)
        : Math.max(0, Date.now() - startedAtTime);

      const nodeRuns = run.nodeRuns || [];
      const nodeCount = nodeRuns.length;
      const successCount = nodeRuns.filter((nr) => nr.status === 'success').length;
      const failedCount = nodeRuns.filter((nr) => nr.status === 'failed').length;

      return {
        id: run.id,
        flowId: run.flowId,
        flowName: run.flow?.name || 'Unknown Workflow',
        status: run.status,
        triggerSource: run.triggerSource,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        durationMs,
        nodeCount,
        successCount,
        failedCount,
      };
    });

    res.setHeader('X-Total-Count', totalCount.toString());
    return res.status(200).json(runSummaries);
  } catch (err) {
    console.error('Error fetching runs:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve workflow runs',
      },
    });
  }
});

/**
 * GET /runs/:id
 * Returns full run summary, overall duration, flow graph definition, and array
 * of all NodeRun records with their statuses and execution times.
 */
runsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const run = await prisma.run.findUnique({
      where: { id: req.params.id },
      include: {
        flow: {
          select: {
            id: true,
            name: true,
            graph: true,
          },
        },
        nodeRuns: {
          orderBy: { startedAt: 'asc' },
          include: {
            logs: {
              orderBy: { ts: 'asc' },
            },
          },
        },
      },
    });

    if (!run) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Run with id "${req.params.id}" not found`,
        },
      });
    }

    const startedAtTime = new Date(run.startedAt).getTime();
    const finishedAtTime = run.finishedAt ? new Date(run.finishedAt).getTime() : null;
    const durationMs = finishedAtTime
      ? Math.max(0, finishedAtTime - startedAtTime)
      : Math.max(0, Date.now() - startedAtTime);

    const formattedNodeRuns = run.nodeRuns.map((nr) => {
      const nrStart = nr.startedAt ? new Date(nr.startedAt).getTime() : null;
      const nrFinish = nr.finishedAt ? new Date(nr.finishedAt).getTime() : null;
      const nrDurationMs =
        nrStart && nrFinish
          ? Math.max(0, nrFinish - nrStart)
          : nrStart
          ? Math.max(0, Date.now() - nrStart)
          : null;

      return {
        id: nr.id,
        runId: nr.runId,
        nodeId: nr.nodeId,
        status: nr.status,
        attempt: nr.attempt,
        input: nr.input,
        output: nr.output,
        error: nr.error,
        startedAt: nr.startedAt,
        finishedAt: nr.finishedAt,
        durationMs: nrDurationMs,
        logs: nr.logs,
      };
    });

    return res.status(200).json({
      id: run.id,
      flowId: run.flowId,
      flowName: run.flow?.name || 'Unknown Workflow',
      flowGraph: run.flow?.graph || null,
      status: run.status,
      triggerSource: run.triggerSource,
      payload: run.payload,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      durationMs,
      nodeRuns: formattedNodeRuns,
    });
  } catch (err) {
    console.error(`Error fetching run ${req.params.id}:`, err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve workflow run detail',
      },
    });
  }
});

/**
 * GET /runs/:id/nodes/:nodeId
 * Detailed record for a specific node execution: input JSON, output JSON, error message,
 * duration, and all associated LogLine records.
 */
runsRouter.get('/:id/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const nodeRun = await prisma.nodeRun.findFirst({
      where: {
        runId: req.params.id,
        nodeId: req.params.nodeId,
      },
      include: {
        logs: {
          orderBy: { ts: 'asc' },
        },
      },
    });

    if (!nodeRun) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `NodeRun for node "${req.params.nodeId}" in run "${req.params.id}" not found`,
        },
      });
    }

    const nrStart = nodeRun.startedAt ? new Date(nodeRun.startedAt).getTime() : null;
    const nrFinish = nodeRun.finishedAt ? new Date(nodeRun.finishedAt).getTime() : null;
    const durationMs =
      nrStart && nrFinish
        ? Math.max(0, nrFinish - nrStart)
        : nrStart
        ? Math.max(0, Date.now() - nrStart)
        : null;

    return res.status(200).json({
      id: nodeRun.id,
      runId: nodeRun.runId,
      nodeId: nodeRun.nodeId,
      status: nodeRun.status,
      attempt: nodeRun.attempt,
      input: nodeRun.input,
      output: nodeRun.output,
      error: nodeRun.error,
      startedAt: nodeRun.startedAt,
      finishedAt: nodeRun.finishedAt,
      durationMs,
      logs: nodeRun.logs,
    });
  } catch (err) {
    console.error(
      `Error fetching nodeRun for run ${req.params.id} node ${req.params.nodeId}:`,
      err
    );
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve node execution details',
      },
    });
  }
});
