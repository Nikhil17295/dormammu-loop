# Team split (about 60 / 40)

The AI writes the code, so the split is about **who drives each phase, reviews it, and learns it first**. Commit under whoever actually ran and reviewed that work. Never invent contributions: commit history is audited.

## Nikhil (about 60%): the core
- Phase 2: graph logic (cycle detection, topological order, readiness)
- Phase 3: the visual editor (React Flow canvas, node config panel, client-side cycle check)
- Phase 4: the execution engine
- Phase 6: BullMQ workers, retries with backoff and jitter, DLQ, idempotency, heartbeats

## Madhav (about 40%): the supporting parts
- Phase 3: flow save/load API (Express + Prisma)
- Phase 4: run history API and the run history / run detail pages
- Phase 5: webhook and cron triggers
- Phase 7: SSE stream and the live view on the canvas
- Phase 8: tests pass, README final, setup instructions

## Both
- Phase 1 together (so both machines work and both understand the layout)
- Phase 8: viva practice, quiz each other

## How the two sides connect
- Graph logic is pure functions (no database), so Nikhil can build it without waiting.
- The API and database do not need the engine, so Madhav can build them in parallel.
- They meet in Phase 4: the engine saves results through the run-history code. Agree on the database tables first (they are in Phase 1's Prisma schema).
- Use branches named `nikhil/...` and `madhav/...`, merge to `main` only when it works. Pull `main` before starting each phase.

## Cross-teaching (important for the viva)
After each phase, the owner spends 10 minutes explaining it to the other. The viva will ask both of you about everything.
