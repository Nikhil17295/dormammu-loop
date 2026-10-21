# 07. Viva Cheat Sheet & Oral Defense Guide

## 30-Second Elevator Pitch (Memorize This)
> "The Dormammu Loop is a distributed DAG workflow automation engine built for problem statement M1. Users visually design workflows in a React Flow canvas. The system validates the graph using Kahn's algorithm to reject cycles, executes nodes in topological dependency order, and persists every execution step in PostgreSQL. In our Pass Tier, execution runs reliably in-process with webhook and cron scheduling. In our Distributed Tier, node jobs are offloaded to Redis BullMQ worker pools with exponential backoff retries, a Dead-Letter Queue with one-click replay, and live status streaming over Server-Sent Events."

---

## 1. Graph Theory & DAG Fundamentals

### Q1: What is a DAG and why must automated workflows be DAGs?
- **Answer:** A Directed Acyclic Graph (DAG) is a network of nodes connected by one-way directional edges with **no closed loops**. Workflows must be acyclic because if a cycle existed (e.g. A -> B -> A), node A would wait for node B, which is waiting for node A, resulting in an infinite deadlock where execution hangs forever.

### Q2: How does your cycle detection algorithm work in plain English?
- **Answer:** We use **Kahn's Algorithm**:
  1. We calculate the *in-degree* (number of incoming dependency arrows) for every node.
  2. Nodes with an in-degree of 0 have no dependencies and are ready immediately. We add them to a processing queue.
  3. While the queue has nodes, we remove a node, add it to our topological order list, and decrement the in-degree of all its child nodes.
  4. If a child's in-degree drops to 0, it is added to the queue.
  5. **The cycle test:** If the final ordered list contains all nodes in the graph, it is a valid DAG. If some nodes were never processed, they are trapped in a cycle.

### Q3: What is the time complexity of Kahn's algorithm?
- **Answer:** \(\mathcal{O}(V + E)\), where \(V\) is the number of vertices (nodes) and \(E\) is the number of edges. We inspect each node and each edge a constant number of times.

---

## 2. Architecture & Data Flow

### Q4: Why is PostgreSQL the single source of truth instead of Redis?
- **Answer:** Redis is an in-memory data store primarily intended for high-speed queueing and pub/sub message transport. If Redis restarts or runs out of memory, jobs in transit could be flushed. PostgreSQL provides permanent, ACID-compliant storage for workflow graphs, execution history, outputs, and audit logs.

### Q5: Why validate the workflow graph on both the frontend and the backend?
- **Answer:** Defense in depth. Client-side validation in React Flow gives instantaneous feedback so users cannot accidentally draw a cycle. Server-side validation in Express guarantees that anyone sending raw API requests (e.g. via cURL, Postman, or external integrations) cannot save an invalid graph into the database.

---

## 3. Execution Engine Mechanics

### Q6: How does the engine run independent branches in parallel?
- **Answer:** In our runner loop, we compute all currently `readyNodes` (nodes whose parent dependencies have all reached `success`). In Node.js, we execute these ready nodes concurrently using `Promise.allSettled`. For example, in a diamond graph (`A -> B, A -> C, B -> D, C -> D`), once A completes, B and C execute simultaneously.

### Q7: What happens when an upstream node fails?
- **Answer:** We perform a **cascading skip**. If Node B fails, any child node that depends on Node B cannot run because it lacks required input. The engine finds all transitive downstream descendants of Node B using depth-first/breadth-first search and marks their status as `skipped`. Independent parallel branches continue executing normally.

### Q8: Why did you forbid `eval()` for variable templating?
- **Answer:** To prevent **Remote Code Execution (RCE)** vulnerabilities. If workflows allowed arbitrary code evaluation, an attacker could send a malicious webhook payload containing code that executes on our server. We built a safe path resolver (`{{ trigger.user.id }}`) that accesses object properties without executing code.

---

## 4. Reliability, Fault Tolerance, & Distributed Systems

