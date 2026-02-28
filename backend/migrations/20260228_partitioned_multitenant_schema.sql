-- ==========================================
-- 0. TEARDOWN (DANGER ZONE: Wipes everything)
-- ==========================================

DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS users_backup CASCADE;

DROP TABLE IF EXISTS exam_sessions CASCADE;
DROP TABLE IF EXISTS exam_assignments CASCADE;
DROP TABLE IF EXISTS ques_ans CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS faculties CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS institute_admins CASCADE;
DROP TABLE IF EXISTS institutes CASCADE;
DROP TABLE IF EXISTS super_admins CASCADE;

DROP FUNCTION IF EXISTS generate_admin_code CASCADE;
DROP FUNCTION IF EXISTS generate_batch_code CASCADE;
DROP FUNCTION IF EXISTS generate_faculty_code CASCADE;
DROP FUNCTION IF EXISTS generate_student_code CASCADE;
DROP FUNCTION IF EXISTS generate_exam_code CASCADE;
DROP FUNCTION IF EXISTS generate_session_code CASCADE;


-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==========================================
-- 2. GLOBAL TABLES (Unpartitioned)
-- ==========================================

CREATE TABLE super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE institutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 3. TENANT TABLES (Partitioned by institute_id)
-- ==========================================

CREATE TABLE institute_admins (
    id UUID DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    emp_id VARCHAR(50) NOT NULL,
    admin_code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (institute_id, id),
    UNIQUE (institute_id, admin_code)
) PARTITION BY LIST (institute_id);

CREATE TABLE batches (
    id UUID DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    course_code VARCHAR(50) NOT NULL,
    batch_year VARCHAR(10) NOT NULL,
    batch_code VARCHAR(100),
    course_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (institute_id, id),
    UNIQUE (institute_id, batch_code)
) PARTITION BY LIST (institute_id);

CREATE TABLE faculties (
    id UUID DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    dept_code VARCHAR(50) NOT NULL,
    emp_id VARCHAR(50) NOT NULL,
    faculty_code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (institute_id, id),
    UNIQUE (institute_id, faculty_code)
) PARTITION BY LIST (institute_id);

CREATE TABLE students (
    id UUID DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL,
    section VARCHAR(10) NOT NULL,
    roll_no VARCHAR(50) NOT NULL,
    student_code VARCHAR(150),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (institute_id, id),
    UNIQUE (institute_id, student_code),
    FOREIGN KEY (institute_id, batch_id) REFERENCES batches(institute_id, id) ON DELETE CASCADE
) PARTITION BY LIST (institute_id);

CREATE TABLE exams (
    id UUID DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    exam_type VARCHAR(50) NOT NULL,
    exam_year VARCHAR(10) NOT NULL,
    exam_code VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    duration_minutes INT NOT NULL,
    passing_marks INT NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (institute_id, id),
    UNIQUE (institute_id, exam_code),
    FOREIGN KEY (institute_id, faculty_id) REFERENCES faculties(institute_id, id) ON DELETE CASCADE
) PARTITION BY LIST (institute_id);

CREATE TABLE ques_ans (
    id UUID DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    marks INT DEFAULT 1,
    PRIMARY KEY (institute_id, id),
    FOREIGN KEY (institute_id, exam_id) REFERENCES exams(institute_id, id) ON DELETE CASCADE
) PARTITION BY LIST (institute_id);

CREATE TABLE exam_assignments (
    id UUID DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (institute_id, id),
    FOREIGN KEY (institute_id, exam_id) REFERENCES exams(institute_id, id) ON DELETE CASCADE,
    FOREIGN KEY (institute_id, batch_id) REFERENCES batches(institute_id, id) ON DELETE CASCADE
) PARTITION BY LIST (institute_id);

CREATE TABLE exam_sessions (
    id UUID DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL,
    student_id UUID NOT NULL,
    session_code VARCHAR(255),
    session_status VARCHAR(50) DEFAULT 'not_started',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    final_score INT,
    violation_found BOOLEAN DEFAULT FALSE,
    mongo_log_ref VARCHAR(255),
    s3_media_prefix VARCHAR(255),
    PRIMARY KEY (institute_id, id),
    UNIQUE (institute_id, session_code),
    FOREIGN KEY (institute_id, exam_id) REFERENCES exams(institute_id, id) ON DELETE CASCADE,
    FOREIGN KEY (institute_id, student_id) REFERENCES students(institute_id, id) ON DELETE CASCADE
) PARTITION BY LIST (institute_id);


