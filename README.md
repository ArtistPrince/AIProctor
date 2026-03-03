# AI-Proctor System

Production-ready multi-tenant AI proctoring platform with:
- FastAPI backend (`backend/`)
- New React + Vite dashboard frontend (`dashboard/`)
- Legacy frontend reference (`frontend/`)

## Repository Overview

- `backend/` — FastAPI APIs, routers, migrations, seed scripts
- `dashboard/` — primary admin/faculty/student web app (active frontend)
- `frontend/` — older frontend retained for reference
- `backend/scripts/seed_credentials.xlsx` — seeded account credentials export

## Quick Start (New Developer)

### 1) Install dependencies

From workspace root:

```bash
npm install
npm --prefix dashboard install
```

Backend:

```bash
python -m pip install -r backend/requirements.txt
```

### 2) Configure env

Dashboard env:

```bash
copy dashboard/.env.example dashboard/.env
```

Backend env:
- Configure `backend/.env` with `DATABASE_URL` and any required runtime variables.

### 3) Run backend + dashboard together

```bash
npm run dev
```

- Dashboard: `http://localhost:8080`
- API: `http://127.0.0.1:8000/api`

## Auth & Seed Data

Primary seeded credentials are exported at:
- `backend/scripts/seed_credentials.xlsx`
- `backend/scripts/seed_credentials.csv`

Use these for local QA sign-in by role (`super_admin`, `institute_admin`, `faculty`, `student`).

## Multi-Tenant Partitioning

- Tenant child partitions are managed in schema: `tenant_partitions`
- Parent partitioned tables remain in `public`
- Partition provisioning is handled automatically during institute and dependent entity creation

## Performance Notes

Recent optimizations include:
- N+1 query removal in heavy list endpoints (`sessions`, `assignments`, `batches`)
- Read-path indexes in `backend/migrations/20260303_add_performance_indexes.sql`
- Reduced redundant frontend overfetch for exam listings

## Important Scripts

- `npm run dev` — start backend + dashboard
- `npm run build:dashboard` — production build for dashboard
- `npm run test:dashboard` — dashboard tests

## Team Guidance

- Treat `dashboard/` as the primary frontend going forward.
- Keep credentials exports (`seed_credentials.xlsx/csv`) updated when reseeding test users.
- Run migrations before validating new tenant/institute creation flows.
