# Study Guide 04 Part B: Run History API & Visual Run Inspector

> **Target Audience:** Madhav & Nikhil (WEBSTER 2026)  
> **Topic:** Phase 4 Run History API & Execution UI (Part B)  
> **Primary Owner:** Madhav (API & History Lead)  
> **Key Concepts:** RESTful Run History Routes, Relational Querying with Prisma, React Flow Read-Only Execution Canvas, Dynamic Node Card Status Styling, Polling Lifecycle with Terminal State Cessation, Slide-Over Node Execution Drawer, Timestamped Execution Log Terminal, Run Modal Parameterization.

---

## 1. What Was Built & Why It Exists

In Phase 4 Part A, Nikhil built the topological execution runner and node executors. In Phase 4 Part B, **Madhav built the complete observability and inspection layer**:

1. **Run History Endpoints (`backend/src/api/runs.ts`):**
   - `GET /runs`: Lists past workflow executions with filtering (`flowId`, `status`), pagination (`limit`, `offset`), and `X-Total-Count` header, sorted newest first.
   - `GET /runs/:id`: Returns full run summary, overall duration, flow graph definition, and an array of all `NodeRun` records with their individual execution times and status.
   - `GET /runs/:id/nodes/:nodeId`: Detailed record for an individual node execution: input JSON context, sanitized output JSON, error messages, attempt count, duration, and all associated `LogLine` records.

2. **Frontend Run History List (`frontend/src/pages/RunListPage.tsx`):**
   - High-density execution dashboard displaying metrics cards (Total Runs, Successful, Running, Failed).
   - Real-time auto-refresh toggle polling every 3 seconds for active executions.
   - Status filters (All, Running, Success, Failed), workflow search, and run table showing Run ID, Flow Name, Trigger Source badge, Steps Completed progress (`4 / 4`), Started At, Duration, and "Inspect" button.

3. **Frontend Visual Run Inspector (`frontend/src/pages/RunDetailPage.tsx`):**
   - Renders the workflow DAG in read-only mode using React Flow.
   - Dynamic node card styling reflects real-time status:
     - `pending`: gray border/badge with clock icon.
     - `running`: glowing blue border with pulsing animation and loader.
     - `success`: emerald green border, checkmark icon, and duration badge.
     - `failed`: rose red border and alert triangle icon.
     - `skipped`: dark muted gray with slashed ban icon.
   - **Smart Polling Loop:** While the run is in `'pending'` or `'running'`, automatically polls `GET /runs/:id` every 1.5 seconds. Instantly cleans up and halts polling as soon as the run reaches a terminal state (`'success'` or `'failed'`).
   - **Slide-Over Node Execution Drawer:** Clicking any node on the canvas opens a rich panel showing:
     - Status badge, duration, and attempt number.
     - Error alert banner (if failed) with stack/message.
     - Timestamped Execution Log Terminal with log level filters (`ALL`, `INFO`, `WARN`, `ERROR`).
     - Formatted JSON viewers for Node Input and Node Output with one-click copy.

4. **Canvas Run Button Integration (`frontend/src/components/canvas/RunModal.tsx`):**
   - Workflow Editor (`/flows/:id` and `/flows/new`) features an active **Run** button.
   - Clicking **Run** validates the graph, opens the Run Modal to input a custom JSON payload (with "Sample Data" and "Prettify" buttons), submits `POST /flows/:id/run`, and automatically redirects the user to `/runs/:id` to watch execution proceed live!

---

## 2. File-by-File Breakdown with Beginner Analogies

