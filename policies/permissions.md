# Permission and approval policy

- Department scope is broad within *authorized* resources. It is not OS-level isolation or blanket access to personal files.
- Direct local development is chosen. A Git worktree prevents checkout clashes but does not sandbox a shell. Isolate sensitive credentials and enforce OS permissions separately.
- Normal branch commits, non-destructive pushes to authorized branches, draft PRs and user-requested Git handovers can proceed without an extra confirmation when permitted by the engine's native controls.
- Protected merges, force-push/history rewrite, stable NPM publishing, production deployment, external financial transactions, public publishing and material personal-account changes require separate authenticated approval.
- A pending approval does not block independent tasks; Chief may safely replan. Approval expiry is context-dependent and invalidated by changed target revisions.
- Do not commit local runtime tokens, provider auth, sensitive financial/personal data, or log files into Git.
- Imported team files do not transfer machine-local permissions, credentials, working folders or model selections; review and apply them locally.
