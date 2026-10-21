# Phase 3: Flow API (Madhav) + visual editor (Nikhil) (Day 2)

**Read first:** `docs/01-big-picture.md`, `docs/02-dag-and-validation.md`. **Give the agent:** master rules + this file. Phase 2 must be merged first (both parts use its validation).
Two people can work in parallel: Madhav does Part A, Nikhil does Part B, on separate branches.

## Part A: Flow API (Madhav, backend)
1. Routes using Prisma and zod validation:
   - `POST /flows`, `GET /flows`, `GET /flows/:id`, `PUT /flows/:id`, `DELETE /flows/:id`
   - `POST /flows/validate` (checks a graph without saving)
2. Saving calls `validateGraph` from Phase 2. Invalid graph: respond `422` with the error list.
3. Consistent JSON error shape `{ error: { code, message, details? } }`; no stack traces in responses.
4. Tests (supertest + Vitest) for create, read, update, delete, and rejecting a cyclic graph.

## Part B: Visual editor (Nikhil, frontend)
1. Pages: flow list (`/`), editor (`/flows/:id`). Use React Router.
2. Editor with React Flow:
   - Left palette: trigger, transform, http, delay, output; drag onto the canvas
   - Connect nodes by dragging between handles; delete nodes and edges
   - Right panel: a form for the selected node's config (http: method, url, headers, body, timeout; delay: seconds; transform: template; output: a name)
   - Custom node look with an icon, title, and a status colour dot (used later for live status)
   - MiniMap, Controls, background grid
3. **Client-side cycle check:** when the user connects two nodes, run the same cycle logic (copy or share the Phase 2 function) and refuse the connection if it would make a cycle; show a clear message and highlight the nodes. Also refuse self-loops.
4. Buttons: Save (calls the API; show server errors), Validate, and a Run button that is disabled for now.
5. A small typed API client (`src/api`) with loading and error states.

## Checklist
- [ ] Create a flow trigger -> http -> transform -> output in the browser, save, reload, it is still there
- [ ] Drawing an edge that makes a cycle is refused with a visible message
- [ ] Saving an invalid graph shows the server's errors
- [ ] API tests pass; no console errors in the browser
