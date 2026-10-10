BEGIN;
-- One row per actual server-observed attempt. Times are controlled by PostgreSQL.
CREATE TABLE IF NOT EXISTS exam_attempt_sessions (
 id UUID PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 exam_id TEXT NOT NULL,
 title TEXT NOT NULL,
 subject TEXT NOT NULL,
 grade SMALLINT CHECK(grade BETWEEN 1 AND 5),
 duration_minutes SMALLINT NOT NULL CHECK(duration_minutes BETWEEN 5 AND 180),
 total_questions SMALLINT NOT NULL CHECK(total_questions BETWEEN 1 AND 200),
 answered_count SMALLINT NOT NULL DEFAULT 0,
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 due_at TIMESTAMPTZ NOT NULL,
 last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 submitted_at TIMESTAMPTZ,
 submission_status TEXT CHECK(submission_status IN ('submitted','submitted_late')),
 CHECK(answered_count BETWEEN 0 AND total_questions),
 CHECK((submitted_at IS NULL AND submission_status IS NULL) OR (submitted_at IS NOT NULL AND submission_status IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_exam_attempt_sessions_admin ON exam_attempt_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_attempt_sessions_user ON exam_attempt_sessions(user_id,started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_attempt_sessions_open ON exam_attempt_sessions(due_at,last_seen_at DESC) WHERE submitted_at IS NULL;
ALTER TABLE exam_attempt_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE exam_attempt_sessions FROM PUBLIC, anon, authenticated;
COMMIT;
