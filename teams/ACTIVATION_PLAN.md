# Staged activation plan

The version-controlled registry in `agents/catalog.yaml` defines all 22 permanent identities. Runtime activation is deliberately staged; an idle registered bot does not count against the maximum, but at most four agents may execute simultaneously.

| Stage | Scope | Runtime status after Mac bootstrap |
| --- | --- | --- |
| 1 | Nexus, Atlas, Nova, Forge, Sentinel, Relay | Created and roster-verified 2026-10-16; operating core on Codex |
| 2 | Iris, Harbor, Scout, Vector, Echo, Compass | Created and roster-verified 2026-10-16; registered idle pending role smoke tests and permission review |
| 3 | Muse, Spark, Prism, Frame, Signal | Created and roster-verified 2026-10-16; registered idle pending content and publishing gates |
| 4 | Sage, Courier, Mentor, Wayfinder, Ledger | Created and roster-verified 2026-10-16; registered idle pending personal-data and connected-account gates |
| 5 | Organization-wide integration | Exercise four-agent scheduling, handover, approvals, recovery, and cross-device synchronization |

## Gate for each stage

1. Reconcile live settings with the Git definitions without overwriting user changes.
2. Confirm an available model and least-privilege tool scope on that device.
3. Run one read-only smoke task and one reversible repository task.
4. Verify records, receipts, and the four-agent cap.
5. Record discrepancies and rollback instructions before proceeding.

Gemini remains preferred for Nexus, Research, Creative, and Personal Operations. At the 2026-10-16 roster expansion, the 14 Research, Creative, and Personal Operations bots were created on the available Antigravity/Gemini `gemini-3.8-flash-high` instance. Iris and Harbor use Codex `gpt-6.1-sol`, as do the six Stage 1 bots. Registration does not authorize autonomous or consequential execution.
