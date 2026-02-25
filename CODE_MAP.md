# Code Map - AI Proctor System

**Quick reference for file locations, purposes, and connections**

---

## 📦 Version Information

**Backend:** Python 3.11+  
**Frontend:** React 18.3.1 + TypeScript 5.8.3  
**Database:** PostgreSQL (Supabase)

---

## 🗂️ Backend Files (`backend/app/`)

### Core Files

| File | Purpose | Uses | Called By |
|------|---------|------|-----------|
| `main.py` | FastAPI app entry point, CORS setup, router registration | All routers | uvicorn server |
| `database.py` | Database connection, session management | SQLAlchemy, PostgreSQL | All routers, models |
| `models.py` | Database table definitions (9 tables: Institute, Department, Admin, Student, Batch, Exam, Question, ExamAssignment, ExamSession) | SQLAlchemy | All routers |
| `schemas.py` | Pydantic validation schemas for API requests/responses | Pydantic | All routers |
| `security.py` | Password hashing, JWT token creation/verification | bcrypt, python-jose | auth.py router |

### API Routers (`backend/app/routers/`)

| File | Endpoints | Purpose | Calls |
|------|-----------|---------|-------|
| `auth.py` | `POST /login`, `GET /me` | User authentication, face verification | `security.py`, `models.py`, face-recognition lib |
| `institutes.py` | `POST /institutes/`, `GET /institutes/` | Institute CRUD | `models.Institute`, `database.py` |
| `departments.py` | `POST /departments/`, `GET /departments/` | Department CRUD | `models.Department`, `database.py` |
| `batches.py` | `POST /batches/`, `GET /batches/`, `POST /batches/{id}/members` | Batch management | `models.Batch`, `database.py` |
| `exams.py` | `POST /exams/`, `GET /exams/` | Exam creation and listing | `models.Exam`, `database.py` |
| `questions.py` | `POST /questions/`, `GET /questions/`, `GET /questions/exam/{exam_id}` | Question bank management | `models.Question`, `database.py` |
| `assignments.py` | `POST /assignments/`, `GET /assignments/`, `GET /assignments/me` | Assign exams to batches/students | `models.ExamAssignment`, `database.py` |
| `sessions.py` | `POST /sessions/`, `GET /sessions/`, `GET /sessions/exam/{exam_id}`, `GET /sessions/exam/{exam_id}/details` | Exam attempts and results | `models.ExamSession`, `database.py` |
| `users.py` | `GET /users/` | List all users (admins + students) | `models.Admin`, `models.Student` |

---

## 🗂️ Frontend Files

### Entry Points (`frontend/src/`)

| File | Purpose | Imports | Exported To |
|------|---------|---------|-------------|
| `main.tsx` | React app entry, routing setup | `App.tsx`, `react-router-dom` | Vite index.html |
| `App.tsx` | Root component, route definitions | All page components, `RequireAuth` | `main.tsx` |
| `vite.config.ts` | Build configuration | Vite, React plugin | Vite CLI |

### API Layer (`frontend/src/lib/`)

| File | Purpose | Uses | Called By |
|------|---------|------|-----------|
| `api.ts` | Axios HTTP client, auth interceptors, automatic JWT attachment | axios, `authStore` | All pages, components |
| `utils.ts` | Helper functions | - | Various components |

### State Management (`frontend/src/stores/`)

| File | Purpose | Uses | Called By |
|------|---------|------|-----------|
| `authStore.ts` | User authentication state (login, logout, token storage) | zustand, localStorage | `api.ts`, all protected pages, `RequireAuth` |

### Authentication (`frontend/src/components/auth/`)

| File | Purpose | Uses | Called By |
|------|---------|------|-----------|
| `RequireAuth.tsx` | Route protection, redirects unauthorized users | `authStore`, `react-router-dom` | `App.tsx` route wrappers |

### Student Exam Flow (`frontend/src/components/student-final/`)

| File | Purpose | Uses | Called By |
|------|---------|------|-----------|
| `Verification.tsx` | Face capture during login/exam start | react-webcam, face-api.js, `faceStore` | Login page, exam start |
| `faceStore.ts` | In-memory storage for face descriptors | - | `Verification.tsx`, `ExamInterface.tsx` |
| `ExamInterface.tsx` | Exam taking UI, AI monitoring, question display, answer submission, score calculation | face-api.js, `faceStore`, `api.ts` | `StudentExamFlow.tsx` |
| `Result.tsx` | Display exam results, save to backend | `api.ts` | `StudentExamFlow.tsx` |

### Student Pages (`frontend/src/pages/student/`)

