# Progress Log

After each phase add a few lines documenting actual implementation progress.

---

## Phase 1: Setup, Scaffold, & Database Foundation (2026-10-21) by Both
- **Built:**
  - Root `docker-compose.yml` orchestrating PostgreSQL 16 and Redis 7 with persistent volumes.
  - Express backend scaffold with TypeScript, CORS, JSON middleware, and `GET /health` endpoint.
  - Complete Prisma schema defining 8 models (`Flow`, `Trigger`, `Run`, `NodeRun`, `LogLine`, `DeadLetter`, `IdempotencyRecord`, `WorkerHeartbeat`) and executed initial database migration.
  - React + TypeScript + Vite frontend styled with Tailwind CSS, `@xyflow/react` installed and configured, and interactive health check dashboard.
  - Vitest + Supertest automated test suite for backend health check.
- **What broke and how it was fixed:**
  - Running `npm run build` in the frontend failed because `import.meta.env` lacked Vite types; added `frontend/src/vite-env.d.ts` with `/// <reference types="vite/client" />`.
  - Tailwind CSS warned that `@import "@xyflow/react/dist/style.css";` must precede Tailwind directives; reordered imports in `frontend/src/index.css`.
- **What I learned:**
  - How Docker Compose separates infrastructure services from application code.
  - How Prisma migrations map declarative schema definitions into PostgreSQL relational tables.
  - How CORS headers enable cross-origin communication between Vite (port 5173) and Express (port 4000).
- **Still unclear / Next focus:**
  - Ready for Phase 3: Flow persistence API and React Flow canvas integration.

---

## Phase 2: Pure DAG Logic, Cycle Detection, & Topological Sorting (2026-10-21) by Nikhil
- **Built:**
  - Pure TypeScript type definitions in `backend/src/engine/types.ts` (`NodeType`, `NodeStatus`, `GraphNode`, `GraphEdge`, `Graph`, `ValidationError`, `TopologicalSortResult`).
  - Pure topological sort via Kahn's algorithm with deterministic alphabetical tie-breaking in `backend/src/engine/graph.ts`.
  - Depth-First Search (DFS) 3-color back-edge cycle isolation (`findCycle`) isolating the exact subset of cyclic nodes.
  - Complete graph validator (`validateGraph`) auditing empty graphs, duplicate IDs, dangling edges, self-loops, cycles, trigger rules, and node configs (HTTP URLs, delay ranges, templates, output keys).
  - Graph traversal helpers (`parentsOf`, `childrenOf`, `descendantsOf`, `roots`).
  - Node readiness calculator (`readyNodes`) ensuring nodes only execute when all parents succeed.
  - Comprehensive Vitest test suite in `backend/tests/graph.test.ts` with 33 unit tests across all linear, diamond, disconnected, and cyclic graph permutations (34 total backend tests passing).
  - Study notes guide in `docs/study-notes/02-dag-and-algorithms.md` with viva Q&As, PowerShell debug commands, and beginner analogies.
- **What broke and how it was fixed:**
  - Running `npm test` from the root workspace directory failed with `ENOENT` because `package.json` is located in `backend/`; all backend commands now explicitly target the `backend/` directory (`npm --prefix backend test` or `cd backend; npm test`).
- **What I learned:**
  - How Kahn's algorithm computes in-degrees to iteratively resolve ready tasks in $O(V + E)$ time.
  - Why deterministic tie-breaking prevents flaky parallel execution ordering.
  - How 3-color DFS isolates the exact circular back-edge without falsely flagging valid diamond fan-in joins.
- **Still unclear / Next focus:**
  - Phase 3: Exposing the graph validator in Express REST endpoints and building the interactive React Flow canvas.

---

## Phase 3: Flow Persistence API & Graph Validation (2026-10-22) by Madhav
- **Built:**
  - Runtime request validation schemas in `backend/src/api/schemas.ts` using Zod for `Flow` create, update, graph structure, and dry-run validation payloads.
  - Complete RESTful Flow API routes in `backend/src/api/flows.ts` (`GET /flows`, `POST /flows`, `GET /flows/:id`, `PUT /flows/:id`, `DELETE /flows/:id`, and `POST /flows/validate`).
  - Integrated pure DAG validation (`validateGraph`) into flow creation and updates, rejecting cyclic graphs with semantic HTTP 422 Unprocessable Content.
  - Mounted routes onto Express at `/flows` in `backend/src/api/app.ts`.
  - Comprehensive Vitest + Supertest integration test suite in `backend/tests/flows.test.ts` with 20 integration tests verifying CRUD, cycle rejection, cascade deletion, and error codes (54 total backend tests passing).
  - Strongly typed client API functions in `frontend/src/api/flows.ts` (`fetchFlows`, `fetchFlow`, `createFlow`, `updateFlow`, `deleteFlow`, `validateGraphApi`).
  - Study notes guide in `docs/study-notes/03-flow-api-and-persistence.md` with viva Q&As, PowerShell debugging toolkit, and beginner analogies.
- **What broke and how it was fixed:**
  - When testing `POST /flows/validate` with `{ invalid: "not a graph" }`, the test expected HTTP 400 but received HTTP 200 because `nodes` and `edges` were configured with `.default([])` in Zod; fixed by requiring explicit array types in `graphSchema`.
  - Ensured static route `POST /flows/validate` is registered before dynamic `:id` routes to prevent Express route shadowing.
- **What I learned:**
  - Why runtime validation (Zod) is essential in Node.js despite having compile-time TypeScript types.
  - The semantic distinction between HTTP 400 (syntactical client error) and HTTP 422 (semantic/DAG domain constraint violation).
  - How Prisma foreign key relations with `onDelete: Cascade` keep PostgreSQL clean when workflows are deleted.
- **Still unclear / Next focus:**
  - Nikhil builds the React Flow canvas visual editor (`@xyflow/react`) in Phase 3 Part B, consuming these `/flows` endpoints.

