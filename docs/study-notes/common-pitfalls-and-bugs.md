# Master Directory: Common Pitfalls, Bugs, & Tricky Edge Cases

This document compiles the most common bugs, mistakes, edge cases, and gotchas across every layer of **The Dormammu Loop**.  
Keep this file bookmarked: whenever you run into an unexpected error, look here first.

---

## 1. Environment & Local Infrastructure Gotchas

### Bug 1.1: Docker containers exit immediately or restart constantly
- **Symptom:** `docker ps` shows container status `Restarting (1)` or ports fail to bind.
- **Root Cause:** Corrupted volume data from an unclean shutdown, or conflicting local services.
- **Fix:** Reset the specific container and volume:
  ```powershell
  docker compose down -v
  docker compose up -d
  ```

### Bug 1.2: Prisma and TypeScript out of sync
- **Symptom:** TypeScript compiler complains: `Property 'flow' does not exist on type 'PrismaClient'`.
- **Root Cause:** You modified `schema.prisma` or ran a migration on PostgreSQL, but didn't run the TypeScript client generator.
- **Fix:** In `backend/`:
  ```powershell
  npx prisma generate
  ```

---

## 2. Graph Algorithms & DAG Logic Pitfalls (Phase 2)

### Bug 2.1: Infinite Loop on Cycles (Forgetting the Visited Count)
- **Symptom:** Server hangs or times out when validating a workflow graph.
- **Root Cause:** A naive depth-first search that visits nodes without tracking visited ancestors gets caught in an endless loop: `A -> B -> C -> A`.
- **Fix:** Use **Kahn's Algorithm** with an in-degree map. Because Kahn's algorithm only enqueues nodes when their in-degree reaches 0, cyclic nodes can never reach 0 and execution terminates cleanly in \(\mathcal{O}(V + E)\) time.

### Bug 2.2: Non-Deterministic Topological Sort
- **Symptom:** Saving the exact same workflow graph produces different execution orders on different machines.
- **Root Cause:** When multiple nodes have an in-degree of 0 (e.g. parallel branches), pulling from a `Set` or unordered array processes them in random memory order.
- **Fix:** Always enforce **tie-breaking**: sort ready nodes alphabetically by node `id` before processing them.

### Bug 2.3: Hidden Cycles in Diamond Graphs
- **Symptom:** Diamond fan-out and fan-in (`A -> B, A -> C, B -> D, C -> D`) is mistakenly reported as a cycle!
- **Root Cause:** In simple cycle algorithms, reaching Node D twice makes the algorithm think there is a cycle.
- **Fix:** Reaching a node via multiple independent paths is **valid fan-in**, not a cycle. A cycle only occurs if a path leads back to an ancestor. Kahn's in-degree count accurately handles this: D's in-degree is 2; it only runs when *both* B and C finish.

### Bug 2.4: Trigger Nodes Receiving Incoming Edges
- **Symptom:** Workflow engine triggers execution loops or gets confused about what kicked off the workflow.
- **Root Cause:** A user connects an upstream task into a `trigger` node. By definition, a trigger represents an external event (webhook or cron), not an internal step.
- **Fix:** `validateGraph` checks every trigger node and enforces `in-degree === 0` (`TRIGGER_HAS_INCOMING_EDGES`).

### Bug 2.5: Dangling Edges and Duplicate IDs Poisoning In-Degree Maps
- **Symptom:** Kahn's algorithm counts in-degrees for deleted or phantom nodes, causing topological sort to incorrectly report cycles or crash with `undefined` map access.
- **Fix:** Filter graph edges to ensure `source` and `target` both exist in `graph.nodes`. Report `DANGLING_EDGE` and `DUPLICATE_NODE_IDS` before cycle detection runs.

---

## 3. Visual Canvas & Flow API Traps (Phase 3)

### Bug 3.1: Self-Loop Connections (`A -> A`)
- **Symptom:** User drags a connection from a node's output handle directly into its own input handle.
- **Root Cause:** React Flow by default allows connections between any handles on the same node.
- **Fix:** In `isValidConnection` or `onConnect`:
  ```typescript
  if (connection.source === connection.target) return false;
  ```

### Bug 3.2: Broken React Flow Styling
- **Symptom:** Canvas nodes look like unstyled raw HTML text and handles appear in the top-left corner.
- **Root Cause:** Missing React Flow base stylesheet.
- **Fix:** Verify `frontend/src/index.css` imports `@import "@xyflow/react/dist/style.css";` at the very top.

