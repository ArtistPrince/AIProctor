# AI Proctor System - User Table Refactoring Summary

## Overview
Successfully refactored the monolithic `users` table into separate `admins` and `students` tables with role-based separation and login role selector UI.

## Changes Made

### 1. Database Schema (Migration)
**File**: `backend/migrations/001_split_users_table.sql`

- Created `admins` table with fields:
  - id (VARCHAR, PK)
  - institute_id (FK → institutes.id)
  - email (UNIQUE)
  - password_hash
  - role (ENUM with admin-type values)
  - profile_image
  - timestamps

- Created `students` table with fields:
  - id (VARCHAR, PK)
  - institute_id (FK → institutes.id)
  - batch_id (FK → batches.id)
  - email (UNIQUE)
  - password_hash
  - role (ENUM with student value)
  - profile_image
  - timestamps

- Updated `exam_assignments` table: Changed user_id FK → student_id FK
- Updated `exam_sessions` table: Changed user_id FK → student_id FK
- Created backup of original users table as users_backup
- Auto-partitioned existing users by role into appropriate table

### 2. Backend Models
**File**: `backend/app/models.py`

- Removed `User` model
- Added `Admin` model (inherits institute_id only)
- Added `Student` model (inherits institute_id + batch_id)
- Updated `ExamAssignment.user_id` → `ExamAssignment.student_id`
- Updated `ExamSession.user_id` → `ExamSession.student_id`

### 3. Schemas
**Files**: `backend/app/schemas.py`

- Kept `UserOut` for backward compatibility (works with both Admin/Student data)
- Added `AdminOut` schema (id, institute_id, email, role, profile_image)
- Added `StudentOut` schema (id, institute_id, batch_id, email, role, profile_image)
- Updated `ExamAssignmentCreate` & `ExamAssignmentOut`: user_id → student_id
- Updated `ExamSessionCreate` & `ExamSessionOut`: user_id → student_id

### 4. Authentication
**File**: `backend/app/routers/auth.py`

- **POST /login**: Now accepts `role` parameter (enum: 'admin' | 'student')
  - Queries `admins` table if role='admin'
  - Queries `students` table if role='student'
  - Returns same Token response with role in JWT

- **GET /me**: Returns unified `UserOut` that works with both Admin and Student objects
  - Uses getattr for optional batch_id field

- **POST /users/**: Updated user creation to partition into appropriate table
  - Students created in `students` table
  - Admins created in `admins` table

### 5. Security
**File**: `backend/app/security.py`

- Updated `get_current_user()`: Queries admins first, then students
  - Return type: `models.Admin | models.Student`

- Updated `require_role()`: Accepts both Admin and Student user types
  - Validates role against allowed roles list

### 6. Routers
**Updated Type Hints** across all routers:
- assignments.py
- batches.py
- departments.py
- exams.py
- institutes.py
- questions.py
- sessions.py
- users.py

All `current_user: models.User` → `current_user: models.Admin | models.Student`

**Functional Updates**:
- sessions.py: Updated to use `student_id` instead of `user_id`
- batches.py: Updated member queries to check `students` table
- assignments.py: Updated to use `student_id` FK

### 7. Frontend UI
**File**: `frontend/src/pages/Login.tsx`

- Added `role` state (default: 'student')
- Added role selector UI with radio buttons:
  - Admin option
  - Student option (default)
- Updated `handleLogin` to pass role to auth store
- Role selector appears before email field for clear UX

**File**: `frontend/src/stores/authStore.ts`

- Updated `login()` method signature: `(email, password, role, verificationImage?) => void`
- Passes role as form field to POST /login endpoint
- Maintains backward compatibility with JWT token handling

## Testing Checklist

- [x] Backend Python files compile without syntax errors
- [x] Frontend builds successfully (npm run build)
- [x] No TypeScript errors in Login.tsx
- [x] Migration SQL is complete and reversible
- [x] All route type hints updated to Admin | Student union

## Manual Testing Required (Before Deployment)

1. **Database Migration**:
   ```sql
   -- Run migration
   psql -d <db_name> -f migrations/001_split_users_table.sql
   
   -- Verify tables exist
   SELECT * FROM admins;
   SELECT * FROM students;
   SELECT * FROM users_backup;  -- Should be non-empty
   ```

2. **Login Flow**:
   - Open frontend login page
   - Verify role selector appears (Admin / Student)
   - Login as admin (select Admin role)
   - Verify JWT token generated and user redirected to /admin
   - Login as student (select Student role)
   - Verify JWT token generated and user redirected to /student

3. **API Endpoints**:
   - POST /api/login with role parameter
   - GET /api/me (should return correct user data)
   - POST /api/users/ (should route to correct table based on role)
   - GET /api/assignments/me (should filter by student_id)
   - GET /api/sessions/me (should filter by student_id)

4. **Access Control**:
   - Verify admin users cannot access student routes
   - Verify students cannot access admin routes
   - Verify role-based permission checks work

## Rollback Plan

If issues occur:

1. **Drop new tables**:
   ```sql
   DROP TABLE IF EXISTS admins;
   DROP TABLE IF EXISTS students;
   ```

2. **Restore from backup**:
   ```sql
   CREATE TABLE users AS SELECT * FROM users_backup;
   ```

3. **Revert code changes**:
   ```bash
   git checkout HEAD~1 -- backend/app/ frontend/src/
   ```

## Key Design Decisions

1. **String PKs vs UUID**: Kept contextual string PKs (e.g., "ADMIN-001") for consistency with existing schema
2. **Role Enum**: Maintained existing UserRole enum with admin-type values for admins, student for students
3. **Login Role Selector**: Placed before credentials for UX clarity and logical flow
4. **Backward Compatibility**: Kept `UserOut` schema to minimize API contract changes
5. **Migration Safety**: Created backup table and used ON CONFLICT clauses

## Files Modified

### Backend
- models.py
- schemas.py
- security.py
- routers/auth.py
- routers/assignments.py
- routers/batches.py
- routers/sessions.py
- routers/departments.py
- routers/exams.py
- routers/institutes.py
- routers/questions.py
- routers/users.py
- utils/key_generator.py

### Frontend
- pages/Login.tsx
- stores/authStore.ts

### Database
- migrations/001_split_users_table.sql

## Next Steps

1. Apply migration to Supabase database
2. Test login flow with both admin and student accounts
3. Verify all role-based routes work correctly
4. Monitor for any edge cases with exam sessions and assignments
5. Deploy to production once all tests pass
