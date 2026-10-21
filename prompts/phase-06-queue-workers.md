# Phase 6: Distributed BullMQ Workers, Retries with Jitter, DLQ, & Heartbeats (Day 4)

**Read first:** `docs/05-queue-workers-reliability.md`  
**Give the agent:** `prompts/00-master-rules.md` + this file.  
*(Safety Rule: Do NOT start this phase unless the Pass Tier [Phases 1 through 5] is fully verified and working).*

---

## Goal
Transform the in-process execution engine into a resilient, production-ready distributed system:
- Work is executed by separate Node.js worker processes via **BullMQ** and **Redis**.
- Transient failures automatically retry using **exponential backoff with full jitter**.
- Exhausted retries are captured in a **Dead-Letter Queue (DLQ)** with manual replay capability.
- Worker liveness is tracked via **heartbeats** in PostgreSQL.

**Preservation Principle:** An environment variable `EXECUTION_MODE=inline|distributed` (defaulting to `inline` in tests or local fallback) preserves the Phase 4 runner so unit tests and simple setups never break.

---

## Required Tasks & Specifications

### 1. Redis Connection & BullMQ Queue Setup (`backend/src/workers/queue.ts`)
- Connect to Redis using `ioredis` (reading `REDIS_URL` from `.env`).
- Instantiate BullMQ Queue named `node-jobs`.
- Export a helper `addNodeJob(nodeRunId: string, runId: string, nodeId: string)` with:
  - Custom `jobId: `${runId}:${nodeId}`` to enforce BullMQ deduplication.
  - Configurable attempts and custom backoff strategy.

### 2. Concurrency-Safe DAG Advancement (`backend/src/engine/advance.ts`)
- Implement `advanceRun(runId: string): Promise<void>`:
  - Must run within a Prisma transaction or with atomic checks to be safe against concurrent worker completions (e.g. when two parallel nodes finish at the exact same millisecond).
  - Queries all `NodeRun` rows for the run.
  - Computes ready nodes using `readyNodes(graph, statusByNodeId)`.
  - Atomically updates ready nodes from `'pending'` to `'queued'`.
  - Pushes a BullMQ job for each newly queued node.
  - If any node has status `'failed'` or `'dead'`, mark all its unexecuted descendants as `'skipped'`.
  - If all nodes are in terminal states (`success`, `failed`, `skipped`, `dead`), mark the `Run` record finished with its final status (`success` or `failed`).

### 3. Worker Process & Atomic Job Claiming (`backend/src/workers/worker.ts`)
- Dedicated worker process entry point started via `npm run worker` (in `backend/package.json`).
- Worker concurrency configurable via `WORKER_CONCURRENCY` (default 3).
- **Atomic Claim Pattern:**
  - Before executing a job, perform an atomic update:
    ```typescript
    const updated = await prisma.nodeRun.updateMany({
      where: { id: nodeRunId, status: 'queued' },
      data: { status: 'running', startedAt: new Date() }
    });
    if (updated.count === 0) return; // Another worker already claimed it!
    ```
  - Fetch executor for node type, execute, record output/error in PostgreSQL.
  - If successful: mark `status = 'success'`, save output, and call `advanceRun(runId)`.
  - If failed: throw error to trigger BullMQ's retry mechanism or DLQ handling.

### 4. Exponential Backoff with Full Jitter (`backend/src/engine/backoff.ts`)
- Pure function:
  ```typescript
  export function computeBackoff(attempt: number, baseMs = 2000, capMs = 60000, rng = Math.random): number {
    const exponential = Math.min(capMs, baseMs * Math.pow(2, attempt));
    return Math.floor(rng() * exponential);
  }
  ```
- Register a custom backoff strategy with BullMQ Worker.
- Classify errors:
  - **Retryable errors:** Network timeouts, HTTP 500/502/503/504, HTTP 429 Rate Limited.
  - **Non-retryable errors:** HTTP 400/401/403/404, invalid configuration, schema errors (fail immediately without wasting retries).
