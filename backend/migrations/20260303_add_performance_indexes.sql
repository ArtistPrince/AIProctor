-- Performance indexes for high-frequency read paths
-- Safe to run multiple times.

CREATE INDEX IF NOT EXISTS idx_students_batch_id ON public.students (batch_id);
CREATE INDEX IF NOT EXISTS idx_students_institute_batch ON public.students (institute_id, batch_id);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam_id ON public.exam_sessions (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student_id ON public.exam_sessions (student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_institute_status ON public.exam_sessions (institute_id, session_status);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam_id ON public.exam_assignments (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_batch_id ON public.exam_assignments (batch_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_institute_batch ON public.exam_assignments (institute_id, batch_id);

CREATE INDEX IF NOT EXISTS idx_exams_institute_scheduled_time ON public.exams (institute_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_batches_institute_id ON public.batches (institute_id);
