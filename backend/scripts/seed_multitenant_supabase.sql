BEGIN;

-- =========================================================
-- Schema alignment patch (safe if already applied)
-- =========================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE SCHEMA IF NOT EXISTS tenant_partitions;

ALTER TABLE IF EXISTS public.exams
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.exam_sessions
ADD COLUMN IF NOT EXISTS violation_logs_id VARCHAR,
ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

-- =========================================================
-- Deterministic reset for target institutes only
-- =========================================================
DO $$
DECLARE
    sch TEXT;
    inst TEXT;
    base TEXT;
    inst_id UUID;
    uuid_suffix TEXT;
BEGIN
    -- Drop known seed partition tables from possible schemas
    FOR sch IN SELECT unnest(ARRAY['public', 'tenant_partition', 'tenant_partitions'])
    LOOP
        FOR inst IN SELECT unnest(ARRAY['nova01','pine02','aurm03','susp04','rivr05'])
        LOOP
            FOR base IN SELECT unnest(ARRAY[
                'exam_sessions',
                'exam_assignments',
                'ques_ans',
                'students',
                'exams',
                'faculties',
                'batches',
                'institute_admins'
            ])
            LOOP
                EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', sch, base || '_' || inst);
            END LOOP;
        END LOOP;
    END LOOP;

    -- Drop canonical UUID-suffixed partition tables for existing target institutes
    FOR sch IN SELECT unnest(ARRAY['public', 'tenant_partition', 'tenant_partitions'])
    LOOP
        FOR inst_id IN
            SELECT id
            FROM public.institutes
            WHERE institute_code IN ('NOVA01', 'PINE02', 'AURM03', 'SUSP04', 'RIVR05')
        LOOP
            uuid_suffix := replace(lower(inst_id::text), '-', '_');
            FOR base IN SELECT unnest(ARRAY[
                'exam_sessions',
                'exam_assignments',
                'ques_ans',
                'students',
                'exams',
                'faculties',
                'batches',
                'institute_admins'
            ])
            LOOP
                EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', sch, base || '_' || uuid_suffix);
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Remove previously seeded demo rows for strict counts
DELETE FROM public.super_admins
WHERE email = 'superadmin@aiproctor.dev';

DELETE FROM public.institutes
WHERE institute_code IN ('NOVA01', 'PINE02', 'AURM03', 'SUSP04', 'RIVR05');

-- =========================================================
-- 1) super_admins (exactly 1)
-- =========================================================
INSERT INTO public.super_admins (email, password_hash, created_at)
VALUES ('superadmin@aiproctor.dev', '$2b$12$SuperAdminSeedHashValue', NOW());

-- =========================================================
-- 2) institutes (exactly 5)
-- =========================================================
INSERT INTO public.institutes (institute_code, name, address, contact_email, created_at)
VALUES
('NOVA01', 'Nova Institute of Technology', 'North Campus, City A', 'contact@nova01.edu', NOW() - INTERVAL '120 days'),
('PINE02', 'Pine Valley University', 'West Campus, City B', 'contact@pine02.edu', NOW() - INTERVAL '110 days'),
('AURM03', 'Aurum School of Business & Engineering', 'Central Campus, City C', 'contact@aurm03.edu', NOW() - INTERVAL '100 days'),
('SUSP04', 'Demo Suspended Institute (Simulation)', 'Demo Campus, City D', 'contact@susp04.edu', NOW() - INTERVAL '90 days'),
('RIVR05', 'Riverdale College', 'East Campus, City E', 'contact@rivr05.edu', NOW() - INTERVAL '80 days');

-- =========================================================
-- 3) partitions in tenant_partitions schema
-- =========================================================
DO $$
DECLARE
    inst RECORD;
    suffix TEXT;
