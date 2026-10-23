import { prisma } from '../lib/prisma';
import { Graph, NodeStatus } from './types';
import { readyNodes, descendantsOf } from './graph';
import { getExecutor } from '../executors';
import { ExecutionContext } from '../executors/types';
import { maskSensitiveData } from '../executors/masking';

/**
 * Creates a new Run record in PostgreSQL, initializes all pending NodeRuns,
 * and launches background in-process execution.
 *
 * @param flowId The UUID of the workflow to run.
 * @param payload Optional input payload (e.g. from manual trigger or webhook).
 * @param triggerSource "manual" | "webhook" | "cron"
 * @returns The newly created Run record with status 'pending'.
 */
export async function createRun(
  flowId: string,
  payload: any = {},
  triggerSource: string = 'manual'
) {
  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
  });

  if (!flow) {
    throw new Error(`Flow with id "${flowId}" not found`);
  }

  const graph = flow.graph as unknown as Graph;
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];

  const run = await prisma.run.create({
    data: {
      flowId: flow.id,
      status: 'pending',
      triggerSource,
      payload: payload ?? {},
      startedAt: new Date(),
    },
  });

  if (nodes.length > 0) {
    await prisma.nodeRun.createMany({
      data: nodes.map((node) => ({
        runId: run.id,
        nodeId: node.id,
        status: 'pending',
        attempt: 0,
        idempotencyKey: `${run.id}:${node.id}`,
      })),
    });
  }

  // Trigger execution asynchronously in the background
  void executeRun(run.id).catch((err) => {
    if (err?.code !== 'P2025') {
      console.error(`Unhandled background error executing run ${run.id}:`, err);
    }
  });

  return run;
}

/**
 * Helper to await completion of a background run until terminal status is reached.
 */
export async function waitForRun(runId: string, timeoutMs = 5000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const run = await prisma.run.findUnique({ where: { id: runId } });
    if (!run || run.status === 'success' || run.status === 'failed') {
      return run;
    }
    await new Promise((res) => setTimeout(res, 50));
  }
  return await prisma.run.findUnique({ where: { id: runId } });
}

/**
 * Writes an execution log entry to the LogLine table.
 */
async function recordLog(
  nodeRunId: string,
  level: 'info' | 'warn' | 'error',
  message: string
): Promise<void> {
  try {
    await prisma.logLine.create({
      data: {
        nodeRunId,
        level,
        message: message.slice(0, 5000),
        ts: new Date(),
      },
    });
  } catch (err: any) {
    if (err?.code !== 'P2025') {
      console.error(`Failed to record log line for nodeRun ${nodeRunId}:`, err);
    }
  }
}

/**
 * In-Process DAG Execution Engine
 *
 * Traverses workflow nodes in topological order with async concurrency for
 * parallel branches. Automatically performs cascading skips for descendants
 * of failed nodes and persists node outputs and status changes to PostgreSQL.
 *
 * @param runId The UUID of the Run to execute.
 */
