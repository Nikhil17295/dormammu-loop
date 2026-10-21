# 01. The Big Picture

## Web Basics for Beginners (5 Minutes)
- **Frontend:** What runs inside the browser (our React 18 application and React Flow visual canvas).
- **Backend / API:** The Node.js Express server that accepts requests, validates workflows, stores data, and coordinates execution.
- **Database:** Where records live permanently (PostgreSQL). **Prisma** is our ORM (Object-Relational Mapping tool) that allows TypeScript code to query the database safely.
- **Redis:** An ultra-fast in-memory data store used in Phase 6 as a BullMQ task queue and in Phase 7 as a real-time Pub/Sub message broker.
- **Worker:** A background Node.js process that pulls jobs from Redis and executes them independently of the web API.

---

## Two-Tier Strategy: Pass Tier First, Then Distributed Tier
To guarantee that you finish a complete, high-scoring project on time, the architecture is split into two distinct tiers:

### Tier 1: The Pass Tier (Phases 1 through 5)
- **Goal:** A complete, working product that judges can see and test end-to-end.
- **How it runs:** In-process inside Express using asynchronous Node.js concurrency (`Promise.all`).
- **Capabilities:**
  1. Draw workflow graphs in React Flow.
  2. Validate DAGs and reject cycles (Kahn's algorithm).
  3. Save workflows to PostgreSQL via Prisma.
  4. Execute workflows manually or via webhooks and cron schedules.
  5. Inspect step-by-step inputs, outputs, errors, and logs in the UI.
- **Guarantee:** Even if you run out of time before completing the distributed tier, **your project is 100% complete, fully functional, and earns the baseline pass grade.**

### Tier 2: The Distributed Tier (Phases 6 and 7)
- **Goal:** Production-grade scalability and reliability.
- **How it runs:** Node tasks are offloaded to Redis BullMQ worker processes.
- **Capabilities:**
  1. Parallel worker pools.
  2. Automatic retries with exponential backoff and full jitter.
  3. Dead-Letter Queue (DLQ) with one-click failure replay.
  4. Real-time canvas updates streamed over Server-Sent Events (SSE).

---

## Architecture Flow Diagram

```
[ Browser: React + React Flow Canvas ]
       |                              ^
       | HTTP (Save / Run / History)   | Live Events (SSE)
       v                              |
[ Express API Server ] -------------> [ Redis Pub/Sub ]
       |                                      ^
       |-- (Pass Tier: in-process runner)     |
       |                                      |
       |-- (Distributed Tier: enqueue job)    |
       v                                      |
[ BullMQ Redis Queue ] --> [ Worker Processes ]
       |                              |
       +------------------------------+
                      |
                      v (Store flows, runs, logs, dead letters)
             [ PostgreSQL Database ]
```

---

## The 5 Core Principles (Memorize These for Your Viva)
1. **The database is the single source of truth:** Redis is temporary transport; all flow definitions, run history, and logs survive permanently in PostgreSQL.
2. **A node runs only when all its parent dependencies succeed:** Diamond joins wait for both incoming branches to reach `success`.
3. **Unified execution entrypoint:** Manual runs, webhook triggers, and cron timers all route through the same `createRun()` function.
4. **Idempotency over exactly-once:** Distributed networks can deliver duplicate messages; workflows remain safe because identical idempotency keys ignore repeat executions.
5. **Failures are surfaced, not hidden:** Failing nodes cascade `skipped` status to downstream children, retry with jitter, and park in a Dead-Letter Queue for human inspection.

---

## The 8 Database Models (Quick Reference)
- **`Flow`:** Saved workflow definition with name and JSON graph (nodes + edges).
- **`Trigger`:** Webhook token or cron expression linked to a flow.
- **`Run`:** Top-level workflow execution instance (status, payload, timestamps).
- **`NodeRun`:** Individual node execution record within a run (input, output, status, error, attempt).
- **`LogLine`:** Timestamped console log emitted during a node's execution.
- **`DeadLetter`:** Permanently failed job captured after retries are exhausted.
- **`IdempotencyRecord`:** Keys used to deduplicate incoming webhook payloads and prevent duplicate runs.
- **`WorkerHeartbeat`:** Liveness tracker recording active worker IDs and timestamps.

---

## Status State Machine
- **Run Statuses:** `pending` -> `running` -> `success` | `failed`
- **NodeRun Statuses:**
  - `pending`: Waiting for parent nodes to finish.
  - `queued`: Enqueued in Redis/BullMQ waiting for an available worker.
  - `running`: Currently executing.
  - `success`: Execution completed successfully.
  - `retrying`: Failed retryable error; waiting for backoff delay.
  - `skipped`: An upstream parent node failed; this node was bypassed.
  - `dead`: Retries exhausted; quarantined in the Dead-Letter Queue.
  - `failed`: Terminal failure in in-process mode.
