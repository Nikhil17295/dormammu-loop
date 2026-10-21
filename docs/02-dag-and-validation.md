# 02. Graphs, DAGs and cycle detection (Phase 2)

## Vocabulary
- **Graph:** nodes connected by edges. **Directed:** an edge A -> B means B depends on A.
- **Cycle:** a path that returns to its start (A -> B -> C -> A). A workflow with a cycle could never finish: A waits for C, C for B, B for A. That is the "Dormammu loop".
- **DAG:** Directed Acyclic Graph, a directed graph with no cycles.
- **Parent** of a node: nodes with an edge into it. **Child:** nodes it points to.
- **In-degree:** number of incoming edges. A **root** has in-degree 0 (a trigger).
- **Topological order:** a list of all nodes where every node comes after all its parents. Only DAGs have one.

## Kahn's algorithm (our cycle detector and sorter)
1. Count each node's in-degree.
2. Put all nodes with in-degree 0 in a queue.
3. Take one out, add it to the result list. For each child, reduce its in-degree by 1; if it becomes 0, add the child to the queue.
4. At the end, if the result has all the nodes, the graph is a DAG. If some are missing, there is a cycle.

Time: O(V + E) (V nodes, E edges).

## Deterministic order
When several nodes are ready at once, we sort them by node id before picking. Same graph in, same order out. (Parallel nodes may still *finish* in any order at runtime; the plan is deterministic.)

## Other checks before saving a flow
- Edge points to a node that does not exist
- Self-loop (A -> A)
- Duplicate node ids
- Empty graph / no trigger node
- A trigger with incoming edges
- Missing required settings (an HTTP node with no URL)

The browser checks too (instant feedback when you draw an edge), but **the server is authoritative**: never trust the browser.

## Fan-out and fan-in
- Fan-out: one node feeds several; they can run in parallel.
- Fan-in (join): a node with several parents waits for **all** of them.

## Likely viva questions
- What is a DAG and why must a workflow be one?
- How does Kahn's algorithm detect a cycle? Complexity?
- How do you decide a node can run? (All parents succeeded.)
- Why validate on both client and server?
