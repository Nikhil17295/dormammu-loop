import { z } from "zod";

/**
 * Supported node types in The Dormammu Loop DAG engine.
 */
export const nodeTypeSchema = z.enum([
  "trigger",
  "transform",
  "http",
  "delay",
  "output",
]);

/**
 * Schema for an individual node in the workflow graph.
 */
export const graphNodeSchema = z.object({
  id: z.string().min(1, "Node ID cannot be empty"),
  type: nodeTypeSchema,
  name: z.string().optional(),
  config: z.record(z.any()).default({}),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

/**
 * Schema for a directed edge connecting two nodes.
 */
export const graphEdgeSchema = z.object({
  id: z.string().min(1, "Edge ID cannot be empty"),
  source: z.string().min(1, "Edge source node ID cannot be empty"),
  target: z.string().min(1, "Edge target node ID cannot be empty"),
});

/**
 * Schema for a complete workflow graph consisting of nodes and directed edges.
 */
export const graphSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

/**
 * Schema for creating a new workflow flow record.
 */
export const createFlowSchema = z.object({
  name: z.string().trim().min(1, "Flow name is required"),
  graph: graphSchema,
});

/**
 * Schema for updating an existing flow (supports partial updates).
 */
export const updateFlowSchema = z
  .object({
    name: z.string().trim().min(1, "Flow name cannot be empty").optional(),
    graph: graphSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.graph !== undefined, {
    message: "At least one of 'name' or 'graph' must be provided for update",
  });

/**
 * Schema for validating graph payload (supports `{ graph: ... }` wrapper or raw `{ nodes, edges }`).
 */
export const validateGraphPayloadSchema = z.union([
  z.object({ graph: graphSchema }).transform((val) => val.graph),
  graphSchema,
]);

export type CreateFlowInput = z.infer<typeof createFlowSchema>;
export type UpdateFlowInput = z.infer<typeof updateFlowSchema>;

/**
 * Schema for filtering and paginating workflow runs in GET /runs.
 */
export const runQuerySchema = z.object({
  flowId: z.string().uuid().optional(),
  status: z.enum(["pending", "running", "success", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type RunQueryInput = z.infer<typeof runQuerySchema>;
