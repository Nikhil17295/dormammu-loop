# 05. Queue, workers and reliability (Phase 6)

## Why a queue?
If the API ran the nodes itself, a slow HTTP call would block it and a crash would lose work. With a **queue** (BullMQ on Redis) the API only adds jobs; separate **worker** programs take jobs and run them. More workers = more parallel work.

## Flow
1. A run is created. The engine finds the ready nodes and adds one job per node to the queue (NodeRun becomes `queued`).
2. A worker takes a job, marks the node `running`, runs the executor, saves the result (`success` or `failed`).
3. After saving, the worker asks the engine "what is ready now?" and queues those nodes. Repeat until the run ends.
4. The ready-check must be safe if two workers finish at the same time (a join node must not be queued twice). Use a database transaction/lock and the idempotency claim below.

## At-least-once delivery
A queue promises a job will be delivered **at least once**. If a worker crashes mid-job, the job comes back and runs again. It can **not** promise exactly-once. So we make jobs **idempotent**.

## Idempotency (safe to repeat)
- Each NodeRun has a unique key `runId:nodeId`.
- Before running, a worker "claims" the node with one atomic update: `set status=running where id=X and status=queued`. If no row changed, someone else has it: skip.
- If the node is already `success`, a duplicate delivery just returns the saved output.
- Outgoing HTTP calls send an `Idempotency-Key` header.
- Honest limit: if a worker does an external side effect (e.g. sends an email) and crashes before saving, we can not guarantee the outside world did it only once.

## Retries with exponential backoff and jitter
- Wait longer after each failure: delay = base x 2^attempt (capped).
- **Jitter** = randomise that delay, so many failing jobs don't all retry at the same moment (the "thundering herd").
- Example: `delay = random(0, min(cap, base x 2^attempt))`.
- Retry only **retryable** errors: timeouts, connection errors, HTTP 5xx and 429. Don't retry 4xx or config errors; they will never succeed.
- Each node has a configurable max retries. Attempt number and next retry time are saved.

## Dead-letter queue (DLQ)
When retries run out, the job is not thrown away. NodeRun becomes `dead`, a DeadLetter row stores the error and attempts, descendants are `skipped`, and the run is `failed`. A person can inspect it and **replay** it.

## Worker heartbeats
Each worker writes "I'm alive" (id, last seen time) every ~5 seconds. A check marks workers dead if they have been silent for ~15 seconds. BullMQ also detects "stalled" jobs from dead workers and re-delivers them. Together: a crashed worker's job is picked up again.

## Likely viva questions
- What happens if a worker dies mid-job?
- Why not exactly-once?
- What is jitter and why?
- Difference between a retry and the DLQ?
- How do you prevent a node running twice?
