-- Promote contextual key to real PK id (string) on core entities
-- This makes id itself equal to your business key format.

BEGIN;

-- Drop FK constraints first
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_institute_id_fkey;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_batch_id_fkey;
ALTER TABLE IF EXISTS departments DROP CONSTRAINT IF EXISTS departments_institute_id_fkey;
ALTER TABLE IF EXISTS batches DROP CONSTRAINT IF EXISTS batches_institute_id_fkey;
ALTER TABLE IF EXISTS batches DROP CONSTRAINT IF EXISTS batches_department_id_fkey;
ALTER TABLE IF EXISTS exams DROP CONSTRAINT IF EXISTS exams_institute_id_fkey;
ALTER TABLE IF EXISTS exams DROP CONSTRAINT IF EXISTS exams_department_id_fkey;
ALTER TABLE IF EXISTS questions DROP CONSTRAINT IF EXISTS questions_exam_id_fkey;
ALTER TABLE IF EXISTS exam_assignments DROP CONSTRAINT IF EXISTS exam_assignments_exam_id_fkey;
ALTER TABLE IF EXISTS exam_assignments DROP CONSTRAINT IF EXISTS exam_assignments_batch_id_fkey;
ALTER TABLE IF EXISTS exam_assignments DROP CONSTRAINT IF EXISTS exam_assignments_user_id_fkey;
ALTER TABLE IF EXISTS exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_user_id_fkey;
ALTER TABLE IF EXISTS exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_fkey;

-- staged textual columns
ALTER TABLE institutes ADD COLUMN IF NOT EXISTS id_new VARCHAR(128);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS id_new VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_new VARCHAR(128);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS id_new VARCHAR(128);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS id_new VARCHAR(128);
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS id_new VARCHAR(256);

ALTER TABLE users ADD COLUMN IF NOT EXISTS institute_id_new VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS batch_id_new VARCHAR(128);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS institute_id_new VARCHAR(128);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS institute_id_new VARCHAR(128);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS department_id_new VARCHAR(128);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS institute_id_new VARCHAR(128);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS department_id_new VARCHAR(128);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_id_new VARCHAR(128);
ALTER TABLE exam_assignments ADD COLUMN IF NOT EXISTS exam_id_new VARCHAR(128);
ALTER TABLE exam_assignments ADD COLUMN IF NOT EXISTS batch_id_new VARCHAR(128);
ALTER TABLE exam_assignments ADD COLUMN IF NOT EXISTS user_id_new VARCHAR(128);
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS user_id_new VARCHAR(128);
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS exam_id_new VARCHAR(128);

-- fill new PK from contextual keys
UPDATE institutes SET id_new = public_id WHERE id_new IS NULL;
UPDATE departments SET id_new = public_id WHERE id_new IS NULL;
UPDATE users SET id_new = public_id WHERE id_new IS NULL;
UPDATE batches SET id_new = public_id WHERE id_new IS NULL;
UPDATE exams SET id_new = public_id WHERE id_new IS NULL;
UPDATE exam_sessions SET id_new = public_id WHERE id_new IS NULL;

-- fill FK projections by joining old UUID ids
UPDATE users u SET institute_id_new = i.public_id FROM institutes i WHERE u.institute_id = i.id;
UPDATE users u SET batch_id_new = b.public_id FROM batches b WHERE u.batch_id = b.id;
UPDATE departments d SET institute_id_new = i.public_id FROM institutes i WHERE d.institute_id = i.id;
UPDATE batches b SET institute_id_new = i.public_id FROM institutes i WHERE b.institute_id = i.id;
UPDATE batches b SET department_id_new = d.public_id FROM departments d WHERE b.department_id = d.id;
UPDATE exams e SET institute_id_new = i.public_id FROM institutes i WHERE e.institute_id = i.id;
UPDATE exams e SET department_id_new = d.public_id FROM departments d WHERE e.department_id = d.id;
UPDATE questions q SET exam_id_new = e.public_id FROM exams e WHERE q.exam_id = e.id;
UPDATE exam_assignments ea SET exam_id_new = e.public_id FROM exams e WHERE ea.exam_id = e.id;
UPDATE exam_assignments ea SET batch_id_new = b.public_id FROM batches b WHERE ea.batch_id = b.id;
UPDATE exam_assignments ea SET user_id_new = u.public_id FROM users u WHERE ea.user_id = u.id;
UPDATE exam_sessions s SET user_id_new = u.public_id FROM users u WHERE s.user_id = u.id;
UPDATE exam_sessions s SET exam_id_new = e.public_id FROM exams e WHERE s.exam_id = e.id;

