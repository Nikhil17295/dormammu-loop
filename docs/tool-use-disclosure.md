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
| 3 (Part B: Canvas Editor) | Antigravity | React Flow canvas (`WorkflowCanvas`), 5 custom nodes (`TriggerNode`, `HttpNode`, `TransformNode`, `DelayNode`, `OutputNode`), Node Palette, Inspector Panel, Action Bar, client-side cycle rejection (`canConnectEdge`), React Router pages (`FlowListPage`, `FlowEditorPage`), client API layer with offline fallback, 15 Vitest tests, and Study Guide 03 | Verified 0ms client cycle rejection and self-loop blocking, verified drag-and-drop coordinate projection, ran 15 frontend tests (all passing), verified clean production build with `tsc && vite build`, verified all 34 backend tests still pass |
