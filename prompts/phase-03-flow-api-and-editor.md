# Phase 3: Flow Persistence API & Visual Canvas Editor (Day 2)

**Read first:** `docs/01-big-picture.md`, `docs/02-dag-and-validation.md`  
**Give the agent:** `prompts/00-master-rules.md` + this file.  
*(Prerequisite: Phase 2 graph algorithms must be completed and passing tests).*

---

## Goal
Build the end-to-end visual workflow builder and persistence layer:
1. **Backend:** A RESTful API to create, list, retrieve, update, delete, and validate workflow definitions using PostgreSQL and Prisma.
2. **Frontend:** An interactive React Flow canvas allowing users to drag/add nodes, connect dependencies via edges, configure node properties in an inspector panel, prevent cycles in real-time, and save flows to the database.

---

## Required Tasks & Specifications

### Part A: Backend Flow Persistence API (`backend/src/api/`)

1. **Zod Validation Schemas (`backend/src/api/schemas.ts`):**
   - Create Zod schemas validating `Flow` payloads:
     - `name`: non-empty string.
     - `graph`: must validate node IDs, supported types, config objects, and edges matching Phase 2 types.
   - Enforce standard JSON error response format:
     ```json
     {
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "Graph contains cycles or invalid configurations",
         "details": [ ... ]
       }
     }
     ```

2. **Flow API Routes (`backend/src/api/flows.ts`):**
   - `GET /flows`: returns list of saved flows (`id`, `name`, `createdAt`, `updatedAt`, node count).
   - `POST /flows`: validates graph using `validateGraph(graph)`. If invalid, returns HTTP 422 with structured error details. If valid, saves to `Flow` table and returns HTTP 201 with the created flow.
   - `GET /flows/:id`: returns full flow record including the `graph` JSON. Returns HTTP 404 if not found.
   - `PUT /flows/:id`: validates updated graph. If valid, updates database record and returns HTTP 200.
   - `DELETE /flows/:id`: deletes flow and cascades to related records. Returns HTTP 204 or `{ success: true }`.
   - `POST /flows/validate`: standalone dry-run endpoint accepting a `graph` payload and returning `{ valid: boolean, errors: ValidationError[] }` without saving.

3. **Mounting Routes (`backend/src/api/app.ts`):**
   - Mount flows router at `/flows`.

4. **Integration Tests (`backend/tests/flows.test.ts`):**
   - Vitest + Supertest tests covering:
     - Creating a valid linear and diamond flow (HTTP 201).
     - Attempting to save a cyclic flow (HTTP 422 with cycle error code).
     - Fetching flow by ID and listing flows.
     - Updating an existing flow.
     - Deleting a flow.
     - Validating a graph via `POST /flows/validate`.

---

### Part B: Frontend Visual Workflow Editor (`frontend/src/`)

1. **Client API Layer (`frontend/src/api/flows.ts`):**
   - Typed fetch functions for all `/flows` endpoints with loading and error handling:
     - `fetchFlows()`, `fetchFlow(id)`, `createFlow(data)`, `updateFlow(id, data)`, `deleteFlow(id)`, `validateGraphApi(graph)`.

2. **Routing & Pages (`frontend/src/`):**
   - Install `react-router-dom` (or lightweight route state) for multi-page navigation:
     - Flow List page (`/`): table/cards of saved workflows with "Create New Flow" button, last modified date, and delete actions.
     - Workflow Editor page (`/flows/:id` or `/flows/new`): full visual canvas builder.

3. **React Flow Canvas Implementation (`frontend/src/components/canvas/`):**
   - Use `@xyflow/react` with custom styled nodes:
     - Supported node types: `trigger`, `transform`, `http`, `delay`, `output`.
     - Card styling: Tailwind dark theme, clear node name, icon per type, input Handle (top/left) and output Handle (bottom/right).
     - Trigger node displays only an output handle (no incoming dependencies).
   - Include React Flow `Background`, `Controls`, and `MiniMap`.
   - Left palette or toolbar: buttons/cards to add new nodes to the canvas.

4. **Interactive Node Configuration Inspector Panel:**
   - Clicking a node opens a slide-over/inspector panel on the right:
     - Editable node title.
     - Type-specific inputs:
       - `http`: Method (GET/POST/PUT/DELETE), URL, Headers (JSON), Body (JSON/text), Timeout (ms).
       - `transform`: Template string (e.g. `"Order {{ trigger.orderId }} confirmed"`).
       - `delay`: Number of seconds (1–60).
       - `output`: Output key / label.
     - Updating properties immediately updates the node's `config` state in the graph.

5. **Client-Side Cycle Prevention & Edge Validation:**
   - In React Flow's `onConnect` callback:
     - Refuse connections where `source === target` (self-loops).
     - Temporarily test the new edge with the Phase 2 cycle detection logic.
     - If adding the edge creates a cycle, reject the connection immediately, flash a warning toast ("Cycle detected: Workflows cannot loop back on themselves"), and do not add the edge.

6. **Canvas Action Bar:**
   - **Flow Name Input:** Inline editable name.
   - **Validate Button:** Checks the graph locally and via `/flows/validate`; displays a banner showing any issues.
   - **Save Button:** Saves or updates the flow to PostgreSQL. Displays success toast or validation errors.
   - **Run Button:** Present on the canvas (disabled with a tooltip: *"Execution enabled in Phase 4"*).

---

## Verification Checklist
- [ ] Backend flow routes (`GET /flows`, `POST /flows`, `GET /flows/:id`, `PUT /flows/:id`, `DELETE /flows/:id`, `POST /flows/validate`) function correctly.
- [ ] Attempting to POST a cyclic flow to the API returns HTTP 422 with structured validation errors.
- [ ] Backend flow tests pass: `cd backend; npm test`.
- [ ] Frontend user can create a flow with `trigger -> http -> transform -> output`.
- [ ] Dragging an edge that creates a cycle is refused with an alert or toast.
- [ ] Saving the flow persists it to PostgreSQL; refreshing the browser reloads the exact node positions and configs.
- [ ] Frontend builds cleanly: `cd frontend; npm run build`.

---

## Beginner Viva Preparation for Phase 3
1. **Why validate the graph on both the client and the server?**  
   *Answer:* Defense in depth. The client-side check provides instantaneous UI feedback so the user cannot accidentally create a cycle. The server-side check is our security guarantee: if someone calls the API directly via cURL or Postman, the server still rejects invalid or cyclic graphs.
2. **Why return HTTP 422 instead of HTTP 400 for a cyclic graph?**  
   *Answer:* HTTP 400 Bad Request means the syntax was malformed (e.g., bad JSON). HTTP 422 Unprocessable Entity means the JSON syntax was valid, but its business logic or semantics (being a valid DAG) failed our validation rules.
3. **How does React Flow store node connections?**  
   *Answer:* React Flow maintains two arrays in state: `nodes` (each with `id`, `type`, `position`, and custom `data`/`config`) and `edges` (each with `id`, `source` node ID, and `target` node ID).
