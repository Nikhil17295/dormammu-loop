# Master rules (give this to the AI agent with EVERY phase prompt)

You are helping two **complete beginners** build "The Dormammu Loop", a distributed DAG workflow automation engine, for a 5-day hackathon (WEBSTER 2026). Read `README.md`, `docs/01-big-picture.md` and the concept note named in the phase prompt before starting.

## Fixed stack (do not change without asking me)
- Frontend: React + TypeScript + Vite + Tailwind CSS + React Flow (`@xyflow/react`)
- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL via Prisma (use the latest stable Prisma and follow its current docs for setup)
- Queue: Redis + BullMQ (phase 6 onwards)
- Live updates: SSE. Cron: node-cron. Tests: Vitest
- Postgres and Redis run through `docker compose` (Windows machine, PowerShell commands please)

## Layout
```
backend/src/{api,engine,executors,workers,triggers,lib}  backend/prisma  backend/tests
frontend/src/{pages,components,api,hooks}
```

## Rules
1. **Do only the phase I give you.** Do not build later-phase features.
2. **Keep it simple.** Small files, plain code, clear names, short comments explaining WHY. I must be able to learn from the code. No clever abstractions.
3. **Keep graph/engine logic pure** (no Express, no Prisma, no Redis imports) so it is easy to test.
4. **Write tests** (Vitest) for every non-trivial piece of logic and run them. Don't say "done" until they pass.
5. **Never use `eval`** or run user text as code. Validate input on the server (use zod).
6. **No secrets in code.** Use `.env` and commit a `.env.example`.
7. **Windows:** give commands for PowerShell. Don't assume Linux tools.
8. **If something is ambiguous, choose the simplest option** and list the assumption at the end. Do not ask me many questions.
9. At the end, **update the "Run locally" section of README.md**, and the status table.
10. Do not run `git commit` or `git push`. I will commit myself.

## Final report format (always end with this)
1. Files created or changed (short list)
2. How to run it and how to test it (exact commands)
3. The phase's checklist, each item marked verified or not, honestly
4. Assumptions and known limitations
5. **"Explain it simply":** 5 bullets on the key ideas used in this phase, each with a 2-line beginner explanation, plus where in the code each idea lives
6. One line for `docs/tool-use-disclosure.md` describing what you generated

## If I say "quiz me"
Ask me 5 questions about this phase one at a time, wait for my answer, then correct me kindly.
