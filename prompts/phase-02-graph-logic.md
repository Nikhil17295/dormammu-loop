# Phase 2: Graph logic (Day 2, Nikhil)

**Read first:** `docs/02-dag-and-validation.md`. **Give the agent:** master rules + this file.

## Goal
Pure TypeScript functions that validate a graph and order its nodes. **No Express, no database.** Nikhil: ask the agent to explain each function and try to understand the algorithm before moving on; this is the heart of the viva.

## Tasks (in `backend/src/engine/graph.ts` and a shared types file)
1. Types: `GraphNode { id, type, config, position? }`, `GraphEdge { id, source, target }`, `Graph { nodes, edges }`. Node types: `trigger`, `transform`, `http`, `delay`, `output`.
2. `topologicalSort(graph)` using **Kahn's algorithm**. When several nodes are ready, take them in sorted node-id order so the result is deterministic. Returns the ordered ids, or reports a cycle.
3. `findCycle(graph)` returning the ids of nodes involved in a cycle (or null), so the UI can highlight them.
4. `validateGraph(graph)` returning a list of structured errors `{ code, message, nodeIds? }` for: cycle, self-loop, duplicate node id, edge pointing to a missing node, empty graph, no trigger node, a trigger with incoming edges, missing required config (http needs url; delay needs seconds within 1 to 60; transform needs a template/mapping).
5. Helpers: `parentsOf`, `childrenOf`, `descendantsOf`, `roots`.
6. `readyNodes(graph, statusByNodeId)`: returns ids of nodes with status `pending` whose parents are all `success`. Sorted by id.
7. Comments explaining Kahn's algorithm step by step in plain words.
8. Vitest tests: linear chain, diamond (fan-out and fan-in), disconnected nodes, simple cycle, self-loop, long cycle, empty graph, missing trigger, missing edge target, same input gives same order, `readyNodes` for several situations including a failed parent.

## Checklist
- [ ] All tests pass
- [ ] A cyclic graph is rejected with the cycle's node ids
- [ ] Same graph gives the same order every time
- [ ] You can explain Kahn's algorithm in your own words (ask the agent to quiz you)
