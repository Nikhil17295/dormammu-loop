# The Dormammu Loop

Distributed DAG workflow and automation engine. Team **The Time Keepers** (ID 424), WEBSTER 2026, problem statement M1.

> **Honesty rule:** this README only claims what is actually built and tested. The status table below is updated after every phase.

## What it is
A visual workflow builder. You draw a graph of nodes (trigger, transform, HTTP request, delay, output). The server checks the graph has no cycles, runs the nodes in dependency order (a node runs only after all its parents succeeded), records every run, and can start runs from a webhook or a cron schedule. In the distributed tier, nodes run on separate worker processes through a Redis queue, with retries, a dead-letter queue, and live updates to the canvas over SSE.

## Tech stack (as in our submitted abstract)
| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Canvas | React Flow (@xyflow/react) |
| API | Node.js + TypeScript + Express |
| Database | PostgreSQL + Prisma |
| Queue / workers | Redis + BullMQ |
| Live updates | Server-Sent Events (SSE) |
| Cron | node-cron |
| Tests | Vitest |

## Status
| Phase | What | Owner | Status |
|---|---|---|---|
| 1 | Setup, scaffold, database | both | done (verified) |
| 2 | Graph logic: validation, cycle detection, topological order | Nikhil | done (verified) |
| 3 | Flow API + visual editor | Madhav (API), Nikhil (editor) | API done (verified), editor in progress |
| 4 | Execution engine + run history | Nikhil (engine), Madhav (history) | not started |
| 5 | Webhook + cron triggers | Madhav | not started |
| 6 | BullMQ workers, retries, DLQ, idempotency, heartbeats | Nikhil | not started |
| 7 | SSE live streaming | Madhav | not started |
| 8 | Tests, README, tool-use disclosure, viva prep | both | not started |

Not planned (documented as future work): workflow versioning, SSRF protection, full load-test report, Condition node (may be added if time allows).

## Run locally

### Prerequisites
- Node.js LTS (v20+ or v24+)
- Docker Desktop (WSL2 backend enabled on Windows)

### 1. Start Postgres & Redis containers
From repository root in PowerShell:
```powershell
docker compose up -d
```
> **Tip:** If Docker is not available, you can use free cloud services (Neon for PostgreSQL and Upstash for Redis) by updating `DATABASE_URL` and `REDIS_URL` in `backend/.env`.

### 2. Setup and run Backend API
In a new PowerShell window:
```powershell
cd backend
npm install
npx prisma migrate dev
npm run dev
```
The backend API starts at `http://localhost:4000`. Test health with:
```powershell
Invoke-RestMethod -Uri http://localhost:4000/health
```

To run backend tests:
```powershell
cd backend
npm test
```

To inspect database records visually in your browser:
```powershell
cd backend
npx prisma studio
```

### 3. Setup and run Frontend
In another PowerShell window:
```powershell
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173` to see the Dormammu Loop interface and live backend status indicator.

## Documentation
- Start here: [docs/00-start-here.md](docs/00-start-here.md)
- Who does what: [docs/team-split.md](docs/team-split.md)
- Concept notes: `docs/01` to `docs/07`
- AI tool-use disclosure: [docs/tool-use-disclosure.md](docs/tool-use-disclosure.md)

## Repo layout
```
backend/
  src/
    api/        # Express app, middleware, routes, request validation
    engine/     # Pure DAG logic: validation, Kahn's algorithm, readyNodes, runner
    executors/  # Node executors (trigger, http, transform, delay, output)
    workers/    # BullMQ worker processes, job handlers (Phase 6)
    triggers/   # Webhook handler, node-cron scheduler (Phase 5)
    lib/        # Prisma client, Redis client, event publisher, logger
  prisma/       # schema.prisma, migrations
  tests/        # Vitest automated test suites
frontend/
  src/
    pages/      # Route pages (Home/List, Editor, RunDetail, DLQ)
    components/ # Reusable UI components, custom React Flow nodes
    api/        # Typed API client fetching backend endpoints
    hooks/      # React hooks (health, flow state, run stream)
docs/           # Architecture notes, viva prep, progress log
prompts/        # Master rules and phase prompts for AI coding agent
```

## Known limitations
_Filled in at the end (Phase 8)._