| File | What It Does | Beginner Analogy |
|---|---|---|
| [`backend/src/api/runs.ts`](file:///a:/projects/dormammu-loop/backend/src/api/runs.ts) | Express REST router for `/runs`, `/runs/:id`, and `/runs/:id/nodes/:nodeId`. Queries PostgreSQL via Prisma and computes durations. | The **Flight Recorder Archives**. Keeps detailed black-box logs of every flight that took off, how long each leg took, and whether it landed safely. |
| [`frontend/src/api/runs.ts`](file:///a:/projects/dormammu-loop/frontend/src/api/runs.ts) | Strongly typed client functions (`fetchRuns`, `fetchRun`, `fetchNodeRun`, `triggerRun`). | The **Courier Service**. Fetches run records and sends launch orders from the browser to the backend server. |
| [`frontend/src/pages/RunListPage.tsx`](file:///a:/projects/dormammu-loop/frontend/src/pages/RunListPage.tsx) | Execution history list page with metrics summary, search, status filtering, and live polling. | The **Airport Flight Departures Board**. Displays all active and past flights, their flight number, status, and arrival time. |
| [`frontend/src/pages/RunDetailPage.tsx`](file:///a:/projects/dormammu-loop/frontend/src/pages/RunDetailPage.tsx) | Visual DAG run inspector with React Flow canvas, node execution drawer, and live polling. | The **Mission Control Dashboard**. Displays the spaceship's systems visually in real-time and lets engineers drill into any individual component's telemetry. |
| [`frontend/src/components/canvas/RunModal.tsx`](file:///a:/projects/dormammu-loop/frontend/src/components/canvas/RunModal.tsx) | Parameter input modal for custom JSON trigger payloads with validation and syntax checks. | The **Pre-Flight Cargo Manifest**. Allows pilots to specify fuel and cargo weights before launching the mission. |
| [`frontend/src/components/canvas/nodes/NodeCard.tsx`](file:///a:/projects/dormammu-loop/frontend/src/components/canvas/nodes/NodeCard.tsx) | Base custom React Flow card with dynamic status styling (pulsing blue, emerald green, rose red). | The **LED Indicator Light Panel**. Lights up green, red, or blinking blue depending on machine operational status. |

---

## 3. Under the Hood: Step-by-Step Data Flow

```
1. User clicks "Run" in Canvas Action Bar:
   ├── Verifies DAG has zero cycles locally.
   └── Opens RunModal with default payload {}.

2. User clicks "Execute Workflow":
   ├── If flow is new, creates Flow record in PostgreSQL.
   ├── Sends POST /flows/:id/run with JSON payload.
   ├── Server responds with HTTP 202 { runId, status: 'pending' }.
   └── Browser navigates immediately to /runs/:runId.

3. RunDetailPage mounts:
   ├── Fetches GET /runs/:runId to retrieve flow graph and nodeRuns.
   ├── Renders DAG nodes in read-only React Flow canvas.
   ├── Merges node statuses into node cards (running: pulsing blue, success: green).
   └── Initiates 1.5s interval polling loop while status is 'pending' or 'running'.

4. Execution completes on backend:
   ├── Next poll of GET /runs/:runId returns status: 'success' (or 'failed').
   ├── Polling loop halts automatically.
   └── Canvas edges and nodes settle in green success (or red failed) state.

5. User clicks any Node on Canvas:
   ├── Node Execution Drawer slides in from the right.
   ├── Displays attempt count, duration (ms), and start/finish timestamps.
   ├── Renders timestamped LogLine records in a dark developer terminal.
   └── Shows formatted JSON viewers for input context and output result.
```

---

## 4. Tricky Edge Cases & How We Handled Them

1. **Smart Polling Without Memory Leaks:**
   - *Problem:* If polling continues indefinitely, it wastes server resources and leaks intervals when navigating away.
   - *Solution:* Polling checks `run.status === 'success' || run.status === 'failed'`. As soon as terminal status is reached, the interval is cleared. `useEffect` returns a cleanup function `clearInterval` so unmounting also halts polling immediately.

2. **Connecting Custom Nodes to Execution State:**
   - *Problem:* React Flow canvas nodes were originally designed for editing, not runtime status display.
   - *Solution:* Enhanced `NodeCard` with `status?: NodeStatus` and `durationMs?: number`. In `RunDetailPage`, we map `flowGraph.nodes` and attach `data.status = nodeRun.status`. All 5 node types (`trigger`, `http`, `transform`, `delay`, `output`) seamlessly display status badges and duration metrics.

3. **Running Unsaved Workflows:**
   - *Problem:* A user creates a new workflow on `/flows/new` and clicks "Run" before saving.
   - *Solution:* In `FlowEditorPage`, `handleRunFlow` checks if the flow has a database ID. If not, it saves the workflow to PostgreSQL first (`createFlow`), obtains the generated UUID, and then triggers `POST /flows/:id/run`.

4. **Preserving Node Output Data Integrity:**
   - *Problem:* Some nodes output plain strings or numbers, while others output nested JSON objects.
   - *Solution:* The JSON viewer in the drawer checks `typeof output === 'string' ? output : JSON.stringify(output, null, 2)`, rendering formatted text without throwing runtime exceptions.

---

## 5. PowerShell Debugging Toolkit

Use these exact PowerShell commands to inspect and troubleshoot the Run History system:

```powershell
# 1. Trigger a workflow execution via REST API
$run = Invoke-RestMethod -Uri "http://localhost:4000/flows/<FLOW_ID>/run" -Method Post -Body '{"orderId":"ORD-123"}' -ContentType "application/json"
$runId = $run.runId
Write-Host "Triggered Run ID: $runId"

# 2. Query all past runs
Invoke-RestMethod -Uri "http://localhost:4000/runs" | Select-Object id, flowName, status, durationMs, startedAt | Format-Table

# 3. Query specific run details
$detail = Invoke-RestMethod -Uri "http://localhost:4000/runs/$runId"
$detail | Select-Object id, flowName, status, durationMs
$detail.nodeRuns | Select-Object nodeId, status, durationMs, attempt | Format-Table

# 4. Inspect specific node execution and logs
$nodeDetail = Invoke-RestMethod -Uri "http://localhost:4000/runs/$runId/nodes/node_trigger"
Write-Host "Node Status: $($nodeDetail.status)"
Write-Host "Output: $($nodeDetail.output | ConvertTo-Json)"
$nodeDetail.logs | Select-Object ts, level, message | Format-Table

# 5. Run all backend tests (including runs.test.ts)
npm --prefix backend test

# 6. Run all frontend tests (including runsApi.test.ts)
npm --prefix frontend test
```

---

## 6. Likely Viva & Interview Questions with Model Answers

### Q1: Why did we build a separate Run History API instead of returning all logs directly from `POST /flows/:id/run`?
**Answer:** `POST /flows/:id/run` executes asynchronously in the background and responds with `HTTP 202 Accepted` in less than 20 milliseconds. Workflows can take several seconds or minutes (especially with delays or external HTTP calls). Returning execution results synchronously would hold HTTP connections open, causing gateway timeouts and preventing real-time progress monitoring. Separate `GET /runs/:id` endpoints allow the client to poll or stream updates progressively.

### Q2: How does the frontend know when to stop polling the run status?
**Answer:** The polling effect monitors the `run.status` state. Once the run status transitions to a terminal state (`'success'` or `'failed'`), the interval timer is stopped via `clearInterval`. Additionally, when the component unmounts (e.g. if the user navigates away), React's effect cleanup function clears the interval to prevent background memory leaks.

### Q3: What is the benefit of showing the workflow run on the visual React Flow canvas rather than just a flat table?
**Answer:** A DAG workflow is non-linear. In diamond or multi-branch pipelines, parallel branches execute concurrently. A visual canvas allows operators to instantly see which exact branch succeeded, which branch failed, and which downstream nodes were skipped due to upstream failure, providing vastly superior observability compared to a flat list.

### Q4: How are inputs and outputs isolated between multiple executions of the same workflow?
**Answer:** In PostgreSQL, each execution creates an independent `Run` record with a unique UUID. Every node in that execution gets an associated `NodeRun` record with a composite idempotency key (`${runId}:${nodeId}`). Node inputs and outputs are persisted specifically to their `NodeRun` record, ensuring complete data isolation between concurrent or historical runs.

### Q5: How does the Node Execution Drawer help developers debug failing workflows?
**Answer:** When an operator clicks a failed node, the drawer highlights the exact error message in an error banner, displays the input data context that was fed to the node, and renders timestamped `LogLine` entries in a developer terminal, allowing developers to identify whether the failure was due to malformed input, network timeouts, or invalid templates.
