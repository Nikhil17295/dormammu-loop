# Study Guide 04: In-Process DAG Execution Engine & Safe Templating

> **Target Audience:** Nikhil & Madhav (WEBSTER 2026)  
> **Topic:** Phase 4 Execution Engine (Part A)  
> **Primary Owner:** Nikhil (Algorithms & Engine Lead)  
> **Key Concepts:** In-Process DAG Runner, `readyNodes` Resolution Loop, Parallel Concurrency via `Promise.allSettled`, Cascading Skips (`descendantsOf`), Zero-Eval Safe Object-Path Templating, Sensitive Data Redaction, Modular Node Executors.

---

## 1. What Was Built & Why It Exists

In Phase 2 we built pure DAG algorithms (cycle validation, topological sort, and readiness checks), and in Phase 3 we built workflow persistence in PostgreSQL and the visual React Flow canvas.

**Phase 4 brings the workflows to life:**
1. **Safe Variable Templating Engine (`backend/src/engine/templating.ts`):** Allows downstream nodes to read outputs from upstream nodes (e.g. `{{ trigger.userId }}` or `{{ nodes.step1.output.email }}`) with **strict zero-eval security**.
2. **Modular Node Executors (`backend/src/executors/`):** A clean pluggable architecture with individual executors for `trigger`, `transform`, `http`, `delay`, and `output`.
3. **In-Process DAG Runner (`backend/src/engine/runner.ts`):** An asynchronous topological execution engine. It polls `readyNodes(graph, statusByNodeId)`, launches independent branches concurrently using `Promise.allSettled`, captures step-by-step outputs in PostgreSQL, and marks descendants as `'skipped'` if an upstream dependency fails.
4. **Trigger REST Endpoint (`POST /flows/:id/run`):** Accepts trigger payloads, validates the graph, creates `Run` and `NodeRun` records, starts background execution, and responds immediately with `HTTP 202 Accepted`.
5. **Data Protection & Masking (`backend/src/executors/masking.ts`):** Redacts passwords, tokens, API keys, and authorization headers before storing inputs/outputs in PostgreSQL or writing logs.

### Why In-Process First Before BullMQ (Phase 6)?
Building an in-process runner first adheres to the hackathon's **Pass Tier First rule**:
- **Zero Redis Dependency for Logic Testing:** We can verify topological order, branch concurrency, cascading skips, and templating with 100% deterministic unit and integration tests.
- **Identical Executor Interface:** When BullMQ worker distribution is introduced in Phase 6, the exact same modular executors (`getExecutor(node.type)`) and templating functions are reused without rewriting a single line of business logic!

---

## 2. File-by-File Breakdown with Beginner Analogies

