# START HERE

Read this once. It tells you what to install, how to work every day, and the rules you must not break.

## The rules that matter (from the WEBSTER rules PDF)
- The repo must be created only after the development period began. It has begun, so you may create it now.
- **Commit as you go, with honest timestamps.** Commits are audited. Never backdate. No commits after the deadline (commit freeze).
- **Zero plagiarism.** Do not copy someone else's project. AI help must be disclosed in `docs/tool-use-disclosure.md` (the deliverables list a tool-use disclosure). Keep that file updated every phase.
- Viva: you must defend the architecture and implementation live. Both of you can be asked anything.
- Ask your allotted mentor if unsure. Follow their advice.

## 1. Install on Windows (do this first, about 1 hour)
1. **Git for Windows:** https://git-scm.com (accept defaults). Then in PowerShell:
   ```
   git config --global user.name "Your Name"
   git config --global user.email "your-github-email"
   ```
2. **Node.js LTS:** https://nodejs.org (the LTS button). Check: `node -v` and `npm -v`.
3. **Docker Desktop:** https://www.docker.com/products/docker-desktop (it will ask to enable WSL2; allow it and restart). Check: `docker --version`. Docker runs Postgres and Redis for you so you never install them by hand.
   - If Docker will not work after 30 minutes, do not fight it. Tell the AI agent: "Docker doesn't work on my machine, switch to free hosted Postgres (Neon) and Redis (Upstash)."
4. **VS Code** (optional but handy) and **Antigravity** (you have it).
5. A **GitHub account** each, for you and Madhav.

## 2. Create the repo (once)
1. On github.com click New repository, name it `dormammu-loop`, keep it **private** (or public, your choice), no README (we already have one).
2. Unzip the project folder, open PowerShell inside it, then:
   ```
   git init
   git add .
   git commit -m "docs: add project plan, notes and phase prompts"
   git branch -M main
   git remote add origin https://github.com/<your-username>/dormammu-loop.git
   git push -u origin main
   ```
3. Add Madhav as a collaborator (repo Settings > Collaborators).

## 3. Daily loop (follow it every phase)
1. **Read** the concept note named at the top of the phase prompt (10 to 15 min). Do not skip; this is your viva prep.
2. **New branch:** `git checkout -b phase-2-graph`
3. **Open the repo folder in Antigravity.** Tell the agent exactly:
   > Read prompts/00-master-rules.md and prompts/phase-0X-....md. Do only that phase. Follow the rules and finish with the report described in the rules.
4. **Let it build. Check the checklist** at the bottom of the phase file. Run the commands yourself. If something fails, paste the error back to the agent.
5. **Explain step (mandatory):** ask the agent: "Explain what you built in simple words, file by file, then ask me 5 questions to test me." Answer them. This is how you learn.
6. **Commit:** `git add .` then `git commit -m "feat(graph): cycle detection and topological sort"` then `git push`. Merge the branch to `main` once it works.
7. **Update** the status table in README.md, add a few lines to `docs/progress-log.md`, and add the AI usage to `docs/tool-use-disclosure.md`.

## 4. Working with the AI agent (simple tips)
- One phase at a time. Never paste all prompts at once.
- Small, frequent commits. If the agent breaks things: `git restore .` (undo uncommitted changes) and try again with a narrower request.
- Error? Paste the whole error text, and say what command you ran.
- Not understanding something? Say "explain like I'm a beginner, with an example." Then write the 2-line answer into your own notes.
- Never accept "done" without tests passing and the checklist verified.

## 5. The 5-day plan
| Day | Phases | Safety goal |
|---|---|---|
| 1 | Install + Phase 1 | App starts, Postgres and Redis run |
| 2 | Phase 2 + 3 | Draw, validate and save a flow |
| 3 | Phase 4 + 5 | **Pass tier works end to end. If Day 3 slips, drop Phase 7 or 6, not this.** |
| 4 | Phase 6 + 7 | Workers, retries, DLQ, live logs |
| 5 | Phase 8 | No new features. Fix, README, disclosure, viva practice |

If you are behind, cut in this order: heartbeats, idempotency polish, SSE polish, extra node types. Never cut the Pass tier.

## 6. Viva survival
Read `docs/07-viva-qa.md` on Day 5 and practice answering out loud. You do not need to know every line of code; you need to explain *what each part does, why it exists, and what happens when it fails*. Be honest about what is partial.
