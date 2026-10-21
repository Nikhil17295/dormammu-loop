# Study Guide 01: Setup, Infrastructure, & Database Foundation

> **Target Audience:** Nikhil & Madhav (WEBSTER 2026)  
> **Topic:** Phase 1 Foundation  
> **Key Technologies:** Docker Compose, PostgreSQL 16, Redis 7, Prisma ORM, Node.js + Express, TypeScript, Vite, Tailwind CSS, Vitest.

---

## 1. What Was Built & Why It Exists

Modern distributed systems need three layers to function:
1. **Infrastructure (Data Storage):** PostgreSQL for permanent state and Redis for messaging/queueing. Instead of installing database software directly onto Windows (which causes configuration drift and version conflicts), we containerized them using **Docker Compose**.
2. **Backend API Server:** An Express server with TypeScript that exposes endpoints to check health, query database models, and coordinate work.
3. **Frontend Dashboard:** A React application styled with Tailwind CSS, preconfigured with `@xyflow/react` for our visual canvas, and connected to the backend via a health check client.

---

## 2. File-by-File Breakdown (Where Code Lives)

| File | What It Does | Beginner Explanation |
|---|---|---|
| `docker-compose.yml` | Starts PostgreSQL & Redis containers | A configuration blueprint telling Docker which database images to download, which ports to expose, and where to store permanent data on your hard drive. |
| `backend/prisma/schema.prisma` | Defines the 8 database models | The single source of truth for our database tables. Prisma reads this file and automatically generates SQL migrations and TypeScript types. |
| `backend/src/lib/prisma.ts` | Global PrismaClient singleton | Prevents opening dozens of duplicate database connections during hot reloads by keeping one shared client instance. |
| `backend/src/api/app.ts` | Configures Express, CORS, and `/health` | The core web application. It parses incoming JSON requests and allows the browser on port 5173 to communicate with port 4000. |
| `backend/src/index.ts` | Server entrypoint | Loads `.env` variables and starts the Express server listening on port 4000. |
| `backend/tests/health.test.ts` | Vitest integration test | Automatically sends a test request to `/health` in memory to verify that the server responds with HTTP 200 and `{ status: "ok" }`. |
| `frontend/src/api/health.ts` | Typed frontend API client | A clean fetch function that calls `http://localhost:4000/health` and returns typed response data. |
| `frontend/src/hooks/useHealth.ts` | React state hook | Encapsulates the network request, loading spinner, and error state so any React component can easily check backend health. |
| `frontend/src/pages/HomePage.tsx` | Dashboard UI | Renders the project header, live status badge, and architecture cards. |

---

## 3. Under the Hood: What Happens When You Start the App

```
1. You run: docker compose up -d
   -> Docker pulls postgres:16-alpine and redis:7-alpine.
   -> Containers bind to localhost:5432 and localhost:6379.
   -> Persistent volumes (postgres_data, redis_data) keep data safe across restarts.

2. You run: cd backend; npx prisma migrate dev
   -> Prisma reads schema.prisma.
   -> Generates SQL migration scripts in prisma/migrations/.
   -> Executes SQL on PostgreSQL to create the 8 tables.
   -> Generates type-safe client in node_modules/@prisma/client.

3. You run: cd backend; npm run dev
   -> tsx loads backend/src/index.ts.
   -> dotenv loads DATABASE_URL and PORT=4000.
   -> Express begins listening on http://localhost:4000.

4. You run: cd frontend; npm run dev
   -> Vite starts dev server on http://localhost:5173.
   -> Browser opens HomePage.tsx.
   -> useHealth() hook fires a GET request to http://localhost:4000/health.
   -> Express receives request -> CORS validates origin http://localhost:5173 -> returns HTTP 200 {"status": "ok"}.
   -> StatusBadge turns green: "Backend Online (status: ok)".
```

---

## 4. Common Bugs, Mistakes, & Gotchas (And How to Fix Them)

### Pitfall 1: Port Already in Use (`EADDRINUSE: port 5432` or `port 4000`)
- **What happens:** Docker or Express fails to start with `bind: address already in use`.
- **Why:** You already have native PostgreSQL installed on Windows, or an orphaned node process is still running in the background.
- **Fix:** In PowerShell:
  ```powershell
  # Check what process holds port 4000:
  Get-NetTCPConnection -LocalPort 4000
  # Stop native Windows postgres service if it conflicts:
  Stop-Service postgresql*
  ```

### Pitfall 2: CORS Blocked in Browser Console (`Access-Control-Allow-Origin missing`)
- **What happens:** The frontend shows "Backend Offline" and browser DevTools displays a CORS red error.
- **Why:** Browsers enforce the Same-Origin Policy. Port `5173` is considered a different origin than port `4000`.
- **Fix:** In `backend/src/api/app.ts`, `cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true })` explicitly authorizes requests from Vite.

