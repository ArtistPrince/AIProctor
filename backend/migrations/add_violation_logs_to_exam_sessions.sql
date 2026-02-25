-- Migration: Add violation logs reference and timestamps to exam_sessions table
-- This migration extends the ExamSession model to reference MongoDB violation logs
-- and track when students attempted and submitted exams

ALTER TABLE exam_sessions
ADD COLUMN IF NOT EXISTS violation_logs_id VARCHAR,
ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

-- Index on violation_logs_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_exam_sessions_violation_logs ON exam_sessions(violation_logs_id);

-- Index on student_id and exam_id for fetching exam attempts by exam
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam_student ON exam_sessions(exam_id, student_id);
