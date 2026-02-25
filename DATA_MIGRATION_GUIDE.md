# User Table Data Migration Guide

## Overview
This migration splits the monolithic `users` table into two role-specific tables:
- **admins**: For admin-type users (admin, proctor, exam_admin, institute_admin, super_admin)
- **students**: For student users

## Data Migration Process

### Step-by-Step Execution

The migration performs the following:

#### 1. **Create New Tables**
- Creates `admins` table with:
  - Primary key: `id` (VARCHAR)
  - Foreign key: `institute_id` (required)
  - All user credentials and profile fields
  - Timestamps (created_at, updated_at)

- Creates `students` table with:
  - Primary key: `id` (VARCHAR)
  - Foreign keys: `institute_id` (required) + `batch_id` (required)
  - All user credentials and profile fields
  - Timestamps (created_at, updated_at)

#### 2. **Backup Original Data**
- Creates `users_backup` table as a complete copy
- Preserves all original data for rollback if needed

#### 3. **Migrate Admin-Role Users**
Condition: `role IN ('admin', 'proctor', 'exam_admin', 'institute_admin', 'super_admin')`
- Must have non-null `institute_id`
- Preserves original `created_at` and `updated_at` timestamps
- Copies: id, institute_id, email, password_hash, role, profile_image

Example data flow:
```
users table:
id=ADMIN-001, role=institute_admin, institute_id=INST-001
    ↓
admins table:
id=ADMIN-001, role=institute_admin, institute_id=INST-001
```

#### 4. **Migrate Student-Role Users**
Condition: `role = 'student'`
- Must have BOTH non-null `institute_id` AND `batch_id`
- Preserves original timestamps
- Copies: id, institute_id, batch_id, email, password_hash, role, profile_image

Example data flow:
```
users table:
id=STU-001, role=student, institute_id=INST-001, batch_id=CSE-24-01
    ↓
students table:
id=STU-001, institute_id=INST-001, batch_id=CSE-24-01, role=student
```

#### 5. **Migrate Related Data**
Updates foreign key references:
- `exam_assignments.user_id` → `exam_assignments.student_id`
- `exam_sessions.user_id` → `exam_sessions.student_id`

#### 6. **Data Validation & Error Handling**

**Students Checked:**
```sql
-- Must have both institute_id and batch_id
INSERT INTO students (...)
WHERE role = 'student'
  AND institute_id IS NOT NULL
  AND batch_id IS NOT NULL
```

**Warning System:**
- If students exist with NULL batch_id, a warning is logged
- These records cannot be auto-migrated (requires manual intervention)
- The warning shows count: "Found X student records with missing batch_id"

#### 7. **Cleanup & Optimization**
- Removes old foreign key constraints safely
- Adds new constraints for referential integrity
- Creates performance indexes on:
  - `admins(email, institute_id)`
  - `students(email, institute_id, batch_id)`
  - `exam_assignments(student_id)`
  - `exam_sessions(student_id)`

## Data Integrity Checks

### Before Migration
Run this to verify data consistency:
```sql
-- Check for admins with NULL institute_id
SELECT COUNT(*) FROM users 
WHERE role IN ('admin', 'proctor', 'exam_admin', 'institute_admin', 'super_admin') 
AND institute_id IS NULL;

-- Check for students with NULL batch_id
SELECT COUNT(*) FROM users 
WHERE role = 'student' AND batch_id IS NULL;

-- Check for students with NULL institute_id
SELECT COUNT(*) FROM users 
WHERE role = 'student' AND institute_id IS NULL;
```

### After Migration
Verify data was migrated:
```sql
-- Verify admin count
SELECT COUNT(*) FROM admins;

-- Verify student count
SELECT COUNT(*) FROM students;

-- Verify no duplicates
SELECT COUNT(*) FROM 
  (SELECT * FROM users_backup 
   WHERE role IN ('admin', 'proctor', 'exam_admin', 'institute_admin', 'super_admin'))
WHERE NOT EXISTS (SELECT 1 FROM admins a WHERE a.id = users_backup.id);
```