### Bug 3.3: Semantic HTTP Status Code Confusion (400 Bad Request vs 422 Unprocessable Content)
- **Symptom:** Returning HTTP 400 for a cyclic graph or semantic validation failure.
- **Root Cause:** Not differentiating between JSON syntax/type validation (Zod) and business logic/DAG graph constraints.
- **Fix:** Return HTTP 400 for malformed JSON or missing required body fields. Return HTTP 422 for semantically invalid graphs (cycles, trigger rule violations, or invalid node configurations).

### Bug 3.4: Route Shadowing in Express (`/flows/:id` overriding `/flows/validate`)
- **Symptom:** Calling `POST /flows/validate` returns HTTP 404 or routes to the parameterized `:id` handler.
- **Root Cause:** In Express, route order is strictly first-match. Registering `/:id` before `/validate` causes Express to treat `"validate"` as an `id`.
- **Fix:** Always declare static sub-routes (`/validate`) before dynamic parameter routes (`/:id`).

### Bug 3.5: Zod Schema Defaulting Masking Incomplete Payloads
- **Symptom:** Sending `{ invalid: "not a graph" }` passes validation and creates an empty graph instead of failing.
- **Root Cause:** Using `.default([])` on `nodes` and `edges` fields in `graphSchema`.
- **Fix:** Require `nodes` and `edges` to be explicitly provided as arrays in `graphSchema`.

### Bug 3.6: Canvas Node Types Recreated on Every Render (Flickering & Focus Loss)
- **Symptom:** Typing into an input field inside an Inspector panel causes inputs to lose focus or nodes to flash on every keystroke.
- **Root Cause:** Declaring `const nodeTypes = { trigger: TriggerNode, ... }` inline within a React component. React Flow detects a new object reference on every render and unmounts/remounts all canvas nodes.
- **Fix:** Declare `nodeTypes` **outside** the React component scope or memoize with `useMemo`.

### Bug 3.7: Coordinate Disconnect in Drag & Drop from Palette
- **Symptom:** Dragging a node card from the left palette and dropping it on the canvas results in the node appearing hundreds of pixels away from where the cursor dropped.
- **Root Cause:** Raw DOM `event.clientX` and `event.clientY` coordinates are relative to the viewport window and do not account for React Flow's canvas pan and zoom scale.
- **Fix:** Use React Flow's `screenToFlowPosition({ x: event.clientX, y: event.clientY })` from `useReactFlow()` to convert screen-space pixels into internal graph coordinates.

### Bug 3.8: Attempting to Add Inward Edges to Triggers
- **Symptom:** User tries to wire an HTTP node output into a Trigger node input.
- **Root Cause:** Triggers represent the root of execution (in-degree 0).
- **Fix:** Do not render an input `Handle` (`type="target"`) on `TriggerNode` at all, and reject any programmatic connection attempt in `canConnectEdge`.

---

## 4. Execution Engine & Templating Gotchas (Phase 4)

### Bug 4.1: Remote Code Execution via `eval()`
- **Symptom:** Major security vulnerability flagged during code audit or viva.
- **Root Cause:** Using `eval(expression)` or `new Function()` to evaluate templates like `"{{ trigger.name }}"`.
- **Fix:** Strictly use safe path resolution:
  ```typescript
  export function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
  }
  ```

### Bug 4.2: Hanging Promise on Unhandled Executor Rejection
- **Symptom:** A workflow gets permanently stuck in `'running'` status because a node threw an unexpected network error.
- **Root Cause:** Using `Promise.all` which rejects immediately on the first error, leaving the other running promises unobserved, or not catching errors properly.
- **Fix:** Use `Promise.allSettled()` in the runner loop. Inspect each result: if rejected, mark the node `'failed'` and immediately cascade `'skipped'` to all descendants.

### Bug 4.3: Cascading Skip Omission
- **Symptom:** If Node A fails, Node B (which depends on A) stays stuck in `'pending'` forever, and the workflow never completes.
- **Fix:** Call `descendantsOf(graph, failedNodeId)` and atomically mark every downstream child node as `'skipped'`.

### Bug 4.4: Prototype Pollution in Nested Object Property Access
- **Symptom:** A template accesses `{{ trigger.__proto__.polluted }}` or `{{ trigger.constructor }}`, potentially corrupting global JavaScript object prototypes.
- **Fix:** In `templating.ts`, blacklist property tokens `['__proto__', 'prototype', 'constructor']` and return `undefined` immediately when encountered.

### Bug 4.5: Parallel Integration Test Database Collisions
- **Symptom:** Running `npm test` causes intermittent foreign key violations (`P2003`) or record count mismatches when running multiple test suites at once.
- **Root Cause:** Vitest executes test files concurrently across multiple worker processes by default. Separate test files running `deleteMany()` collide against the shared PostgreSQL database.
- **Fix:** Set `fileParallelism: false` in `backend/vitest.config.ts` so integration test suites execute sequentially.

