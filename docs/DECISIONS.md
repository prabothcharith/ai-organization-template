# Decisions retained from design

- 22 permanent identities, one Chief, adaptive project leadership; individual/group/Chief-managed conversations. Foundation-first rollout activates six before remaining departments.
- Local Mac M1/8GB and Windows office machines; project folders are anywhere the user chooses. One organization clone is installed at a user-selected location per machine.
- Git-first `.agents/` state and handover; master `ai-organization` private GitHub repo; machine-local project registry. Audit-first existing projects; comprehensive human + machine records.
- Automatic per-project ownership with user-triggered handover and automatic ordinary Git branch push (after verification) as previously authorized. Unchanged handovers remain reusable.
- Direct local development with separate project worktrees; worktrees are not security boundaries.
- Chief-managed continuation, adaptive maximum four concurrent agents; automatic recovery, progress-based limits, dynamic scheduling; Chief-controlled QA while respecting enforced safety gates.
- Governed memory; organization-wide non-sensitive knowledge sharing; autonomous evidence-backed contributions; context-aware retrieval; Git + rebuildable SQLite FTS5; adaptive verification and periodic low-priority maintenance.
- Broad department access inside approved resources; restricted personal/confidential material remains isolated; major permission/policy changes need approval.
- Automatic safe configuration updates, intelligent two-way reconciliation, governed self-improvement with reversible change history.
- Intelligent priority notifications, context-aware approval validity and continue-safely-replan while waiting.
- Comprehensive monitoring with 30-day local diagnostic retention; permanent portable audit trail.
- Git + consistent local snapshots + encrypted off-device backup; automatic staged restoration.
- Providers available: OpenAI Codex and Google Antigravity (Google AI Pro). Specific models configured per machine after verification.
- Integration plan: GitHub, Git, NPM, Gmail, Google Calendar, Drive, Telegram, Figma, social platforms and local FFmpeg/DaVinci workflows. Validate each integration before claiming support.
- CLI-only for infrastructure/bootstrap and project registration; MausBot remains the chat interface for tasks and agent coordination.

- Dependency policy: fully automated compatible setup through official Homebrew/winget/npm package managers for allowlisted tools; use native OS/elevation prompts and never silently bypass system trust/authentication. Provider sign-ins remain user-controlled.
- Standalone CLI handover command: with explicit `--push` authorization and Chief-confirmed idle workers, commit and push ordinary work-branch checkpoints, verify remote HEAD, refuse protected branches and likely secret files. This is not yet automatic Chief worker coordination or an atomic cross-machine ownership lock.
