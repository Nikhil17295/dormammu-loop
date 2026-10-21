# 07. Viva cheat sheet

**30-second pitch:** "The Dormammu Loop is a visual workflow engine. You draw a DAG; the server rejects cycles, runs nodes in dependency order, and records every run. Runs start from a button, a webhook or cron. In the distributed tier, nodes run on BullMQ workers over Redis with retries (exponential backoff with jitter), a dead-letter queue, and live updates to the canvas over SSE."

## Fundamentals
1. What is a DAG? Why no cycles? (A cycle means nodes wait on each other forever.)
2. How do you detect a cycle? (Kahn's algorithm, O(V+E); leftover nodes mean a cycle.)
3. When can a node run? (When all parents succeeded.)
4. What happens if a node fails? (Descendants skipped; independent branches continue; run failed.)

## Architecture
5. Why a queue and separate workers? (API isn't blocked; scale by adding workers; survive crashes.)
6. What is the source of truth? (PostgreSQL. Redis is transport.)
7. Why these technologies? (React Flow for the canvas, Express for a simple API, Prisma for typed DB access, BullMQ for queues on Redis.)

## Reliability
8. Exactly-once? (No. At-least-once delivery plus idempotency.)
9. Backoff and jitter? (Spacing retries out; randomness avoids synchronized retry bursts.)
10. DLQ? (Parking place for jobs that ran out of retries; inspect and replay.)
11. Worker crash? (Job is re-delivered; claim-before-run prevents double execution; heartbeats show the worker is dead.)
12. How do you stop a duplicate webhook? (Idempotency-Key.)

## Live updates
13. SSE vs WebSocket? (One-way, simpler, auto-reconnect.)
14. Browser refresh mid-run? (Snapshot from the DB, then live events.)

## Say these limitations yourselves (it shows maturity)
- Scheduler runs in a single process.
- Simple template language, not a full expression language.
- No user accounts / authentication.
- Only HTTP, transform, delay, output node types (plus trigger).
- No workflow versioning; no SSRF protection; no full load-test report.
- Idempotency can't guarantee exactly-once for third-party side effects.
(Edit this list to match what is really implemented.)

## Honest answers help
If you don't know something: "We used AI to write that part; here's how it works as I understand it, and here's what I'm unsure about." Better than bluffing.

## Glossary
DAG, topological sort, in-degree, fan-out, fan-in, idempotency, at-least-once, backoff, jitter, DLQ, heartbeat, pub/sub, SSE, webhook, cron, payload injection, 202 Accepted.
