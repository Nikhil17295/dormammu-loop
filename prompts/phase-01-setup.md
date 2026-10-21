# Phase 1: Setup, Scaffold, & Database Foundation (Day 1)

**Read first:** `docs/00-start-here.md`, `docs/01-big-picture.md`  
**Give the agent:** `prompts/00-master-rules.md` + this file.

---

## Goal
Establish a rock-solid, reproducible local development environment on Windows:
- PostgreSQL and Redis running via Docker Compose.
- Express + TypeScript backend with Prisma ORM (8 core database models).
- React + TypeScript + Vite frontend with Tailwind CSS and `@xyflow/react`.
- Automated health test passing with Vitest.

*(Note: Phase 1 has been initially implemented and verified. This prompt serves as the specification, baseline validation, and setup guide for fresh machines.)*

---

## Required Tasks & Specifications

### 1. Local Infrastructure (`docker-compose.yml`)
- PostgreSQL 16 container (`dormammu_postgres`) exposed on port `5432` with a persistent volume `postgres_data`.
- Redis 7 container (`dormammu_redis`) exposed on port `6379` with a persistent volume `redis_data`.
- Cloud fallback instructions documented in `.env.example`:
  - PostgreSQL: Neon (free tier connection string).
  - Redis: Upstash (free tier REST/Redis URL).

### 2. Backend Scaffold (`backend/`)
- Express server configured with TypeScript and `tsx` hot-reloading.
- Essential middleware: JSON body parser (`express.json()`), CORS middleware pointing to the Vite dev server (`http://localhost:5173`).
- Environment variables loaded via `dotenv` (`PORT`, `CORS_ORIGIN`, `DATABASE_URL`, `REDIS_URL`).
- Health check route: `GET /health` returning `{ "status": "ok" }`.
- Scripts in `backend/package.json`:
  - `npm run dev`: starts server with `tsx watch src/index.ts`.
  - `npm run build`: compiles TypeScript via `tsc`.
  - `npm test`: executes Vitest unit/integration tests.
- Layout directories preserved: `src/{api,engine,executors,workers,triggers,lib}`.

### 3. Database Schema (`backend/prisma/schema.prisma`)
Create and maintain the 8 core models supporting both Pass Tier and Distributed Tier:
1. `Flow`: Workflow definition (`id`, `name`, `graph` JSON, `createdAt`, `updatedAt`).
2. `Trigger`: Trigger definitions (`id`, `flowId`, `type` ("webhook" | "cron"), `token`?, `cronExpr`?, `enabled`).
3. `Run`: Top-level workflow execution record (`id`, `flowId`, `status`, `triggerSource`, `payload` JSON?, `startedAt`, `finishedAt`?).
4. `NodeRun`: Execution record for each individual node in a run (`id`, `runId`, `nodeId`, `status`, `attempt`, `input` JSON?, `output` JSON?, `error`?, `idempotencyKey` unique, `startedAt`?, `finishedAt`?).
5. `LogLine`: Execution logs per node run (`id`, `nodeRunId`, `ts`, `level`, `message`).
6. `DeadLetter`: Failed jobs after max retries exhausted (`id`, `nodeRunId`, `reason`, `attempts`, `payload` JSON?, `createdAt`).
7. `IdempotencyRecord`: Webhook and job deduplication keys (`id`, `key` unique, `runId`, `createdAt`).
8. `WorkerHeartbeat`: Active background worker tracker (`workerId` primary key, `lastSeen`, `currentTask`?).
- Run migration using `npx prisma migrate dev`.

### 4. Frontend Scaffold (`frontend/`)
- Vite React + TypeScript template styled with Tailwind CSS.
- Canvas engine installed: `@xyflow/react` (and styles imported).
- Folder structure: `src/{pages,components,api,hooks}`.
- Dashboard titled **"Dormammu Loop"** that fetches `GET /health` from the backend and displays a live connection status indicator (Online / Offline / Checking).

### 5. Verification Test Suite (`backend/tests/health.test.ts`)
- Vitest + Supertest integration test verifying `GET /health` responds with HTTP 200 and `{ status: "ok" }`.

---

## Verification Checklist
- [ ] `docker compose up -d` starts PostgreSQL and Redis without port conflicts.
- [ ] `npx prisma migrate dev` creates and applies migrations cleanly.
- [ ] PostgreSQL tables are visible (`docker exec -i dormammu_postgres psql -U dormammu -d dormammu_loop -c "\dt"` or `npx prisma studio`).
- [ ] Backend dev server starts on port `4000` and `GET /health` returns `{"status":"ok"}`.
- [ ] Backend test `npm test` runs and passes.
- [ ] Frontend dev server runs on port `5173` and displays live backend status.
- [ ] Frontend production build (`npm run build`) compiles cleanly with zero TypeScript errors.
- [ ] `README.md` contains accurate, reproducible PowerShell commands.

---

## Beginner Viva Preparation for Phase 1
1. **Why do we run PostgreSQL and Redis in Docker?**  
   *Answer:* Docker guarantees that everyone on the team runs the exact same database versions and configuration without having to manually install, configure, or debug native Windows database services.
2. **What is Prisma ORM and why use it instead of raw SQL queries?**  
   *Answer:* Prisma generates type-safe TypeScript models from our schema. It prevents syntax mistakes, automatically handles schema migrations, and provides autocompletion for database queries.
3. **What is CORS and why did we configure it in Express?**  
   *Answer:* Cross-Origin Resource Sharing is a browser security mechanism. Because the frontend runs on port `5173` and the backend runs on port `4000`, the browser blocks requests unless Express explicitly allows `http://localhost:5173` in its CORS headers.
