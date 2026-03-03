BEGIN;

-- Removes only the data/partitions created by seed_multitenant_supabase.sql

DELETE FROM public.super_admins
WHERE email = 'superadmin@aiproctor.dev';

DELETE FROM public.institutes
WHERE institute_code IN ('NOVA01', 'PINE02', 'AURM03', 'SUSP04', 'RIVR05');

DO $$
DECLARE
    sch TEXT;
    inst TEXT;
    base TEXT;
BEGIN
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
END $$;

-- Drop accidental schemas only if empty
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_namespace n
        WHERE n.nspname = 'tenant_partition'
          AND NOT EXISTS (
              SELECT 1
              FROM pg_class c
              JOIN pg_namespace ns ON ns.oid = c.relnamespace
              WHERE ns.nspname = 'tenant_partition'
                AND c.relkind IN ('r','p','v','m','f')
          )
    ) THEN
        EXECUTE 'DROP SCHEMA tenant_partition';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_namespace n
        WHERE n.nspname = 'tenant_partitions'
          AND NOT EXISTS (
              SELECT 1
              FROM pg_class c
              JOIN pg_namespace ns ON ns.oid = c.relnamespace
              WHERE ns.nspname = 'tenant_partitions'
                AND c.relkind IN ('r','p','v','m','f')
          )
    ) THEN
        EXECUTE 'DROP SCHEMA tenant_partitions';
    END IF;
END $$;

COMMIT;
