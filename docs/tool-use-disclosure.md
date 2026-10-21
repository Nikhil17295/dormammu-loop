# AI tool-use disclosure

WEBSTER requires a tool-use disclosure. Keep this file honest and current. Fill in the details; do not leave it for the last minute.

## Tools used
| Tool | Used for |
|---|---|
| Antigravity (AI coding agent) | Writing most of the application code, tests and boilerplate, following the prompts in `prompts/` |
| Claude (chat assistant) | Project planning, concept explanations, writing study notes and the phase prompts |

## How we used them
- Each phase has a written prompt in `prompts/`. The agent implemented that phase; we ran, checked and tested the result, and fixed problems by re-prompting.
- We reviewed generated code, ran the tests, and studied each phase using the notes in `docs/`.

## Per-phase log
| Phase | Tool | What it generated | What we checked / changed |
|---|---|---|---|
| 1 | Antigravity | Docker compose file, Express backend scaffold with TypeScript & Prisma schema (8 models), Vite + React + Tailwind frontend with health status page, and Vitest suite | Verified Docker containers (Postgres & Redis), verified Prisma migrations applied all 8 tables, ran backend test suite, built frontend without warnings |
| 2 | | | |