| File | Purpose | Uses | Called By |
|------|---------|------|-----------|
| `StudentDashboard.tsx` | View assigned exams | `api.ts` (`GET /assignments/me`) | `App.tsx` route |
| `StudentExamFlow.tsx` | Orchestrates Verification → ExamInterface → Result flow | `Verification`, `ExamInterface`, `Result` | `App.tsx` route |
| `StudentResultsPage.tsx` | View past exam results | `api.ts` (`GET /sessions/me`) | `App.tsx` route |

### Exam Admin Pages (`frontend/src/pages/exam-admin/`)

| File | Purpose | Uses | Called By |
|------|---------|------|-----------|
| `ExamAdminDashboard.tsx` | Dashboard overview | `api.ts` | `App.tsx` route |
| `ExamSetupPage.tsx` | Create new exams | `api.ts` (`POST /exams/`) | `App.tsx` route |
| `QuestionBankPage.tsx` | Add questions to exams | `api.ts` (`POST /questions/`) | `App.tsx` route |
| `AssignExamPage.tsx` | Assign exams to batches | `api.ts` (`POST /assignments/`) | `App.tsx` route |
| `ExamResultsPage.tsx` | View all student results for an exam | `api.ts` (`GET /sessions/exam/{id}/details`) | `App.tsx` route |
| `ExamAttemptsPage.tsx` | Monitor live exam sessions | `api.ts` | `App.tsx` route |

### Login (`frontend/src/pages/`)

| File | Purpose | Uses | Called By |
|------|---------|------|-----------|
| `Login.tsx` | Login form with face verification | `Verification`, `authStore`, `api.ts` (`POST /login`) | `App.tsx` route |

---

## 🔄 Data Flow Diagrams

### 1. Student Login Flow

```
User fills form in Login.tsx
    ↓
Login.tsx captures face using Verification.tsx
    ↓
Verification.tsx uses face-api.js to get face descriptor
    ↓
Login.tsx sends credentials + face image to backend (api.ts → POST /login)
    ↓
backend/routers/auth.py verifies face with face-recognition lib
    ↓
auth.py returns JWT token
    ↓
authStore.ts saves token + user info to localStorage
    ↓
api.ts automatically attaches token to all future requests
```

### 2. Taking an Exam Flow

```
StudentDashboard.tsx fetches assigned exams (GET /assignments/me)
    ↓
Student clicks "Start Exam"
    ↓
StudentExamFlow.tsx renders Verification.tsx
    ↓
Verification.tsx captures reference face → saved to faceStore.ts
    ↓
StudentExamFlow.tsx renders ExamInterface.tsx
    ↓
ExamInterface.tsx fetches questions (GET /questions/exam/{exam_code})
    ↓
backend/routers/questions.py queries models.Question from database
    ↓
Questions displayed in ExamInterface.tsx
    ↓
ExamInterface.tsx continuously monitors face using face-api.js
    ↓
ExamInterface.tsx compares live face to faceStore.ts reference
    ↓
If mismatch detected → integrity score decreases
    ↓
Student submits answers → ExamInterface.tsx calculates score
    ↓
StudentExamFlow.tsx renders Result.tsx with score + integrity
    ↓
Result.tsx saves session (POST /sessions/)
    ↓
backend/routers/sessions.py creates ExamSession in database
```

### 3. Creating an Exam Flow

```
ExamAdminDashboard.tsx → Click "Create Exam"
    ↓
ExamSetupPage.tsx → Fill exam details (title, duration, dates)
    ↓
POST /exams/ → backend/routers/exams.py
    ↓
exams.py creates Exam record in database (models.Exam)
    ↓
Exam created → Navigate to QuestionBankPage.tsx
    ↓
Add questions → POST /questions/ for each question
    ↓
backend/routers/questions.py creates Question records
    ↓
Navigate to AssignExamPage.tsx
    ↓
Select batch → POST /assignments/
    ↓
backend/routers/assignments.py creates ExamAssignment
    ↓
Students in batch can now see exam in their dashboard
```

### 4. Viewing Results Flow

```
ExamAdminDashboard.tsx → Click "View Results" for exam
    ↓
ExamResultsPage.tsx loads
    ↓
GET /sessions/exam/{exam_id}/details
    ↓
backend/routers/sessions.py queries ExamSession + Student tables
    ↓
Returns list of attempts with student emails, scores, integrity
    ↓
ExamResultsPage.tsx displays table with:
    - Student ID
    - Student Email
    - Score
    - Integrity
    - Status
```

---

## 🔑 Key Connections

### Database Schema → Backend Models → API → Frontend

```
PostgreSQL Tables (Supabase)
    ↕️
backend/app/models.py (SQLAlchemy ORM)
    ↕️
backend/app/routers/*.py (API endpoints)
    ↕️
frontend/src/lib/api.ts (Axios HTTP client)
    ↕️
frontend/src/pages/*.tsx (UI components)
```