### Pitfall 3: Forgetting `npx prisma generate` after Schema Edits
- **What happens:** TypeScript complains that `prisma.flow` or `prisma.nodeRun` does not exist on type `PrismaClient`.
- **Why:** Prisma generates TypeScript types into `node_modules`. Whenever you change `schema.prisma`, you must regenerate them.
- **Fix:** Run `npx prisma generate` inside `backend/`.

### Pitfall 4: Missing `vite/client` Reference in Frontend TypeScript
- **What happens:** `tsc` build errors with `Property 'env' does not exist on type 'ImportMeta'`.
- **Why:** TypeScript doesn't know that Vite injects `import.meta.env`.
- **Fix:** Ensure `frontend/src/vite-env.d.ts` contains `/// <reference types="vite/client" />`.

---

## 5. Tricky Edge Cases Handled in Phase 1

1. **Docker Unavailable on Windows Machine:**  
   If WSL2 or Docker Desktop cannot run on a teammate's computer, they don't get blocked. `.env.example` documents free cloud alternatives: Neon for PostgreSQL and Upstash for Redis. You just swap the connection URLs!
2. **Order of CSS Imports:**  
   React Flow's `@xyflow/react/dist/style.css` must be imported at the very top of `frontend/src/index.css` before `@tailwind base`, or PostCSS will warn about non-standard `@import` placement.

---

## 6. Viva & Technical Interview Questions (Practice Out Loud)

### Q1: Why do we need both PostgreSQL and Redis in this project?
- **Model Answer:** PostgreSQL is our permanent relational database—it stores workflow graphs, run history, and audit logs with ACID transactions. Redis is an in-memory data store used for fast, high-throughput task queueing with BullMQ and live pub/sub event broadcasting. If Redis restarts, our history survives safely in PostgreSQL.

### Q2: What is the purpose of database migrations in Prisma?
- **Model Answer:** Migrations track database schema changes as version-controlled SQL files. Instead of manually running `CREATE TABLE` commands in psql, `npx prisma migrate dev` automatically inspects `schema.prisma`, detects additions or alterations, and executes the exact SQL statements so all team members have identical schemas.

### Q3: What is CORS and how does it protect web applications?
- **Model Answer:** Cross-Origin Resource Sharing is a browser security standard. It prevents malicious websites from making unauthorized background HTTP requests to a different domain where the user might be authenticated. By configuring CORS in Express, we explicitly permit our Vite dev server (`http://localhost:5173`) to make API requests while blocking untrusted origins.

### Q4: What is the difference between a unit test and an integration test?
- **Model Answer:** A unit test verifies an isolated function without external systems (like testing Kahn's algorithm with dummy data). An integration test verifies that multiple components work together properly—such as our `health.test.ts`, which boots Express and routes an HTTP request through middleware to ensure the expected JSON response.

### Q5: Why did we choose UUIDs for table primary keys instead of auto-incrementing integers?
- **Model Answer:** In distributed systems, worker processes and client requests can generate unique record IDs independently without having to ask a centralized database sequence for the next integer. UUIDs also prevent sequential enumeration attacks where attackers guess sequential IDs (`/flows/1`, `/flows/2`).

---

## 7. PowerShell Debugging Toolkit (Commands for Viva & Daily Coding)

Keep these exact PowerShell commands handy. You can run them anytime to inspect what is happening behind the scenes:

### 1. Check Container Health & Logs
```powershell
# See if Postgres and Redis containers are healthy:
docker ps

# Inspect real-time PostgreSQL database logs:
docker logs dormammu_postgres --tail 50

# Inspect real-time Redis queue logs:
docker logs dormammu_redis --tail 50
```

### 2. Inspect Database Tables & Test Connectivity
```powershell
# List all 8 created tables inside PostgreSQL:
docker exec -i dormammu_postgres psql -U dormammu -d dormammu_loop -c "\dt"

# Ping Redis to verify it's responsive (should return "PONG"):
docker exec -i dormammu_redis redis-cli ping

# Open visual database browser GUI on http://localhost:5555:
cd backend
npx prisma studio
```

### 3. Test & Debug API Endpoints Directly from PowerShell
```powershell
# Test backend health check (returns JSON status):
Invoke-RestMethod -Uri http://localhost:4000/health

# Check if port 4000 is open and see what process owns it:
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
```

### 4. Interactive Test Runner for Code Debugging
```powershell
# Run backend tests once:
cd backend
npm test

# Run Vitest in interactive WATCH mode (re-tests automatically every time you save a file):
cd backend
npx vitest
```