-- drop existing PK constraints
ALTER TABLE institutes DROP CONSTRAINT IF EXISTS institutes_pkey;
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_pkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_pkey;
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_pkey;
ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_pkey;

-- swap id columns: old UUID -> _uuid, id_new -> id
ALTER TABLE institutes RENAME COLUMN id TO id_uuid;
ALTER TABLE institutes RENAME COLUMN id_new TO id;

ALTER TABLE departments RENAME COLUMN id TO id_uuid;
ALTER TABLE departments RENAME COLUMN institute_id TO institute_id_uuid;
ALTER TABLE departments RENAME COLUMN id_new TO id;
ALTER TABLE departments RENAME COLUMN institute_id_new TO institute_id;

ALTER TABLE users RENAME COLUMN id TO id_uuid;
ALTER TABLE users RENAME COLUMN institute_id TO institute_id_uuid;
ALTER TABLE users RENAME COLUMN batch_id TO batch_id_uuid;
ALTER TABLE users RENAME COLUMN id_new TO id;
ALTER TABLE users RENAME COLUMN institute_id_new TO institute_id;
ALTER TABLE users RENAME COLUMN batch_id_new TO batch_id;

ALTER TABLE batches RENAME COLUMN id TO id_uuid;
ALTER TABLE batches RENAME COLUMN institute_id TO institute_id_uuid;
ALTER TABLE batches RENAME COLUMN department_id TO department_id_uuid;
ALTER TABLE batches RENAME COLUMN id_new TO id;
ALTER TABLE batches RENAME COLUMN institute_id_new TO institute_id;
ALTER TABLE batches RENAME COLUMN department_id_new TO department_id;

ALTER TABLE exams RENAME COLUMN id TO id_uuid;
ALTER TABLE exams RENAME COLUMN institute_id TO institute_id_uuid;
ALTER TABLE exams RENAME COLUMN department_id TO department_id_uuid;
ALTER TABLE exams RENAME COLUMN id_new TO id;
ALTER TABLE exams RENAME COLUMN institute_id_new TO institute_id;
ALTER TABLE exams RENAME COLUMN department_id_new TO department_id;

ALTER TABLE exam_sessions RENAME COLUMN id TO id_uuid;
ALTER TABLE exam_sessions RENAME COLUMN user_id TO user_id_uuid;
ALTER TABLE exam_sessions RENAME COLUMN exam_id TO exam_id_uuid;
ALTER TABLE exam_sessions RENAME COLUMN id_new TO id;
ALTER TABLE exam_sessions RENAME COLUMN user_id_new TO user_id;
ALTER TABLE exam_sessions RENAME COLUMN exam_id_new TO exam_id;

ALTER TABLE questions RENAME COLUMN exam_id TO exam_id_uuid;
ALTER TABLE questions RENAME COLUMN exam_id_new TO exam_id;

ALTER TABLE exam_assignments RENAME COLUMN exam_id TO exam_id_uuid;
ALTER TABLE exam_assignments RENAME COLUMN batch_id TO batch_id_uuid;
ALTER TABLE exam_assignments RENAME COLUMN user_id TO user_id_uuid;
ALTER TABLE exam_assignments RENAME COLUMN exam_id_new TO exam_id;
ALTER TABLE exam_assignments RENAME COLUMN batch_id_new TO batch_id;
ALTER TABLE exam_assignments RENAME COLUMN user_id_new TO user_id;