- On each retry: update `NodeRun.attempt`, set status `'retrying'`, log the scheduled backoff delay.

### 5. Dead-Letter Queue (DLQ) & Replay (`backend/src/api/dlq.ts`)
- When a node exhausts its maximum retries (default 3):
  - Mark `NodeRun.status = 'dead'`.
  - Insert record into `DeadLetter` table (`nodeRunId`, `reason`, `attempts`, `payload`).
  - Mark all its downstream descendants as `'skipped'`.
  - Call `advanceRun(runId)` to finalize the Run as `'failed'`.
- DLQ API endpoints:
  - `GET /dlq`: Returns paginated list of dead letters with flow and node information.
  - `POST /dlq/:id/replay`: Re-queues the dead node:
    - Resets the `NodeRun` status from `'dead'` back to `'pending'` (attempt reset to 0).
    - Resets all its `'skipped'` descendants back to `'pending'`.
    - Calls `advanceRun(runId)` to resume workflow execution.
  - `DELETE /dlq/:id`: Dismisses/acknowledges the dead letter.
- Frontend DLQ Dashboard (`frontend/src/pages/DlqPage.tsx`):
  - Table of failed jobs with error reason, flow name, failure timestamp, and a **"Replay"** action button.

### 6. Worker Heartbeats & Liveness Monitoring (`backend/src/workers/heartbeat.ts`)
- Each running worker generates a unique `workerId` on startup (e.g. `worker-abc123`).
- Interval every 5 seconds upserts into `WorkerHeartbeat` table (`workerId`, `lastSeen: new Date()`, `currentTask`).
- On graceful shutdown (`SIGTERM`/`SIGINT`), remove heartbeat row.
- Endpoint `GET /workers`:
  - Returns all registered workers.
  - If `now - lastSeen > 15s`, marks status as `'stale'` or `'dead'`.
- Small Worker Status drawer or panel in the frontend showing active worker count.

### 7. Automated Tests (`backend/tests/workers.test.ts`)
- Pure unit tests for `computeBackoff` (deterministic with seeded RNG).
- Error classification tests: 404 is not retried; 503 triggers retry.
- Distributed lock/atomic claim test: verifying two workers cannot claim the same node run.
- DLQ replay test: dead letter resets node and skipped children to pending.

---

## Verification Checklist
- [ ] Worker process runs via `npm run worker` in a separate PowerShell window.
- [ ] Two or three worker processes concurrently process parallel branches of a diamond flow (verified in worker terminal logs).
- [ ] A flow with a failing HTTP endpoint (`https://httpbin.org/status/503`) retries with exponential backoff and jitter.
- [ ] After 3 failed attempts, the node is marked `dead` and appears in `GET /dlq` and on the DLQ frontend page.
- [ ] Clicking **Replay** in the DLQ UI resets the dead node and resumes execution.
- [ ] Terminating a worker mid-job is recovered and displayed as dead in `GET /workers`.
- [ ] All tests pass: `cd backend; npm test`.

---

## Beginner Viva Preparation for Phase 6
1. **Why use Redis + BullMQ instead of running everything inside the Express server?**  
   *Answer:* Decoupling. If a node performs heavy processing or makes a slow HTTP request, the Express API stays fast and responsive. Furthermore, if a worker crashes, the job is not lost—it remains safely in Redis and can be picked up by another worker.
2. **What is exponential backoff with "jitter" and why is jitter important?**  
   *Answer:* Exponential backoff doubles the wait time between retries (\(2s, 4s, 8s, 16s\)). Jitter introduces randomness (\(random \times delay\)). Without jitter, if an external service goes down and 100 failed jobs retry at the exact same second, they cause a "thundering herd" that crashes the service again.
3. **What is the difference between at-least-once delivery and exactly-once execution?**  
   *Answer:* Distributed message queues can guarantee that a job is delivered *at least once*, but network partitions or worker crashes might deliver it a second time. We achieve *safe execution* by pairing at-least-once delivery with **idempotency keys** and **atomic status claims** so duplicate deliveries are ignored.