| File | What It Does | Beginner Analogy |
|---|---|---|
| [`backend/src/engine/templating.ts`](file:///m:/dormammu-loop/backend/src/engine/templating.ts) | Pure object-path template resolver. Replaces `{{ trigger.foo }}` or `{{ nodes.A.output.bar }}` with values from the run context. Enforces prototype pollution protection. | The **Mailroom Labeler**. Safely finds values inside mailboxes without ever opening a shell or running unknown scripts. |
| [`backend/src/executors/types.ts`](file:///m:/dormammu-loop/backend/src/executors/types.ts) | Defines `ExecutionContext` (`trigger`, `nodes`) and the `NodeExecutor` function signature. | The **Standard Electrical Plug**. Guarantees all node types fit into the engine in the exact same way. |
| [`backend/src/executors/masking.ts`](file:///m:/dormammu-loop/backend/src/executors/masking.ts) | Deeply clones and scrubs passwords, bearer tokens, API keys, and secrets with `"[REDACTED]"`. | The **Black Sharpie**. Scrubs confidential data before anyone files the report into public archives. |
| [`backend/src/executors/trigger.ts`](file:///m:/dormammu-loop/backend/src/executors/trigger.ts) | Extracts the incoming trigger payload that initiated the workflow run. | The **Starting Gun**. Hands the opening relay baton to the first runners. |
| [`backend/src/executors/transform.ts`](file:///m:/dormammu-loop/backend/src/executors/transform.ts) | Evaluates templates and structured mappings from previous node outputs into new JSON payloads. | The **Translator / Chef**. Combines ingredients from upstream bowls into a newly plated dish. |
| [`backend/src/executors/delay.ts`](file:///m:/dormammu-loop/backend/src/executors/delay.ts) | Pauses execution cleanly via `setTimeout` promise, strictly bounded between 0 and 60 seconds. | The **Egg Timer**. Keeps the recipe waiting for a precise number of seconds. |
| [`backend/src/executors/http.ts`](file:///m:/dormammu-loop/backend/src/executors/http.ts) | Performs native `fetch` requests with configurable headers, methods, auto-parsed JSON, and `AbortController` timeouts (capped at 30s). | The **Courier**. Delivers an envelope to an external office and brings back the reply, with a stopwatch in hand. |
| [`backend/src/executors/output.ts`](file:///m:/dormammu-loop/backend/src/executors/output.ts) | Gathers and emits final workflow results or named output bundles. | The **Shipping Dock**. Packs up the completed order for the customer. |
| [`backend/src/executors/index.ts`](file:///m:/dormammu-loop/backend/src/executors/index.ts) | Registry mapping `NodeType` to its executor function via `getExecutor(type)`. | The **Tool Rack**. Grab the right tool by reading the label on the handle. |
| [`backend/src/engine/runner.ts`](file:///m:/dormammu-loop/backend/src/engine/runner.ts) | Coordinates the in-process execution loop: `createRun`, `executeRun`, `waitForRun`, cascading skips, and DB log persistence. | The **Assembly Line Foreman**. Checks who is ready, starts multiple workers at once, halts downstream steps if a machine breaks, and signs off on the final run report. |
| [`backend/src/api/flows.ts`](file:///m:/dormammu-loop/backend/src/api/flows.ts) | Contains `POST /flows/:id/run` which validates the graph, initiates `createRun`, and responds with `HTTP 202 Accepted`. | The **Order Desk**. Hands you a claim check ticket (`202 Accepted` with `runId`) while the factory gets to work in the back. |

---

## 3. Under the Hood: Step-by-Step Data Flow

```
1. Client sends POST /flows/:id/run with optional trigger JSON payload.
2. API validates flow exists and confirms graph is a valid DAG (zero cycles).
3. createRun() creates Run (status: 'pending') and NodeRuns (all 'pending') in PostgreSQL.
4. API responds immediately with HTTP 202 { runId, status: 'pending' }.
5. executeRun() starts in background:
   ├── Sets Run status = 'running'.
   ├── Initializes in-memory context: { trigger: payload, nodes: {} }.
   └── WHILE pending or running nodes exist:
       ├── Call readyNodes(graph, statusByNodeId).
       ├── If ready nodes found:
       │   ├── Set ready nodes status = 'running' in PostgreSQL + insert LogLine.
       │   ├── Launch executors concurrently via Promise.allSettled.
       │   ├── On Success:
       │   │   ├── Save sanitized output in PostgreSQL.
       │   │   ├── Save output to in-memory context: context.nodes[nodeId] = { output }.
       │   │   └── Set NodeRun status = 'success' + insert LogLine.
       │   └── On Failure:
       │       ├── Set NodeRun status = 'failed' + insert error LogLine.
       │       ├── Find descendantsOf(graph, failedNodeId).
       │       └── Immediately mark all reachable pending descendants as 'skipped'.
       └── If no ready nodes remain and pending nodes exist:
           └── Mark remaining unreached pending nodes as 'skipped'.
6. Update final Run status:
   └── 'failed' if any node failed; 'success' if all reached nodes succeeded.
```

---

## 4. Key Engineering Design Decisions & Trade-offs

### A. The Strict Ban on `eval()` and `new Function()`
- **The Risk:** In automation platforms (like Zapier, Make, n8n), users write variable templates like `{{ trigger.user.id }}`. Beginners often use `eval("context." + expr)` because it's only one line of code. However, if a user's webhook payload contains:
  `"{{ (function(){ require('child_process').execSync('rm -rf /') })() }}"`
  Using `eval()` executes that malicious payload directly on the server (**Remote Code Execution / RCE**)!
- **Our Solution:** `backend/src/engine/templating.ts` uses pure functional string splitting and property traversal:
  `path.replace(/\[(\d+)\]/g, '.$1').split('.').reduce(...)`
  It blocks access to `__proto__`, `prototype`, and `constructor` to prevent **Prototype Pollution**. If an expression path does not exist, it safely returns an empty string without crashing.

### B. Concurrency: `Promise.allSettled` vs `Promise.all`
- **Why NOT `Promise.all`:** `Promise.all` short-circuits on the *first* rejection. If Node B and Node C are running in parallel, and Node B throws an error, `Promise.all` immediately aborts and ignores Node C. Node C would be left running in an unmonitored zombie state, and its database status would never be updated!
- **Why `Promise.allSettled`:** `Promise.allSettled` waits until **every** branch in the concurrent batch finishes, regardless of whether they succeeded or failed. We inspect each result individually, save outputs for successful nodes, and record errors for failed nodes.

### C. Cascading Skip vs Stuck Pending
- If Node A fails in `A -> B -> C`, Node B and Node C can never execute because Node B requires output from Node A.
- Without cascading skips, Node B and Node C would remain in `'pending'` forever, leaving users confused about why their workflow is frozen.
- Our engine calls `descendantsOf(graph, failedNodeId)` and immediately updates all downstream children to `'skipped'`, explaining the exact reason: `"Skipped due to upstream failure of node 'A'"`. Independent parallel branches (`A_healthy -> D`) continue running uninterrupted.

---

## 5. Tricky Edge Cases Solved

1. **Native Types in Single Template Expressions:**
   - If someone specifies a template `"{{ trigger.score }}"` where `score` is the number `95`, returning `"95"` (string) breaks arithmetic or JSON schemas.
   - Our `resolveTemplate` checks if the string matches `/^\{\{\s*([^}]+?)\s*\}\}$/` exactly. If so, it preserves the native type (`number`, `boolean`, `object`, `array`). If it's part of a larger sentence (`"Score is {{ trigger.score }}"`), it interpolates as a string.
2. **Database Record Deletion During Background Async Execution:**
   - In automated test teardown or when a user deletes a flow while a run is executing, PostgreSQL removes the `Run` and `NodeRun` rows via `onDelete: Cascade`.
   - When the background async runner attempted to update the deleted `NodeRun`, Prisma threw `P2025: Record to update not found`.
   - `runner.ts` explicitly guards against `P2025` errors so teardown and flow deletions never trigger uncaught server rejections.
3. **Database Test Concurrency (`vitest.config.ts`):**
   - Vitest runs test files in parallel worker threads by default. Multiple test suites executing `prisma.flow.deleteMany()` simultaneously collided against the same shared PostgreSQL database.
   - We configured `fileParallelism: false` in `backend/vitest.config.ts`, ensuring integration tests run sequentially with zero cross-test state pollution.

---

## 6. PowerShell Debugging Toolkit

Run these commands in PowerShell to inspect, execute, and verify the execution engine:

```powershell
# 1. Run all backend tests (including templating, executors, and engine runner)
npm --prefix backend test

# 2. Run only the engine integration test suite
npm --prefix backend test -- tests/engine.test.ts

# 3. Run unit tests for templating and executors
npm --prefix backend test -- tests/templating.test.ts tests/executors.test.ts

# 4. Trigger an execution run via PowerShell REST call (replace <FLOW_ID> with a valid UUID)
$body = @{ customer = @{ name = "Tony Stark"; tier = "VIP" } } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:4000/flows/<FLOW_ID>/run" -Method Post -Body $body -ContentType "application/json"
$response | Format-Table

# 5. Inspect Run and NodeRun records directly in PostgreSQL
docker exec -it dormammu_postgres psql -U dormammu -d dormammu_db -c "SELECT id, \"flowId\", status, \"startedAt\", \"finishedAt\" FROM \"Run\" ORDER BY \"startedAt\" DESC LIMIT 5;"
docker exec -it dormammu_postgres psql -U dormammu -d dormammu_db -c "SELECT \"nodeId\", status, attempt, error, \"startedAt\", \"finishedAt\" FROM \"NodeRun\" ORDER BY \"startedAt\" ASC LIMIT 10;"

# 6. Inspect execution logs captured in LogLine
docker exec -it dormammu_postgres psql -U dormammu -d dormammu_db -c "SELECT level, message, ts FROM \"LogLine\" ORDER BY ts DESC LIMIT 15;"
```

---

## 7. Viva & Technical Interview Questions (Phase 4 Edition)

### Q1: How does your execution engine run parallel branches at the exact same time in Node.js?
> **Model Answer:**  
> "Node.js is single-threaded in its JavaScript execution, but it uses an asynchronous, non-blocking event loop for I/O operations (like network fetch or timers). In our engine runner, whenever Kahn's readiness function identifies multiple unblocked nodes (such as branches B and C in a diamond graph), we launch their executor promises simultaneously using `Promise.allSettled`. While those HTTP requests or timers wait in the background, the Node.js event loop handles whichever responds first without blocking the rest of the engine."

### Q2: What is cascading skip and why is it essential for DAG engines?
> **Model Answer:**  
> "When an upstream node fails, any downstream child that relies on its output cannot execute. Instead of leaving downstream nodes stuck in a `'pending'` state indefinitely or causing them to crash with missing data, our engine performs a cascading skip. It traverses the DAG using `descendantsOf(graph, failedNodeId)` and immediately transitions all reachable pending child nodes to `'skipped'`, recording an informative message. This allows healthy parallel branches to finish normally while giving the user a clear explanation in the UI."

### Q3: Why is `eval()` strictly forbidden for variable templating, and how did you implement it safely?
> **Model Answer:**  
> "Using `eval()` on user-supplied input creates a critical Remote Code Execution (RCE) vulnerability; an attacker could inject malicious JavaScript inside a webhook payload to compromise our host machine or steal database credentials. We built a purely functional path resolver in `templating.ts`. It splits property paths into tokens (e.g. `['nodes', 'fetchUser', 'output', 'email']`) and safely navigates the context dictionary with explicit prototype pollution guards against `__proto__` and `constructor`. If a path does not exist, it safely returns an empty string without throwing."

### Q4: Why did you use `Promise.allSettled` instead of `Promise.all` in the execution loop?
> **Model Answer:**  
> "`Promise.all` fails fast on the very first rejection, abandoning all other in-flight promises in an unhandled zombie state. In a workflow engine with parallel branches, if Branch A encounters an HTTP 500 error, we must still allow Branch B to complete its work and record its output. `Promise.allSettled` guarantees that every concurrent branch is awaited to completion, allowing us to accurately record successes, failures, logs, and cascading skips for all nodes."

### Q5: How is sensitive data protected when workflows make authenticated API calls?
> **Model Answer:**  
> "Workflows frequently handle sensitive secrets, like bearer tokens and API keys. We implemented a recursive redaction utility in `maskSensitiveData`. Before storing node inputs, outputs, or log lines into PostgreSQL, any dictionary key matching authorization, password, secret, token, or api_key is sanitized to `'[REDACTED]'`. This guarantees that database backups, debug logs, and UI history views never leak sensitive credentials."
