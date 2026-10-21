# Phase 7: SSE live streaming (Day 4, Madhav)

**Read first:** `docs/06-sse-streaming.md`. **Give the agent:** master rules + this file.

## Goal
Node status and logs appear live on the canvas as nodes run, including when the work is done by separate workers.

## Tasks
1. `backend/src/lib/events.ts`: `publishEvent(runId, type, data)` publishes JSON to Redis channel `run:<runId>`. Call it on every NodeRun status change, every log line, and run status change (from both the engine and the workers). Event types: `node_status`, `log`, `run_status`. Include a run id and an increasing sequence/time so the client can keep order.
2. SSE route `GET /runs/:id/stream`:
   - headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
   - first send a `snapshot` event with the current run, node statuses and existing logs from the database
   - then subscribe to the Redis channel (a dedicated subscriber connection) and forward events as `event: <type>\ndata: <json>\n\n`
   - send `: ping` every 15 seconds
   - on client disconnect, unsubscribe and clean up; after the final `run_status` (success/failed) close the stream
3. Frontend hook `useRunStream(runId)` using `EventSource`: updates node colours live (grey pending, blue running, green success, red failed, orange retrying, dark/grey skipped) and appends logs to a terminal-style panel for the selected node. Show a small "live / reconnecting" indicator. Avoid duplicate logs after a reconnect.
4. Replace polling on the run detail page with the stream. When Run is clicked in the editor, go to the run detail page (or animate on the canvas) so the user watches it live.
5. Tests: published events arrive in order; snapshot comes first; the stream closes after a terminal status.

## Checklist
- [ ] Run a flow with a delay node: nodes go blue then green live, log lines appear as they happen
- [ ] Refresh the page mid-run: state is restored from the snapshot and live updates continue
- [ ] Closing the tab leaves no stuck Redis subscription (check in the server log)
- [ ] Works with workers running in separate terminals
