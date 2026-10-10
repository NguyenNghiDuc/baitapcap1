BEGIN;
-- An atomic attempt slot keeps simultaneous submission requests from consuming the same attempt number.
-- Check existing imported data for duplicate (assignment, student, attempt) before applying.
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_attempt_unique
ON submissions(assignment_id,student_id,attempt);
COMMIT;
