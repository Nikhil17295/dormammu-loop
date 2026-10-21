# Phase 4: In-Process Execution Engine & Run History (Day 3)

**Read first:** `docs/03-execution-engine.md`  
**Give the agent:** `prompts/00-master-rules.md` + this file.  
*(Prerequisites: Phase 2 graph algorithms and Phase 3 flow persistence must be completed).*

---

## Goal
Build the execution engine and run history system. A user can click **Run** on any saved workflow, provide an optional input payload, execute the DAG in topological order with parallel node execution, store step-by-step inputs, outputs, and logs in PostgreSQL, and inspect the live execution results in the UI.

**Architecture Note:** In this phase, the engine runs **in-process** via Node.js async concurrency (`Promise.all`). This guarantees a rock-solid, fully testable execution engine independent of Redis. Phase 6 later adds BullMQ worker distribution without changing the executor logic.

---

## Required Tasks & Specifications

### Part A: Safe Node Executors & Templating (`backend/src/executors/` & `backend/src/engine/`)

1. **Safe Variable Templating (`backend/src/engine/templating.ts`):**
   - Pure function `resolveTemplate(template: string, context: Record<string, any>): any`.
   - Replaces expressions like `{{ trigger.userId }}` or `{{ nodes.fetchUser.output.email }}` by safely resolving nested object paths.
   - **Strict Security Rule:** **Never** use `eval()`, `new Function()`, or dynamic script execution. Use safe object path traversal (`path.split('.').reduce(...)`).
   - If a referenced path does not exist, return an empty string or clear placeholder without crashing.
   - Unit tests covering: simple substitution, deep nested paths (`a.b.c`), numbers/booleans, and missing keys.

2. **Modular Node Executors (`backend/src/executors/`):**
   Create an executor interface `(node: GraphNode, context: ExecutionContext) => Promise<any>` and implement:
   - `trigger`: Returns the run's trigger payload.
   - `http`: Executes an HTTP request via native `fetch`:
     - Method, resolved URL, headers, and body.
     - Timeout support via `AbortController` (default 10s, max 30s).
     - Resolves JSON responses automatically; parses text otherwise.
     - HTTP status >= 400 or network failure throws an error.
   - `transform`: Applies `resolveTemplate` to its configured template or JSON mapping.
   - `delay`: Pauses execution cleanly via `new Promise(res => setTimeout(res, ms))` (capped at 60 seconds).
   - `output`: Returns the resolved payload as the workflow's final result.
   - Sensitive data masking: Redact any header or field matching `authorization`, `password`, `token`, `secret`.

3. **In-Process DAG Runner (`backend/src/engine/runner.ts`):**
   - Implement `createRun(flowId: string, payload: any, triggerSource: string): Promise<Run>`:
     - Creates `Run` record with status `'pending'`.
     - Initializes a `NodeRun` record for every node in the flow with status `'pending'` and an idempotency key (`${runId}:${nodeId}`).
     - Triggers `executeRun(run.id)` asynchronously in the background.
     - Returns the created `Run` immediately.
   - Implement `executeRun(runId: string): Promise<void>`:
     - Mark `Run` status as `'running'`.
     - Maintain an in-memory execution context: `{ trigger: payload, nodes: { [nodeId]: { output } } }`.
     - Execution loop:
       1. Query current `NodeRun` statuses.
       2. Call `readyNodes(graph, statusByNodeId)` from Phase 2.
       3. If ready nodes exist:
          - Execute them **in parallel** using `Promise.allSettled`.
          - For each ready node: mark `running`, call its executor, record start/finish times, save output/error in PostgreSQL, and insert `LogLine` rows.
          - If a node fails: mark its status as `'failed'`. Use `descendantsOf(graph, failedNodeId)` to immediately mark all its downstream nodes as `'skipped'`.
       4. Repeat until no nodes remain in `'pending'` or `'running'` status.
     - Update final `Run` status: `'success'` if all reachable nodes succeeded; `'failed'` if any node failed.