BEGIN
    FOR inst IN
        SELECT id
        FROM public.institutes
        WHERE institute_code IN ('NOVA01', 'PINE02', 'AURM03', 'SUSP04', 'RIVR05')
        ORDER BY institute_code
    LOOP
        suffix := replace(lower(inst.id::text), '-', '_');
        EXECUTE format('CREATE TABLE IF NOT EXISTS tenant_partitions.%I PARTITION OF public.institute_admins FOR VALUES IN (%L)', 'institute_admins_' || suffix, inst.id);
        EXECUTE format('CREATE TABLE IF NOT EXISTS tenant_partitions.%I PARTITION OF public.batches FOR VALUES IN (%L)', 'batches_' || suffix, inst.id);
        EXECUTE format('CREATE TABLE IF NOT EXISTS tenant_partitions.%I PARTITION OF public.faculties FOR VALUES IN (%L)', 'faculties_' || suffix, inst.id);
        EXECUTE format('CREATE TABLE IF NOT EXISTS tenant_partitions.%I PARTITION OF public.students FOR VALUES IN (%L)', 'students_' || suffix, inst.id);
        EXECUTE format('CREATE TABLE IF NOT EXISTS tenant_partitions.%I PARTITION OF public.exams FOR VALUES IN (%L)', 'exams_' || suffix, inst.id);
        EXECUTE format('CREATE TABLE IF NOT EXISTS tenant_partitions.%I PARTITION OF public.ques_ans FOR VALUES IN (%L)', 'ques_ans_' || suffix, inst.id);
        EXECUTE format('CREATE TABLE IF NOT EXISTS tenant_partitions.%I PARTITION OF public.exam_assignments FOR VALUES IN (%L)', 'exam_assignments_' || suffix, inst.id);
        EXECUTE format('CREATE TABLE IF NOT EXISTS tenant_partitions.%I PARTITION OF public.exam_sessions FOR VALUES IN (%L)', 'exam_sessions_' || suffix, inst.id);
    END LOOP;
END $$;

-- =========================================================
-- 4..11) tenant seed in strict order
-- =========================================================
DO $$
DECLARE
    inst RECORD;

    btech_batch_id UUID;
    mba_batch_id UUID;

    fac_cs_id UUID;
    fac_ee_id UUID;
    fac_mba_id UUID;

    stu1_id UUID;
    stu2_id UUID;
    stu3_id UUID;
    stu4_id UUID;
    stu5_id UUID;

    exam_upcoming_id UUID;
    exam_live_id UUID;
    exam_completed_id UUID;

    qn INT;
