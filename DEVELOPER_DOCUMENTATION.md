# AI Proctor System - Developer Documentation

> **Version:** 1.0.0  
> **Last Updated:** February 2026  
> **Status:** Production Ready

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Dependencies](#dependencies)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Authentication Flow](#authentication-flow)
8. [Exam Flow](#exam-flow)
9. [Face Detection System](#face-detection-system)
10. [Setup & Installation](#setup--installation)
11. [Environment Configuration](#environment-configuration)
12. [Integration Points](#integration-points)
13. [Testing](#testing)

---

## 🎯 System Overview

AI Proctor System is a comprehensive online examination platform with real-time AI-powered proctoring capabilities. It supports multi-tenant institutes, role-based access control, and automated integrity monitoring.

**Key Features:**
- Multi-tenant institute management
- Role-based authentication (5 roles)
- Real-time face detection & verification
- Automated integrity scoring
- Question bank management (MCQ, Coding, Descriptive)
- Batch assignments
- Results analytics dashboard

---

## 🛠 Technology Stack

### **Backend**
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL (via Supabase)
- **ORM:** SQLAlchemy 2.x
- **Authentication:** JWT (python-jose)
- **Password Hashing:** bcrypt
- **AI/ML:** face-recognition, numpy, Pillow

### **Frontend**
- **Framework:** React 18.3.1 + TypeScript 5.8.3
- **Build Tool:** Vite 7.3.1
- **Routing:** React Router DOM v6
- **State Management:** Zustand 5.0.11
- **UI Library:** Radix UI + Tailwind CSS 3.4.17
- **HTTP Client:** Axios 1.13.5
- **Face Detection:** face-api.js 0.22.2 (TensorFlow.js)
- **Animations:** Framer Motion 12.33.0
- **Webcam:** react-webcam 7.2.0

---

## 📐 Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Admin UI   │  │   Student    │  │  Proctor  │ │
│  │  Dashboard   │  │  Exam Flow   │  │  Monitor  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                         ↕ (Axios/REST API)
┌─────────────────────────────────────────────────────┐
│               Backend (FastAPI)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   Auth   │  │  Exams   │  │   Proctoring     │  │
│  │  Router  │  │  Router  │  │   Router         │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↕ (SQLAlchemy)
┌─────────────────────────────────────────────────────┐
│          PostgreSQL Database (Supabase)             │
└─────────────────────────────────────────────────────┘
```

### **Multi-Tenant Architecture**
```
Super Admin (Global)
    ↓
Institute Admin (Per Institute)
    ↓
Exam Admin + Proctor (Per Department)
    ↓
Students (Per Batch)
```

---

## 📦 Dependencies

### **Backend Dependencies** (`requirements.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | Latest | Web framework |
| `uvicorn[standard]` | Latest | ASGI server |
| `sqlalchemy` | Latest | ORM |
| `python-dotenv` | Latest | Environment variables |
| `passlib[bcrypt]` | Latest | Password hashing |
| `bcrypt` | 3.2.2 | Hashing algorithms |
| `python-jose[cryptography]` | Latest | JWT tokens |
| `python-multipart` | Latest | File uploads |
| `psycopg2-binary` | Latest | PostgreSQL adapter |
| `pydantic` | Latest | Data validation |
| `face-recognition` | Latest | Face matching |
| `numpy` | Latest | Numerical operations |
| `Pillow` | Latest | Image processing |

### **Frontend Dependencies** (`package.json`)

#### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.3.1 | UI framework |
| `react-dom` | 18.3.1 | DOM rendering |
| `typescript` | 5.8.3 | Type safety |
| `vite` | 7.3.1 | Build tool |
| `axios` | 1.13.5 | HTTP client |
| `zustand` | 5.0.11 | State management |
| `react-router-dom` | 6.30.1 | Routing |
| `face-api.js` | 0.22.2 | Face detection |
| `react-webcam` | 7.2.0 | Camera access |
| `framer-motion` | 12.33.0 | Animations |
| `tailwindcss` | 3.4.17 | CSS framework |
| `@radix-ui/*` | Various | UI components |
| `lucide-react` | 0.462.0 | Icons |
| `react-hook-form` | 7.61.1 | Form handling |
| `zod` | 3.25.76 | Schema validation |

#### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `@vitejs/plugin-react-swc` | 3.11.0 | Fast refresh |
| `eslint` | 9.39.2 | Code linting |
| `vitest` | 3.2.4 | Unit testing |
| `autoprefixer` | 10.4.21 | CSS prefixing |

---

## 🗄 Database Schema

### **Entity Relationship Diagram**

```
┌─────────────┐
│  Institute  │
└─────────────┘
       │
       ├──────────┬──────────┬──────────────┐
       ↓          ↓          ↓              ↓
 ┌──────────┐ ┌──────┐ ┌─────────┐    ┌────────┐
 │Department│ │ Admin│ │ Student │    │  Exam  │
 └──────────┘ └──────┘ └─────────┘    └────────┘
       │                    │               │
       ↓                    ↓               ↓
  ┌───────┐            ┌───────┐      ┌──────────┐
  │ Batch │            │Session│      │ Question │
  └───────┘            └───────┘      └──────────┘
                            │
                            ↓
                      ┌───────────┐
                      │Assignment │
                      └───────────┘
```

### **Tables**

#### 1. **institutes**
```sql
id              VARCHAR (PK)
name            VARCHAR (UNIQUE, NOT NULL)
plan            VARCHAR (DEFAULT 'Free')
config          JSONB (DEFAULT {})
```

#### 2. **departments**
```sql
id              VARCHAR (PK)
institute_id    VARCHAR (FK → institutes.id)
name            VARCHAR (NOT NULL)
code            VARCHAR(3) (NOT NULL)
UNIQUE(institute_id, name)
UNIQUE(institute_id, code)
```

#### 3. **admins**
```sql
id              VARCHAR (PK)
institute_id    VARCHAR (FK → institutes.id, NULLABLE)
email           VARCHAR (UNIQUE, NOT NULL)
password_hash   VARCHAR (NOT NULL)
role            ENUM (user_role) -- super_admin, institute_admin, exam_admin, proctor
profile_image   VARCHAR (NULLABLE)
created_at      TIMESTAMP (DEFAULT NOW)
updated_at      TIMESTAMP (DEFAULT NOW)
```

#### 4. **students**
```sql
id              VARCHAR (PK)
institute_id    VARCHAR (FK → institutes.id)
batch_id        VARCHAR (FK → batches.id)
email           VARCHAR (UNIQUE, NOT NULL)
password_hash   VARCHAR (NOT NULL)
role            ENUM (user_role) -- Always 'student'
profile_image   VARCHAR (NULLABLE)
created_at      TIMESTAMP (DEFAULT NOW)
updated_at      TIMESTAMP (DEFAULT NOW)
```

#### 5. **batches**
```sql
id              VARCHAR (PK)
institute_id    VARCHAR (FK → institutes.id)
department_id   VARCHAR (FK → departments.id)
batch_year      INTEGER (NOT NULL)
name            VARCHAR
members         JSONB (DEFAULT [])
```

#### 6. **exams**
```sql
id              VARCHAR (PK)
institute_id    VARCHAR (FK → institutes.id)
department_id   VARCHAR (FK → departments.id)
title           VARCHAR
duration        INTEGER (minutes)
start_time      TIMESTAMP (NULLABLE)
end_time        TIMESTAMP (NULLABLE)
proctor_config  JSONB (DEFAULT {})
random_rules    JSONB (DEFAULT {})
```

#### 7. **questions**
```sql
id              VARCHAR (PK)
exam_id         VARCHAR (FK → exams.id)
type            ENUM (question_type) -- MCQ, Coding, Descriptive
text            VARCHAR
marks           INTEGER (DEFAULT 1)
data            JSONB -- Structure: { options: [], correct_answer: "" }
```

#### 8. **exam_assignments**
```sql
id              VARCHAR (PK)
exam_id         VARCHAR (FK → exams.id)
batch_id        VARCHAR (FK → batches.id, NULLABLE)
student_id      VARCHAR (FK → students.id, NULLABLE)
CHECK: (batch_id IS NOT NULL XOR student_id IS NOT NULL)
```

#### 9. **exam_sessions**
```sql
id              VARCHAR (PK)
student_id      VARCHAR (FK → students.id)
exam_id         VARCHAR (FK → exams.id)
status          ENUM (session_status) -- ongoing, submitted, disqualified
score           INTEGER (NULLABLE)
integrity       INTEGER (NULLABLE) -- 0-100
```

### **Enums**

```python
UserRole:
  - student
  - proctor
  - exam_admin
  - institute_admin
  - super_admin

QuestionType:
  - MCQ
  - Coding
  - Descriptive

SessionStatus:
  - ongoing
  - submitted
  - disqualified
```

---

## 🔌 API Endpoints

**Base URL:** `http://localhost:8000/api`

### **Authentication**

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/login` | No | Login with email, password, role, and optional face image |
| GET | `/me` | Yes (Bearer) | Get current user profile |

### **Institutes**

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/institutes/` | super_admin | Create institute |
| GET | `/institutes/` | super_admin | List all institutes |

### **Departments**

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/departments/` | super_admin, institute_admin | Create department |
| GET | `/departments/` | super_admin, institute_admin | List departments |

### **Batches**

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/batches/` | super_admin, institute_admin | Create batch |
| GET | `/batches/` | super_admin, institute_admin | List batches |
| POST | `/batches/{batch_id}/members` | super_admin, institute_admin | Add members to batch |

### **Exams**

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/exams/` | exam_admin, institute_admin, super_admin | Create exam |
| GET | `/exams/` | All roles | List exams (filtered by role) |

### **Questions**

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/questions/` | exam_admin, institute_admin, super_admin | Create question |
| GET | `/questions/` | exam_admin, institute_admin, super_admin | List all questions |
| GET | `/questions/exam/{exam_id}` | All authenticated | Get questions for exam |

### **Assignments**

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/assignments/` | exam_admin, institute_admin, super_admin | Assign exam to batch/student |
| GET | `/assignments/` | exam_admin, institute_admin, super_admin | List all assignments |
| GET | `/assignments/me` | student | Get student's assigned exams |

### **Sessions (Exam Attempts)**

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/sessions/` | All authenticated | Create/submit exam session |
| GET | `/sessions/` | Admin roles | List all sessions |
| GET | `/sessions/me` | student | Get student's sessions |
| GET | `/sessions/exam/{exam_id}` | Admin roles | Get sessions for exam |
| GET | `/sessions/exam/{exam_id}/details` | Admin roles | Get sessions with student details |

### **Users**

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/users/` | Admin roles | List all users (admins + students) |

---

## 🔐 Authentication Flow

### **Login Process**
```
1. User submits:
   - email
   - password
   - role (student/admin type)
   - file (optional face verification image)

2. Backend validates:
   - Email + password match
   - Role matches user's actual role
   - Face image processed (if provided)

3. Backend returns:
   - JWT access_token (expires in 30 days)

4. Frontend:
   - Stores token in localStorage (via Zustand persist)
   - All subsequent requests include: Authorization: Bearer <token>

5. Token verification:
   - Backend decodes JWT on each request
   - Extracts user_id and role
   - Validates permissions
```

### **Role-Based Access Control**

```typescript
// Frontend route protection
<RequireAuth allowedRoles={['super_admin', 'institute_admin']}>
  <AdminDashboard />
</RequireAuth>

// Backend endpoint protection
@router.get("/exams/")
def list_exams(
    current_user = Depends(require_role(["exam_admin", "institute_admin"]))
)
```

### **Token Structure**
```json
{
  "sub": "user_id_string",
  "role": "student",
  "exp": 1234567890
}
```

---

## 📝 Exam Flow

### **Complete Workflow**

```
┌─────────────────────┐
│  1. Assignment      │  Exam Admin assigns exam to batch/student
└─────────────────────┘
          ↓
┌─────────────────────┐
│  2. Student Login   │  Student logs in via /login
└─────────────────────┘
          ↓
┌─────────────────────┐
│  3. View Exams      │  GET /assignments/me
└─────────────────────┘
          ↓
┌─────────────────────┐
│  4. Start Exam      │  Navigate to StudentExamFlow
└─────────────────────┘
          ↓
┌─────────────────────┐
│  5. Verification    │  Face capture + biometric baseline
└─────────────────────┘
          ↓
┌─────────────────────┐
│  6. Exam Interface  │  Answer questions + continuous monitoring
└─────────────────────┘
          ↓
┌─────────────────────┐
│  7. Submit          │  Calculate score + integrity
└─────────────────────┘
          ↓
┌─────────────────────┐
│  8. Save Results    │  POST /sessions/ with score/integrity
└─────────────────────┘
          ↓
┌─────────────────────┐
│  9. View Results    │  Student & Admin dashboards
└─────────────────────┘
```

### **Score Calculation Logic**

```typescript
// For each question:
if (question.type === 'MCQ') {
  const selectedOption = answers[index];
  const correctAnswer = question.data.correct_answer;
  
  if (question.data.options[selectedOption] === correctAnswer) {
    score += 1;
  }
}

// Final score: (correct / total) * 100
finalScore = Math.round((score / questions.length) * 100);
```

### **Integrity Calculation**

```typescript
integrity = 100 - (warnings × 10);

// Warnings triggered by:
// 1. Face not detected
// 2. Different person detected (distance > 0.55)
```

---

## 🤖 Face Detection System

### **Technology Stack**
- **Library:** face-api.js v0.22.2 (TensorFlow.js based)
- **Models Used:**
  1. `tiny_face_detector` - Lightweight face detection
  2. `face_landmark_68` - 68 facial landmark points
  3. `face_recognition` - 128-dimensional face embeddings

### **Phase 1: Verification (Pre-Exam)**

**Location:** `frontend/src/components/student-final/Verification.tsx`

```typescript
1. Load models from /public/models/
2. Request camera + microphone access
3. Detect face in video stream
4. Extract 68 landmarks (eyes, nose, mouth, jawline)
5. Generate face descriptor (Float32Array[128])
6. Store baseline descriptor in memory
7. Proceed to exam
```

**Face Descriptor:** A 128-dimensional vector uniquely identifying the face
```
Example: [0.123, -0.456, 0.789, ..., 0.321] (128 numbers)
```

### **Phase 2: Continuous Monitoring (During Exam)**

**Location:** `frontend/src/components/student-final/ExamInterface.tsx`

```typescript
// Every 4 seconds:
1. Capture current frame from webcam
2. Detect face
3. Extract face descriptor
4. Compare with baseline using Euclidean distance

const distance = faceapi.euclideanDistance(baseline, current);

if (!faceDetected) {
  warnings++;  // Student not visible
}

if (distance > 0.55) {
  warnings++;  // Different person detected
}
```

### **Distance Threshold**
```
distance < 0.55  →  Same person ✓
distance > 0.55  →  Different person ✗
```

### **Model Files Required**

Place in `frontend/public/models/`:
```
tiny_face_detector_model-shard1
tiny_face_detector_model-weights_manifest.json
face_landmark_68_model-shard1
face_landmark_68_model-weights_manifest.json
face_recognition_model-shard1
face_recognition_model-shard2
face_recognition_model-weights_manifest.json
```

---

## 🚀 Setup & Installation

### **Prerequisites**
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL (or Supabase account)

### **Backend Setup**

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Environment Configuration)
# Run migrations (auto-created on first run)
# Start server
uvicorn app.main:app --reload

# Server runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### **Frontend Setup**

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Download face-api.js models
# Place model files in public/models/ directory

# Create .env file
# VITE_API_URL=http://localhost:8000/api

# Start dev server
npm run dev

# Server runs at http://localhost:5173

# Build for production
npm run build
```

---

## ⚙️ Environment Configuration

### **Backend `.env`**

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Configuration
SECRET_KEY=your-secret-key-here-use-strong-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days

# Supabase (if using)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### **Frontend `.env`**

```env
# API Base URL
VITE_API_URL=http://localhost:8000/api

# OR for production
# VITE_API_URL=https://your-production-domain.com/api
```

### **CORS Configuration**

Backend allows these origins (edit in `app/main.py`):
```python
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
    "http://localhost:8080",  # Alternative
    "http://127.0.0.1:8080",
]
```

---

## 🔗 Integration Points

### **1. Frontend → Backend API**

**HTTP Client:** Axios with interceptors

```typescript
// Location: frontend/src/lib/api.ts

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Request interceptor: Attach JWT
api.interceptors.request.use((config) => {
  const token = getTokenFromStorage();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthAndRedirect();
    }
    return Promise.reject(error);
  }
);
```

### **2. State Management**

**Zustand Store:** Authentication state persisted to localStorage

```typescript
// Location: frontend/src/stores/authStore.ts

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (email, password, role, image) => {
        const res = await api.post('/login', formData);
        set({ 
          user: res.data.user, 
          token: res.data.access_token,
          isAuthenticated: true 
        });
      },
      
      logout: () => {
        localStorage.removeItem('proctora-auth');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    { name: 'proctora-auth' }
  )
);
```

### **3. File Uploads**

**Face Verification Image:**

```typescript
// Frontend
const formData = new FormData();
formData.append('email', email);
formData.append('password', password);
formData.append('role', role);
formData.append('file', imageFile);  // Optional

await api.post('/login', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

```python
# Backend
@router.post("/login")
async def login(
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    file: UploadFile = File(None)
):
    # Process face image if provided
    if file:
        image = face_recognition.load_image_file(file.file)
        encodings = face_recognition.face_encodings(image)
```

### **4. Database Connection**

```python
# Location: backend/app/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### **5. Routing**

**Frontend Routes:**

```typescript
// Location: frontend/src/App.tsx

<Routes>
  {/* Public */}
  <Route path="/login" element={<Login />} />
  
  {/* Protected - Admin */}
  <Route element={<RequireAuth allowedRoles={['super_admin', 'institute_admin']}>
    <Route path="/admin" element={<AdminDashboard />} />
    <Route path="/admin/institutes" element={<InstitutesPage />} />
  </RequireAuth>} />
  
  {/* Protected - Exam Admin */}
  <Route element={<RequireAuth allowedRoles={['exam_admin']}>
    <Route path="/exam-admin" element={<ExamAdminDashboard />} />
    <Route path="/exam-admin/create" element={<ExamSetupPage />} />
  </RequireAuth>} />
  
  {/* Protected - Student */}
  <Route element={<RequireAuth allowedRoles={['student']}>
    <Route path="/student" element={<StudentDashboard />} />
    <Route path="/student/exam/:examId" element={<StudentExamFlow />} />
  </RequireAuth>} />
</Routes>
```

**Backend Routes:**

```python
# Location: backend/app/main.py

app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(institutes.router, prefix="/api", tags=["Institutes"])
app.include_router(departments.router, prefix="/api", tags=["Departments"])
app.include_router(batches.router, prefix="/api", tags=["Batches"])
app.include_router(exams.router, prefix="/api", tags=["Exams"])
app.include_router(questions.router, prefix="/api", tags=["Questions"])
app.include_router(assignments.router, prefix="/api", tags=["Assignments"])
app.include_router(sessions.router, prefix="/api", tags=["Sessions"])
```

---

## 🧪 Testing

### **Backend Testing**

```bash
# Run with pytest (not yet implemented)
pytest tests/

# Manual testing with Swagger UI
# Visit: http://localhost:8000/docs
```

### **Frontend Testing**

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Testing library: Vitest + React Testing Library
```

### **API Testing with curl**

```bash
# Login
curl -X POST http://localhost:8000/api/login \
  -F "email=admin@test.com" \
  -F "password=password123" \
  -F "role=super_admin"

# Get exams with token
curl -X GET http://localhost:8000/api/exams/ \
  -H "Authorization: Bearer <your_token>"
```

---

## 📊 Data Flow Examples

### **Exam Creation Flow**

```
1. Exam Admin creates exam
   POST /exams/
   {
     "department_id": "DEPT-001",
     "title": "Midterm Exam",
     "duration": 60
   }

2. Add questions
   POST /questions/
   {
     "exam_id": "EXAM-001",
     "type": "MCQ",
     "text": "What is 2+2?",
     "marks": 1,
     "data": {
       "options": ["3", "4", "5", "6"],
       "correct_answer": "4"
     }
   }

3. Assign to batch
   POST /assignments/
   {
     "exam_id": "EXAM-001",
     "batch_id": "BATCH-001"
   }

4. Students see exam in /assignments/me
```

### **Student Exam Attempt Flow**

```
1. Student views assigned exams
   GET /assignments/me
   
2. Starts exam → Face verification

3. Fetches questions
   GET /questions/exam/EXAM-001
   
4. Answers questions (frontend state)

5. Submits exam
   POST /sessions/
   {
     "student_id": "STU-001",
     "exam_id": "EXAM-001",
     "score": 85,
     "integrity": 90,
     "status": "submitted"
   }

6. View results
   GET /sessions/me
```

---

## 🔒 Security Considerations

### **Current Implementation**

✅ **Implemented:**
- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- CORS configuration
- SQL injection prevention (SQLAlchemy ORM)

⚠️ **Recommended Additions:**
- Rate limiting on login endpoint
- Refresh token mechanism
- HTTPS in production
- Input validation middleware
- Content Security Policy (CSP)
- MongoDB for violation logs (currently not implemented)

---

## 📝 Common Issues & Solutions

### **Issue: Face models not loading**
**Solution:** Ensure model files are in `frontend/public/models/` and accessible at `/models/*`

### **Issue: CORS errors**
**Solution:** Add frontend URL to `origins` list in `backend/app/main.py`

### **Issue: 401 Unauthorized on all requests**
**Solution:** Check JWT token in localStorage and verify it's being sent in Authorization header

### **Issue: Questions not loading**
**Solution:** Verify exam has been assigned to student's batch via `/assignments/`

### **Issue: Score always 0**
**Solution:** Check browser console debug logs for question data structure mismatch

---

## 👥 Contact & Support

For questions or issues:
- Check API documentation: `http://localhost:8000/docs`
- Review this documentation
- Check browser console for frontend errors
- Check backend terminal for API errors

---

## 📄 License

[Specify your license here]

---

**Last Updated:** February 21, 2026  
**Documentation Version:** 1.0.0
