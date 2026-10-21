import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/api/app";

describe("GET /health", () => {
  it("should return status 200 and { status: 'ok' }", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
