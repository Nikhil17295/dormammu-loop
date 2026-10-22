# Study Guide 03: Flow Persistence API & Graph Validation

> **Target Audience:** Nikhil & Madhav (WEBSTER 2026)  
> **Topic:** Phase 3 Flow Persistence & REST API  
> **Primary Owner:** Madhav (API & Database Lead)  
> **Key Concepts:** RESTful API Design, Zod Runtime Schema Validation, Prisma ORM CRUD, Defense-in-Depth Validation, Semantic HTTP Status Codes (200, 201, 400, 404, 422, 500), Foreign Key Cascade Deletion, Dry-Run Validation.

---

## 1. What Was Built & Why It Exists

In Phase 2, Nikhil built the pure graph algorithms (Kahn's topological sort, cycle detection, and DAG validation) in isolation. However, pure algorithms only run in computer memory. Once the user closes their browser or restarts the computer, the workflow would be lost forever.

In Phase 3, Madhav connected those pure algorithms to the outside world by building the **Flow Persistence REST API**:
1. **Zod Runtime Validation (`backend/src/api/schemas.ts`):** Validates every incoming HTTP request body before it touches our database or engine, enforcing required types, string boundaries, and structural rules.
2. **REST Endpoints (`backend/src/api/flows.ts`):** Standard HTTP endpoints allowing clients to:
   - `GET /flows`: List all saved workflows with high-level summaries and node counts.
   - `POST /flows`: Validate and save a new workflow definition to PostgreSQL.
   - `GET /flows/:id`: Fetch a single complete workflow record including its full JSON graph.
   - `PUT /flows/:id`: Update an existing workflow's name and/or graph definition.
   - `DELETE /flows/:id`: Delete a workflow and cascade delete all its associated triggers and runs.
   - `POST /flows/validate`: A standalone dry-run endpoint that tests a graph for cycles and config errors without saving anything to the database.
3. **Database Integration (`prisma.flow`):** Maps JSON graph definitions to PostgreSQL relational records using Prisma ORM with automatic UUID generation and timestamps (`createdAt`, `updatedAt`).
4. **Typed Client Layer (`frontend/src/api/flows.ts`):** Provides strongly typed fetch functions for the React frontend, handling error parsing and network requests.

---

## 2. File-by-File Breakdown with Beginner Analogies

| File | What It Does | Beginner Analogy |
|---|---|---|
| [`backend/src/api/schemas.ts`](file:///a:/projects/dormammu-loop/backend/src/api/schemas.ts) | Defines Zod schemas (`createFlowSchema`, `updateFlowSchema`, `graphSchema`, `validateGraphPayloadSchema`). | The **Security Guard at the door**. Inspects every parcel (HTTP request) entering the building. If a parcel is misshapen or missing required labels, the guard rejects it immediately before it enters the warehouse. |
| [`backend/src/api/flows.ts`](file:///a:/projects/dormammu-loop/backend/src/api/flows.ts) | Express router implementing all `/flows` CRUD and validation endpoints. | The **Filing Clerk**. Handles requests from users to open new files, search folders, update documents, shred old folders, or pre-check documents for errors. |
| [`backend/src/api/app.ts`](file:///a:/projects/dormammu-loop/backend/src/api/app.ts) | Express server configuration; mounts `flowsRouter` at `/flows`. | The **Building Directory**. Routes visitors seeking `/flows` to the filing clerk's desk. |
| [`backend/tests/flows.test.ts`](file:///a:/projects/dormammu-loop/backend/tests/flows.test.ts) | 20 Vitest + Supertest integration tests validating every route, cycle rejection, error formats, and database queries. | The **Building Inspector**. Verifies that fire alarms, locks, and elevators work properly by testing 20 different normal and emergency scenarios. |
| [`frontend/src/api/flows.ts`](file:///a:/projects/dormammu-loop/frontend/src/api/flows.ts) | Typed TypeScript API client functions for fetching, saving, updating, and validating flows. | The **Courier Service**. Safely carries orders from the React browser UI to the backend API and delivers responses back. |

---

## 3. Under the Hood: Step-by-Step Data Flow

### A. Saving a Valid Workflow (`POST /flows`)

```
1. Client (Vite Frontend or cURL) sends:
   POST /flows
   Content-Type: application/json
   Body: { "name": "Linear Flow", "graph": { "nodes": [...], "edges": [...] } }

2. Express Router receives request:
   -> routes to POST /flows handler in backend/src/api/flows.ts

3. Gate 1: Structural Validation (Zod)
   -> createFlowSchema.safeParse(req.body)
   -> Checks: Is name a non-empty string? Are nodes and edges arrays? Are node types valid?
   -> If malformed -> Returns HTTP 400 Bad Request with field-level details.

4. Gate 2: Semantic DAG Validation (Pure Engine)
   -> validateGraph(parsed.data.graph)
   -> Checks: Does graph have a trigger? Are there cycles? Any self-loops? Any dangling edges?
   -> If invalid/cyclic -> Returns HTTP 422 Unprocessable Entity with error codes (e.g. CYCLE_DETECTED).

5. Database Persistence (Prisma)
   -> prisma.flow.create({ data: { name: ..., graph: ... } })
   -> PostgreSQL generates UUID, assigns default now() timestamps, stores graph JSON.

6. Response:
   -> Returns HTTP 201 Created with { id: "uuid", name: "...", graph: ..., createdAt: ..., updatedAt: ... }
```

---

### B. Dry-Run Validation (`POST /flows/validate`)

```
1. Client sends:
   POST /flows/validate
   Body: { "graph": { ... } } (or raw { "nodes": [...], "edges": [...] })

2. validateGraphPayloadSchema parses either wrapper format into a clean Graph object.

3. validateGraph(graph) runs in memory (takes < 1 ms).

4. Returns HTTP 200 OK:
   {
     "valid": false,
     "errors": [
       {
         "code": "CYCLE_DETECTED",
         "message": "Cycle detected involving nodes: A -> B -> A.",
         "nodeIds": ["A", "B"]
       }
     ]
   }
   -> Zero database queries executed! Safe, fast, and reusable.
```

---

## 4. Common Bugs, Mistakes, & Gotchas

### Gotcha 1: Confusing HTTP 400 with HTTP 422
- **What happens:** Returning HTTP 400 whenever a graph contains a cycle.
- **Why it matters:** In REST standards, **HTTP 400 (Bad Request)** means the syntax is invalid (e.g., corrupted JSON, missing required fields, wrong data types). **HTTP 422 (Unprocessable Entity)** means the syntax was completely valid and parseable, but semantic or domain business logic was violated (e.g., the graph contains a cycle or has no trigger node).
- **The Fix:** Zod schema syntax failures return HTTP 400; DAG algorithm failures return HTTP 422.

### Gotcha 2: Route Shadowing in Express (`/flows/:id` vs `/flows/validate`)
- **What happens:** If `router.get("/:id", ...)` or `router.post("/:id", ...)` is defined before `router.post("/validate", ...)`, Express treats the word `"validate"` as a parameter ID (`req.params.id = "validate"`), causing requests to fail or return 404!
- **The Fix:** Always register static routes (`/flows/validate`) before dynamic parameter routes (`/flows/:id`).

### Gotcha 3: Prisma Defaulting in Zod Schemas Causing Silent False Passes
- **What happens:** If Zod defines `nodes: z.array(...).default([])`, sending `{ invalid: "foo" }` silently creates an empty graph `{ nodes: [], edges: [] }` instead of failing structural validation.
- **The Fix:** Require `nodes` and `edges` to be explicitly provided as arrays in `graphSchema`.

---

## 5. Tricky Edge Cases Handled in Phase 3

1. **Partial Flow Updates (`PUT /flows/:id`):**  
   Users might want to rename a flow without resending the entire 50-node graph, or update the graph without changing the title. `updateFlowSchema` uses Zod's `.refine()` to ensure at least one field (`name` or `graph`) is present, and only runs expensive DAG validation when a new graph is provided.
2. **Dual-Format Dry-Run Payload (`POST /flows/validate`):**  
   Some frontend clients wrap the graph in `{ graph: { nodes, edges } }` while others send raw `{ nodes, edges }`. `validateGraphPayloadSchema` uses `z.union()` with a `.transform()` so both formats work seamlessly.
3. **Foreign Key Cascade Deletion:**  
   When deleting a workflow (`DELETE /flows/:id`), PostgreSQL triggers and runs associated with this flow could become orphaned. By using Prisma's `onDelete: Cascade` in `schema.prisma`, deleting a flow cleanly deletes all associated `Trigger` and `Run` rows in a single atomic transaction.
4. **Summary Node Count Optimization:**  
   `GET /flows` shouldn't burden clients or bandwidth by shipping full 100-node graphs for 50 workflows on the dashboard. The route extracts `nodes.length` to return lightweight summaries (`nodeCount`).

---

## 6. PowerShell Debugging Toolkit

Use these exact commands to test and inspect the Flow API directly in PowerShell:

```powershell
# 1. Run all backend tests (health, graph, flows):
cd backend
npm test

# 2. Run only the flow API integration test suite:
cd backend
npx vitest tests/flows.test.ts

# 3. Test listing flows via PowerShell:
Invoke-RestMethod -Uri http://localhost:4000/flows

# 4. Create a test flow via PowerShell:
$payload = @{
  name = "CLI Demo Flow"
  graph = @{
    nodes = @(
      @{ id = "t1"; type = "trigger"; config = @{} },
      @{ id = "d1"; type = "delay"; config = @{ seconds = 5 } },
      @{ id = "o1"; type = "output"; config = @{ key = "res" } }
    )
    edges = @(
      @{ id = "e1"; source = "t1"; target = "d1" },
      @{ id = "e2"; source = "d1"; target = "o1" }
    )
  }
} | ConvertTo-Json -Depth 6

$created = Invoke-RestMethod -Uri http://localhost:4000/flows -Method Post -Body $payload -ContentType "application/json"
$created

# 5. Fetch the newly created flow by its ID:
Invoke-RestMethod -Uri "http://localhost:4000/flows/$($created.id)"

# 6. Delete the test flow by ID:
Invoke-RestMethod -Uri "http://localhost:4000/flows/$($created.id)" -Method Delete

# 7. Test dry-run cycle detection without saving to database:
$cyclePayload = @{
  graph = @{
    nodes = @(
      @{ id = "t1"; type = "trigger"; config = @{} },
      @{ id = "a"; type = "delay"; config = @{ seconds = 1 } },
      @{ id = "b"; type = "delay"; config = @{ seconds = 1 } }
    )
    edges = @(
      @{ id = "e1"; source = "t1"; target = "a" },
      @{ id = "e2"; source = "a"; target = "b" },
      @{ id = "e3"; source = "b"; target = "a" }
    )
  }
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Uri http://localhost:4000/flows/validate -Method Post -Body $cyclePayload -ContentType "application/json"
```

---

## 7. Viva & Technical Interview Questions (5 Essential Model Q&As)

### Question 1: What is the purpose of Zod in this API, and why isn't TypeScript alone sufficient?
> **Model Answer:**  
> TypeScript provides compile-time type checking, but type annotations are completely erased during JavaScript execution. When an external client makes an HTTP request to our Express server, the incoming payload is raw untrusted JSON. Zod provides **runtime schema validation**: it intercepts incoming requests at runtime, verifies data types, enforces string lengths and regexes, and rejects malformed payloads with descriptive error messages before any database query or algorithm executes.

### Question 2: Why do we return HTTP 422 for a cyclic workflow instead of HTTP 400?
> **Model Answer:**  
> This adheres to RFC 9110 HTTP semantic standards. HTTP 400 Bad Request indicates syntactical invalidity—such as broken JSON formatting or a missing mandatory parameter. HTTP 422 Unprocessable Content indicates semantic invalidity—the JSON payload was well-formed and successfully parsed, but its contents violate our domain business logic (i.e. the graph contains a circular dependency or lacks a trigger node).

### Question 3: How does the API prevent storing corrupted or cyclic workflows in PostgreSQL?
> **Model Answer:**  
> Through a two-stage validation gate:
> 1. Stage 1 (Structural): Zod parses the JSON body to verify that `nodes` and `edges` conform to our typed interfaces.
> 2. Stage 2 (Semantic): Our pure `validateGraph` function executes Kahn's algorithm and DFS cycle isolation.  
> Only if `validateGraph` returns an empty array of errors does the route proceed to execute `prisma.flow.create()`. If any error exists, the server immediately returns HTTP 422 and PostgreSQL is never touched.

### Question 4: What is the purpose of the `/flows/validate` dry-run endpoint?
> **Model Answer:**  
> The dry-run endpoint allows the frontend visual canvas or external API clients to validate a workflow graph in real-time without persisting anything to the database. For example, while a user is drawing edges or configuring nodes, the canvas can send the current graph to `/flows/validate` to verify its integrity, calculate ready nodes, or highlight invalid nodes before the user ever clicks "Save".

### Question 5: How does deleting a flow handle associated triggers and execution history?
> **Model Answer:**  
> In our Prisma schema (`schema.prisma`), the `Trigger` and `Run` models define foreign key relations to `Flow` with `onDelete: Cascade`. When `DELETE /flows/:id` is called, PostgreSQL automatically and atomically deletes all associated webhook tokens, cron schedules, execution runs, node runs, and logs tied to that flow ID. This prevents orphan records and maintains relational integrity without needing multiple manual SQL queries.
