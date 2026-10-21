# Phase 2: Pure DAG Logic, Cycle Detection, & Topological Sorting (Day 2)

**Read first:** `docs/02-dag-and-validation.md`  
**Give the agent:** `prompts/00-master-rules.md` + this file.

---

## Goal
Build and rigorously test pure TypeScript algorithms that validate workflow graphs, detect cycles, calculate deterministic topological ordering, and determine node execution readiness.

**Purity rule:** Code in this phase must reside entirely in `backend/src/engine/` with **zero** imports of Express, Prisma, database, or Redis. It must be 100% pure computational logic so it is lightning fast and trivially testable.

---

## Required Tasks & Specifications

### 1. Type Definitions (`backend/src/engine/types.ts`)
Define clean, exported TypeScript types:
- `NodeType`: `'trigger' | 'transform' | 'http' | 'delay' | 'output'`
- `NodeStatus`: `'pending' | 'queued' | 'running' | 'success' | 'failed' | 'retrying' | 'skipped' | 'dead'`
- `GraphNode`:
  - `id`: string
  - `type`: `NodeType`
  - `name`?: string
  - `config`: Record<string, any> (e.g. url, template, seconds, outputKey)
  - `position`?: { x: number; y: number } (for UI canvas compatibility)
- `GraphEdge`:
  - `id`: string
  - `source`: string (node id)
  - `target`: string (node id)
- `Graph`:
  - `nodes`: `GraphNode[]`
  - `edges`: `GraphEdge[]`
- `ValidationError`:
  - `code`: string (e.g. `'CYCLE_DETECTED'`, `'EMPTY_GRAPH'`, `'NO_TRIGGER'`, `'INVALID_CONFIG'`)
  - `message`: string
  - `nodeIds`?: string[]

### 2. Topological Sort via Kahn's Algorithm (`backend/src/engine/graph.ts`)
- Implement `topologicalSort(graph: Graph): { order: string[]; hasCycle: boolean }`.
- Algorithm:
  1. Calculate the in-degree (number of incoming edges) for every node.
  2. Initialize a queue with all nodes having `in-degree == 0`.
  3. **Deterministic tie-breaking:** When multiple nodes have zero in-degree, process them in alphabetical order by `id`. This guarantees reproducible execution order.
  4. While the queue is not empty, dequeue node `u`, append `u` to the result list, and for each outgoing edge `u -> v`, decrement the in-degree of `v`. If `v`'s in-degree drops to 0, push `v` to the queue.
  5. If the result list contains all graph nodes, the graph is a valid DAG. If fewer nodes are visited, a cycle exists (`hasCycle: true`).

### 3. Cycle Isolation (`backend/src/engine/graph.ts`)
- Implement `findCycle(graph: Graph): string[] | null`.
- If Kahn's algorithm reveals a cycle, isolate the subset of nodes involved in the loop so the UI can highlight the offending cycle in red.

### 4. Graph Structural & Config Validation (`backend/src/engine/graph.ts`)
- Implement `validateGraph(graph: Graph): ValidationError[]`.
- Must check and return structured errors for:
  - **Empty graph:** No nodes defined.
  - **Duplicate node IDs:** Two nodes sharing the same identifier.
  - **Dangling edges:** Edge referencing a non-existent `source` or `target` node ID.
  - **Self-loops:** Edge where `source === target`.
  - **Cycle detection:** Direct or indirect cyclic dependencies.
  - **Trigger rules:** At least one `trigger` node; trigger nodes must have **zero** incoming edges (`in-degree === 0`).
  - **Node configuration rules:**
    - `http`: must provide a valid URL string starting with `http://` or `https://`.
    - `delay`: must provide `seconds` as an integer between 1 and 60.
    - `transform`: must provide a `template` string or mapping configuration.
    - `output`: must specify a non-empty `name` or `key`.

### 5. Graph Traversal Helpers (`backend/src/engine/graph.ts`)
- `parentsOf(graph: Graph, nodeId: string): string[]`: immediate predecessor node IDs.
- `childrenOf(graph: Graph, nodeId: string): string[]`: immediate successor node IDs.
- `descendantsOf(graph: Graph, nodeId: string): string[]`: all transitive downstream node IDs (used when a node fails and all its descendants must be marked `skipped`).
- `roots(graph: Graph): string[]`: nodes with zero incoming edges.

### 6. Node Readiness Calculator (`backend/src/engine/graph.ts`)
- Implement `readyNodes(graph: Graph, statusByNodeId: Record<string, NodeStatus>): string[]`.
- A node is ready to execute if and only if:
  1. Its current status is `'pending'`.
  2. **All** of its parent nodes have reached status `'success'`.
- Return ready node IDs sorted alphabetically for determinism.

### 7. Comprehensive Vitest Test Suite (`backend/tests/graph.test.ts`)
Write and execute thorough tests covering:
- Linear chain graph: `A -> B -> C`.
- Diamond graph (fan-out and fan-in): `A -> B, A -> C, B -> D, C -> D`.
- Disconnected graph components.
- Self-loop cycle: `A -> A`.
- 2-node cycle: `A -> B -> A`.
- Complex multi-node cycle: `A -> B -> C -> D -> B`.
- Deterministic tie-breaking verification (same graph always yields the identical topological sort).
- Validation errors: empty graph, missing trigger, trigger with incoming edge, invalid HTTP URL, invalid delay seconds.
- `readyNodes`:
  - Initial state: only trigger/root nodes ready.
  - Mid-execution: node waits until **both** parents in a diamond succeed.
  - Failed parent: downstream node is never marked ready.
- `descendantsOf`: correctly returns all downstream nodes for cascading skips.

---

## Verification Checklist
- [ ] `backend/src/engine/types.ts` defines all graph types cleanly.
- [ ] `backend/src/engine/graph.ts` has zero imports from Express, Prisma, or external network packages.
- [ ] Kahn's algorithm handles both valid DAGs and cyclic graphs correctly.
- [ ] Tie-breaking by node ID produces identical ordering on repeated runs.
- [ ] `findCycle` isolates cyclic nodes for canvas error highlighting.
- [ ] `validateGraph` returns structured error objects with actionable error messages.
- [ ] `descendantsOf` and `readyNodes` accurately support parallel and skipped execution.
- [ ] `cd backend; npm test` runs and all tests pass with zero failures.

---

## Beginner Viva Preparation for Phase 2
1. **What is a DAG and why must workflow automation engines be DAGs?**  
   *Answer:* A Directed Acyclic Graph is a network of nodes connected by directional edges with no closed loops. Workflows must be acyclic because if a cycle existed, node A would wait for node B, which is waiting for node A, causing an infinite deadlock.
2. **How does Kahn's algorithm work in plain English?**  
   *Answer:* It counts how many dependencies (in-degrees) each node has. Nodes with zero dependencies are ready first. We process them, remove their outgoing edges, and check if any child nodes now have zero remaining dependencies. If all nodes get processed, it's a DAG; if some nodes are left unprocessed, a cycle trapped them.
3. **What is the time complexity of cycle detection?**  
   *Answer:* \(O(V + E)\), where \(V\) is the number of vertices (nodes) and \(E\) is the number of edges. We visit each node and edge a constant number of times.
