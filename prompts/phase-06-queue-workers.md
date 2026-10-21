# Phase 6: BullMQ workers, retries, DLQ, idempotency, heartbeats (Day 4, Nikhil)

**Read first:** `docs/05-queue-workers-reliability.md`. **Give the agent:** master rules + this file. **Only start this if the Pass tier works.** Redis must be running.

## Goal
Move node execution out of the API into separate worker processes, and make failures survivable.

## Tasks
1. `backend/src/workers/queue.ts` (BullMQ Queue `node-jobs`, ioredis connection) and `workers/worker.ts` (a separate entry: `npm run worker`) with a configurable concurrency.
2. Setting `EXECUTION_MODE=inline|distributed`. Inline keeps the Phase 4 behaviour (so tests still work). Distributed: `createRun` creates NodeRuns then calls `advanceRun(runId)`.
3. `advanceRun(runId)`: inside a Prisma transaction, compute ready nodes with `readyNodes`, set them `queued`, add one BullMQ job each (jobId = the idempotency key `runId:nodeId`), mark descendants of failures `skipped`, and finish the Run when nothing is left. It must be safe if called at the same time by two workers (a join node must not be queued twice).
4. Worker job handler: **claim** the NodeRun with an atomic update (`updateMany` where status is `queued`; if 0 rows updated, skip). Run the executor, save the result, call `advanceRun`. If the node is already `success`, return the stored output.
5. **Retries:** per-node config `maxRetries` (default 3), `backoffBase` (default 2s), `backoffCap` (default 60s). Write a pure function `computeBackoff(attempt, base, cap, rng)` with **full jitter** (`random * min(cap, base * 2^attempt)`) and a custom BullMQ backoff strategy that uses it (check the BullMQ docs for your installed version). Only retry retryable errors: timeouts, network errors, HTTP 5xx, 429. HTTP 4xx and config errors fail immediately. Save `attempt` and log each retry with the next delay; NodeRun status `retrying`.
6. **DLQ:** when retries are exhausted: NodeRun `dead`, insert a `DeadLetter` row (error, attempts, payload), descendants `skipped`, Run `failed`. API: `GET /dlq`, `POST /dlq/:id/replay` (reset that node and its skipped descendants to pending, re-run), `DELETE /dlq/:id`. Frontend: a simple DLQ page with a Replay button.
7. **Heartbeats:** each worker upserts a `WorkerHeartbeat` row (id, lastSeen, currentTask) every 5s. `GET /workers` lists workers and marks as `dead` any silent for over 15s. A small Workers panel in the frontend. Rely on BullMQ's stalled-job recovery for re-delivering a crashed worker's job; note this in the report.
8. A demo flow that calls `https://httpbin.org/status/503` to show retries then DLQ.
9. `docker-compose` or npm scripts so that `npm run worker` can be started in 2 or 3 terminals.
10. Tests: backoff stays within bounds (seeded rng), 4xx is not retried, 503 retries N times then goes dead, duplicate delivery runs the executor once, a join node is queued once.

## Checklist
- [ ] Two or three workers handle parallel branches at the same time (visible in logs)
- [ ] A failing node retries with growing, random delays, then appears in the DLQ and the run is `failed`
- [ ] Replay from the UI re-runs the dead node and its descendants
- [ ] Killing a worker mid-job: the job is picked up by another worker and the run still completes (try it)
- [ ] `/workers` shows live heartbeats
- [ ] Tests pass
