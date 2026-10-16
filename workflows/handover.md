# Portable Git handover contract

When the user requests **prepare handover and push**: 
1. Stop starting new work for the affected project; evaluate active tasks and checkpoint safely. Do not interrupt unsafe non-idempotent operations mid-flight.
2. Run project preflight and inspect Git status/branch/upstream. Preserve existing local changes and confirm the correct repository.
3. Update `.agents/tasks/`, `.agents/state/CURRENT.md`, `.agents/handover/CURRENT.md` with completed work, incomplete tasks, remaining approvals, validation evidence, last known remote state and next steps.
4. Scan changed files for secrets and accidental sensitive artifacts. Commit only authorized changes to the current appropriate branch.
5. Push the authorized working branch **without requesting additional confirmation**, as requested by the user, provided native tool controls permit it. Never force-push or merge protected branches without approval.
6. Fetch or inspect the remote ref and verify the pushed commit is present. Mark success only upon verification. If offline or declined, mark handover incomplete and keep local recovery state.
7. On receiving Mac or Windows, bind the local repository path, fetch safely, preserve uncommitted changes, verify project and branch identity, read handover, determine whether work has changed, and resume only unfinished work. If an unchanged handover is reused, do not require a new document.

Git alone is not an atomic distributed lock; a separate ownership protocol and conflict resolution are required before automatic cross-machine concurrency can be claimed safe.
