# 04. Triggers: manual, webhook, cron (Phase 5)

## One entry point
Everything starts a run by calling the same function: `createRun(flowId, payload, source)`. Manual, webhook and cron differ only in where the call comes from.

## Webhook
- A webhook is a URL that other systems call to tell you something happened.
- Each trigger gets a long random token: `POST /hooks/<token>`.
- The request's body, query and headers (secrets hidden) become the run's **trigger payload**. Nodes read it as `{{ trigger.body.xyz }}` (this is **payload injection**).
- Reply immediately with `202 Accepted` and the run id; the work happens afterwards. (202 = "accepted, not finished yet".)
- Unknown token: 404. Disabled flow: 409.
- Duplicates: callers sometimes send the same webhook twice. If the request has an `Idempotency-Key` header we have seen before, we return the existing run instead of starting a new one.

## Cron
- A cron expression has 5 fields: `minute hour day-of-month month day-of-week`. Example: `*/5 * * * *` = every 5 minutes; `0 9 * * 1-5` = 9:00 on weekdays.
- `node-cron` runs a callback on that schedule. On server start we load all enabled cron triggers and register them; creating, disabling or deleting a trigger updates the schedule immediately.
- Validate the expression when saving; reject bad ones.
- Limitation to state honestly: if you run several API servers, each would fire the job. We run the scheduler in one process.

## Likely viva questions
- Why return 202 instead of waiting?
- How does the webhook payload reach the nodes?
- How do you stop a duplicate webhook from running twice?
- What is a cron expression? What are the limits of your scheduler?
