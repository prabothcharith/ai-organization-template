# AI Organization Template

> **A production-ready, 22-agent autonomous AI organization template for [OpenMausBot](https://github.com/milind-soni/OpenMausBot), macOS, and Windows.**

[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)
[![OpenMausBot](https://img.shields.io/badge/OpenMausBot-Team%20Template-blue.svg)](https://github.com/milind-soni/OpenMausBot)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](https://github.com/)

This repository is a GitHub template providing a fully structured, multi-agent organization with 22 permanent bot identities, system directives (`SOUL.md`), role boundaries, and declarative OpenMausBot manifests.

---

## Quickstart (60 Seconds)

### 1. Apply Directly to OpenMausBot

If you already have OpenMausBot installed, apply the entire 22-agent organization in one command:

```bash
openmausbot team apply openmausbot-team.yaml
```

To preview the plan without applying changes:
```bash
openmausbot team apply openmausbot-team.yaml --dry-run
```

Or open the **OpenMausBot desktop app** -> go to **Teams / Templates** -> **Import** -> select `openmausbot-team.yaml`.

---

### 2. Local CLI & Repository Setup

```bash
# Clone or create your repo from this template
git clone <your-repo-url>
cd <your-repo-folder>

# Run initial verification & doctor
node --experimental-strip-types src/cli.ts init --root "$PWD"
node --experimental-strip-types src/cli.ts doctor

# Run the test suite
npm test
```

---

## The 22-Agent Roster

The organization is divided into five functional departments, coordinated by **Nexus**, the Chief Orchestrator:

| Department | Bot | Role | Primary Responsibility |
|---|---|---|---|
| **Executive** | **Nexus** (Chief) | Chief Orchestrator & Director | Multi-agent coordination, 4-agent execution cap, handovers |
| **Engineering** | **Atlas** | Software Architect | System design, architectural boundaries, ADRs |
| | **Nova** | Frontend Developer | UI implementation, responsive interfaces, accessibility |
| | **Forge** | Backend Developer | API development, services, migrations, data layers |
| | **Sentinel** | QA & Security Engineer | Independent verification, security audits, release gates |
| | **Relay** | GitHub & Release Manager | Safe repository sync, PR preparation, release packaging |
| | **Iris** | UI/UX Designer | User journeys, interactive specs, design tokens |
| **Research & Strategy** | **Scout** | Market Intelligence | Competitive analysis, market trends, pricing benchmarks |
| | **Vector** | Technical Research | Primary source verification, technical benchmarks |
| | **Echo** | Customer Intelligence | User feedback synthesis, qualitative segmentation |
| | **Compass** | Product Strategist | Requirements definition, PRDs, product outcomes |
| **Creative & Media** | **Muse** | Content Strategist | Editorial calendars, campaign roadmaps, messaging |
| | **Spark** | Content Creator | Multi-lingual copy, long-form articles, scripts |
| | **Prism** | Visual Designer | Graphic assets, branding systems, visual layouts |
| | **Frame** | Video Production | Script-to-screen workflows, video editing, subtitles |
| | **Signal** | Publishing & Analytics | Multi-channel publishing, analytics, performance KPIs |
| **Personal & Ops** | **Sage** | Executive Assistant | Workflow management, agendas, executive briefings |
| | **Courier** | Communications Agent | Correspondence drafts, scheduling, follow-ups |
| | **Mentor** | Education & Career Agent | Skill development paths, career research, roadmaps |
| | **Wayfinder** | Logistics & Travel Agent | Travel planning, itineraries, route optimization |
| | **Ledger** | Finance & Admin Agent | Cost models, financial research, administrative checklists |
| | **Harbor** | DevOps Engineer | CI/CD pipelines, containerization, disaster recovery |

---

## Core Governance & Safety Policies

1. **Four-Agent Concurrency Cap:** Nexus enforces an organization-wide limit where at most 4 agents execute simultaneously to protect compute resources and prevent runaway tasks.
2. **Approval Gates on Consequential Actions:** Dangerous operations (merging into protected branches, npm publishes, destructive file deletions, or credential modifications) require human approval (`approval: ask`).
3. **Zero Credential Leakage:** Sensitive keys and personal data are never committed to Git, diagnostics, or shared memory.
4. **Idempotent Handover System:** Cross-session progress is tracked in `.agents/handover/` with verified checkpoints.

---

## Customization

- **Prompts & Directives:** Each agent's personality and instructions live in `agents/<department>.<role>/SOUL.md`.
- **Manifests:** Modify tool scopes, approval modes, and model preferences in `agents/catalog.yaml` or `openmausbot-team.yaml`.
- **Models:** Default recommendations are Codex (`gpt-6.1-sol` or Claude Sonnet) for engineering core, and Google Gemini (`gemini-3.8-flash-high`) for research and creative specialists.

---

## License

MIT
