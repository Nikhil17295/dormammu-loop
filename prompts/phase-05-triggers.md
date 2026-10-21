# Phase 5: Webhook & Cron Triggers with Idempotency (Day 3)

**Read first:** `docs/04-triggers.md`  
**Give the agent:** `prompts/00-master-rules.md` + this file.  
*(Prerequisite: Phase 4 execution engine and `createRun()` must be completed and passing tests).*

---

## Goal
Enable automated workflow initiation through **Webhooks** and **Cron Schedules**, protected against duplicate executions via **Idempotency Keys**.

**Milestone Significance:** Upon completing this phase, the **Pass Tier** is 100% complete and fully demonstrable end-to-end. Workflows can be constructed visually, saved, validated, manually executed, triggered by webhooks, triggered by cron schedules, and inspected in history.

---

## Required Tasks & Specifications

### 1. Trigger Management API (`backend/src/api/triggers.ts`)
- `POST /flows/:id/triggers`:
  - Body: `{ type: 'webhook' | 'cron', cronExpr?: string, enabled?: boolean }`.
  - For `webhook`: generate a secure random hex token (`crypto.randomBytes(24).toString('hex')`).
  - For `cron`: validate the cron expression syntax. If invalid, return HTTP 422 with an explanation.
  - Persists record in the `Trigger` table and returns the created trigger with its full webhook invocation URL.
- `GET /flows/:id/triggers`: Lists all triggers configured for the flow.
- `PATCH /triggers/:id`: Updates trigger status (`enabled: boolean`) or `cronExpr`. Updates active cron timers in real-time.
- `DELETE /triggers/:id`: Deletes trigger and unregisters any active cron timer.

### 2. Inbound Webhook Ingestion (`backend/src/api/webhooks.ts`)
- `POST /hooks/:token`:
  - Body limit: 1 MB. Accepts JSON payload.
  - Lookup the trigger by `token`:
    - If not found: return HTTP 404 `{ error: "Invalid webhook token" }`.
    - If trigger or flow is disabled: return HTTP 409 Conflict `{ error: "Trigger is disabled" }`.
  - **Idempotency Protection:**
    - Check request header `Idempotency-Key`.
    - If present, query the `IdempotencyRecord` table:
      - If found: return HTTP 200 `{ runId: existingRecord.runId, duplicate: true }` without starting a new execution.
      - If not found: insert a new `IdempotencyRecord` row linking the key to the new run ID inside a transaction.
  - Construct trigger payload: `{ body: req.body, query: req.query, headers: sanitizedHeaders }`.
  - Call the unified `createRun(trigger.flowId, payload, 'webhook')`.
  - Return HTTP 202 Accepted: `{ runId: run.id, status: 'pending' }`.

### 3. Automated Cron Scheduler (`backend/src/triggers/scheduler.ts`)
- Use `node-cron` to schedule automated workflow runs:
  - `initScheduler()`: Called at API server startup. Queries all enabled cron triggers from PostgreSQL and registers their jobs.
  - On each cron tick: calls `createRun(trigger.flowId, { scheduledAt: new Date().toISOString() }, 'cron')`.
  - Dynamic registration functions: `registerCron(trigger)`, `unregisterCron(triggerId)` so API modifications update active timers immediately without requiring a server restart.
  - Store scheduled job references in memory in the API process.

### 4. Frontend Triggers Panel (`frontend/src/components/triggers/`)
- In the Workflow Editor:
  - Add a **"Triggers"** tab or panel.
  - **Add Webhook:** Button that creates a webhook trigger and displays the generated URL with an instant "Copy Webhook URL" button.
  - **Add Cron Trigger:** Dropdown with human presets:
    - `"Every minute (* * * * *)"`
    - `"Every 5 minutes (*/5 * * * *)"`
    - `"Hourly (0 * * * *)"`
    - Or custom cron expression input.
  - Trigger List: Displays all active triggers with an enable/disable toggle switch and a delete icon.

### 5. Automated Tests (`backend/tests/triggers.test.ts`)
- Vitest tests covering:
  - Creating webhook trigger with unique token.
  - Invoking `POST /hooks/:token` creates a run and passes the JSON payload.
  - Invoking webhook with unknown token returns HTTP 404.
  - Disabled trigger returns HTTP 409.
  - Invoking webhook twice with the same `Idempotency-Key` returns the existing run ID and does not create a second run.
  - Rejecting invalid cron syntax with HTTP 422.

---

## Verification Checklist
- [ ] Webhook trigger generates a unique URL and token.
- [ ] Inbound webhook test in PowerShell triggers a run:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:4000/hooks/<TOKEN>" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body '{"temperature": 28, "city": "Bengaluru"}'
  ```
- [ ] Sending duplicate `Idempotency-Key` returns the original run ID without double execution.
- [ ] A 1-minute cron schedule (`* * * * *`) automatically triggers a run every minute (verified in Run History).
- [ ] Disabling a trigger in the UI immediately stops incoming runs.
- [ ] All automated tests pass: `cd backend; npm test`.
- [ ] **Pass Tier is Complete!** You can now present a complete, fully functioning product.

---

## Beginner Viva Preparation for Phase 5
1. **What is idempotency and why is it crucial for webhooks?**  
   *Answer:* Idempotency means that making the same request multiple times produces the exact same outcome as making it once. If a payment service (like Stripe) sends a webhook and doesn't get a response within 3 seconds due to a network blip, it retries. Without an `Idempotency-Key` check, we would charge the customer or process the order twice.
2. **Why do we run the cron scheduler inside the API process rather than on workers?**  
   *Answer:* In our Pass Tier, running `node-cron` in the API process is simple and reliable. If we ran cron on multiple distributed workers simultaneously, every worker instance would trigger duplicate runs at the exact same minute.
3. **What is the difference between HTTP 200, 202, 404, and 409 in our webhook API?**  
   *Answer:*
   - `200 OK`: Duplicate request acknowledged, returning previous run.
   - `202 Accepted`: Request accepted and workflow run has been queued/started.
   - `404 Not Found`: Webhook token does not exist.
   - `409 Conflict`: Webhook token exists, but the workflow or trigger has been turned off by the user.
