# API Reference - AI Proctor System

**Base URL:** `http://localhost:8000/api`  
**Authentication:** Bearer Token (JWT)

---

## 📑 Table of Contents

- [Authentication](#authentication)
- [Institutes](#institutes)
- [Departments](#departments)
- [Batches](#batches)
- [Exams](#exams)
- [Questions](#questions)
- [Assignments](#assignments)
- [Sessions](#sessions)
- [Users](#users)

---

## 🔐 Authentication

### Login
```http
POST /api/login
Content-Type: multipart/form-data
```

**Form Data:**
- `email` (required): User email
- `password` (required): User password
- `role` (required): `student` | `super_admin` | `institute_admin` | `exam_admin` | `proctor`
- `file` (optional): Face verification image

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### Get Current User
```http
GET /api/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "STU-001",
  "email": "student@college.edu",
  "role": "student",
  "institute_id": "INST-001",
  "batch_id": "BATCH-001"
}
```

---

## 🏢 Institutes

### Create Institute
```http
POST /api/institutes/
Authorization: Bearer <super_admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "MIT College",
  "plan": "Enterprise",
  "config": {}
}
```

**Response:**
```json
{
  "id": "INST-001",
  "name": "MIT College",
  "plan": "Enterprise",
  "config": {}
}
```

---

### List Institutes
```http
GET /api/institutes/
Authorization: Bearer <super_admin_token>
```

**Response:**
```json
[
  {
    "id": "INST-001",
    "name": "MIT College",
    "plan": "Enterprise",
    "config": {}
  }
]
```

---

## 🏛 Departments

### Create Department
```http
POST /api/departments/
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "institute_id": "INST-001",
  "name": "Computer Science",
  "code": "CSE"
}
```

**Response:**
```json
{
  "id": "DEPT-001",
  "institute_id": "INST-001",
  "name": "Computer Science",
  "code": "CSE"
}
```

---

### List Departments
```http
GET /api/departments/
Authorization: Bearer <admin_token>
```

**Query Parameters:** None

**Response:**
```json
[
  {
    "id": "DEPT-001",
    "institute_id": "INST-001",
    "name": "Computer Science",
    "code": "CSE"
  }
]
```

---

## 👥 Batches

### Create Batch
```http
POST /api/batches/
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "institute_id": "INST-001",
  "department_id": "DEPT-001",
  "batch_year": 2024,
  "name": "CS 2024-A"
}
```

**Response:**
```json
{
  "id": "BATCH-001",
  "institute_id": "INST-001",
  "department_id": "DEPT-001",
  "batch_year": 2024,
  "name": "CS 2024-A",
  "members": []
}
```

---

### List Batches
```http
GET /api/batches/
Authorization: Bearer <admin_token>
```

**Response:**
```json
[
  {
    "id": "BATCH-001",
    "institute_id": "INST-001",
    "department_id": "DEPT-001",
    "batch_year": 2024,
    "name": "CS 2024-A",
    "members": ["STU-001", "STU-002"]
  }
]
```

---

### Add Members to Batch
```http
POST /api/batches/{batch_id}/members
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "student_ids": ["STU-003", "STU-004"]
}
```

---

## 📝 Exams

### Create Exam
```http
POST /api/exams/
Authorization: Bearer <exam_admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "department_id": "DEPT-001",
  "title": "Data Structures Midterm",
  "duration": 60,
  "start_time": "2024-02-25T10:00:00Z",
  "end_time": "2024-02-25T12:00:00Z",
  "proctor_config": {
    "face_detection": true,
    "tab_switching": true
  },
  "random_rules": {}
}
```

**Response:**
```json
{
  "id": "EXAM-001",
  "institute_id": "INST-001",
  "department_id": "DEPT-001",
  "title": "Data Structures Midterm",
  "duration": 60,
  "start_time": "2024-02-25T10:00:00Z",
  "end_time": "2024-02-25T12:00:00Z",
  "proctor_config": {
    "face_detection": true,
    "tab_switching": true
  },
  "random_rules": {}
}
```

---

### List Exams
```http
GET /api/exams/
Authorization: Bearer <token>
```

**Response:** (Filtered based on user role and permissions)
```json
[
  {
    "id": "EXAM-001",
    "title": "Data Structures Midterm",
    "duration": 60,
    "department_id": "DEPT-001"
  }
]
```

---

## ❓ Questions

### Create Question
```http
POST /api/questions/
Authorization: Bearer <exam_admin_token>
Content-Type: application/json
```

**MCQ Example:**
```json
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
```

**Descriptive Example:**
```json
{
  "exam_id": "EXAM-001",
  "type": "Descriptive",
  "text": "Explain the concept of polymorphism in OOP.",
  "marks": 5,
  "data": {}
}
```

**Response:**
```json
{
  "id": "e7f8g9h0-i1j2-k3l4-m5n6-o7p8q9r0s1t2",
  "exam_id": "EXAM-001",
  "type": "MCQ",
  "text": "What is the time complexity of binary search?",
  "marks": 1,
  "data": {
    "options": ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
    "correct_answer": "O(log n)"
  }
}
```

---

### List All Questions
```http
GET /api/questions/
Authorization: Bearer <exam_admin_token>
```

**Response:**
```json
[
  {
    "id": "uuid-1",
    "exam_id": "EXAM-001",
    "type": "MCQ",
    "text": "Question text...",
    "marks": 1,
    "data": {}
  }
]
```

---

### Get Questions for Exam
```http
GET /api/questions/exam/{exam_id}
Authorization: Bearer <token>
```

**Path Parameters:**
- `exam_id`: Exam ID

**Response:**
```json
[
  {
    "id": "uuid-1",
    "exam_id": "EXAM-001",
    "type": "MCQ",
    "text": "What is the time complexity of binary search?",
    "marks": 1,
    "data": {
      "options": ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
      "correct_answer": "O(log n)"
    }
  }
]
```

---

## 📌 Assignments

### Create Assignment
```http
POST /api/assignments/
Authorization: Bearer <exam_admin_token>
Content-Type: application/json
```

**Assign to Batch:**
```json
{
  "exam_id": "EXAM-001",
  "batch_id": "BATCH-001"
}
```

**Assign to Individual Student:**
```json
{
  "exam_id": "EXAM-001",
  "student_id": "STU-001"
}
```

**Response:**
```json
{
  "id": "ASSIGN-001",
  "exam_id": "EXAM-001",
  "batch_id": "BATCH-001",
  "student_id": null
}
```

---

### List Assignments
```http
GET /api/assignments/
Authorization: Bearer <exam_admin_token>
```

**Response:**
```json
[
  {
    "id": "ASSIGN-001",
    "exam_id": "EXAM-001",
    "batch_id": "BATCH-001",
    "student_id": null
  }
]
```

---

### Get Student's Assignments
```http
GET /api/assignments/me
Authorization: Bearer <student_token>
```

**Response:**
```json
[
  {
    "id": "ASSIGN-001",
    "exam_id": "EXAM-001",
    "exam": {
      "id": "EXAM-001",
      "title": "Data Structures Midterm",
      "duration": 60,
      "start_time": "2024-02-25T10:00:00Z"
    }
  }
]
```

---

## 📊 Sessions (Exam Attempts)

### Create/Submit Session
```http
POST /api/sessions/
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "student_id": "STU-001",
  "exam_id": "EXAM-001",
  "score": 85,
  "integrity": 90,
  "status": "submitted"
}
```

**Response:**
```json
{
  "id": "STU-001-EX001",
  "student_id": "STU-001",
  "exam_id": "EXAM-001",
  "status": "submitted",
  "score": 85,
  "integrity": 90
}
```

---

### List All Sessions
```http
GET /api/sessions/
Authorization: Bearer <admin_token>
```

**Response:**
```json
[
  {
    "id": "STU-001-EX001",
    "student_id": "STU-001",
    "exam_id": "EXAM-001",
    "status": "submitted",
    "score": 85,
    "integrity": 90
  }
]
```

---

### Get Student's Sessions
```http
GET /api/sessions/me
Authorization: Bearer <student_token>
```

**Response:**
```json
[
  {
    "id": "STU-001-EX001",
    "student_id": "STU-001",
    "exam_id": "EXAM-001",
    "status": "submitted",
    "score": 85,
    "integrity": 90
  }
]
```

---

### Get Sessions for Exam
```http
GET /api/sessions/exam/{exam_id}
Authorization: Bearer <admin_token>
```

**Path Parameters:**
- `exam_id`: Exam ID

**Response:**
```json
[
  {
    "id": "STU-001-EX001",
    "student_id": "STU-001",
    "exam_id": "EXAM-001",
    "status": "submitted",
    "score": 85,
    "integrity": 90
  }
]
```

---

### Get Sessions with Student Details
```http
GET /api/sessions/exam/{exam_id}/details
Authorization: Bearer <admin_token>
```

**Response:**
```json
[
  {
    "id": "STU-001-EX001",
    "student_id": "STU-001",
    "student_email": "student@college.edu",
    "student_name": "student",
    "exam_id": "EXAM-001",
    "status": "submitted",
    "score": 85,
    "integrity": 90
  }
]
```

---

## 👤 Users

### List All Users
```http
GET /api/users/
Authorization: Bearer <admin_token>
```

**Response:**
```json
[
  {
    "id": "ADMIN-001",
    "email": "admin@test.com",
    "role": "super_admin",
    "type": "admin"
  },
  {
    "id": "STU-001",
    "email": "student@college.edu",
    "role": "student",
    "type": "student",
    "batch_id": "BATCH-001"
  }
]
```

---

## 🔑 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 📝 Data Structures

### Question Types

**MCQ:**
```json
{
  "type": "MCQ",
  "data": {
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option B"
  }
}
```

**Descriptive:**
```json
{
  "type": "Descriptive",
  "data": {}
}
```

**Coding:**
```json
{
  "type": "Coding",
  "data": {
    "language": "python",
    "starter_code": "def solution():\n    pass",
    "test_cases": []
  }
}
```

---

### Session Status

- `ongoing` - Exam in progress
- `submitted` - Exam completed
- `disqualified` - Student disqualified due to violations

---

### User Roles

- `super_admin` - Full system access
- `institute_admin` - Manage institute
- `exam_admin` - Create/manage exams
- `proctor` - Monitor exams
- `student` - Take exams

---

## 🧪 Testing Examples

### Using curl

```bash
# Login
curl -X POST http://localhost:8000/api/login \
  -F "email=student@test.com" \
  -F "password=password123" \
  -F "role=student"

# Get assigned exams (with token)
curl -X GET http://localhost:8000/api/assignments/me \
  -H "Authorization: Bearer eyJhbGc..."

# Submit exam session
curl -X POST http://localhost:8000/api/sessions/ \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU-001",
    "exam_id": "EXAM-001",
    "score": 85,
    "integrity": 90,
    "status": "submitted"
  }'
```

---

### Using JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get assigned exams
const { data } = await api.get('/assignments/me');

// Submit session
await api.post('/sessions/', {
  student_id: 'STU-001',
  exam_id: 'EXAM-001',
  score: 85,
  integrity: 90,
  status: 'submitted'
});
```

---

**For more details, see:** [DEVELOPER_DOCUMENTATION.md](./DEVELOPER_DOCUMENTATION.md)
