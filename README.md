# Library Management System

Multi-database library system with a React frontend and a Node/Express backend.

## Active Stack

- `frontend/`: React + Vite UI
- `backend-node/`: Express API (main backend)
- Databases:
  - PostgreSQL for core library data
  - MongoDB Atlas for activity logs
  - MySQL (Aiven) for audit trail
  - Neo4j for graph features

## Run Locally

1. Install dependencies:
   - `cd backend-node && npm install`
   - `cd frontend && npm install`
2. Start both services:
   - Use `start.bat`
   - Or run manually:
     - `cd backend-node && npm run dev`
     - `cd frontend && npm run dev`

## Default URLs

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## Frontend API Config

Set these in `frontend/.env` if needed:

- `VITE_BACKEND_ORIGIN=http://localhost:8000`
- `VITE_API_BASE_URL=http://localhost:8000/api`

## Prisma (Backend)

Use migration-first workflow (not `db push`) from `backend-node/`:

- Create migration: `npm.cmd run prisma:migrate:dev -- --name <change_name>`
- Deploy migrations: `npm.cmd run prisma:migrate:deploy`
- Check migration state: `npm.cmd run prisma:migrate:status`

Set both runtime and migration DB URLs in `backend-node/.env`:

- `DATABASE_URL` (pooled runtime URL)
- `DIRECT_DATABASE_URL` (direct URL for migrations)

More details: `backend-node/README.md`
