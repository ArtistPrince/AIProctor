# AI Proctor System - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Start Backend

```bash
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
uvicorn app.main:app --reload
```

**Backend running at:** `http://localhost:8000`  
**API Docs:** `http://localhost:8000/docs`

---

### Step 2: Start Frontend

```bash
cd frontend
npm run dev
```

**Frontend running at:** `http://localhost:5173`

---

### Step 3: Initial Setup

#### Create Super Admin (First Time Only)

**Option A - Using Swagger UI:**
1. Go to `http://localhost:8000/docs`
2. Find `POST /api/login` endpoint
3. Click "Try it out"
4. Create super admin account first via direct database insert (or use Supabase dashboard)

**Option B - Direct Database Insert:**
```sql
INSERT INTO admins (id, email, password_hash, role, institute_id)
VALUES (
  'ADMIN-001',
  'admin@knowbots.com',
  '$2b$12$your_bcrypt_hash_here',  -- Use bcrypt to hash 'password123'
  'super_admin',
  NULL
);
```

**Generate password hash in Python:**
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
print(pwd_context.hash("password123"))
```

---

## 📋 Common Workflows

### Workflow 1: Create Institute & Department

```bash
# Login as super admin
POST /api/login
{
  "email": "admin@knowbots.com",
  "password": "password123",
  "role": "super_admin"
}
# Returns: { "access_token": "..." }

# Create institute
POST /api/institutes/
Headers: Authorization: Bearer <token>
{
  "name": "MIT College",
  "plan": "Enterprise"
}

# Create department
POST /api/departments/
{
  "institute_id": "INST-001",
  "name": "Computer Science",
  "code": "CSE"
}
```

---

### Workflow 2: Create Batch & Students

```bash
# Create batch
POST /api/batches/
{
  "institute_id": "INST-001",
  "department_id": "DEPT-001",
  "batch_year": 2024,
  "name": "CS 2024-A"
}

# Create student accounts directly in database or via registration flow
```

---

### Workflow 3: Create Exam with Questions

```bash
# 1. Create exam
POST /api/exams/
{
  "department_id": "DEPT-001",
  "title": "Data Structures Midterm",
  "duration": 60
}
# Returns: exam_id = "EXAM-001"

# 2. Add MCQ question
POST /api/questions/
{
  "exam_id": "EXAM-001",
  "type": "MCQ",
  "text": "What is the time complexity of binary search?",
  "marks": 1,
  "data": {
    "options": ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
    "correct_answer": "O(log n)"
  }
}

# 3. Repeat for all questions...

# 4. Assign to batch
POST /api/assignments/
{
  "exam_id": "EXAM-001",
  "batch_id": "BATCH-001"
}
```

---

### Workflow 4: Student Takes Exam

```bash
# 1. Student login
POST /api/login
{
  "email": "student@college.edu",
  "password": "studentpass",
  "role": "student"
}

# 2. Get assigned exams
GET /api/assignments/me

# 3. Start exam (Frontend handles this)
# - Navigate to /student/exam/:examId
# - Face verification
# - Answer questions
# - Submit

# 4. Submit exam session
POST /api/sessions/
{
  "student_id": "STU-001",
  "exam_id": "EXAM-001",
  "score": 85,
  "integrity": 90,
  "status": "submitted"
}
```

---

## 🎭 Role-Based Access

### Super Admin
- Full access to everything
- URL: `/admin`
- Can create institutes, departments, admins

### Institute Admin
- Manage their institute
- URL: `/admin`
- Can create departments, batches, exam admins

### Exam Admin
- Create and manage exams
- URL: `/exam-admin`
- Can create exams, questions, assignments

### Proctor
- Monitor live exams
- URL: `/proctor`
- View exam sessions

### Student
- Take exams
- URL: `/student`
- View assignments and results

---

## 🔑 Default Test Accounts

Create these in your database for testing:

```sql
-- Super Admin
INSERT INTO admins VALUES ('ADMIN-001', 'admin@test.com', '<hash>', 'super_admin', NULL);

-- Institute Admin
INSERT INTO admins VALUES ('ADMIN-002', 'institute@test.com', '<hash>', 'institute_admin', 'INST-001');

-- Exam Admin
INSERT INTO admins VALUES ('ADMIN-003', 'exam@test.com', '<hash>', 'exam_admin', 'INST-001');

-- Student (after creating batch)
INSERT INTO students VALUES ('STU-001', 'INST-001', 'BATCH-001', 'student@test.com', '<hash>', 'student');
```

**Password:** Use same hash for all → `password123`

---

## 🐛 Troubleshooting

### Frontend won't connect to backend
```bash
# Check VITE_API_URL in frontend/.env
VITE_API_URL=http://localhost:8000/api
```

### Database connection error
```bash
# Check DATABASE_URL in backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Face models not loading
```bash
# Ensure models are in frontend/public/models/
# Check browser console for 404 errors on /models/*.json
```

### CORS error
```bash
# Add your frontend URL to backend/app/main.py origins list
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

---

## 📦 Quick Commands Reference

```bash
# Backend
cd backend
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
npm run build  # Production build

# Database (if using Supabase)
# Use Supabase Dashboard → SQL Editor

# Testing API
# Visit http://localhost:8000/docs (Swagger UI)
```

---

## 🎯 Next Steps

1. ✅ Set up backend + frontend
2. ✅ Create super admin account
3. ✅ Create institute → department → batch
4. ✅ Create exam + questions
5. ✅ Assign exam to batch
6. ✅ Test student exam flow
7. ✅ View results in admin dashboard

---

**Need Help?** Check [DEVELOPER_DOCUMENTATION.md](./DEVELOPER_DOCUMENTATION.md) for detailed information.
