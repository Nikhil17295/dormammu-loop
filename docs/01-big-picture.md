# 01. The big picture

## Web basics you need (5 minutes)
- **Frontend:** what runs in the browser (our React app, the canvas).
- **Backend / API:** a program on a server that the frontend talks to over HTTP (our Express app). It stores data and does the real work.
- **Database:** where data lives permanently (PostgreSQL). **Prisma** is a tool that lets TypeScript code talk to it.
- **Redis:** a very fast in-memory store. We use it as a to-do list for workers (a queue) and as a message channel.
- **Worker:** a separate program that takes jobs from the queue and does them.

## What the project does in one paragraph
You draw a graph in the browser. It is saved through the API into the database. When something **triggers** a run (you click Run, a webhook arrives, or a cron time hits), the server creates a **Run** record and works out which nodes may start. Each node is a job on the Redis queue; workers do the jobs and save the results in the database. As things happen, live events are pushed to the browser (SSE) so the canvas updates.

## Picture
```
Browser (React + React Flow)
   |  save flow, run, view history         ^ live events (SSE)
   v                                       |
Express API ------------------------> Redis (pub/sub for events)
   |   create Run, queue ready nodes        ^
   v                                        |
Redis queue (BullMQ) ---> Workers ----------+
                            | run node, retry
                            v
                       PostgreSQL (flows, runs, node runs, logs, dead letters)

Cron timer and Webhook URL --> both call the same "create run" function
```

## The key ideas (memorise these five)
1. **The database is the truth.** Redis can be wiped; history must survive.
2. **A node runs only when all its parents succeeded.**
3. **Manual, webhook and cron all use one function to start a run.**
4. **A job can be delivered twice** (a crash, a retry), so the work must be safe to repeat (idempotency).
5. **Failures are recorded, not hidden:** retries, then a dead-letter queue.

## Tables (simple version)
- **Flow:** name, the graph (nodes and edges as JSON)
- **Run:** which flow, status, the trigger payload, start/end time
- **NodeRun:** one row per node per run: status, attempt number, input, output, error, times
- **LogLine:** log messages per node run
- **DeadLetter:** jobs that failed after all retries
- **Trigger:** webhook token or cron expression for a flow
- **IdempotencyRecord:** keys to ignore duplicate webhook deliveries
- **WorkerHeartbeat:** which workers are alive

## Statuses
Run: `pending, running, success, failed`
NodeRun: `pending, queued, running, success, failed, retrying, skipped, dead`
`skipped` means a parent failed so this node never ran. `dead` means retries ran out.
