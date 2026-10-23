# AI tool-use disclosure

WEBSTER requires a tool-use disclosure. Keep this file honest and current. Fill in the details; do not leave it for the last minute.

## Tools used
| Tool | Used for |
|---|---|
| Antigravity (AI coding agent) | Writing most of the application code, tests and boilerplate, following the prompts in `prompts/` |
| Claude (chat assistant) | Project planning, concept explanations, writing study notes and the phase prompts |

## How we used them
- Each phase has a written prompt in `prompts/`. The agent implemented that phase; we ran, checked and tested the result, and fixed problems by re-prompting.
- We reviewed generated code, ran the tests, and studied each phase using the notes in `docs/`.

## Per-phase log
| Phase | Tool | What it generated | What we checked / changed |
|---|---|---|---|
| 1 | Antigravity | Docker compose file, Express backend scaffold with TypeScript & Prisma schema (8 models), Vite + React + Tailwind frontend with health status page, and Vitest suite | Verified Docker containers (Postgres & Redis), verified Prisma migrations applied all 8 tables, ran backend test suite, built frontend without warnings |
| 2 | Antigravity | Pure TypeScript engine types (`backend/src/engine/types.ts`), graph algorithms with Kahn's sort, 3-color DFS cycle isolation, readiness calculator, validator (`backend/src/engine/graph.ts`), 33-case Vitest suite (`backend/tests/graph.test.ts`), and Study Guide 02 | Verified 0 external imports in engine, ran all 34 Vitest tests passing with 0 failures, tested tsc build, verified deterministic tie-breaking and cycle isolation |
| 3 (Part A: Flow Persistence API) | Antigravity | Flow persistence REST API (`backend/src/api/flows.ts`), Zod request schemas (`backend/src/api/schemas.ts`), Express route mounting, typed frontend client API, 20-case integration test suite (`backend/tests/flows.test.ts`), and Study Guide 03 (Persistence) | Verified all 54 backend tests pass with 0 failures, tested live POST /flows and POST /flows/validate via PowerShell, verified HTTP 422 on cycles, verified cascade deletion |
| 3 (Part B: Canvas Editor) | Antigravity | React Flow canvas (`WorkflowCanvas`), 5 custom nodes (`TriggerNode`, `HttpNode`, `TransformNode`, `DelayNode`, `OutputNode`), Node Palette, Inspector Panel, Action Bar, client-side cycle rejection (`canConnectEdge`), React Router pages (`FlowListPage`, `FlowEditorPage`), client API layer with offline fallback, 15 Vitest tests, and Study Guide 03 (Canvas) | Verified 0ms client cycle rejection and self-loop blocking, verified drag-and-drop coordinate projection, ran 15 frontend tests (all passing), verified clean production build with `tsc && vite build`, verified all 54 backend tests still pass |
| 4 (Part A: Execution Engine) | Antigravity | Safe variable templating (`backend/src/engine/templating.ts`), modular executors (`backend/src/executors/`), data masking (`maskSensitiveData`), in-process DAG runner with topological concurrency & cascading skips (`backend/src/engine/runner.ts`), `POST /flows/:id/run` API endpoint, Vitest config & test suites (34 new tests across `templating.test.ts`, `executors.test.ts`, `engine.test.ts`), and Study Guide 04 | Verified zero-eval templating with prototype pollution guards, verified diamond parallel branch concurrency via `Promise.allSettled`, verified cascading skips of child nodes on failure, configured sequential test parallelism, ran all 88 backend tests and 15 frontend tests passing with 0 failures |
| 4 (Part B: Run History & Inspector) | Antigravity | Run history REST API (`GET /runs`, `GET /runs/:id`, `GET /runs/:id/nodes/:nodeId` in `backend/src/api/runs.ts`), Zod query schemas, 11-case integration test suite (`backend/tests/runs.test.ts`), typed frontend client (`frontend/src/api/runs.ts`), Run Modal (`RunModal.tsx`), dynamic node status styling (`NodeCard.tsx`), Visual Run Inspector (`RunDetailPage.tsx`) with 1.5s polling loop and slide-over Node Execution Drawer, Run History list page (`RunListPage.tsx`) with metrics and auto-refresh, frontend tests (`runsApi.test.ts`), and Study Guide 04 (Run History) | Verified all 99 backend tests and 20 frontend tests pass with 0 failures, verified live polling halting upon terminal status, verified end-to-end workflow execution, node status badges, and terminal logs inspection via browser subagent, verified zero TypeScript build errors |