4. **Execution Trigger Endpoint (`backend/src/api/flows.ts`):**
   - `POST /flows/:id/run`: Accepts optional JSON body as trigger payload.
   - Calls `createRun(flow.id, req.body, 'manual')`.
   - Responds immediately with HTTP 202: `{ runId: run.id, status: 'pending' }`.

---

### Part B: Run History API & Frontend Inspector (`backend/src/api/` & `frontend/src/`)

1. **Run History Endpoints (`backend/src/api/runs.ts`):**
   - `GET /runs`: List past workflow runs with query parameters (`flowId`, `status`, `limit`, `offset`), sorted newest first.
   - `GET /runs/:id`: Returns full run summary, overall duration, and array of all `NodeRun` records with their statuses and execution times.
   - `GET /runs/:id/nodes/:nodeId`: Detailed record for a specific node execution: input JSON, output JSON, error message, and all associated `LogLine` records.

2. **Frontend Run History List (`frontend/src/pages/RunListPage.tsx`):**
   - Table displaying: Run ID, Flow Name, Trigger Source (Manual / Webhook / Cron), Status Badge (Running / Success / Failed), Started At, Duration.
   - Click a run to open the Run Detail Inspector.

3. **Frontend Visual Run Inspector (`frontend/src/pages/RunDetailPage.tsx`):**
   - Renders the workflow DAG in read-only mode using React Flow.
   - Dynamic node card styling reflects real-time status:
     - `pending`: gray border/badge.
     - `running`: blue border with pulsing indicator.
     - `success`: emerald green border and check icon.
     - `failed`: rose red border and alert icon.
     - `skipped`: dark muted gray with slashed icon.
   - **Polling mechanism:** While the run status is `'pending'` or `'running'`, automatically poll `GET /runs/:id` every 1.5 seconds. Stop polling when the run reaches `'success'` or `'failed'`.
   - **Node Execution Drawer:** Clicking any node in the canvas opens an inspection drawer showing:
     - Status, attempt number, started/finished timestamps, and duration.
     - Formatted JSON viewers for Node Input and Node Output.
     - Error banner if status is `'failed'`.
     - Timestamped execution log terminal displaying all `LogLine` entries.

4. **Canvas Run Button Integration:**
   - In the Workflow Editor (`frontend/src/pages/EditorPage.tsx`):
     - Click **"Run Workflow"**: opens a modal to input custom JSON payload (defaults to `{}`).
     - Submitting calls `POST /flows/:id/run` and navigates directly to the Run Detail page to watch execution proceed.

---

## Verification Checklist
- [ ] In-process execution runner executes nodes in exact topological order.
- [ ] Diamond graphs execute parallel branches concurrently via `Promise.allSettled`.
- [ ] A failing node causes all its descendants to be marked `skipped`, while independent branches continue executing.
- [ ] Safe templating parses `{{ trigger.foo }}` without using `eval()`.
- [ ] Sensitive headers/keys are redacted from logs and database records.
- [ ] Automated tests in `backend/tests/engine.test.ts` pass with zero failures.
- [ ] Clicking **Run** in the UI executes a complete end-to-end flow (`trigger -> http -> transform -> output`).
- [ ] Run Inspector displays node status colors and real-time execution logs.

---

## Beginner Viva Preparation for Phase 4
1. **How do parallel nodes execute at the same time in Node.js?**  
   *Answer:* Node.js uses an asynchronous event loop. When multiple nodes are ready (e.g. in a diamond graph), we launch their promises concurrently using `Promise.allSettled`. As network requests or timers wait in the background, the event loop handles whichever finishes first.
2. **What is cascading skip and why is it important?**  
   *Answer:* If Node A fails, any child Node B that depends on Node A cannot possibly run because it lacks required input. The engine immediately finds all downstream descendants of Node A and marks them `skipped` instead of leaving them stuck in `pending` forever.
3. **Why did we forbid `eval()` for variable templating?**  
   *Answer:* Security. If a workflow accepted user input (like a webhook payload) and passed it to `eval()`, an attacker could inject malicious JavaScript (`Remote Code Execution`) to compromise our server. Safe object-path lookup eliminates this vulnerability entirely.
