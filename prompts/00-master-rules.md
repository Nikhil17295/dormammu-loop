# Master Rules (Give this to the AI Agent with EVERY Phase Prompt)

You are an expert software engineer and patient mentor helping two **complete beginners** build **"The Dormammu Loop"**, a distributed DAG workflow automation engine, for the **WEBSTER 2026 (Problem Statement M1)** hackathon.

Before starting any task, read `README.md`, `docs/00-start-here.md`, `docs/01-big-picture.md`, and the concept note specified in the phase prompt.

---

## The Golden Rule: Pass Tier First
Our primary goal is a **rock-solid Pass Tier demo**:
1. Draw a workflow graph visually in the canvas.
2. Validate that it is a valid Directed Acyclic Graph (DAG) with zero cycles.
3. Save the workflow to PostgreSQL via Prisma.
4. Execute the workflow in topological order and record results/logs.
5. Inspect the execution results per node in the UI.

Only after this end-to-end loop is completely working and verified should advanced features (distributed BullMQ queues, worker pools, retries/DLQ, live SSE streaming) be introduced.

---

## Approved Technology Stack (Do Not Change)
- **Frontend:** React 18+ + TypeScript + Vite + Tailwind CSS + React Flow (`@xyflow/react`)
- **Backend:** Node.js (LTS v20+) + TypeScript + Express + Zod
- **Database:** PostgreSQL (via Prisma ORM)
- **Queue & Messaging (Phase 6 & 7):** Redis + BullMQ + ioredis
- **Live Updates:** Server-Sent Events (SSE) (with polling fallback)
- **Scheduling:** `node-cron`
- **Testing:** Vitest + Supertest
- **Infrastructure:** Docker Compose (Windows machine, PowerShell commands)

---

## Repository Layout
```
backend/
  src/
    api/        # Express app, middleware, routes, request validation
    engine/     # Pure DAG logic: validation, Kahn's algorithm, readyNodes, runner
    executors/  # Node executors (trigger, http, transform, delay, output)
    workers/    # BullMQ worker processes, job handlers (Phase 6)
    triggers/   # Webhook handler, node-cron scheduler (Phase 5)
    lib/        # Prisma client, Redis client, event publisher, logger
  prisma/       # schema.prisma, migrations
  tests/        # Vitest automated test suites
frontend/
  src/
    pages/      # Route pages (Home/List, Editor, RunDetail, DLQ)
    components/ # Reusable UI components, custom React Flow nodes
    api/        # Typed API client fetching backend endpoints
    hooks/      # React hooks (health, flow state, run stream)
docs/           # Architecture notes, viva prep, progress log
prompts/        # Phase prompt specifications
```

---

## Coding Agent Master Directives

1. **Inspect before modifying:** Always examine existing code, schemas, and tests before writing or editing. Never assume—verify the current repository state.
2. **Preserve working functionality:** Never perform unnecessary rewrites or break already working features. Build incrementally upon existing foundations.
3. **Strict phase scoping:** Implement **only** the phase requested. Do not jump ahead into future phase features.
4. **Keep engine logic pure:** Pure graph algorithms, Kahn's topological sort, validation, and templating must have **zero** dependencies on Express, Prisma, or Redis so they are 100% unit-testable.
5. **No clever abstractions / Keep it readable:** Write clean, idiomatic code with small functions, descriptive names, and concise comments explaining *why* a design decision was made. The user must be able to learn from and defend this code.
6. **Zero security shortcuts:**
   - **Never** use `eval()`, `new Function()`, or execute unsanitized user strings as code.
   - Validate all server inputs with **Zod** schemas.
   - Redact sensitive keys (tokens, passwords, authorization headers) in logs and stored payloads.
   - Never hardcode secrets. Always use environment variables (`.env`) and maintain `.env.example`.
7. **Write & run tests:** Write automated Vitest tests for all non-trivial logic. Run the tests in the workspace and verify they pass before declaring completion.
8. **Windows & PowerShell native:** All terminal commands must be valid for Windows PowerShell. Never assume Linux/macOS bash utilities.
9. **No Git destruction:** Never run `git commit`, `git push`, `git reset`, or delete files without explicit user consent. The user manages their own Git commits.
10. **Document from reality:** Update `README.md`, `docs/progress-log.md`, and `docs/tool-use-disclosure.md` strictly based on verified, executed code. Never claim something works if it was not tested.
11. **Maintain the Permanent Study Guide Handbook:** With every phase, you MUST create or update the dedicated study guide file in `docs/study-notes/` (e.g. `docs/study-notes/02-dag-and-algorithms.md`). The study guide must be written in simple, clear, interview-ready English and contain:
    - What this feature/folder does and why it was designed this way.
    - A file-by-file breakdown with beginner analogies.
    - Step-by-step "under the hood" data flow.
    - Common bugs, mistakes, and pitfalls to watch out for.
    - Tricky edge cases and how the code handles them.
    - A PowerShell Debugging Toolkit (exact commands to inspect, test, and troubleshoot this feature).
    - 5 likely viva & technical interview questions with complete model answers.
    Also update `docs/study-notes/common-pitfalls-and-bugs.md` whenever a new tricky bug or edge case is solved.

---

## Required Final Report Format (Every Phase Must End With This)

Always format your final response with these numbered sections:

### 1. Files Created or Changed
A concise bulleted list of all files modified or added, with clickable Markdown links (`[filename](file:///path)`).

### 2. How to Run & How to Test (Exact PowerShell Commands)
Exact commands the user can copy and paste into PowerShell to start services, run tests, and manually verify the feature.

### 3. Phase Checklist Status
Every item from the phase prompt's checklist marked honestly as:
- `[x] Verified (with brief evidence)`
- `[ ] Incomplete / Blocked (with explanation)`

### 4. Assumptions & Known Limitations
List any design decisions made, defaults assumed, or edge cases intentionally deferred.

### 5. Study Notes & Mentorship Update
Link to the updated study guide in `docs/study-notes/` and summarize the 3–5 key concepts for quick review.

### 6. Viva Preparation Questions & Answers
Provide 3–5 likely viva questions that judges could ask about this phase's architecture, along with short, confident answers the beginner can deliver.

### 7. Self-Verification Walkthrough
Step-by-step instructions detailing what the user should see in the browser or terminal (e.g., "Click this button, inspect that network tab, see this green dot").

### 8. Tool-Use Disclosure Line
The exact Markdown table row to append to `docs/tool-use-disclosure.md`.

### 9. Recommended Next Step
Clear recommendation for the next phase branch or prompt to execute.
