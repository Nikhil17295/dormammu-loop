# Phase 5: Webhook and cron triggers (Day 3, Madhav)

**Read first:** `docs/04-triggers.md`. **Give the agent:** master rules + this file. Phase 4's `createRun` must exist.

## Tasks
1. Trigger endpoints: `POST /flows/:id/triggers` (type webhook or cron), `GET /flows/:id/triggers`, `PATCH /triggers/:id` (enable/disable), `DELETE /triggers/:id`. A webhook trigger gets a random token (`crypto.randomBytes`) and the response includes its full URL.
2. `POST /hooks/:token`: accepts JSON. Builds the payload `{ body, query, headers }` (sensitive headers removed), calls `createRun`, replies `202 { runId }`. Unknown token: 404. Disabled trigger/flow: 409. Body limit 1 MB.
3. Duplicate protection: if the request has an `Idempotency-Key` header already stored in `IdempotencyRecord`, return the existing run (200 with the same `runId`) and don't start another. Otherwise store the key.
4. Cron with `node-cron`: on server start load all enabled cron triggers and schedule them; each tick calls `createRun(flowId, { scheduledAt }, "cron")`. Creating, disabling, enabling or deleting a trigger updates the schedule immediately. Validate the expression when saving (422 if invalid). Run the scheduler only in the API process.
5. Frontend: a Triggers panel in the editor. Add a webhook (show the URL with a Copy button) or a cron (input + a short human hint like "every minute"), toggle on/off, delete.
6. Tests: webhook starts a run and the node can read `{{ trigger.body.a }}`; bad token; disabled trigger; duplicate idempotency key returns the same run; invalid cron rejected.

## Checklist
- [ ] `curl -X POST <url> -H "Content-Type: application/json" -d '{"a":1}'` (PowerShell: use `Invoke-RestMethod`) starts a run and a node reads `trigger.body.a`
- [ ] A `* * * * *` cron flow appears in run history every minute
- [ ] Sending the same Idempotency-Key twice creates only one run
- [ ] Disabling a trigger stops it immediately
- [ ] **Pass tier complete. Tag it:** `git tag pass-tier` and push the tag.
