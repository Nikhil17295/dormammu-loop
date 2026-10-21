# Phase 7: Real-Time Server-Sent Events (SSE) Streaming (Day 4)

**Read first:** `docs/06-sse-streaming.md`  
**Give the agent:** `prompts/00-master-rules.md` + this file.  
*(Prerequisite: Phase 4 execution engine and Phase 6 Redis pub/sub).*

---

## Goal
Replace HTTP polling with live, real-time push streaming over **Server-Sent Events (SSE)**:
- As nodes change status (`running`, `success`, `failed`, `skipped`) or emit logs, updates are published to Redis and pushed directly into the browser canvas without refreshing.
- Seamlessly handles browser refreshes and late connections using the **Snapshot + Stream** pattern.
- Gracefully falls back to HTTP polling if SSE encounters persistent network disconnection.

---

## Required Tasks & Specifications

### 1. Redis Pub/Sub Event Publisher (`backend/src/lib/events.ts`)
- Use a dedicated Redis publisher connection via `ioredis`.
- Channel naming convention: `run:<runId>`.
- Event payload structure:
  ```typescript
  export interface StreamEvent {
    type: 'node_status' | 'log' | 'run_status';
    runId: string;
    timestamp: string;
    data: any;
  }
  ```
- Implement `publishEvent(runId: string, event: StreamEvent): Promise<void>`.
- Wire `publishEvent` into both the engine (`runner.ts` / `advance.ts`) and executors/workers whenever:
  - A node transitions to `running`, `success`, `failed`, `retrying`, or `skipped`.
  - A new `LogLine` is recorded.
  - The overall `Run` completes with `success` or `failed`.

### 2. SSE Streaming Route (`backend/src/api/stream.ts`)
- `GET /runs/:id/stream`:
  - Set streaming headers:
    ```typescript
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    ```
  - **The Snapshot Step:** Before listening to live events, query PostgreSQL for the latest `Run`, its `NodeRun` records, and existing `LogLine` entries. Send this as the initial `snapshot` event:
    ```
    event: snapshot\ndata: { ... }\n\n
    ```
  - **The Subscription Step:** Create a dedicated Redis subscriber connection subscribed to `run:<runId>`.
  - On incoming Redis messages: write formatted SSE frame `event: <type>\ndata: <json>\n\n`.
  - **Heartbeat:** Emit a lightweight comment `: ping\n\n` every 15 seconds to prevent browser or proxy timeouts.
  - **Terminal cleanup:** When a `run_status` event indicates the run reached `success` or `failed`, send the event, unregister Redis subscription, and close the stream.
  - **Client disconnect:** When `req.on('close')` fires, immediately unsubscribe from Redis and close the subscriber to prevent memory/connection leaks.

### 3. Frontend SSE Hook (`frontend/src/hooks/useRunStream.ts`)
- Custom hook `useRunStream(runId: string)` using the native browser `EventSource`:
  - Connects to `/runs/:id/stream`.
  - Handles `snapshot` event: initializes node statuses and past logs.
  - Handles `node_status` event: dynamically updates the specific React Flow node's status dot and card border color.
  - Handles `log` event: appends log line to the terminal viewer in real-time without duplicate entries.
  - Handles `run_status` event: updates overall run banner and closes connection.
  - Exposes connection state: `'connected' | 'connecting' | 'fallback_polling'`.
  - **Polling Fallback:** If `EventSource` errors repeatedly, automatically fall back to Phase 4's 1.5-second polling mechanism so the user is never left without data.

### 4. Canvas Real-Time Visual Polish (`frontend/src/pages/RunDetailPage.tsx`)
- Status colors animate live as nodes execute:
  - Gray (`pending`) -> Pulsing Blue (`running`) -> Emerald Green (`success`) or Rose Red (`failed`).
- Live terminal drawer:
  - Auto-scrolls to the newest log line as logs arrive.
  - Displays filter buttons: All / Info / Error.
- Connection indicator badge:
  - Green dot: "Live Stream Connected"
  - Amber dot: "Polling Mode (Fallback)"

### 5. Automated Tests (`backend/tests/stream.test.ts`)
- Vitest tests covering:
  - Correct headers returned for `text/event-stream`.
  - Snapshot event delivered immediately upon connection.
  - Published events forwarded to the client stream in order.
  - Redis subscription cleanly unsubscribed on client disconnect.

---

## Verification Checklist
- [ ] Running a workflow with a 5-second delay node shows the node turn pulsing blue, then emerald green live on the canvas.
- [ ] Log lines appear in the terminal drawer in real time as the execution proceeds.
- [ ] Refreshing the browser mid-run receives the snapshot and seamlessly continues live streaming.
- [ ] Closing the browser tab terminates the Redis subscription without hanging connections.
- [ ] Disabling Redis causes the frontend to seamlessly fall back to polling without breaking.
- [ ] All tests pass: `cd backend; npm test`.

---

## Beginner Viva Preparation for Phase 7
1. **Why use Server-Sent Events (SSE) instead of WebSockets?**  
   *Answer:* SSE is unidirectional (server-to-client), which matches our workflow engine perfectly because the browser only needs to receive live status updates. SSE is simpler than WebSockets, runs over standard HTTP, has native browser reconnection built-in, and avoids WebSocket proxy complexities.
2. **What is the Snapshot + Pub/Sub pattern and why is it needed?**  
   *Answer:* If a user opens the run page 3 seconds after a run started, pub/sub alone would only show future events and miss everything that already happened. By querying PostgreSQL for a snapshot first and then subscribing to Redis, the client gets the complete history followed by live updates without any race conditions.
3. **What happens if a client disconnects unexpectedly?**  
   *Answer:* The HTTP request triggers a `'close'` event. We catch this event in Express to immediately unsubscribe the dedicated Redis client and close it, preventing dangling memory leaks on our server.