export async function executeRun(runId: string): Promise<void> {
  try {
    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: { flow: true },
    });

    if (!run) {
      return;
    }

    // Mark Run as running
    await prisma.run.update({
      where: { id: runId },
      data: { status: 'running' },
    });

    const graph = run.flow.graph as unknown as Graph;
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];

    // If graph has no nodes, finish immediately as success
    if (nodes.length === 0) {
      await prisma.run.update({
        where: { id: runId },
        data: {
          status: 'success',
          finishedAt: new Date(),
        },
      });
      return;
    }

    // Maintain in-memory execution context across steps
    const context: ExecutionContext = {
      trigger: run.payload ?? {},
      nodes: {},
    };

    // Query initialized node runs for this run
    const allNodeRuns = await prisma.nodeRun.findMany({
      where: { runId },
    });
    const nodeRunMap = new Map(allNodeRuns.map((nr) => [nr.nodeId, nr]));
    const statusByNodeId: Record<string, NodeStatus> = {};

    for (const nr of allNodeRuns) {
      statusByNodeId[nr.nodeId] = nr.status as NodeStatus;
      if (nr.status === 'success' && nr.output !== null) {
        context.nodes[nr.nodeId] = { output: nr.output };
      }
    }

    // Execution loop: resolve ready nodes until none remain pending or running
    while (true) {
      const ready = readyNodes(graph, statusByNodeId);

      if (ready.length === 0) {
        // Check for any remaining pending nodes that cannot be reached
        const pendingNodes = Object.entries(statusByNodeId).filter(
          ([_, st]) => st === 'pending'
        );

        if (pendingNodes.length > 0) {
          for (const [nodeId] of pendingNodes) {
            statusByNodeId[nodeId] = 'skipped';
            const nr = nodeRunMap.get(nodeId);
            if (nr) {
              await prisma.nodeRun.update({
                where: { id: nr.id },
                data: {
                  status: 'skipped',
                  error: 'Skipped: Upstream dependencies failed or were unreachable',
                  finishedAt: new Date(),
                },
              });
              await recordLog(
                nr.id,
                'warn',
                `Node "${nodeId}" skipped: dependency chain did not succeed`
              );
            }
          }
        }
        break;
      }

      // Mark ready nodes as running
      for (const nodeId of ready) {
        statusByNodeId[nodeId] = 'running';
        const nr = nodeRunMap.get(nodeId);
        if (nr) {
          await prisma.nodeRun.update({
            where: { id: nr.id },
            data: {
              status: 'running',
              attempt: (nr.attempt || 0) + 1,
              startedAt: new Date(),
              input: maskSensitiveData(context) as any,
            },
          });
          await recordLog(
            nr.id,
            'info',
            `Node "${nodeId}" started execution (attempt ${(nr.attempt || 0) + 1})`
          );
        }
      }

      // Execute ready nodes concurrently using Promise.allSettled
      const tasks = ready.map(async (nodeId) => {
        const node = graph.nodes.find((n) => n.id === nodeId);
        const nr = nodeRunMap.get(nodeId);
        if (!node || !nr) return;

        try {
          const executor = getExecutor(node.type);
          const rawOutput = await executor(node, context);
          const sanitizedOutput = maskSensitiveData(rawOutput);

          // Populate context for downstream nodes
          context.nodes[nodeId] = { output: rawOutput };
          statusByNodeId[nodeId] = 'success';

          await prisma.nodeRun.update({
            where: { id: nr.id },
            data: {
              status: 'success',
              output: (sanitizedOutput === undefined ? null : sanitizedOutput) as any,
              finishedAt: new Date(),
            },
          });
          await recordLog(nr.id, 'info', `Node "${nodeId}" completed successfully`);
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          statusByNodeId[nodeId] = 'failed';

          await prisma.nodeRun.update({
            where: { id: nr.id },
            data: {
              status: 'failed',
              error: errorMsg,
              finishedAt: new Date(),
            },
          });
          await recordLog(nr.id, 'error', `Node "${nodeId}" failed: ${errorMsg}`);

          // Cascading skip: mark all downstream descendants of failed node as skipped
          const descendants = descendantsOf(graph, nodeId);
          for (const descId of descendants) {
            if (statusByNodeId[descId] === 'pending') {
              statusByNodeId[descId] = 'skipped';
              const descNr = nodeRunMap.get(descId);
              if (descNr) {
                await prisma.nodeRun.update({
                  where: { id: descNr.id },
                  data: {
                    status: 'skipped',
                    error: `Skipped due to upstream failure of node "${nodeId}"`,
                    finishedAt: new Date(),
                  },
                });
                await recordLog(
                  descNr.id,
                  'warn',
                  `Node "${descId}" skipped due to failure of upstream node "${nodeId}"`
                );
              }
            }
          }
        }
      });

      await Promise.allSettled(tasks);
    }

    // Determine overall Run status
    const finalNodeRuns = await prisma.nodeRun.findMany({
      where: { runId },
    });
    const hasFailed = finalNodeRuns.some((nr) => nr.status === 'failed');
    const finalStatus = hasFailed ? 'failed' : 'success';

    await prisma.run.update({
      where: { id: runId },
      data: {
        status: finalStatus,
        finishedAt: new Date(),
      },
    });
  } catch (fatalErr: any) {
    if (fatalErr?.code === 'P2025') {
      // Record was deleted during execution (e.g. test teardown or flow deletion)
      return;
    }
    console.error(`Fatal error in executeRun(${runId}):`, fatalErr);
    try {
      await prisma.run.update({
        where: { id: runId },
        data: {
          status: 'failed',
          finishedAt: new Date(),
        },
      });
    } catch (e: any) {
      if (e?.code !== 'P2025') {
        console.error(`Failed to mark run ${runId} as failed:`, e);
      }
    }
  }
}
