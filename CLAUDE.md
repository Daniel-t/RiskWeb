# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RiskWeb is a web-based quantitative cyber risk analysis and attack path modeling tool. It combines FAIR risk quantification with attack tree modeling, Monte Carlo simulation (Bayesian-updated distributions), and MITRE ATT&CK/D3FEND control mapping.

## Tech Stack

- **Frontend**: React, React Flow (attack tree canvas), D3 (visualizations), TypeScript
- **Backend**: NestJS (TypeScript)
- **Storage**: Local file-based (JSON), architected for future database persistence
- **Simulation**: Client-side Monte Carlo engine in Web Workers

## Build & Development Commands

No build system, package.json, or test framework has been configured yet. This section should be updated once the project is scaffolded.

## AI Workforce Personas

This project uses an AI persona system defined in [Workforce Strategy.md](Workforce%20Strategy.md). When working as a persona, follow the bootstrap pattern:

1. Read `/context/{persona}/context.md`
2. Check `/context/shared/CURRENT.md`
3. Read assigned tasks in `/context/{persona}/task###.md`

| Handle | Role |
|---|---|
| @orchestrator | Project manager — task coordination, no technical decisions |
| @analyst | Requirements, FAIR specs, simulation methodology |
| @frontend | React UI, React Flow canvas, D3 visualizations |
| @backend | NestJS API, file storage, simulation engine |
| @ux | UI/UX design, CSS, styling, themes |
| @threat | MITRE ATT&CK catalog, D3FEND mappings, attack templates |
| @secarch | Security code review (OWASP, secure coding) — reviews only, no implementation |

**Key rules:**
- Spec personas (@analyst, @ux, @threat) do NOT implement code
- Implementation personas (@frontend, @backend) work from specs, not self-authored requirements
- @secarch reviews all implementation tasks
- Architectural decisions, scope changes, and conflicting requirements escalate to the human

## Context & Task Management

- Each persona's context lives in `/context/{persona}/`
- Global task index: `/context/TASK_INDEX.md`
- Shared state: `/context/shared/CURRENT.md`
- Task files use YAML frontmatter with fields: `id`, `status`, `priority`, `assigned`, `reviewers`, `depends_on`, `modifies`
- The `modifies` field declares file ownership — no two parallel tasks should touch the same files
- Handoffs between personas go to `/context/{receiving-persona}/handoff-from-{source}-TASK-###.md`