BEGIN
    FOR inst IN
        SELECT id, institute_code
        FROM public.institutes
        WHERE institute_code IN ('NOVA01', 'PINE02', 'AURM03', 'SUSP04', 'RIVR05')
        ORDER BY institute_code
    LOOP
        -- 4) institute_admins
        INSERT INTO public.institute_admins (
            institute_id, emp_id, name, email, password_hash, created_at
        ) VALUES (
            inst.id,
            '01',
            inst.institute_code || ' Institute Admin',
            LOWER(inst.institute_code) || '.admin@seed.edu',
            '$2b$12$InstituteAdminSeedHashValue',
            NOW() - INTERVAL '30 days'
        );

        -- 5) batches
        INSERT INTO public.batches (institute_id, course_code, batch_year, course_name, created_at)
        VALUES (inst.id, 'BTECH', '23', 'Bachelor of Technology', NOW() - INTERVAL '25 days')
        RETURNING id INTO btech_batch_id;

        INSERT INTO public.batches (institute_id, course_code, batch_year, course_name, created_at)
        VALUES (inst.id, 'MBA', '24', 'Master of Business Administration', NOW() - INTERVAL '24 days')
        RETURNING id INTO mba_batch_id;

        -- 6) faculties
        INSERT INTO public.faculties (institute_id, dept_code, emp_id, name, email, password_hash, created_at)
        VALUES (
            inst.id, 'CS', 'CS01',
            inst.institute_code || ' Faculty CS',
            LOWER(inst.institute_code) || '.fac.cs@seed.edu',
            '$2b$12$FacultySeedHashValue',
            NOW() - INTERVAL '20 days'
        ) RETURNING id INTO fac_cs_id;

        INSERT INTO public.faculties (institute_id, dept_code, emp_id, name, email, password_hash, created_at)
        VALUES (
            inst.id, 'EE', 'EE02',
            inst.institute_code || ' Faculty EE',
            LOWER(inst.institute_code) || '.fac.ee@seed.edu',
            '$2b$12$FacultySeedHashValue',
            NOW() - INTERVAL '19 days'
        ) RETURNING id INTO fac_ee_id;

        INSERT INTO public.faculties (institute_id, dept_code, emp_id, name, email, password_hash, created_at)
        VALUES (
            inst.id, 'MBA', 'MBA03',
            inst.institute_code || ' Faculty MBA',
            LOWER(inst.institute_code) || '.fac.mba@seed.edu',
            '$2b$12$FacultySeedHashValue',
            NOW() - INTERVAL '18 days'
        ) RETURNING id INTO fac_mba_id;

        -- 7) students (Indian names)
        INSERT INTO public.students (institute_id, batch_id, section, roll_no, name, email, password_hash, created_at)
        VALUES (
            inst.id, btech_batch_id, 'A', '001',
            'Aarav Sharma',
            LOWER(inst.institute_code) || '.aarav.sharma@seed.edu',
            '$2b$12$StudentSeedHashValue',
            NOW() - INTERVAL '15 days'
        ) RETURNING id INTO stu1_id;

        INSERT INTO public.students (institute_id, batch_id, section, roll_no, name, email, password_hash, created_at)
        VALUES (
            inst.id, btech_batch_id, 'A', '002',
            'Priya Nair',
            LOWER(inst.institute_code) || '.priya.nair@seed.edu',
            '$2b$12$StudentSeedHashValue',
            NOW() - INTERVAL '14 days'
        ) RETURNING id INTO stu2_id;

        INSERT INTO public.students (institute_id, batch_id, section, roll_no, name, email, password_hash, created_at)
        VALUES (
            inst.id, btech_batch_id, 'B', '003',
            'Rohan Verma',
            LOWER(inst.institute_code) || '.rohan.verma@seed.edu',
            '$2b$12$StudentSeedHashValue',
            NOW() - INTERVAL '13 days'
        ) RETURNING id INTO stu3_id;

        INSERT INTO public.students (institute_id, batch_id, section, roll_no, name, email, password_hash, created_at)
        VALUES (
            inst.id, mba_batch_id, 'C', '004',
            'Ananya Iyer',
            LOWER(inst.institute_code) || '.ananya.iyer@seed.edu',
            '$2b$12$StudentSeedHashValue',
            NOW() - INTERVAL '12 days'
        ) RETURNING id INTO stu4_id;

        INSERT INTO public.students (institute_id, batch_id, section, roll_no, name, email, password_hash, created_at)
        VALUES (
            inst.id, mba_batch_id, 'A', '005',
            'Vikram Singh',
            LOWER(inst.institute_code) || '.vikram.singh@seed.edu',
            '$2b$12$StudentSeedHashValue',
            NOW() - INTERVAL '11 days'
        ) RETURNING id INTO stu5_id;

        -- 8) exams
        INSERT INTO public.exams (
            institute_id, faculty_id, subject_code, exam_type, exam_year,
            title, duration_minutes, passing_marks, scheduled_time, end_time, created_at
        ) VALUES (
            inst.id, fac_cs_id, 'CSMID', 'MID', '26',
            inst.institute_code || ' Midterm Upcoming',
            90, 40,
            NOW() + INTERVAL '7 days',
            NOW() + INTERVAL '7 days 1 hour 30 minutes',
            NOW()
        ) RETURNING id INTO exam_upcoming_id;

        INSERT INTO public.exams (
            institute_id, faculty_id, subject_code, exam_type, exam_year,
            title, duration_minutes, passing_marks, scheduled_time, end_time, created_at
        ) VALUES (
            inst.id, fac_ee_id, 'EEMID', 'MID', '26',
            inst.institute_code || ' Midterm Live',
            75, 35,
            NOW(),
            NOW() + INTERVAL '1 hour 15 minutes',
            NOW()
        ) RETURNING id INTO exam_live_id;

        INSERT INTO public.exams (
            institute_id, faculty_id, subject_code, exam_type, exam_year,
            title, duration_minutes, passing_marks, scheduled_time, end_time, created_at
        ) VALUES (
            inst.id, fac_mba_id, 'MBAMID', 'MID', '26',
            inst.institute_code || ' Midterm Completed',
            120, 50,
            NOW() - INTERVAL '7 days',
            NOW() - INTERVAL '7 days' + INTERVAL '2 hours',
            NOW() - INTERVAL '8 days'
        ) RETURNING id INTO exam_completed_id;

        -- 9) ques_ans (10 per exam)
        FOR qn IN 1..10 LOOP
            INSERT INTO public.ques_ans (institute_id, exam_id, question_text, options, correct_answer, marks)
            VALUES (
                inst.id, exam_upcoming_id,
                'Upcoming Q' || qn || ' - ' || inst.institute_code,
                '{"A":"Option 1","B":"Option 2","C":"Option 3","D":"Option 4"}'::jsonb,
                CASE WHEN (qn % 4)=1 THEN 'A' WHEN (qn % 4)=2 THEN 'B' WHEN (qn % 4)=3 THEN 'C' ELSE 'D' END,
                CASE WHEN qn <= 5 THEN 1 ELSE 2 END
            );

            INSERT INTO public.ques_ans (institute_id, exam_id, question_text, options, correct_answer, marks)
            VALUES (
                inst.id, exam_live_id,
                'Live Q' || qn || ' - ' || inst.institute_code,
                '{"A":"Option 1","B":"Option 2","C":"Option 3","D":"Option 4"}'::jsonb,
                CASE WHEN (qn % 4)=1 THEN 'A' WHEN (qn % 4)=2 THEN 'B' WHEN (qn % 4)=3 THEN 'C' ELSE 'D' END,
                CASE WHEN qn <= 5 THEN 1 ELSE 2 END
            );

            INSERT INTO public.ques_ans (institute_id, exam_id, question_text, options, correct_answer, marks)
            VALUES (
                inst.id, exam_completed_id,
                'Completed Q' || qn || ' - ' || inst.institute_code,
                '{"A":"Option 1","B":"Option 2","C":"Option 3","D":"Option 4"}'::jsonb,
                CASE WHEN (qn % 4)=1 THEN 'A' WHEN (qn % 4)=2 THEN 'B' WHEN (qn % 4)=3 THEN 'C' ELSE 'D' END,
                CASE WHEN qn <= 5 THEN 1 ELSE 2 END
            );
        END LOOP;

        -- 10) exam_assignments
        INSERT INTO public.exam_assignments (institute_id, exam_id, batch_id, assigned_at)
        VALUES (inst.id, exam_upcoming_id, btech_batch_id, NOW() - INTERVAL '1 day');

        INSERT INTO public.exam_assignments (institute_id, exam_id, batch_id, assigned_at)
        VALUES (inst.id, exam_live_id, mba_batch_id, NOW() - INTERVAL '2 hours');

        INSERT INTO public.exam_assignments (institute_id, exam_id, batch_id, assigned_at)
        VALUES (inst.id, exam_completed_id, btech_batch_id, NOW() - INTERVAL '9 days');

        -- 11) exam_sessions
        INSERT INTO public.exam_sessions (
            institute_id, exam_id, student_id, session_status,
            started_at, completed_at, final_score, violation_found,
            mongo_log_ref, s3_media_prefix, violation_logs_id, attempted_at, submitted_at
        ) VALUES
        (
            inst.id, exam_completed_id, stu1_id, 'completed',
            (NOW() - INTERVAL '7 days') + INTERVAL '10 minutes',
            (NOW() - INTERVAL '7 days') + INTERVAL '1 hour 40 minutes',
            92, FALSE,
            NULL,
            's3://aiproctor/' || LOWER(inst.institute_code) || '/completed/' || stu1_id::text,
            NULL,
            (NOW() - INTERVAL '7 days') + INTERVAL '10 minutes',
            (NOW() - INTERVAL '7 days') + INTERVAL '1 hour 40 minutes'
        ),
        (
            inst.id, exam_completed_id, stu2_id, 'completed',
            (NOW() - INTERVAL '7 days') + INTERVAL '12 minutes',
            (NOW() - INTERVAL '7 days') + INTERVAL '1 hour 43 minutes',
            65, FALSE,
            NULL,
            's3://aiproctor/' || LOWER(inst.institute_code) || '/completed/' || stu2_id::text,
            NULL,
            (NOW() - INTERVAL '7 days') + INTERVAL '12 minutes',
            (NOW() - INTERVAL '7 days') + INTERVAL '1 hour 43 minutes'
        ),
        (
            inst.id, exam_completed_id, stu3_id, 'completed',
            (NOW() - INTERVAL '7 days') + INTERVAL '14 minutes',
            (NOW() - INTERVAL '7 days') + INTERVAL '1 hour 50 minutes',
            40, TRUE,
            'mongo://violations/' || LOWER(inst.institute_code) || '/' || stu3_id::text,
            's3://aiproctor/' || LOWER(inst.institute_code) || '/completed/' || stu3_id::text,
            'viol-' || LOWER(inst.institute_code) || '-' || stu3_id::text,
            (NOW() - INTERVAL '7 days') + INTERVAL '14 minutes',
            (NOW() - INTERVAL '7 days') + INTERVAL '1 hour 50 minutes'
        );

        INSERT INTO public.exam_sessions (
            institute_id, exam_id, student_id, session_status,
            started_at, completed_at, final_score, violation_found,
            mongo_log_ref, s3_media_prefix, violation_logs_id, attempted_at, submitted_at
        ) VALUES (
            inst.id, exam_live_id, stu4_id, 'in_progress',
            NOW() - INTERVAL '20 minutes',
            NULL, NULL, FALSE,
            NULL,
            's3://aiproctor/' || LOWER(inst.institute_code) || '/live/' || stu4_id::text,
            NULL,
            NOW() - INTERVAL '20 minutes',
            NULL
        );

        INSERT INTO public.exam_sessions (
            institute_id, exam_id, student_id, session_status,
            started_at, completed_at, final_score, violation_found,
            mongo_log_ref, s3_media_prefix, violation_logs_id, attempted_at, submitted_at
        ) VALUES (
            inst.id, exam_upcoming_id, stu5_id, 'not_started',
            NULL, NULL, NULL, FALSE,
            NULL,
            's3://aiproctor/' || LOWER(inst.institute_code) || '/upcoming/' || stu5_id::text,
            NULL,
            NULL,
            NULL
        );
    END LOOP;
END $$;

COMMIT;
