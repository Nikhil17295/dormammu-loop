# Phase 8: Hardening, Failure Demos, Viva Defense, & Documentation (Day 5)

**Read first:** `docs/07-viva-qa.md`, `docs/tool-use-disclosure.md`  
**Give the agent:** `prompts/00-master-rules.md` + this file.

---

## Strict Rule: Feature Freeze
**No new features are permitted in Phase 8.**  
All coding efforts must focus strictly on test validation, failure scenario verifications, demo rehearsal, documentation accuracy, and viva practice.

---

## Required Tasks & Specifications

### 1. Complete Test Suite Execution & Audit
- Run backend tests: `cd backend; npm test`.
- Run frontend build: `cd frontend; npm run build`.
- Resolve any failing tests, broken imports, or compiler warnings.
- Verify test coverage across:
  - Pure DAG validation, Kahn's algorithm, cycle isolation.
  - Flow persistence API routes.
  - Execution engine, templating, cascading skips.
  - Webhook ingestion and idempotency deduplication.
  - Distributed queue, backoff calculation, DLQ replay.
  - SSE streaming routes and disconnection cleanup.

### 2. Manual Verification of the "Big 5" Failure Modes
Perform these 5 tests manually and document the verified behavior:
1. **Cycle Prevention:** Attempt to connect a cycle in the UI canvas. Verify that the client refuses the edge and the API rejects `POST /flows` with HTTP 422.
2. **Cascading Skip:** Run a flow where Node B fails. Verify that Node B's children are marked `'skipped'` while independent parallel branches complete successfully.
3. **Webhook Deduplication:** Send an inbound webhook twice with the same `Idempotency-Key` header via PowerShell. Verify that the second call returns HTTP 200 with the existing run ID and does not launch a duplicate run.
4. **Retry with Jitter & DLQ:** Execute a flow calling an endpoint that returns HTTP 503 (`https://httpbin.org/status/503`). Verify that retries occur with increasing, randomized delays, and after 3 failures, the job is moved to the Dead-Letter Queue. Verify that clicking **Replay** in the DLQ UI resumes execution.
5. **Mid-Run Browser Refresh:** Trigger a flow with a 5-second delay. Refresh the browser at second 2. Verify that the snapshot restores state and live updates continue until completion.

### 3. Five-Minute Viva Presentation Script (`docs/09-demo-script.md`)
Create a minute-by-minute demo walkthrough for the judges:
- **Minute 1: The Problem & Pitch:** Explain why modern workflows need DAG execution, visual builders, and distributed fault tolerance.
- **Minute 2: The Visual Canvas:** Show creating a workflow (`trigger -> http -> transform -> output`). Intentionally attempt to draw a cycle and demonstrate immediate visual rejection.
- **Minute 3: Execution & Live Visibility:** Click Run. Demonstrate live node status transitions (blue running -> green success) and real-time execution logs.
- **Minute 4: Fault Tolerance & DLQ:** Demonstrate a failing node, show cascading skips, observe automatic retries, and demonstrate DLQ replay.
- **Minute 5: Architecture & Viva Highlights:** Briefly summarize the stack: React Flow, Express, PostgreSQL via Prisma, Redis + BullMQ, and SSE.

### 4. Final Documentation & Audit Pass
- **`README.md`:** Ensure the status table honestly marks every phase (done / partial / future work), all PowerShell run instructions work from a fresh clone, and known limitations are explicitly listed.
- **`docs/07-viva-qa.md`:** Update to reflect exact project implementation. Practice the 15 viva questions out loud.
- **`docs/tool-use-disclosure.md`:** Ensure every phase has an honest, detailed disclosure entry.
- **`docs/progress-log.md`:** Complete daily log entries documenting what was built, what broke, and what was learned.

### 5. Interactive Mock Viva
- When the user asks **"quiz me"**, conduct an interactive mock viva:
  - Ask 15 viva questions one by one.
  - Cover graph algorithms, execution guarantees, distributed queue mechanics, idempotency, failure recovery, and architectural limitations.
  - Wait for the user's answer, provide encouraging and constructive feedback, and supply the ideal viva response.

---

## Verification Checklist
- [ ] Backend test suite passes: `cd backend; npm test`.
- [ ] Frontend builds with zero TypeScript errors: `cd frontend; npm run build`.
- [ ] All 5 failure scenarios manually tested and verified.
- [ ] `docs/09-demo-script.md` written and rehearsed.
- [ ] `README.md` status table and setup steps are 100% accurate.
- [ ] `docs/tool-use-disclosure.md` fully completed for all phases.
- [ ] Both team members can confidently explain the codebase and answer viva questions.
