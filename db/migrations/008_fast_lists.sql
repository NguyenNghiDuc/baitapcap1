-- Targeted indexes for paginated gradebooks, student history and notifications.
-- All CREATE INDEX statements are idempotent for serverless cold-start migrations.
CREATE INDEX IF NOT EXISTS idx_results_user_time_id
 ON results (user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_results_subject_grade_time
 ON results (subject,grade,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_results_time_id
 ON results (created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_time
 ON submissions (assignment_id,submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_time
 ON notifications (user_id,created_at DESC);
