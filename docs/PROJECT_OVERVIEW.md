# Project Overview (AI-Proctor System)

This document gives a concise orientation for new developers working on the backend and frontend.

## Workspace Layout
- backend/ - FastAPI application (API, models, routers, migrations)
- frontend/ - Vite + React application (UI)
- upload/ - Uploaded assets (runtime)
- docs/ - Project docs (this file)

## Backend (FastAPI)
### Key Paths
- backend/app/main.py - FastAPI app setup, CORS, router registration
- backend/app/models.py - SQLAlchemy models
- backend/app/schemas.py - Pydantic schemas
- backend/app/routers/ - API routes (auth, exams, batches, assignments, questions, etc.)
- backend/app/security.py - JWT auth, role checks
- backend/migrations/ - SQL migration scripts

### Run (dev)
1) Activate venv:
   - Windows PowerShell:
     .\backend\venv\Scripts\Activate.ps1
2) Start API:
   - From backend/:
     uvicorn app.main:app --reload

### API Base Path
- All API routes are prefixed with /api (see main.py)

### Environment Variables
- JWT_SECRET_KEY (required)
- JWT_ALGORITHM (optional, default HS256)
- ACCESS_TOKEN_EXPIRE_MINUTES (optional, default 60)
- ALLOW_LOGIN_WITHOUT_FACE (optional, "true" to bypass face check)
- FACE_MATCH_THRESHOLD (optional, default 0.6)

## Frontend (Vite + React)
### Key Paths
- frontend/src/pages/ - Page components (Login, ExamSetup, AssignExam, etc.)
- frontend/src/components/ - Reusable UI components
- frontend/src/stores/ - Zustand stores (auth)
- frontend/src/lib/api.ts - Axios client + auth interceptor

### Run (dev)
- From frontend/:
  npm install
  npm run dev

### API Configuration
- Frontend uses Vite proxy: /api -> http://127.0.0.1:8000
- Override with VITE_API_URL in frontend env if needed

## Auth Flow (High Level)
- Login posts to /api/login (multipart form)
- JWT stored in localStorage (proctora-auth)
- Axios interceptor attaches Authorization header

## Quick Checklist
- Start backend first, then frontend
- Ensure JWT_SECRET_KEY is set
- Use /api routes through the frontend proxy
