import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { validateGraph } from "../engine/graph";
import { Graph } from "../engine/types";
import {
  createFlowSchema,
  updateFlowSchema,
  validateGraphPayloadSchema,
} from "./schemas";

export const flowsRouter = Router();

/**
 * GET /flows
 * List all saved workflows with summary metadata and nodeCount.
 */
flowsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const flows = await prisma.flow.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const flowSummaries = flows.map((flow) => {
      const graph = flow.graph as unknown as Graph;
      const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
      return {
        id: flow.id,
        name: flow.name,
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
        nodeCount: nodes.length,
      };
    });

    return res.status(200).json(flowSummaries);
  } catch (err) {
    console.error("Error fetching flows:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve flows",
      },
    });
  }
});

/**
 * POST /flows/validate
 * Standalone dry-run graph validation endpoint (does not persist to database).
 */
flowsRouter.post("/validate", (req: Request, res: Response) => {
  const parsed = validateGraphPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid graph payload structure",
        details: parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    });
  }

  const errors = validateGraph(parsed.data as Graph);
  return res.status(200).json({
    valid: errors.length === 0,
    errors,
  });
});

/**
 * GET /flows/:id
 * Retrieve a single workflow by its UUID, including full graph definition.
 */
flowsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const flow = await prisma.flow.findUnique({
      where: { id: req.params.id },
    });

    if (!flow) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Flow with id "${req.params.id}" not found`,
        },
      });
    }

    return res.status(200).json(flow);
  } catch (err) {
    console.error(`Error fetching flow ${req.params.id}:`, err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve flow",
      },
    });
  }
});

/**
 * POST /flows
 * Validate and save a new workflow definition into PostgreSQL.
 */
flowsRouter.post("/", async (req: Request, res: Response) => {
  const parsed = createFlowSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid flow payload",
        details: parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    });
  }

  // Pure DAG validation (cycle detection, trigger rules, node configs)
  const validationErrors = validateGraph(parsed.data.graph as Graph);
  if (validationErrors.length > 0) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Graph contains cycles or invalid configurations",
        details: validationErrors,
      },
    });
  }

  try {
    const createdFlow = await prisma.flow.create({
      data: {
        name: parsed.data.name,
        graph: parsed.data.graph as any,
      },
    });

    return res.status(201).json(createdFlow);
  } catch (err) {
    console.error("Error creating flow:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to persist flow into database",
      },
    });
  }
});

/**
 * PUT /flows/:id
 * Update an existing workflow's name and/or graph definition.
 */
flowsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await prisma.flow.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Flow with id "${req.params.id}" not found`,
        },
      });
    }

    const parsed = updateFlowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid update payload",
          details: parsed.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
      });
    }

    // If graph is being updated, perform full DAG validation
    if (parsed.data.graph) {
      const validationErrors = validateGraph(parsed.data.graph as Graph);
      if (validationErrors.length > 0) {
        return res.status(422).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Graph contains cycles or invalid configurations",
            details: validationErrors,
          },
        });
      }
    }

    const updatedFlow = await prisma.flow.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.graph ? { graph: parsed.data.graph as any } : {}),
      },
    });

    return res.status(200).json(updatedFlow);
  } catch (err) {
    console.error(`Error updating flow ${req.params.id}:`, err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update flow",
      },
    });
  }
});

/**
 * DELETE /flows/:id
 * Delete a workflow and cascades to all associated triggers and runs.
 */
flowsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await prisma.flow.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Flow with id "${req.params.id}" not found`,
        },
      });
    }

    await prisma.flow.delete({
      where: { id: req.params.id },
    });

    return res.status(200).json({
      success: true,
      message: `Flow "${req.params.id}" deleted successfully`,
    });
  } catch (err) {
    console.error(`Error deleting flow ${req.params.id}:`, err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete flow",
      },
    });
  }
});
