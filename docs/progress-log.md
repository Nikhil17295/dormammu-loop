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
  - How Kahn's algorithm isolates cycles and calculates topological sort in Phase 2.
