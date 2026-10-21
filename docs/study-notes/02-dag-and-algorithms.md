# Study Guide 02: Pure DAG Logic, Cycle Detection, & Topological Sorting

> **Target Audience:** Nikhil & Madhav (WEBSTER 2026)  
> **Topic:** Phase 2 Engine Algorithms  
> **Primary Owner:** Nikhil (Algorithms & Engine Lead)  
> **Key Concepts:** Directed Acyclic Graphs (DAG), Kahn's Algorithm, In-Degree Maps, Topological Sorting, Back-Edge DFS Cycle Isolation, Tie-Breaking Determinism, Cascading Skip Tree Traversal, Node Readiness.

---

## 1. What Was Built & Why It Exists

In **The Dormammu Loop**, workflows are represented as visual graphs:
- **Nodes:** Individual tasks (e.g. Trigger, HTTP Fetch, JSON Transform, Delay, Output).
- **Edges:** Directed dependencies indicating execution order ($A \to B$ means "$B$ depends on $A$").

If a user connects $A \to B \to C \to A$, they have created an infinite dependency loop: $A$ waits for $C$, $C$ waits for $B$, and $B$ waits for $A$. Without validation, an execution engine would freeze or deadlock permanently—trapped in a real-life "Dormammu loop".

To make our engine rock-solid, Phase 2 implements **pure, zero-dependency graph theory algorithms**:
1. **Validation (`validateGraph`):** Audits graph structure for empty graphs, duplicate IDs, dangling edges, self-loops, missing triggers, invalid trigger inputs, and invalid node configs (URLs, delay bounds, templates).
2. **Topological Ordering (`topologicalSort`):** Uses **Kahn's Algorithm** with deterministic alphabetical tie-breaking to compute a linear order of tasks where every parent comes strictly before its children.
3. **Cycle Isolation (`findCycle`):** When Kahn's algorithm reports a cycle, a 3-color Depth-First Search (DFS) isolates the exact subset of nodes causing the loop so the React Flow canvas can paint them bright red.
4. **Execution Readiness (`readyNodes`):** Determines which nodes are unblocked and ready to run at any moment during an execution lifecycle (when all upstream parents have succeeded).
5. **Cascading Skip Traversal (`descendantsOf`):** Computes all transitive downstream nodes so that when an upstream node fails, its entire dependency sub-tree is safely marked `'skipped'` instead of hanging in `'pending'` forever.

### The Purity Rule: Why Zero Dependencies Matter
The entire `backend/src/engine/` module imports **no Express, no Prisma, no PostgreSQL, and no Redis**. It is 100% pure computational logic.
- **Speed:** Can validate hundreds of graphs per millisecond in memory.
- **Testability:** Unit tests run in under 20ms without spinning up databases or mocks.
- **Portability:** The exact same pure logic can run inside the Node.js backend API, inside worker threads, or directly inside the React browser canvas.

---

## 2. File-by-File Breakdown with Beginner Analogies

