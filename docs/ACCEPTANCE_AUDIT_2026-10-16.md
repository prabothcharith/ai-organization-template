# Full acceptance audit — 2026-10-16

## Executive result

The Mac foundation is operational and all 22 permanent identities are defined, created, and roster-verified. The complete autonomous, cross-platform organization is **not finished**. The Stage 1 six are the operating core; the later 16 are registered idle pending stage-specific permission, smoke, and integration gates. Several organization controls remain planned rather than technically enforced.

This audit inspected the repository, installed tools, live OpenMausBot workspace, remote Git state and hosted CI. Atlas, Sentinel and Relay performed independent read-only checks; Nexus verified the material findings and implemented the immediate source and dependency corrections described below.

## Acceptance matrix

| Area | Status | Evidence and remaining work |
| --- | --- | --- |
| Source repository and revision | Complete | Private origin verified; work is on `setup/stage1-bootstrap`. Default `main` remains the older baseline until a reviewed merge. |
| 22 identities and differentiated definitions | Complete | 22 catalog entries, manifests and SOUL files. JSON Schema and runtime invariant validation added. |
| Stage 1 six bots | Partial | Six operating-core bots and Nexus as Chief are verified. Native plan still proposes metadata plus Full Access → Ask changes and warns that all six lack default computers. |
| Later 16 bots | Partial | All 16 are created and roster-verified. They remain registered idle until stages 2–4 permission, smoke, and integration gates pass. |
| Models/providers | Complete — roster assignment | Nexus, Atlas, Nova, Forge, Sentinel, Relay, Iris, and Harbor use Codex `gpt-6.1-sol`; the remaining 14 use Antigravity/Gemini `gemini-3.8-flash-high`. Provider assignment does not prove every role integration is configured. |
| Mac dependencies | Complete | Node 24.22.0, npm 11.21.1, Git, GitHub CLI, Codex, OpenMausBot 0.1.113, FFmpeg and FFprobe execute. OpenSSL 4 corruption was repaired through Homebrew. |
| Standalone CLI | Complete — foundation | `ai-org` is linked; doctor, setup dry runs, project registry and core commands work. Doctor now validates full manifest invariants and requires OpenMausBot. |
| Project onboarding | Complete — foundation | Arbitrary paths, audit-first registration, missing-only `.agents` bootstrap and origin-validated rebind are implemented. Deep semantic project review remains an agent responsibility. |
| Handover and Git push | Hardened and CI-verified | Exact filenames, outgoing history, remote identity, metadata symlinks and protected namespaces are guarded with regression tests on all three hosted operating systems. Worker idleness remains a caller assertion. |
| Windows support | Partial | Hosted Windows CI now passes after filesystem identity and recovery-instruction corrections. Real Windows installation, account reconnection and cross-device recovery are still required. |
| GitHub governance | Partial | PR #1 is open with green macOS, Ubuntu, Windows and GitGuardian checks. `main` has no branch protection/ruleset; protection changes and merge need explicit owner approval. |
| Approval/security policy | Partial | Written policy and role boundaries exist. There is no authenticated approval queue, expiry/revalidation engine or OS-level permission isolation. |
| Four-agent cap and adaptive scheduling | Missing runtime | Declared in policy/manifests; no admission controller, memory-pressure accounting or scheduler implementation. |
| Worker suspension and ownership lease | Missing runtime | Handover requires `--agents-idle`; no automatic suspension, distributed lease, takeover or stale-owner recovery. |
| Shared knowledge/FTS5 | Missing runtime | Classification policy exists; permission-aware SQLite FTS5 ingestion/rebuild/retrieval is not implemented. |
| Monitoring and 30-day retention | Missing runtime | No redacted event collector, rotation or retention enforcement. |
| Backups and staged restoration | Missing runtime | Git checkpoints exist; consistent local snapshots, encrypted off-device backup and isolated restoration tests do not. |
| Two-way MausBot reconciliation | Missing runtime | Plan/apply and drift detection work manually; conflict resolution, local overrides and rollback automation do not. |
| External integrations | Mostly unverified | GitHub transport and OpenMausBot work. Gmail, Calendar, Drive, Telegram, Figma, social publishing, NPM release and DaVinci workflows lack end-to-end acceptance evidence. |

## Security defects found and corrected on the working branch

1. Leading-whitespace filenames could evade scanning because NUL-delimited Git output was trimmed.
2. The recovery path could push committed sensitive content without inspecting outgoing commits.
3. `.agents` symlinks could redirect state/handover writes outside the repository.
4. A changed `origin` could receive a push even though the registry still named another repository.
5. Protected-looking namespaces such as `release/1.0` were not denied.

Regression tests now cover each condition. No actual credential was found in this repository; reproductions used synthetic values and disposable local repositories.

## Required next gates

1. Review PR #1; do not merge automatically. Establish branch protection/rulesets only with explicit owner approval.
2. Exercise install, project attach, handover and recovery on the real Windows computer.
3. Decide whether live Full Access is an intentional override or Git's Ask policy should apply, then select and verify default computers.
4. Implement ownership/worker coordination, scheduler, approvals, FTS5, monitoring and encrypted recovery before unattended production operation.
5. Promote the registered-idle departments to operating status only after their stage-specific permission and integration gates pass.
