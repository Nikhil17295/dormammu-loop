import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/api/app";
import { prisma } from "../src/lib/prisma";
import { Graph } from "../src/engine/types";

describe("Flow API Integration Tests (/flows)", () => {
  // Sample valid linear workflow graph: trigger -> delay -> output
  const validLinearGraph: Graph = {
    nodes: [
      {
        id: "node_1",
        type: "trigger",
        name: "Manual Trigger",
        config: {},
      },
      {
        id: "node_2",
        type: "delay",
        name: "Wait 5 Seconds",
        config: { seconds: 5 },
      },
      {
        id: "node_3",
        type: "output",
        name: "Final Output",
        config: { key: "result" },
      },
    ],
    edges: [
      { id: "e1_2", source: "node_1", target: "node_2" },
      { id: "e2_3", source: "node_2", target: "node_3" },
    ],
  };

  // Sample valid diamond workflow graph:
  //      -> transform1 -
  // trigger             -> output
  //      -> transform2 -
  const validDiamondGraph: Graph = {
    nodes: [
      { id: "trigger_1", type: "trigger", config: {} },
      {
        id: "trans_a",
        type: "transform",
        config: { template: "Hello {{ trigger_1.name }}" },
      },
      {
        id: "trans_b",
        type: "transform",
        config: { template: "Status {{ trigger_1.status }}" },
      },
      { id: "output_1", type: "output", config: { key: "joined" } },
    ],
    edges: [
      { id: "e_t_a", source: "trigger_1", target: "trans_a" },
      { id: "e_t_b", source: "trigger_1", target: "trans_b" },
      { id: "e_a_o", source: "trans_a", target: "output_1" },
      { id: "e_b_o", source: "trans_b", target: "output_1" },
    ],
  };

  // Sample cyclic workflow graph: trigger -> A -> B -> A
  const cyclicGraph: Graph = {
    nodes: [
      { id: "trig", type: "trigger", config: {} },
      {
        id: "node_a",
        type: "http",
        config: { url: "https://api.example.com/one" },
      },
      {
        id: "node_b",
        type: "http",
        config: { url: "https://api.example.com/two" },
      },
    ],
    edges: [
      { id: "e_t_a", source: "trig", target: "node_a" },
      { id: "e_a_b", source: "node_a", target: "node_b" },
      { id: "e_b_a", source: "node_b", target: "node_a" }, // Cycle!
    ],
  };

  beforeEach(async () => {
    // Clean flows table before each test for test isolation
    await prisma.flow.deleteMany();
  });

  afterAll(async () => {
    await prisma.flow.deleteMany();
    await prisma.$disconnect();
  });

  describe("POST /flows (Create Flow)", () => {
    it("should successfully create a valid linear flow and return HTTP 201", async () => {
      const payload = {
        name: "Order Processing Flow",
        graph: validLinearGraph,
      };

      const res = await request(app).post("/flows").send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("Order Processing Flow");
      expect(res.body.graph).toEqual(validLinearGraph);
      expect(res.body).toHaveProperty("createdAt");
      expect(res.body).toHaveProperty("updatedAt");

      // Verify record exists in PostgreSQL
      const inDb = await prisma.flow.findUnique({
        where: { id: res.body.id },
      });
      expect(inDb).not.toBeNull();
      expect(inDb?.name).toBe("Order Processing Flow");
    });

    it("should successfully create a valid diamond flow and return HTTP 201", async () => {
      const payload = {
        name: "Diamond Fan-Out Fan-In Flow",
        graph: validDiamondGraph,
      };

      const res = await request(app).post("/flows").send(payload);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Diamond Fan-Out Fan-In Flow");
      expect((res.body.graph as Graph).nodes.length).toBe(4);
      expect((res.body.graph as Graph).edges.length).toBe(4);
    });

    it("should reject cyclic graph with HTTP 422 and structured error details", async () => {
      const payload = {
        name: "Cyclic Trap Flow",
        graph: cyclicGraph,
      };

      const res = await request(app).post("/flows").send(payload);

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("cycles");
      expect(Array.isArray(res.body.error.details)).toBe(true);

      const cycleError = res.body.error.details.find(
        (d: any) => d.code === "CYCLE_DETECTED"
      );
      expect(cycleError).toBeDefined();
      expect(cycleError.nodeIds).toEqual(
        expect.arrayContaining(["node_a", "node_b"])
      );

      // Verify no flow was saved to the database
      const count = await prisma.flow.count();
      expect(count).toBe(0);
    });

    it("should reject graph with no trigger node with HTTP 422", async () => {
      const noTriggerGraph: Graph = {
        nodes: [
          {
            id: "http_1",
            type: "http",
            config: { url: "https://example.com" },
          },
        ],
        edges: [],
      };

      const res = await request(app).post("/flows").send({
        name: "Orphan Flow",
        graph: noTriggerGraph,
      });

      expect(res.status).toBe(422);
      const noTriggerError = res.body.error.details.find(
        (d: any) => d.code === "NO_TRIGGER"
      );
      expect(noTriggerError).toBeDefined();
    });

    it("should reject request with missing name with HTTP 400", async () => {
      const res = await request(app).post("/flows").send({
        graph: validLinearGraph,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toBe("Invalid flow payload");
    });

    it("should reject request with empty name with HTTP 400", async () => {
      const res = await request(app).post("/flows").send({
        name: "   ",
        graph: validLinearGraph,
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /flows (List Flows)", () => {
    it("should return empty array when no flows exist", async () => {
      const res = await request(app).get("/flows");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should list all saved flows with nodeCount and metadata", async () => {
      await prisma.flow.create({
        data: {
          name: "Linear Flow",
          graph: validLinearGraph as any,
        },
      });

      await prisma.flow.create({
        data: {
          name: "Diamond Flow",
          graph: validDiamondGraph as any,
        },
      });

      const res = await request(app).get("/flows");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      const linearSummary = res.body.find((f: any) => f.name === "Linear Flow");
      expect(linearSummary).toBeDefined();
      expect(linearSummary.nodeCount).toBe(3);
      expect(linearSummary).toHaveProperty("id");
      expect(linearSummary).toHaveProperty("createdAt");
      expect(linearSummary).toHaveProperty("updatedAt");

      const diamondSummary = res.body.find(
        (f: any) => f.name === "Diamond Flow"
      );
      expect(diamondSummary).toBeDefined();
      expect(diamondSummary.nodeCount).toBe(4);
    });
  });

  describe("GET /flows/:id (Get Flow by ID)", () => {
    it("should return complete flow record including graph for valid ID", async () => {
      const created = await prisma.flow.create({
        data: {
          name: "Single Flow",
          graph: validLinearGraph as any,
        },
      });

      const res = await request(app).get(`/flows/${created.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.name).toBe("Single Flow");
      expect(res.body.graph).toEqual(validLinearGraph);
    });

    it("should return HTTP 404 if flow does not exist", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app).get(`/flows/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PUT /flows/:id (Update Flow)", () => {
    it("should update flow name and graph successfully with HTTP 200", async () => {
      const created = await prisma.flow.create({
        data: {
          name: "Initial Name",
          graph: validLinearGraph as any,
        },
      });

      const res = await request(app)
        .put(`/flows/${created.id}`)
        .send({
          name: "Updated Name",
          graph: validDiamondGraph,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Name");
      expect(res.body.graph).toEqual(validDiamondGraph);

      const inDb = await prisma.flow.findUnique({
        where: { id: created.id },
      });
      expect(inDb?.name).toBe("Updated Name");
    });

    it("should allow partial update of only flow name", async () => {
      const created = await prisma.flow.create({
        data: {
          name: "Original Name",
          graph: validLinearGraph as any,
        },
      });

      const res = await request(app)
        .put(`/flows/${created.id}`)
        .send({ name: "Renamed Flow" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Renamed Flow");
      expect(res.body.graph).toEqual(validLinearGraph);
    });

    it("should reject update if new graph contains a cycle with HTTP 422", async () => {
      const created = await prisma.flow.create({
        data: {
          name: "Acyclic Flow",
          graph: validLinearGraph as any,
        },
      });

      const res = await request(app)
        .put(`/flows/${created.id}`)
        .send({ graph: cyclicGraph });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");

      // Verify DB graph was not altered
      const inDb = await prisma.flow.findUnique({
        where: { id: created.id },
      });
      expect(inDb?.graph).toEqual(validLinearGraph);
    });

    it("should return HTTP 404 when updating non-existent flow", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .put(`/flows/${nonExistentId}`)
        .send({ name: "Cannot Update" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("DELETE /flows/:id (Delete Flow)", () => {
    it("should delete existing flow and return HTTP 200 with success status", async () => {
      const created = await prisma.flow.create({
        data: {
          name: "Flow to Delete",
          graph: validLinearGraph as any,
        },
      });

      const res = await request(app).delete(`/flows/${created.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion from DB
      const inDb = await prisma.flow.findUnique({
        where: { id: created.id },
      });
      expect(inDb).toBeNull();
    });

    it("should return HTTP 404 when deleting non-existent flow", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app).delete(`/flows/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /flows/validate (Dry-Run Graph Validation)", () => {
    it("should return valid: true and empty errors array for a valid graph", async () => {
      const res = await request(app)
        .post("/flows/validate")
        .send({ graph: validLinearGraph });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.errors).toEqual([]);

      // Ensure no flows were stored
      const count = await prisma.flow.count();
      expect(count).toBe(0);
    });

    it("should accept raw { nodes, edges } payload directly", async () => {
      const res = await request(app)
        .post("/flows/validate")
        .send(validDiamondGraph);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.errors).toEqual([]);
    });

    it("should return valid: false and error list for a cyclic graph without throwing", async () => {
      const res = await request(app)
        .post("/flows/validate")
        .send({ graph: cyclicGraph });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
      expect(
        res.body.errors.some((e: any) => e.code === "CYCLE_DETECTED")
      ).toBe(true);
    });

    it("should return HTTP 400 for malformed payload structure", async () => {
      const res = await request(app)
        .post("/flows/validate")
        .send({ invalid: "not a graph" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