### Authentication Chain

```
Login.tsx → api.ts (POST /login) → auth.py → security.py (JWT creation)
    ↓
authStore.ts stores token
    ↓
api.ts interceptor adds token to all requests
    ↓
backend routers verify token via security.py
    ↓
RequireAuth.tsx protects routes based on authStore state
```

### Face Detection Chain

```
Verification.tsx (capture face image)
    ↓
face-api.js loads TensorFlow models (public/models/)
    ↓
Extracts 128-dimensional face descriptor
    ↓
Saved to faceStore.ts (in-memory)
    ↓
ExamInterface.tsx compares live face every 3 seconds
    ↓
Euclidean distance < 0.55 = match, else warning
    ↓
Integrity score = 100 - (warnings × 10)
```

---

## 📂 File Hierarchy

```
backend/
├── app/
│   ├── main.py                 ← FastAPI app entry
│   ├── database.py             ← DB connection
│   ├── models.py               ← 9 tables
│   ├── schemas.py              ← Pydantic validation
│   ├── security.py             ← JWT & password hashing
│   └── routers/
│       ├── auth.py             ← Login endpoint
│       ├── institutes.py       ← Institute CRUD
│       ├── departments.py      ← Department CRUD
│       ├── batches.py          ← Batch management
│       ├── exams.py            ← Exam CRUD
│       ├── questions.py        ← Question bank
│       ├── assignments.py      ← Exam assignments
│       ├── sessions.py         ← Exam attempts & results
│       └── users.py            ← User listing
└── requirements.txt            ← Python dependencies

frontend/
├── src/
│   ├── main.tsx                ← React entry point
│   ├── App.tsx                 ← Routing setup
│   ├── lib/
│   │   └── api.ts              ← HTTP client (all API calls go through here)
│   ├── stores/
│   │   └── authStore.ts        ← Auth state (login/logout)
│   ├── components/
│   │   ├── auth/
│   │   │   └── RequireAuth.tsx ← Route protection
│   │   └── student-final/
│   │       ├── Verification.tsx    ← Face capture
│   │       ├── faceStore.ts        ← Face descriptor storage
│   │       ├── ExamInterface.tsx   ← Exam taking + monitoring
│   │       └── Result.tsx          ← Result display + save
│   └── pages/
│       ├── Login.tsx           ← Login page
│       ├── student/
│       │   ├── StudentDashboard.tsx      ← View assigned exams
│       │   ├── StudentExamFlow.tsx       ← Exam flow orchestrator
│       │   └── StudentResultsPage.tsx    ← View past results
│       └── exam-admin/
│           ├── ExamAdminDashboard.tsx    ← Admin dashboard
│           ├── ExamSetupPage.tsx         ← Create exam
│           ├── QuestionBankPage.tsx      ← Add questions
│           ├── AssignExamPage.tsx        ← Assign to batches
│           └── ExamResultsPage.tsx       ← View results
└── package.json                ← npm dependencies
```

---

## 🔗 Critical Dependencies

### Backend (Python)
- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **sqlalchemy** - ORM for PostgreSQL
- **python-jose** - JWT tokens
- **bcrypt 3.2.2** - Password hashing
- **face-recognition** - Face verification on login

### Frontend (npm)
- **react 18.3.1** - UI framework
- **typescript 5.8.3** - Type safety
- **vite 7.3.1** - Build tool
- **axios 1.13.5** - HTTP client
- **zustand 5.0.11** - State management
- **face-api.js 0.22.2** - AI face detection (TensorFlow.js)
- **react-webcam 7.2.0** - Camera access
- **react-router-dom 6.30.1** - Routing

---

## 🚀 Quick File Lookup

**Need to modify exam questions?**  
→ `backend/app/routers/questions.py` (API)  
→ `frontend/src/pages/exam-admin/QuestionBankPage.tsx` (UI)

**Need to fix score calculation?**  
→ `frontend/src/components/student-final/ExamInterface.tsx` (lines where answers are compared)

**Need to adjust face detection sensitivity?**  
→ `frontend/src/components/student-final/ExamInterface.tsx` (threshold: 0.55)

**Need to change JWT expiration?**  
→ `backend/app/security.py` (ACCESS_TOKEN_EXPIRE_MINUTES)

**Need to modify database schema?**  
→ `backend/app/models.py` → run migrations

**Need to add new API endpoint?**  
→ Create router in `backend/app/routers/` → register in `main.py`

**Need to add new page?**  
→ Create component in `frontend/src/pages/` → add route in `App.tsx`
