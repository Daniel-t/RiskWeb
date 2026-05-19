# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RiskWeb is a web-based quantitative cyber risk analysis and attack path modeling tool. It combines FAIR risk quantification with attack tree modeling, Monte Carlo simulation (Bayesian-updated distributions), and MITRE ATT&CK/D3FEND control mapping.

## Tech Stack

- **Frontend**: React 19, React Flow (@xyflow/react), D3, Zustand, TypeScript 6, Vite 8
- **Storage**: Browser IndexedDB (scenarios & controls), with JSON export/import for portability
- **Simulation**: Client-side Monte Carlo engine in Web Workers
- **Catalog Data**: Static MITRE ATT&CK/D3FEND JSON bundled at build time from `shared/data/`

## Architecture

Client-side only SPA with two packages: `frontend/` and `shared/` (types + static data). No server required — deployable to any static host (GitHub Pages, Netlify, S3, local file server).

- **Frontend** (localhost:5173): Vite dev server, React 19, state managed with Zustand
- **Shared types**: `shared/src/index.ts` — core interfaces (Scenario, AttackTreeNode, Edge, FAIRInputs, Distribution, SimulationConfig, SimulationResult, Control, ControlAssignment)
- **Shared data**: `shared/data/` — ATT&CK catalog and D3FEND mappings (static JSON, bundled into frontend)
- **Data flow**: Build attack tree → enter FAIR inputs on leaves → run Monte Carlo simulation → view results → save to IndexedDB or export as JSON

### Storage Layer

The `StoragePort` interface (`frontend/src/services/storage.ts`) abstracts persistence. Current implementation uses IndexedDB. This interface allows future addition of an optional backend for multi-user/collaboration without changing frontend code.

### Features Requiring a Future Backend (Deferred)

- Multi-user collaboration / shared scenarios
- Server-side PDF generation (alternative: client-side jsPDF)
- Centralized audit logging
- Real-time sync across devices

## Build & Development Commands

Node v22 required (see `.nvmrc`). No test framework configured yet.

### Frontend (`cd frontend`)
```
npm run dev              # Vite dev server (localhost:5173)
npm run build            # tsc -b && vite build
npm run lint             # eslint .
npm run format           # prettier --write
npm run format:check     # prettier --check
```

### Deployment
```
cd frontend && npm run build
# Serve dist/ from any static host
```

## Code Style

- Prettier: semicolons, single quotes, trailing commas, 100 char line width, 2-space indent
- ESLint: flat config (v10) with typescript-eslint and prettier integration
- TypeScript: strict mode, target ES2022

## AI Workforce Personas

This project uses an AI persona system defined in [Workforce Strategy.md](Workforce%20Strategy.md). When working as a persona, follow the bootstrap pattern:

1. Read `/context/{persona}/context.md`
2. Check `/context/shared/CURRENT.md`
3. Read assigned tasks in `/context/{persona}/task###.md`

| Handle | Role |
|---|---|
| @orchestrator | Project manager — task coordination, no technical decisions |
| @analyst | Requirements, FAIR specs, simulation methodology |
| @frontend | React UI, React Flow canvas, D3 visualizations, storage layer |
| @ux | UI/UX design, CSS, styling, themes |
| @threat | MITRE ATT&CK catalog, D3FEND mappings, attack templates |
| @secarch | Security code review (OWASP, secure coding) — reviews only, no implementation |
| @test | QA/Test engineer — test strategy, automated tests (Vitest, Playwright), validation |

**Key rules:**
- Spec personas (@analyst, @ux, @threat) do NOT implement code
- Implementation persona (@frontend) works from specs, not self-authored requirements
- @secarch reviews all implementation tasks
- Architectural decisions, scope changes, and conflicting requirements escalate to the human

## Context & Task Management

- Each persona's context lives in `/context/{persona}/`
- Global task index: `/context/TASK_INDEX.md`
- Shared state: `/context/shared/CURRENT.md`
- Task files use YAML frontmatter with fields: `id`, `status`, `priority`, `assigned`, `reviewers`, `depends_on`, `modifies`
- The `modifies` field declares file ownership — no two parallel tasks should touch the same files
- Handoffs between personas go to `/context/{receiving-persona}/handoff-from-{source}-TASK-###.md`
