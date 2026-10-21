# Phase 1: Setup, scaffold, database (Day 1, both)

**Read first:** `docs/00-start-here.md`, `docs/01-big-picture.md`. **Give the agent:** `prompts/00-master-rules.md` + this file.

## Goal
Everything starts on a Windows machine with one or two commands: Postgres, Redis, API, frontend. Database tables exist.

## Tasks
1. `docker-compose.yml` at the root with `postgres` (with a volume) and `redis`. If Docker is unavailable, tell me how to use Neon (Postgres) and Upstash (Redis) instead.
2. `backend/`: `npm init`, TypeScript, Express, `tsx` for dev, `zod`, `dotenv`, `cors`, Vitest. Scripts: `dev`, `build`, `test`. `GET /health` returns `{ "status": "ok" }`. CORS for the Vite dev URL. `.env.example` with `DATABASE_URL` and `REDIS_URL`.
3. Prisma: initialise, and create this schema (keep field names simple):
   - `Flow` (id, name, graph Json, createdAt, updatedAt)
   - `Trigger` (id, flowId, type "webhook"|"cron", token?, cronExpr?, enabled)
   - `Run` (id, flowId, status, triggerSource, payload Json?, startedAt, finishedAt?)
   - `NodeRun` (id, runId, nodeId, status, attempt Int default 0, input Json?, output Json?, error String?, idempotencyKey String unique, startedAt?, finishedAt?)
   - `LogLine` (id, nodeRunId, ts, level, message)
   - `DeadLetter` (id, nodeRunId, reason, attempts, payload Json?, createdAt)
   - `IdempotencyRecord` (key unique, runId, createdAt)
   - `WorkerHeartbeat` (workerId id, lastSeen, currentTask?)
   Run the migration.
4. `frontend/`: Vite + React + TypeScript + Tailwind; install `@xyflow/react`. A page titled "Dormammu Loop" that calls `/health` and shows the backend status.
5. One test in `backend/tests` for `/health`.
6. Fill README "Run locally" with exact PowerShell commands.

## Checklist
- [ ] `docker compose up -d` starts Postgres and Redis
- [ ] `npx prisma migrate dev` applies cleanly; tables visible (e.g. `npx prisma studio`)
- [ ] Backend `npm run dev` and `/health` works
- [ ] Frontend `npm run dev` shows backend status ok
- [ ] `npm test` passes
- [ ] README run instructions work from scratch
