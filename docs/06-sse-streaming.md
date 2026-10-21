# 06. Live updates with SSE (Phase 7)

## What is SSE?
Server-Sent Events: the browser opens one normal HTTP request and the server keeps it open, sending small text messages whenever something happens. One direction only (server to browser). The browser's `EventSource` reconnects automatically.

## Why not WebSockets or polling?
- WebSocket is two-way: more complex than we need, since logs only flow to the browser.
- Polling (asking every second) is wasteful and laggy.
- SSE is simple and fits.

## How a log reaches the canvas
```
Worker saves a log/status --> Redis PUBLISH channel run:<id>
API (SSE endpoint) SUBSCRIBEd to that channel --> writes "data: {...}" to the open response
Browser EventSource receives it --> node turns blue/green/red, log appears
```
Redis pub/sub is needed because the worker and the API are different programs.

## Message format
```
event: node_status
data: {"runId":"r1","nodeId":"n2","status":"running"}

```
(a blank line ends each message). Event kinds: `node_status`, `log`, `run_status`.

## Gotchas (good viva material)
- Pub/sub messages are not stored. A browser that connects late (or refreshes) would miss earlier ones. So on connect the server first sends a **snapshot** from the database, then live events. The database stays the source of truth.
- Send a small `: ping` comment every ~15 seconds so connections are not dropped.
- Clean up the Redis subscription when the browser disconnects.

## Likely viva questions
- Why SSE and not WebSocket?
- What if the user refreshes mid-run?
- Why is Redis pub/sub needed?
