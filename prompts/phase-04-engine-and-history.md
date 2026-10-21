# Phase 4: Execution engine (Nikhil) + run history (Madhav) (Day 3)

**Read first:** `docs/03-execution-engine.md`. **Give the agent:** master rules + this file.
Run the engine **in-process** (no queue yet). Phase 6 moves node execution to workers.

## Part A: Engine (Nikhil)
1. Executors in `backend/src/executors/`, one function per node type, registered by name:
   - `trigger`: output = the trigger payload
   - `http`: `fetch` with method/url/headers/body and a timeout (AbortController); output = status, selected headers, body (parsed JSON if possible). 5xx and network errors count as failure.
   - `transform`: templating with `{{ path.to.value }}` against the context (`trigger`, `nodes.<id>.output`). Write `engine/templating.ts` with tests: missing keys, nested paths, non-string values. **No eval.**
   - `delay`: waits the configured seconds (max 60)
   - `output`: stores its input as the run's result
2. `engine/runner.ts` function `executeRun(runId)`: loads the flow graph, creates a `NodeRun` per node (`pending`), loops using `readyNodes` from Phase 2, runs ready nodes in parallel with `Promise.all`, saves status, output, error and times, marks descendants of a failed node `skipped`, sets the final Run status.
3. A single function `createRun(flowId, payload, source)` that creates the Run and starts `executeRun` in the background. All triggers will use it.
4. `POST /flows/:id/run` (optional JSON body = payload) responds immediately with the `runId`.
5. Tests with fake executors: linear order, diamond (join waits for both), a failing node skips only its descendants, an independent branch still runs, payload reaches nodes.

## Part B: Run history (Madhav)
1. Executors and engine write `LogLine`s via a small `log(nodeRunId, level, message)` helper (e.g. "GET url -> 200 in 120ms").
2. Hide sensitive values (Authorization header, anything named token/secret) before saving inputs/logs; truncate outputs over ~100 KB with a marker.
3. Endpoints: `GET /runs?flowId=&status=&limit=&offset=` (newest first), `GET /runs/:id` (run + node runs with status and duration), `GET /runs/:id/nodes/:nodeId` (input, output, error, logs).
4. Frontend pages: run history list (status badge, start time, duration); run detail showing the graph read-only with node colours by status; clicking a node shows its input, output, error and logs. Refresh by polling every 1.5s while the run is `running`. Enable the Run button in the editor (with a small payload JSON box).
5. Tests: pagination, filters, redaction.

## Checklist
- [ ] A diamond flow runs in the right order; the join node waits for both parents
- [ ] A failing node: its descendants are `skipped`, the run is `failed`, independent branches finish
- [ ] A real flow (trigger -> http to https://httpbin.org/get -> transform -> output) works from the UI
- [ ] Run detail shows status, times, input, output, logs per node
- [ ] Tests pass