| File | What It Does | Beginner Analogy |
|---|---|---|
| [`backend/src/engine/types.ts`](file:///m:/dormammu-loop/backend/src/engine/types.ts) | Defines TypeScript interfaces for `GraphNode`, `GraphEdge`, `Graph`, `NodeType`, `NodeStatus`, and `ValidationError`. | The **Lego instruction manual**. It defines what valid Lego blocks (nodes) and connector pins (edges) look like before anyone starts building. |
| [`backend/src/engine/graph.ts`](file:///m:/dormammu-loop/backend/src/engine/graph.ts) | Core pure functions: `topologicalSort`, `findCycle`, `validateGraph`, `parentsOf`, `childrenOf`, `descendantsOf`, `roots`, and `readyNodes`. | The **Air Traffic Controller**. It inspects the flight plan (graph), checks if planes would collide (cycles), decides which planes can take off first (in-degree 0), and ensures runway readiness. |
| [`backend/src/engine/index.ts`](file:///m:/dormammu-loop/backend/src/engine/index.ts) | Clean public barrel export. | The **front reception desk**. Allows any other module to do `import { validateGraph } from '../engine'`. |
| [`backend/tests/graph.test.ts`](file:///m:/dormammu-loop/backend/tests/graph.test.ts) | 33 Vitest unit tests covering linear chains, diamonds, self-loops, multi-node loops, tie-breaking, and validation. | The **crash-test dummy facility**. Fires every conceivable broken, circular, and malformed graph at our engine to ensure it never crashes or hangs. |

---

## 3. Under the Hood: Step-by-Step Data Flow

### A. Kahn's Algorithm Step-by-Step (`topologicalSort`)

Consider a **Diamond Graph**:  
$A$ (trigger) $\to B$ (HTTP) and $A \to C$ (Transform); both $B$ and $C \to D$ (Output).

```
        ┌───────────┐
        │  A (Root) │
        └─────┬─────┘
          ┌───┴───┐
          ▼       ▼
        ┌───┐   ┌───┐
        │ B │   │ C │
        └───┬───┘   └───┬───┘
          └───┬───┘
              ▼
        ┌───────────┐
        │ D (Join)  │
        └───────────┘
```

1. **Calculate In-Degrees:**
   - $A$: 0 incoming edges.
   - $B$: 1 incoming edge (from $A$).
   - $C$: 1 incoming edge (from $A$).
   - $D$: 2 incoming edges (from $B$ and $C$).
2. **Seed the Ready Queue:**
   - Nodes with in-degree == 0: `['A']`.
3. **Round 1:**
   - Dequeue $A$. Append $A$ to `order` (`['A']`).
   - Decrement in-degree of $A$'s children: $B \to 0$, $C \to 0$.
   - Both $B$ and $C$ enter the queue.
   - **Tie-breaker:** Sort alphabetically $\to$ `['B', 'C']`.
4. **Round 2:**
   - Dequeue $B$. Append $B$ to `order` (`['A', 'B']`).
   - Decrement in-degree of $B$'s child: $D$ drops from $2 \to 1$.
   - $D$'s in-degree is not 0, so $D$ stays waiting.
5. **Round 3:**
   - Dequeue $C$. Append $C$ to `order` (`['A', 'B', 'C']`).
   - Decrement in-degree of $C$'s child: $D$ drops from $1 \to 0$.
   - $D$'s in-degree is now 0 $\to$ push $D$ to queue.
6. **Round 4:**
   - Dequeue $D$. Append $D$ to `order` (`['A', 'B', 'C', 'D']`).
7. **Verification:**
   - Visited count is 4, matching total nodes (4).
   - `hasCycle: false`. Order: `['A', 'B', 'C', 'D']`.

---

### B. Cycle Isolation via 3-Color DFS (`findCycle`)

Suppose a user adds an edge $D \to B$ to the diamond graph ($B \to D \to B$ cycle):
1. In Kahn's algorithm:
   - $A$ is processed.
   - $B$ has incoming from $A$ and $D$ (in-degree 2). After $A$, $B$'s in-degree is 1.
   - $C$ becomes 0 and is processed.
   - $D$ has incoming from $B$ (1) and $C$ (1). After $C$, $D$'s in-degree is 1.
   - **Deadlock:** Neither $B$ nor $D$ ever reach in-degree 0! Queue is empty.
   - Processed: `['A', 'C']` (2 nodes visited out of 4). `hasCycle: true`.
2. `findCycle` initiates Depth-First Search:
   - Maintains node states: `0 = unvisited`, `1 = visiting` (in active recursion stack), `2 = visited`.
   - Starts at $A$: visiting path `['A']`. Traverses to $B$: path `['A', 'B']`.
   - Traverses to $D$: path `['A', 'B', 'D']`.
   - From $D$, follows edge $D \to B$:
   - Node $B$ is already marked `1` (visiting in current path)!
   - **Back-edge found!**
   - Slice path from index of $B$ to end: `['A', 'B', 'D'].slice(1)` $\to$ `['B', 'D']`.
   - Returns `['B', 'D']`.
   - Notice that node $A$ and node $C$ are **not** in the cycle and are excluded from the error list!

---

## 4. Common Bugs, Mistakes, & Gotchas

### Gotcha 1: Unstable Topological Order Across Runs (Flaky Tests)
- **What happens:** Node $B$ and Node $C$ are in parallel. Run 1 produces `['A', 'B', 'C', 'D']`, but Run 2 produces `['A', 'C', 'B', 'D']`.
- **Why it matters:** Non-deterministic execution creates unreproducible bugs in production and makes integration tests flaky.
- **The Solution:** Whenever multiple nodes enter the ready queue, always sort them alphabetically by `id` (`readyQueue.sort((a, b) => a.localeCompare(b))`).

### Gotcha 2: Treating Re-Convergence (Diamond Fan-In) as a Cycle
- **What happens:** In a diamond graph, node $D$ is reachable from both path $A \to B \to D$ and $A \to C \to D$. A naive DFS that flags any already-seen node as a cycle flags $D$ as an illegal cycle!
- **The Solution:** Use **3-color DFS** (`unvisited`, `visiting`, `visited`). Re-visiting a node marked `visited` (`2`) is simply an alternative valid path (fan-in). Only re-encountering a node marked `visiting` (`1`) indicates a true circular loop (back-edge).

### Gotcha 3: Trigger Nodes With In-Degree > 0
- **What happens:** A user connects an output of a task back into the Trigger node.
- **The Solution:** `validateGraph` explicitly checks `trigger` nodes. Trigger nodes must have in-degree 0 (`TRIGGER_HAS_INCOMING_EDGES`). A trigger represents an external event (webhook or cron); it cannot depend on an internal task.

---

## 5. Tricky Edge Cases Handled in Phase 2

1. **Self-Loops ($A \to A$):**
   - An edge pointing from a node directly to itself.
   - Handled immediately by `SELF_LOOP` validation and by DFS back-edge detection (`findCycle` returns `['A']`).
2. **Disconnected Components:**
   - Graph with independent subgraphs (e.g. $A \to B$ and $C \to D$).
   - Kahn's algorithm seeds all roots simultaneously (`A` and `C`), processing them cleanly in deterministic order.
3. **Cascading Skip Subtrees:**
   - If node $B$ fails in a multi-stage pipeline, `descendantsOf(graph, 'B')` computes the exact transitive closure of all downstream nodes (using BFS with visited set) so the executor can mark them `'skipped'` in one pass.
4. **Invalid Config Types:**
   - HTTP nodes must have URLs starting with `http://` or `https://` and parse cleanly via `new URL()`.
   - Delay nodes must have an integer `seconds` property between 1 and 60 (preventing fractional delays or infinite pauses).
   - Transform nodes must supply a valid template string or non-empty mapping dictionary.

---

## 6. PowerShell Debugging Toolkit

Run these commands in PowerShell to inspect, test, and debug Phase 2 algorithms:

```powershell
# 1. Run all engine tests with Vitest:
cd backend
npm test

# 2. Run only the graph test suite in watch mode:
npx vitest tests/graph.test.ts

# 3. Compile TypeScript to verify zero build or type errors:
npm run build

# 4. Run an ad-hoc inline node snippet testing topologicalSort:
node -e "const { topologicalSort } = require('./dist/engine'); console.log(topologicalSort({ nodes: [{ id: 'A', type: 'trigger', config: {} }, { id: 'B', type: 'output', config: { key: 'k' } }], edges: [{ id: 'e1', source: 'A', target: 'B' }] }));"
```

---

## 7. Viva & Technical Interview Questions (5 Essential Model Q&As)

### Question 1: What is a Directed Acyclic Graph (DAG) and why must workflow automation engines be DAGs?
> **Answer:**  
> A Directed Acyclic Graph is a network of nodes connected by directional edges where it is mathematically impossible to start at any node and follow the sequence of edges back to the starting node. Workflow automation engines must be DAGs because workflows represent causal step-by-step dependencies. If a cycle existed ($A \to B \to A$), task $A$ could never execute until $B$ finishes, but $B$ cannot run until $A$ finishes, creating an unresolvable infinite deadlock.

### Question 2: How does Kahn's algorithm detect cycles and what is its computational complexity?
> **Answer:**  
> Kahn's algorithm works by tracking the **in-degree** (count of incoming edges) for every node. It seeds a queue with nodes having an in-degree of 0 (independent roots). It repeatedly dequeues a node, appends it to the sorted list, and decrements the in-degree of its child nodes. If a child's in-degree drops to 0, it enters the queue.  
> If the final list contains all vertices ($|V|$), the graph is acyclic. If the list contains fewer than $|V|$ nodes, any remaining nodes have in-degrees trapped above 0, proving a cycle exists.  
> The time complexity is $\mathcal{O}(V + E)$ where $V$ is the number of vertices and $E$ is the number of edges, because each node and edge is examined a constant number of times. Space complexity is $\mathcal{O}(V + E)$ to maintain the adjacency list and in-degree map.

### Question 3: Why did you implement deterministic tie-breaking in your topological sort?
> **Answer:**  
> In a graph with parallel branches (like a diamond graph where $A$ splits into $B$ and $C$), both $B$ and $C$ reach in-degree 0 simultaneously. If we pulled from an unordered set or standard queue, the execution plan could differ based on array memory order or JavaScript engine internals. By enforcing an alphabetical sort on node IDs whenever multiple nodes are ready, the same workflow definition produces the exact identical execution plan on any machine, making testing, logging, and debugging 100% reproducible.

### Question 4: How does your engine determine when a node is ready to execute at runtime?
> **Answer:**  
> Through our pure `readyNodes(graph, statusByNodeId)` function. A node is ready if and only if two conditions are met:
> 1. Its current status in the execution record is `'pending'`.
> 2. **All** of its immediate parent nodes have reached status `'success'`.  
> For root trigger nodes, the parent set is empty, so they are immediately ready. In a diamond fan-in join node, if parent $B$ has succeeded but parent $C$ is still `'running'`, the join node remains waiting.

### Question 5: Why did you isolate the engine logic with zero dependencies on Express, Prisma, or Redis?
> **Answer:**  
> This follows the **Clean Architecture / Pure Core principle**. Graph traversal, cycle detection, and template validation are mathematical algorithms with no external I/O. By keeping them pure TypeScript:
> - Unit tests execute in under 20 milliseconds without spinning up Docker or database migrations.
> - The same graph algorithms can be reused on the backend API, in BullMQ worker processes, or compiled into the React frontend to give instant visual error highlights to users as they drag edges on the canvas.
