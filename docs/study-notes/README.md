# The Dormammu Loop — Comprehensive Study Guide & Interview Prep

Welcome to the permanent study notes for **The Dormammu Loop**.  
This folder is your **master revision handbook** for the **WEBSTER 2026 hackathon viva defense** and for future **software engineering interviews**.

Instead of brief chat messages that disappear, these files are committed directly to your repository so you and Madhav can review them anytime, anywhere.

---

## Team Split & Ownership Roadmap
Refer to [`docs/team-split.md`](../team-split.md) for full details.

| Guide | Topic | Primary Owner | Status |
|---|---|---|---|
| [`01-setup-and-infra.md`](./01-setup-and-infra.md) | Docker, PostgreSQL, Redis, Prisma, Express, Vite, CORS | **Both** | Complete |
| [`02-dag-and-algorithms.md`](./02-dag-and-algorithms.md) | Graph theory, Kahn's algorithm, cycle isolation, readiness | **Nikhil** | Complete |
| [`architecture-decisions-and-tradeoffs.md`](./architecture-decisions-and-tradeoffs.md) | **Master Defense:** Why this stack vs MongoDB, WebSockets, Kafka, Next.js | **Both** | Complete |
| [`03-flow-api-and-canvas.md`](./03-flow-api-and-canvas.md) | Flow CRUD API, Zod schemas, React Flow visual editor | **Madhav (API) / Nikhil (Canvas)** | Part B (Canvas) Complete |
| [`04-execution-engine.md`](./04-execution-engine.md) | In-process runner, safe templating, cascading skips, run history | **Nikhil (Engine) / Madhav (History)** | Phase 4 |
| [`05-triggers-and-idempotency.md`](./05-triggers-and-idempotency.md) | Webhooks, tokens, idempotency deduplication, `node-cron` | **Madhav** | Phase 5 |
| [`06-distributed-workers.md`](./06-distributed-workers.md) | Redis + BullMQ, atomic claims, exponential backoff with jitter, DLQ | **Nikhil** | Phase 6 |
| [`07-sse-streaming.md`](./07-sse-streaming.md) | Server-Sent Events, snapshot + pub/sub, live canvas animations | **Madhav** | Phase 7 |
| [`common-pitfalls-and-bugs.md`](./common-pitfalls-and-bugs.md) | Master directory of bugs, mistakes, edge cases & fixes | **Both** | Living Document |

---

## How to Use These Notes
1. **Before writing code:** Read the note for your phase to understand what you're building.
2. **After the AI builds the code:** Open the note to see which files were created, how data moves through them, and what tricky bugs were avoided.
3. **10-minute cross-teaching:** Use these notes to explain your 60% (or 40%) to your teammate so both of you can answer any question in the viva.
4. **Before the viva:** Quiz each other on the 5 Viva Questions included at the bottom of every guide.
