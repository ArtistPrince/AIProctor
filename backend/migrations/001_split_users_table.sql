-- Migration: Split monolithic users table into admins and students tables
-- This migration backs up existing user data and partitions it into role-specific tables
-- Preserves all timestamps and audit trails

-- Step 0: Drop existing tables if they exist (to ensure clean state)
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- Step 1: Create admins table
CREATE TABLE admins (
    id VARCHAR PRIMARY KEY,
    institute_id VARCHAR REFERENCES institutes(id),
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    profile_image VARCHAR NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (role = 'super_admin' OR institute_id IS NOT NULL)
);

-- Step 2: Create students table (requires batch_id)
CREATE TABLE students (
    id VARCHAR PRIMARY KEY,
    institute_id VARCHAR NOT NULL REFERENCES institutes(id),
    batch_id VARCHAR NOT NULL REFERENCES batches(id),
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    profile_image VARCHAR NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create backup of original users table (only if it still exists and backup doesn't)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_backup') THEN
        EXECUTE 'CREATE TABLE users_backup AS SELECT * FROM users';
    END IF;
END $$;

-- Step 4: Migrate admin-role users to admins table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        INSERT INTO admins (id, institute_id, email, password_hash, role, profile_image, created_at, updated_at)
        SELECT 
            u.id,
            u.institute_id,
            u.email,
            u.password_hash,
            u.role,
            u.profile_image,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM users u
        WHERE u.role IN ('proctor', 'exam_admin', 'institute_admin', 'super_admin')
          AND u.institute_id IS NOT NULL
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Step 5: Migrate student-role users to students table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        INSERT INTO students (id, institute_id, batch_id, email, password_hash, role, profile_image, created_at, updated_at)
        SELECT 
            u.id,
            u.institute_id,
            u.batch_id,
            u.email,
            u.password_hash,
            u.role,
            u.profile_image,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM users u
        WHERE u.role = 'student'
          AND u.institute_id IS NOT NULL
          AND u.batch_id IS NOT NULL
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Step 6: Log any student records with missing batch_id (for manual review)
DO $$
DECLARE
    missing_batch_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        SELECT COUNT(*) INTO missing_batch_count
        FROM users
        WHERE role = 'student' AND batch_id IS NULL;
        
        IF missing_batch_count > 0 THEN
            RAISE WARNING 'Found % student records with missing batch_id. These must be handled manually.', missing_batch_count;
        END IF;
    END IF;
END $$;

-- Step 6.5: Manually insert super_admin users (those without institute_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        INSERT INTO admins (id, institute_id, email, password_hash, role, profile_image, created_at, updated_at)
        SELECT 
            u.id,
            u.institute_id,
            u.email,
            u.password_hash,
            u.role,
            u.profile_image,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM users u
        WHERE u.role = 'super_admin'
          AND NOT EXISTS (SELECT 1 FROM admins WHERE admins.id = u.id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Step 6.6: Manually insert student users (those without batch_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        INSERT INTO admins (id, institute_id, email, password_hash, role, profile_image, created_at, updated_at)
        SELECT 
            u.id,
            u.institute_id,
            u.email,
            u.password_hash,
            u.role,
            u.profile_image,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM users u
        WHERE u.role = 'student'
          AND u.batch_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM admins WHERE admins.id = u.id)
          AND NOT EXISTS (SELECT 1 FROM students WHERE students.id = u.id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Step 7: Update exam_assignments to use student_id instead of user_id
-- First migrate the data
ALTER TABLE exam_assignments ADD COLUMN IF NOT EXISTS student_id VARCHAR;
UPDATE exam_assignments ea
SET student_id = ea.user_id
WHERE EXISTS (
    SELECT 1 FROM students s WHERE s.id = ea.user_id
);

-- Step 8: Update exam_sessions to use student_id instead of user_id
-- First migrate the data
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS student_id VARCHAR;
UPDATE exam_sessions es
SET student_id = es.user_id
WHERE EXISTS (
    SELECT 1 FROM students s WHERE s.id = es.user_id
);

-- Step 9: Remove old foreign key constraints
ALTER TABLE exam_assignments DROP CONSTRAINT IF EXISTS exam_assignments_user_id_fkey CASCADE;
ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_user_id_fkey CASCADE;

-- Step 10: Add new foreign key constraints
ALTER TABLE exam_assignments ADD CONSTRAINT exam_assignments_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE exam_sessions ADD CONSTRAINT exam_sessions_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Step 11: Remove old user_id columns from related tables
ALTER TABLE exam_assignments DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE exam_sessions DROP COLUMN IF EXISTS user_id CASCADE;

-- Step 12: Drop the original users table
DROP TABLE IF EXISTS users CASCADE;

-- Step 13: Create indexes for performance
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_institute_id ON admins(institute_id);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_institute_id ON students(institute_id);
CREATE INDEX idx_students_batch_id ON students(batch_id);

-- Step 14: Create indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_exam_assignments_student_id ON exam_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student_id ON exam_sessions(student_id);