-- make textual ids not null and set PK
ALTER TABLE institutes ALTER COLUMN id SET NOT NULL;
ALTER TABLE departments ALTER COLUMN id SET NOT NULL;
ALTER TABLE users ALTER COLUMN id SET NOT NULL;
ALTER TABLE batches ALTER COLUMN id SET NOT NULL;
ALTER TABLE exams ALTER COLUMN id SET NOT NULL;
ALTER TABLE exam_sessions ALTER COLUMN id SET NOT NULL;

ALTER TABLE institutes ADD CONSTRAINT institutes_pkey PRIMARY KEY (id);
ALTER TABLE departments ADD CONSTRAINT departments_pkey PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE batches ADD CONSTRAINT batches_pkey PRIMARY KEY (id);
ALTER TABLE exams ADD CONSTRAINT exams_pkey PRIMARY KEY (id);
ALTER TABLE exam_sessions ADD CONSTRAINT exam_sessions_pkey PRIMARY KEY (id);

-- re-add FK constraints on new textual ids
ALTER TABLE departments
  ADD CONSTRAINT departments_institute_id_fkey FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE;

ALTER TABLE users
  ADD CONSTRAINT users_institute_id_fkey FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE SET NULL;

ALTER TABLE users
  ADD CONSTRAINT users_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;

ALTER TABLE batches
  ADD CONSTRAINT batches_institute_id_fkey FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE;

ALTER TABLE batches
  ADD CONSTRAINT batches_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;

ALTER TABLE exams
  ADD CONSTRAINT exams_institute_id_fkey FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE;

ALTER TABLE exams
  ADD CONSTRAINT exams_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;

ALTER TABLE questions
  ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;

ALTER TABLE exam_assignments
  ADD CONSTRAINT exam_assignments_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;

ALTER TABLE exam_assignments
  ADD CONSTRAINT exam_assignments_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;

ALTER TABLE exam_assignments
  ADD CONSTRAINT exam_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE exam_sessions
  ADD CONSTRAINT exam_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE exam_sessions
  ADD CONSTRAINT exam_sessions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;

-- remove redundant public_id (id now already stores contextual key)
ALTER TABLE institutes DROP COLUMN IF EXISTS public_id;
ALTER TABLE departments DROP COLUMN IF EXISTS public_id;
ALTER TABLE users DROP COLUMN IF EXISTS public_id;
ALTER TABLE batches DROP COLUMN IF EXISTS public_id;
ALTER TABLE exams DROP COLUMN IF EXISTS public_id;
ALTER TABLE exam_sessions DROP COLUMN IF EXISTS public_id;

-- drop uuid remnants to keep schema lean
ALTER TABLE institutes DROP COLUMN IF EXISTS id_uuid;
ALTER TABLE departments DROP COLUMN IF EXISTS id_uuid, DROP COLUMN IF EXISTS institute_id_uuid;
ALTER TABLE users DROP COLUMN IF EXISTS id_uuid, DROP COLUMN IF EXISTS institute_id_uuid, DROP COLUMN IF EXISTS batch_id_uuid;
ALTER TABLE batches DROP COLUMN IF EXISTS id_uuid, DROP COLUMN IF EXISTS institute_id_uuid, DROP COLUMN IF EXISTS department_id_uuid;
ALTER TABLE exams DROP COLUMN IF EXISTS id_uuid, DROP COLUMN IF EXISTS institute_id_uuid, DROP COLUMN IF EXISTS department_id_uuid;
ALTER TABLE exam_sessions DROP COLUMN IF EXISTS id_uuid, DROP COLUMN IF EXISTS user_id_uuid, DROP COLUMN IF EXISTS exam_id_uuid;
ALTER TABLE questions DROP COLUMN IF EXISTS exam_id_uuid;
ALTER TABLE exam_assignments DROP COLUMN IF EXISTS exam_id_uuid, DROP COLUMN IF EXISTS batch_id_uuid, DROP COLUMN IF EXISTS user_id_uuid;

COMMIT;
