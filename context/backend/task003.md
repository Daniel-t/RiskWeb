---
id: TASK-003
title: Scaffold Backend (NestJS + TypeScript)
status: done
priority: high
assigned: backend
reviewers: [secarch]
depends_on: [TASK-001]
modifies: [backend/**]
created: 2026-05-14
---

# TASK-003: Scaffold Backend

## Objective
Initialize the NestJS backend project, configure CORS, create a health endpoint, and set up the data directory.

## Deliverables

1. **Initialize project** in `backend/` using NestJS CLI or template
2. **Configure CORS** for `http://localhost:5173` (frontend dev server)
3. **Health check endpoint**: `GET /health` returns `{ status: "ok" }`
4. **Create `data/` directory** for JSON file storage (with `data/scenarios/` subdirectory)
5. **Reference shared types**: configure `tsconfig.json` paths to import from `../shared/`
6. **Global API prefix**: all routes under `/api` (except health)

## Acceptance Criteria
- `cd backend && npm install && npm run start:dev` starts on localhost:3000
- `GET http://localhost:3000/health` returns 200 with `{ status: "ok" }`
- TypeScript compilation clean
- @secarch reviews and approves