### Q9: What is the difference between at-least-once delivery and exactly-once execution?
- **Answer:** In distributed message queues, network disconnects or worker crashes mean a message might occasionally be delivered more than once (**at-least-once delivery**). To make execution safe, we enforce **idempotency**:
  1. Each node execution has a unique key (`runId:nodeId`).
  2. Workers perform an atomic database claim (`status = 'queued' -> 'running'`). If another worker already claimed it, the duplicate job is skipped.
  3. External webhooks check the `IdempotencyRecord` table before launching runs.

### Q10: What is exponential backoff with full jitter and why is it used?
- **Answer:** When an external HTTP service fails, immediate retries will likely fail again. Exponential backoff doubles the delay between retries (\(2s, 4s, 8s, 16s\)). **Full jitter** adds randomness (\(delay = random \times min(cap, base \times 2^{attempt})\)). This prevents the **thundering herd problem**, where hundreds of concurrent worker retries hit a recovering server at the exact same millisecond.

### Q11: What is a Dead-Letter Queue (DLQ) and how does replay work?
- **Answer:** A DLQ is a quarantine for jobs that have exhausted all retry attempts. Instead of silently discarding the failure, we record a `DeadLetter` entry with the error reason and payload. In the UI, an engineer can inspect the failure, fix any external issue, and click **Replay**, which resets the node and its skipped children back to `pending` to resume the workflow.

### Q12: How do you detect and recover from a worker crash?
- **Answer:** Active workers emit a heartbeat timestamp into the `WorkerHeartbeat` table every 5 seconds. If a worker stops updating for over 15 seconds, it is flagged as dead. In BullMQ, stalled job locks expire automatically, allowing healthy workers to pick up and process unfinished jobs.

---

## 5. Live Updates & Real-Time Streaming

### Q13: Why did you choose Server-Sent Events (SSE) over WebSockets?
- **Answer:**
  1. **Unidirectional:** Our client only needs to receive live execution events from the server; it does not need to send high-frequency data back over the socket.
  2. **Simpler & Native:** SSE runs over standard HTTP, avoiding complex WebSocket handshake protocols and proxy issues.
  3. **Auto-Reconnect:** Browsers have built-in automatic reconnection for `EventSource`.

### Q14: What is the Snapshot + Stream pattern?
- **Answer:** If a user opens or refreshes the run page mid-execution, subscribing to Redis pub/sub alone would miss events that occurred earlier. The SSE endpoint queries PostgreSQL first to emit an immediate `snapshot` of all past node statuses and logs, and then streams live Redis events as they happen.

---

## 6. Proactive Limitations to State in Your Viva
*State these candidly before the judges ask—it demonstrates engineering maturity!*
1. **Cron Scheduler in API:** In the Pass Tier, `node-cron` runs as an in-memory timer inside the Express API. For multi-instance horizontal scaling, cron triggers would be scheduled via a distributed Redis scheduler (e.g. BullMQ repeatable jobs).
2. **Templating vs Scripting:** We implemented safe JSON path substitution rather than an arbitrary JavaScript sandbox to ensure zero security vulnerabilities.
3. **No Multi-Tenant Auth:** The system focuses on workflow automation and engine internals; user authentication and role-based access control (RBAC) are documented as future production additions.
4. **Outbound SSRF Protection:** While timeouts and URL schema checks are enforced, production deployments would route HTTP executor requests through a forward proxy with private IP blocklists.

---

## 7. Viva Glossary
- **In-Degree:** The count of incoming edges directed into a graph node.
- **Topological Sort:** A linear ordering of DAG vertices such that for every directed edge \(u \to v\), vertex \(u\) comes before \(v\).
- **Fan-Out / Fan-In:** Fan-out splits execution into multiple concurrent branches; fan-in (join) waits for multiple upstream branches to complete.
- **Idempotency:** The property where an operation produces the identical outcome regardless of whether it is applied once or multiple times.
- **Cascading Skip:** Automatically bypassing all downstream children when an upstream parent node fails.
- **Jitter:** Introducing random variation into retry backoff intervals to prevent synchronized traffic spikes.
