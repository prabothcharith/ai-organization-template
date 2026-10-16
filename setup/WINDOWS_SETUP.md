# Windows installation and recovery

This procedure restores the approved organization; it does not redesign or recreate it.

## Prerequisites

- Windows 11 with PowerShell and Microsoft App Installer (`winget`)
- Access to the private repository: `<repository-url>`
- OpenMausBot installed and signed in
- Provider and connected-app credentials entered only through their secure native authentication flows

## Install

1. Install Git first on a clean Windows computer, then restart PowerShell if required:

   ```powershell
   winget install --exact --id Git.Git --accept-package-agreements --accept-source-agreements
   ```

2. Choose a local installation directory. Do not reuse the Mac path.
3. Clone the approved working checkpoint and verify its remote and revision. Until the reviewed bootstrap PR reaches `main`, use `setup/stage1-bootstrap` explicitly:

   ```powershell
   $ApprovedRef = 'setup/stage1-bootstrap'
   git clone --branch $ApprovedRef --single-branch <repository-url> D:\path\you\choose\ai-organization
   Set-Location D:\path\you\choose\ai-organization
   git remote -v
   git status --short --branch
   git rev-parse HEAD
   ```

   After the bootstrap PR is merged and its commit is verified on `main`, use `main` as the approved ref. Never assume the default branch already contains the latest handover.

4. Preview dependency changes, then install approved missing dependencies:

   ```powershell
   .\scripts\bootstrap.ps1 --dry-run
   .\scripts\bootstrap.ps1
   ```

   Restart PowerShell if Node or another tool is newly added to `PATH`.

5. Initialize and install the standalone CLI:

   ```powershell
   node --experimental-strip-types src\cli.ts init --root (Get-Location).Path
   npm link
   ai-org doctor
   npm test
   ```

   The CLI resolves npm-installed `openmausbot.cmd` and `codex.cmd` through a fixed PowerShell invocation rather than a general-purpose shell. This mapping is unit-tested cross-platform, but must still be exercised on the Windows computer.

6. In OpenMausBot, use its supported team/profile interface to reconcile the Stage 1 bots with `teams/core.yaml` and `agents/*/SOUL.md`. Do not copy Mac credentials, local paths, permissions, or runtime state. If native `openmausbot team apply` is available, run the dry run before apply.

## Map projects and recover work

Clone each project wherever appropriate on Windows, then register its Windows path:

```powershell
ai-org project attach --path 'E:\Projects\example'
ai-org project list
ai-org project status --id github.com/OWNER/REPO
```

Before resuming, fetch the remote without discarding local work, compare branch/upstream state, and read:

- project `AGENTS.md`
- `.agents/audit/initial-audit.md`
- `.agents/state/CURRENT.md`
- active task and decision records
- `.agents/handover/CURRENT.md`

Git is not a distributed lock. Confirm the other computer has checkpointed and stopped before taking ownership. Never use a handover file as permission for a protected merge, production deployment, package release, payment, or public post.

## Secure reconnection

Authenticate GitHub, model providers, email, calendar, storage, publishing, and other integrations on Windows through secure native sign-in. Never copy tokens into this repository or the machine registry. Verify account identity and least privilege after connection.

## Validation and recovery

- Run `ai-org doctor` and `npm test`.
- Verify the Stage 1 roster, exact live models, and tool permissions.
- Exercise a read-only project status and a test-repository handover before real work.
- Treat backups as unverified until an isolated restoration succeeds.
- Preserve live user changes: diff them against Git and either promote compatible changes, retain machine-local overrides, or resolve conflicts explicitly.

Known foundation limits are listed in `docs/IMPLEMENTATION_STATUS.md`; do not claim leases, FTS5 search, automatic reconciliation, encrypted backups, or autonomous four-agent scheduling until implemented and tested.
