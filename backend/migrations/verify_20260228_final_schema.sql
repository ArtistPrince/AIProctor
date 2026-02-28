-- Verifies that old schema objects are removed and final schema objects exist.
-- Run with: psql "$DATABASE_URL" -f backend/migrations/verify_20260228_final_schema.sql

WITH expected_new_tables(table_name) AS (
    VALUES
        ('super_admins'),
        ('institutes'),
        ('institute_admins'),
        ('batches'),
        ('faculties'),
        ('students'),
        ('exams'),
        ('ques_ans'),
        ('exam_assignments'),
        ('exam_sessions')
),
expected_old_tables(table_name) AS (
    VALUES
        ('admins'),
        ('departments'),
        ('questions'),
        ('users_backup')
),
existing_tables AS (
    SELECT tablename AS table_name
    FROM pg_tables
    WHERE schemaname = 'public'
)
SELECT
    'new_table_presence' AS check_type,
    n.table_name,
    CASE WHEN e.table_name IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status
FROM expected_new_tables n
LEFT JOIN existing_tables e ON e.table_name = n.table_name
UNION ALL
SELECT
    'old_table_absence' AS check_type,
    o.table_name,
    CASE WHEN e.table_name IS NULL THEN 'OK' ELSE 'STILL_PRESENT' END AS status
FROM expected_old_tables o
LEFT JOIN existing_tables e ON e.table_name = o.table_name
ORDER BY check_type, table_name;

WITH expected_functions(function_name) AS (
    VALUES
        ('generate_admin_code'),
        ('generate_batch_code'),
        ('generate_faculty_code'),
        ('generate_student_code'),
        ('generate_exam_code'),
        ('generate_session_code')
),
existing_functions AS (
    SELECT proname AS function_name
    FROM pg_proc
)
SELECT
    'function_presence' AS check_type,
    f.function_name,
    CASE WHEN e.function_name IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status
FROM expected_functions f
LEFT JOIN existing_functions e ON e.function_name = f.function_name
ORDER BY function_name;

SELECT
    c.relname AS parent_table,
    c.relkind,
    c.relispartition,
    pg_get_partkeydef(c.oid) AS partition_key
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('institute_admins','batches','faculties','students','exams','ques_ans','exam_assignments','exam_sessions')
ORDER BY c.relname;
