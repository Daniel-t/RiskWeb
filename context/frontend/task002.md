---
id: TASK-002
title: Scaffold Frontend (React + Vite + TypeScript)
status: done
priority: high
assigned: frontend
reviewers: [secarch]
depends_on: [TASK-001]
modifies: [frontend/**]
created: 2026-05-14
---

# TASK-002: Scaffold Frontend

## Objective
Initialize the React frontend project with Vite and TypeScript, install core dependencies, and configure tooling.

## Deliverables

1. **Initialize project** in `frontend/` using Vite React-TS template
2. **Install core dependencies**:
   - `@xyflow/react` (React Flow v12 -- attack tree canvas)
   - `d3` + `@types/d3` (visualizations)
   - `zustand` (state management)
3. **Configure tooling**:
   - ESLint with TypeScript rules
   - Prettier
4. **Create placeholder** `App.tsx` that renders a basic page
5. **Reference shared types**: configure `tsconfig.json` paths to import from `../shared/`

## Acceptance Criteria
- `cd frontend && npm install && npm run dev` starts dev server on localhost:5173
- TypeScript compilation clean (no errors)
- ESLint passes with no warnings
- @secarch reviews and approves