## Timestamp Preservation

The migration preserves original timestamps:
```sql
-- If created_at exists in users table, use it
-- Otherwise use CURRENT_TIMESTAMP
COALESCE(u.created_at, CURRENT_TIMESTAMP) as created_at
```

This ensures audit trails remain intact.

## Custom Role Mapping

If your users table has custom roles, update the migration WHERE clauses:

```sql
-- Current mapping:
-- ADMINS: admin, proctor, exam_admin, institute_admin, super_admin
-- STUDENTS: student

-- If you have other roles, add them:
WHERE role IN ('admin', 'proctor', 'exam_admin', 'institute_admin', 'super_admin', 'your_custom_role')
```

## Rollback Procedure

If the migration fails or causes issues:

### Quick Rollback
```sql
-- Drop new tables
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- Get back to using users_backup
-- Option 1: Recreate users from backup
CREATE TABLE users AS SELECT * FROM users_backup;

-- Option 2: Keep and analyze
SELECT * FROM users_backup;
```

### Full Rollback with Git
```bash
cd backend
git checkout HEAD~1 -- app/models.py app/schemas.py app/routers/ app/security.py
git checkout HEAD~1 -- migrations/001_split_users_table.sql
npm run dev  # or uvicorn app.main:app --reload
```

## Running the Migration

### On Supabase
```bash
# Via SQL Editor
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Copy entire migration SQL
5. Execute
6. Monitor for warnings about missing batch_ids
```

### Via Command Line (if local PostgreSQL)
```bash
psql -d your_database_name -f migrations/001_split_users_table.sql
```

### Verify Success
```sql
-- Check table sizes
SELECT COUNT(*) as admin_count FROM admins;
SELECT COUNT(*) as student_count FROM students;

-- Check all data accounted for
SELECT COUNT(*) FROM users_backup
WHERE id NOT IN (SELECT id FROM admins UNION SELECT id FROM students);
-- Should return 0 (all data migrated)

-- Check new constraints
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name IN ('exam_assignments', 'exam_sessions');
```

## Manual Data Fixes (If Needed)

### For Students Missing batch_id
```sql
-- Find affected students
SELECT id, email, role FROM users_backup 
WHERE role = 'student' AND batch_id IS NULL;

-- Option 1: Assign to a batch
UPDATE users_backup SET batch_id = 'BATCH-ID-HERE' WHERE id = 'STUDENT-ID';

-- Option 2: Change role to admin (if appropriate)
UPDATE users_backup SET role = 'proctor' WHERE id = 'STUDENT-ID';

-- Then re-run migration
INSERT INTO students (...) SELECT ... FROM users_backup ...;
```

## Performance Considerations

- Migration creates indexes on frequently queried columns
- New tables are smaller than monolithic users table
- Query performance improved due to schema-specific columns
- Foreign key lookups faster with dedicated indexes

## Application Impact

After migration, these endpoints change:

| Old Endpoint | New Data Source | Field Changes |
|---|---|---|
| POST /login | admins OR students | role param added |
| GET /me | admins OR students | batch_id may be None |
| POST /users | admins OR students | routed to correct table |
| GET /assignments/me | students FK | uses student_id |
| GET /sessions/me | students FK | uses student_id |

## Testing Checklist

- [ ] Backup created successfully
- [ ] All admins migrated correctly
- [ ] All students migrated correctly
- [ ] Foreign key constraints working
- [ ] No students left with NULL batch_id (or manually handled)
- [ ] Timestamps preserved
- [ ] Login works with role selector
- [ ] Exam assignments filtered correctly
- [ ] Exam sessions filtered correctly
- [ ] Indexing improves query speed

## Notes

- Migration is idempotent (safe to run multiple times with ON CONFLICT)
- Original users table kept in users_backup for audit
- All changes logged in migration history
- No data loss (complete backup preserved)
