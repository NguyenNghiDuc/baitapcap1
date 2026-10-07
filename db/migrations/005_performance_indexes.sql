BEGIN;

ALTER TABLE results ADD COLUMN IF NOT EXISTS client_submission_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_results_client_submission
  ON results(client_submission_id)
  WHERE client_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_created ON assignments(teacher_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_student_submitted ON submissions(student_id,submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_rooms_teacher_created ON exam_rooms(teacher_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_rooms_starts_at ON exam_rooms(starts_at);
CREATE INDEX IF NOT EXISTS idx_question_bank_lesson_grade ON question_bank(lesson_id,grade);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_created ON feedback(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_works_user_created ON student_works(user_id,created_at DESC);

COMMIT;
