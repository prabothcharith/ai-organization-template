# OpenMausBot Community Template — 22-Agent Autonomous AI Organization

This template packages the complete **22-agent autonomous AI organization** for [OpenMausBot](https://github.com/milind-soni/OpenMausBot).

It defines all 22 specialized agent personas, system directives (`SOUL.md`), role boundaries, and team topology across 5 departments.

---

## Architecture & Departments

| Department | Agents | Focus Areas |
|---|---|---|
| **Executive Management** | **Nexus** (Chief Orchestrator / Director) | Coordination, 4-agent concurrency cap, handovers, approval gates |
| **Engineering** | **Atlas** (Architect), **Nova** (Frontend), **Forge** (Backend), **Sentinel** (QA/Security), **Relay** (Release/NPM/Git), **Iris** (UI/UX) | System design, full-stack implementation, testing, CI/CD, releases |
| **Research & Strategy** | **Scout** (Market Intel), **Vector** (Tech Research), **Echo** (Customer Intel), **Compass** (Product Strategy) | Market research, competitive analysis, technical claims, customer synthesis |
| **Creative & Media** | **Muse** (Strategy), **Spark** (Content/Copy), **Prism** (Visual/UI), **Frame** (Video Production), **Signal** (Publishing/Analytics) | Editorial strategy, multimedia production, publishing packages, metrics |
| **Personal & Operations**| **Sage** (EA), **Courier** (Comms/Calendar), **Mentor** (Education/Career), **Wayfinder** (Travel/Logistics), **Ledger** (Finance/Admin), **Harbor** (DevOps/Infra) | Executive support, infrastructure, scheduling, documentation, research |

---

## Key Governance & Safety Boundaries

1. **Four-Agent Execution Cap:** Nexus coordinates work so no more than 4 agents execute concurrently, avoiding API starvation or unbounded loops.
2. **Strict Approval Gates:** Consequential actions (merging protected branches, public deployments, credential use, and production mutations) require human approval (`approval: ask`).
3. **No Credential Leakage:** Credentials, secrets, and raw personal files are never stored in tracked Git files, diagnostics, or shared knowledge.
4. **Idempotent & Portable:** Does not hardcode absolute local paths (`cwd` defaults to the importer's active workspace).

---

## How to Import into OpenMausBot

### Option A: Using the OpenMausBot CLI
```sh
openmausbot team apply ai-organization-community-template.yaml
```

To preview changes first without applying:
```sh
openmausbot team apply ai-organization-community-template.yaml --dry-run
```

### Option B: Using the OpenMausBot Desktop App
1. Open **OpenMausBot**.
2. Navigate to **Teams** or the **Templates** tab.
3. Select **Import** -> **From File** and choose `ai-organization-community-template.yaml`.
4. Review the team roster and confirm the import.

---

## Recommended Engine & Model Settings

- **Engineering Core & Nexus:** Codex / GPT (`gpt-6.1-sol` or Claude Sonnet 3.7 / 3.5).
- **Research, Creative & Operations:** Google Gemini (`gemini-3.8-flash-high` / `gemini-2.5-pro` / Claude).