### Bug 4.6: Memory Leaks from Unbounded Polling Loops in React Components
- **Symptom:** After inspecting a running workflow and navigating away, background HTTP network requests continue firing every 1.5s in the browser, wasting CPU and network bandwidth.
- **Root Cause:** Setting `setInterval` without returning a cleanup function in `useEffect`, or polling indefinitely without checking for terminal statuses (`success` or `failed`).
- **Fix:** In `RunDetailPage.tsx`, monitor `run.status`. If `status === 'success' || status === 'failed'`, return early and do not schedule the timer. Always return `() => clearInterval(interval)` from `useEffect`.

### Bug 4.7: Executing Brand New Workflows Before Database Persistence
- **Symptom:** Clicking "Run" on `/flows/new` fails with `HTTP 404: Flow with id "new" not found`.
- **Root Cause:** The workflow only existed in local React state on the canvas and was never saved to PostgreSQL prior to execution.
- **Fix:** In `FlowEditorPage.tsx`, `handleRunFlow` checks if the flow is unsaved (`id === 'new'`). If so, it automatically calls `createFlow` first, obtains the generated UUID, and then triggers `POST /flows/:id/run`.

### Bug 4.8: React Flow Dynamic Status Styling Without Re-Mounting
- **Symptom:** Node cards do not update their visual status badges when new polling data arrives from the server.
- **Root Cause:** Node definitions inside React Flow's state were static, preventing re-rendering of internal card status props.
- **Fix:** Compute `nodes` dynamically with `useMemo` based on `[run?.flowGraph?.nodes, nodeRunMap]`, injecting `data.status = nodeRun?.status` and `data.durationMs = nodeRun?.durationMs`.

---

## 5. Webhooks & Idempotency Edge Cases (Phase 5)

### Bug 5.1: Duplicate Webhook Execution on Network Timeouts
- **Symptom:** Stripe or GitHub sends a webhook; our server processes it, but the network connection drops before the HTTP 200 reaches Stripe. Stripe retries, and the workflow runs twice!
- **Fix:** The client sends an `Idempotency-Key` header. We query `IdempotencyRecord`:
  - If the key exists, return HTTP 200 with the existing `runId` immediately.
  - If not, insert the key and start execution.

### Bug 5.2: Memory Leaks with In-Memory Cron Jobs
- **Symptom:** Editing a cron trigger in the UI creates a new schedule, but the old timer keeps firing in the background.
- **Fix:** Keep an in-memory `Map<string, cron.ScheduledTask>` keyed by trigger ID. When updating or deleting, call `task.stop()` and remove it from the map.

---

## 6. Distributed Queues & Worker Race Conditions (Phase 6)

### Bug 6.1: Double Execution of Join Nodes (Race Condition)
- **Symptom:** In a diamond graph (`B -> D` and `C -> D`), when B and C finish on two separate workers at the same millisecond, Node D gets queued twice in BullMQ!
- **Root Cause:** Both workers call `advanceRun(runId)` simultaneously, see D's parents as successful, and push D into BullMQ.
- **Fix:** Atomic database status update before enqueueing:
  ```typescript
  const updated = await prisma.nodeRun.updateMany({
    where: { id: nodeRunId, status: 'pending' },
    data: { status: 'queued' }
  });
  if (updated.count === 0) return; // The other worker already queued it!
  ```

### Bug 6.2: The "Thundering Herd" on External Outages
- **Symptom:** An external API goes down. 50 failing worker jobs retry at the exact same instant, overwhelming the recovering server.
- **Fix:** Use **Full Jitter**:
  ```typescript
  delay = Math.floor(Math.random() * Math.min(cap, base * Math.pow(2, attempt)));
  ```

---

## 7. Server-Sent Events (SSE) & Connection Leaks (Phase 7)

### Bug 7.1: Dangling Redis Pub/Sub Subscriptions
- **Symptom:** After closing browser tabs, the Node.js server memory climbs and Redis shows dozens of idle subscriber connections.
- **Root Cause:** Forgetting to listen to the HTTP connection `close` event.
- **Fix:** In the Express SSE handler:
  ```typescript
  req.on('close', () => {
    redisSubscriber.unsubscribe(`run:${runId}`);
    redisSubscriber.quit();
  });
  ```

### Bug 7.2: Missed Events on Page Reload (The Race Condition)
- **Symptom:** User reloads the page mid-run; they see a blank canvas or stale status because earlier pub/sub messages were already broadcast.
- **Fix:** The **Snapshot Pattern**: Query PostgreSQL for the full current state and write it as an initial `snapshot` event *before* streaming live Redis pub/sub messages.
