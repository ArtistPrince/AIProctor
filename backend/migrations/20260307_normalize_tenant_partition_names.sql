-- Normalize tenant partition naming to:
--   tenant_partitions.<parent_table>_<institute_uuid_with_underscores>
-- This reconciles legacy seed-created names like *_nova01 with runtime UUID-based names.

CREATE SCHEMA IF NOT EXISTS tenant_partitions;

DO $$
DECLARE
    parent_table TEXT;
    child_rec RECORD;
    institute_uuid TEXT;
    canonical_name TEXT;
    target_exists BOOLEAN;
BEGIN
    FOREACH parent_table IN ARRAY ARRAY[
        'institute_admins',
        'batches',
        'faculties',
        'students',
        'exams',
        'ques_ans',
        'exam_assignments',
        'exam_sessions'
    ]
    LOOP
        FOR child_rec IN
            SELECT
                child_ns.nspname AS child_schema,
                child.relname AS child_table,
                pg_get_expr(child.relpartbound, child.oid) AS bound_expr
            FROM pg_class child
            JOIN pg_inherits inh ON inh.inhrelid = child.oid
            JOIN pg_class parent ON parent.oid = inh.inhparent
            JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
            JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
            WHERE parent_ns.nspname = 'public'
              AND parent.relname = parent_table
        LOOP
            institute_uuid := substring(child_rec.bound_expr from '''([0-9a-fA-F-]{36})''');
            IF institute_uuid IS NULL THEN
                RAISE NOTICE 'Skipping %.% (unable to parse partition bound: %)', child_rec.child_schema, child_rec.child_table, child_rec.bound_expr;
                CONTINUE;
            END IF;

            canonical_name := parent_table || '_' || replace(lower(institute_uuid), '-', '_');

            SELECT EXISTS (
                SELECT 1
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'tenant_partitions'
                  AND c.relname = canonical_name
            ) INTO target_exists;

            IF target_exists
               AND NOT (child_rec.child_schema = 'tenant_partitions' AND child_rec.child_table = canonical_name)
            THEN
                RAISE NOTICE 'Target tenant_partitions.% already exists; leaving %.% unchanged',
                    canonical_name, child_rec.child_schema, child_rec.child_table;
                CONTINUE;
            END IF;

            IF child_rec.child_schema <> 'tenant_partitions' THEN
                EXECUTE format('ALTER TABLE %I.%I SET SCHEMA tenant_partitions', child_rec.child_schema, child_rec.child_table);
                child_rec.child_schema := 'tenant_partitions';
            END IF;

            IF child_rec.child_table <> canonical_name THEN
                EXECUTE format('ALTER TABLE %I.%I RENAME TO %I', child_rec.child_schema, child_rec.child_table, canonical_name);
            END IF;
        END LOOP;
    END LOOP;
END $$;