-- ==========================================
-- 4. AUTOMATION FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION generate_admin_code() RETURNS TRIGGER AS $$
DECLARE
    inst_code VARCHAR(50);
BEGIN
    SELECT institute_code INTO inst_code FROM institutes WHERE id = NEW.institute_id;
    NEW.admin_code := inst_code || '-ADMIN-' || UPPER(NEW.emp_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_batch_code() RETURNS TRIGGER AS $$
DECLARE
    inst_code VARCHAR(50);
BEGIN
    SELECT institute_code INTO inst_code FROM institutes WHERE id = NEW.institute_id;
    NEW.batch_code := inst_code || '-' || UPPER(NEW.course_code) || '-' || NEW.batch_year;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_faculty_code() RETURNS TRIGGER AS $$
DECLARE
    inst_code VARCHAR(50);
BEGIN
    SELECT institute_code INTO inst_code FROM institutes WHERE id = NEW.institute_id;
    NEW.faculty_code := inst_code || '-FAC-' || UPPER(NEW.dept_code) || '-' || UPPER(NEW.emp_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_student_code() RETURNS TRIGGER AS $$
DECLARE
    b_code VARCHAR(100);
BEGIN
    SELECT batch_code INTO b_code FROM batches WHERE id = NEW.batch_id AND institute_id = NEW.institute_id;
    NEW.student_code := b_code || '-' || UPPER(NEW.section) || '-' || UPPER(NEW.roll_no);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_exam_code() RETURNS TRIGGER AS $$
DECLARE
    inst_code VARCHAR(50);
BEGIN
    SELECT institute_code INTO inst_code FROM institutes WHERE id = NEW.institute_id;
    NEW.exam_code := inst_code || '-' || UPPER(NEW.subject_code) || '-' || UPPER(NEW.exam_type) || '-' || NEW.exam_year;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_session_code() RETURNS TRIGGER AS $$
DECLARE
    s_code VARCHAR(150);
    e_code VARCHAR(100);
BEGIN
    SELECT student_code INTO s_code FROM students WHERE id = NEW.student_id AND institute_id = NEW.institute_id;
    SELECT exam_code INTO e_code FROM exams WHERE id = NEW.exam_id AND institute_id = NEW.institute_id;
    NEW.session_code := s_code || '-' || e_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- 5. TRIGGERS
-- ==========================================

CREATE TRIGGER trigger_set_admin_code
BEFORE INSERT OR UPDATE OF emp_id ON institute_admins
FOR EACH ROW EXECUTE FUNCTION generate_admin_code();

CREATE TRIGGER trigger_set_batch_code
BEFORE INSERT OR UPDATE OF course_code, batch_year ON batches
FOR EACH ROW EXECUTE FUNCTION generate_batch_code();

CREATE TRIGGER trigger_set_faculty_code
BEFORE INSERT OR UPDATE OF dept_code, emp_id ON faculties
FOR EACH ROW EXECUTE FUNCTION generate_faculty_code();

CREATE TRIGGER trigger_set_student_code
BEFORE INSERT OR UPDATE OF section, roll_no, batch_id ON students
FOR EACH ROW EXECUTE FUNCTION generate_student_code();

CREATE TRIGGER trigger_set_exam_code
BEFORE INSERT OR UPDATE OF subject_code, exam_type, exam_year ON exams
FOR EACH ROW EXECUTE FUNCTION generate_exam_code();

CREATE TRIGGER trigger_set_session_code
BEFORE INSERT OR UPDATE OF student_id, exam_id ON exam_sessions
FOR EACH ROW EXECUTE FUNCTION generate_session_code();


-- ==========================================
-- 6. INDEXES
-- ==========================================

CREATE INDEX idx_admins_code ON institute_admins (institute_id, admin_code);
CREATE INDEX idx_batches_code ON batches (institute_id, batch_code);
CREATE INDEX idx_faculties_code ON faculties (institute_id, faculty_code);
CREATE INDEX idx_students_code ON students (institute_id, student_code);
CREATE INDEX idx_exams_code ON exams (institute_id, exam_code);
CREATE INDEX idx_sessions_code ON exam_sessions (institute_id, session_code);
