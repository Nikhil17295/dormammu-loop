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
| 1 | Setup, scaffold, database | both | not started |
| 2 | Graph logic: validation, cycle detection, topological order | Nikhil | not started |
| 3 | Flow API + visual editor | Madhav (API), Nikhil (editor) | not started |
| 4 | Execution engine + run history | Nikhil (engine), Madhav (history) | not started |
| 5 | Webhook + cron triggers | Madhav | not started |
| 6 | BullMQ workers, retries, DLQ, idempotency, heartbeats | Nikhil | not started |
| 7 | SSE live streaming | Madhav | not started |
| 8 | Tests, README, tool-use disclosure, viva prep | both | not started |

Not planned (documented as future work): workflow versioning, SSRF protection, full load-test report, Condition node (may be added if time allows).

## Run locally
_Filled in during Phase 1 and kept up to date._

## Documentation
- Start here: [docs/00-start-here.md](docs/00-start-here.md)
- Who does what: [docs/team-split.md](docs/team-split.md)
- Concept notes: `docs/01` to `docs/07`
- AI tool-use disclosure: [docs/tool-use-disclosure.md](docs/tool-use-disclosure.md)

## Repo layout
```
backend/    Express API, engine, workers
frontend/   React + React Flow UI
docs/       study notes and project docs
prompts/    phase prompts for the AI coding agent
```

## Known limitations
_Filled in at the end (Phase 8)._
