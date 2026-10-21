# Phase 8: Tests, README, disclosure, viva prep (Day 5, both). NO NEW FEATURES.

**Give the agent:** master rules + this file. Remember the commit freeze: nothing after the deadline.

## Tasks
1. Run the whole test suite; fix failures. List what is tested and what is not.
2. Failure checks to do by hand and record results (short notes in `docs/test-evidence.md`): a failing node skips its descendants; a worker killed mid-job; the same webhook sent twice with one Idempotency-Key; retries until the DLQ; refreshing the browser during a run.
3. Optional if time remains (small, honest): a script that sends 50 webhook calls and prints success count and p50/p95 time to get a run accepted. Report the machine used. If not done, say so.
4. Make `docker compose up` (and the documented npm commands) start everything cleanly from a fresh clone; verify README run steps on a clean folder.
5. **README final pass:** accurate status table (done / partial / not done), architecture explanation (cycle detection with Kahn's algorithm, how readiness works, how workers and retries work, execution guarantees: at-least-once plus idempotency, not exactly-once), setup steps, demo workflow, known limitations, future work. Do not claim anything that is not implemented and tested.
6. Update `docs/07-viva-qa.md` limitations list to match reality, and `docs/tool-use-disclosure.md` with the full per-phase log.
7. Create `docs/09-demo-script.md`: a 5-minute walkthrough: build trigger -> transform -> http -> output; try to create a cycle and show the rejection; run it and show per-node status, logs, input/output; make a node fail and show descendants skipped; show workers, retries and the DLQ; show live logs; fire a webhook.
8. Quiz mode: quiz me on the whole project, 15 questions, mixing algorithm, architecture and failure-handling questions.

## Checklist
- [ ] Tests pass; evidence notes written
- [ ] Fresh-clone setup works
- [ ] README and disclosure are honest and complete
- [ ] Both of you did a practice run of the demo script and answered the quiz out loud
