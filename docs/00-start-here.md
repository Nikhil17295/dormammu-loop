# START HERE

Read this guide before starting any development phase. It defines the development loop, safety guidelines, and the rules you must not break during the WEBSTER 2026 hackathon.

---

## WEBSTER 2026 Critical Rules
- **Commit as you go, with honest timestamps:** Commits are audited. Never backdate. No commits after the deadline (strict commit freeze).
- **Zero plagiarism:** Do not copy code from external repositories. All AI assistance must be disclosed in `docs/tool-use-disclosure.md`. Keep that file updated after every phase.
- **Viva readiness:** Both team members must defend the architecture, database schema, and failure handling live.
- **Mentor alignment:** Consult your allotted mentor on architectural choices.

---

## 1. Prerequisites on Windows
1. **Git for Windows:** Verify via `git --version`.
2. **Node.js LTS (v20+ or v24+):** Verify via `node -v` and `npm -v`.
3. **Docker Desktop (WSL2 backend enabled):** Verify via `docker --version` and `docker compose version`.
   - *Fallback:* If Docker Desktop is blocked on your machine, switch to cloud hosted databases (Neon for PostgreSQL and Upstash for Redis) as documented in `backend/.env.example`.
4. **Antigravity IDE & Terminal:** Use PowerShell for all terminal commands.

---

## 2. The 5-Day Plan & The Pass-Tier Safety Rule

| Day | Phases | Milestone Goal |
|---|---|---|
| **Day 1** | Phase 1 | Setup, Docker infrastructure, database schema, health tests *(Completed & Verified)* |
| **Day 2** | Phase 2 & 3 | Pure DAG validation & Kahn's algorithm, Flow CRUD API, and React Flow visual builder |
| **Day 3** | Phase 4 & 5 | **Pass Tier Complete:** In-process execution, run history, webhooks, and cron scheduler |
| **Day 4** | Phase 6 & 7 | **Distributed Tier:** BullMQ workers, exponential backoff, DLQ, and real-time SSE |
| **Day 5** | Phase 8 | **Feature Freeze:** Automated test pass, 5 failure demos, 5-minute presentation script, mock viva |

> [!IMPORTANT]
> **The Pass-Tier Safety Rule:** Your highest priority is completing Phases 1 through 5. A working Pass Tier guarantees a demonstrable, end-to-end product for your submission. Only begin Phase 6 (Distributed Tier) after Phases 1 through 5 are verified and working.

---

## 3. Daily Execution Loop (Follow This Every Phase)

1. **Read the Concept Note:** Spend 10–15 minutes studying the corresponding document in `docs/` (`docs/02`, `docs/03`, etc.).
2. **Create a Dedicated Branch:**
   ```powershell
   git checkout -b phase-X-feature-name
   ```
3. **Prompt the AI Agent:** Provide the agent with:
   > Read `prompts/00-master-rules.md` and `prompts/phase-0X-....md`. Do only that phase. Follow the rules and finish with the report described in the rules.
4. **Verify the Code:**
   - Execute the test commands in PowerShell (`cd backend; npm test`, `cd frontend; npm run build`).
   - Run the manual verification steps in your browser.
5. **Learn & Quiz (Mandatory Viva Prep):**
   - Ask the agent: *"Explain what you built in simple words, file by file, and quiz me with 5 questions."*
   - Answer the quiz questions to practice your viva defense.
6. **Commit Your Work:**
   ```powershell
   git add .
   git commit -m "feat(scope): concise description of verified phase"
   git push origin phase-X-feature-name
   ```
7. **Update Documentation:**
   - Add notes to `docs/progress-log.md`.
   - Add tool usage row to `docs/tool-use-disclosure.md`.
   - Update status in `README.md`.

---

## 4. Tips for Beginners Working with AI
- **One phase at a time:** Never execute multiple phase prompts simultaneously.
- **Never accept "done" blindly:** Always run the tests yourself in PowerShell before moving on.
- **Inspect before overwriting:** Instruct the agent to preserve working files and build incrementally.
- **Ask for clarification:** If any concept seems confusing, ask: *"Explain like I'm a beginner with a simple real-world analogy."*
