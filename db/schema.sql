BEGIN;

CREATE TABLE IF NOT EXISTS app_state(
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK(id=1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO app_state(id,data) VALUES(1,'{}'::jsonb) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS schema_migrations(
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','parent','teacher','admin')),
  grade INT CHECK(grade IS NULL OR grade BETWEEN 1 AND 5),
  avatar TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  children JSONB NOT NULL DEFAULT '[]'::jsonb,
  student_sync JSONB,
  student_sync_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade INT NOT NULL CHECK(grade BETWEEN 1 AND 5),
  teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_students(
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(class_id,student_id)
);

CREATE TABLE IF NOT EXISTS assignments(
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject TEXT,
  lesson_id TEXT,
  grade INT,
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  deadline TIMESTAMPTZ,
  max_attempts INT NOT NULL DEFAULT 1 CHECK(max_attempts >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions(
  id TEXT PRIMARY KEY,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB,
  score NUMERIC,
  feedback TEXT,
  attempt INT NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS results(
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  grade INT,
  title TEXT,
  score NUMERIC,
  correct INT,
  total INT,
  wrong_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_sec INT NOT NULL DEFAULT 0,
  proctor JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications(
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS materials(
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs(
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_bank(
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  grade INT NOT NULL,
  lesson_id TEXT,
  level TEXT,
  question TEXT NOT NULL,
  options JSONB,
  answer JSONB,
  explanation TEXT,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_rooms(
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  grade INT,
  lesson_id TEXT,
  duration_min INT NOT NULL DEFAULT 45,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_settings(
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK(id=1),
  daily_min INT NOT NULL DEFAULT 45 CHECK(daily_min BETWEEN 5 AND 180),
  grade4_min INT NOT NULL DEFAULT 60 CHECK(grade4_min BETWEEN 5 AND 180),
  grade5_min INT NOT NULL DEFAULT 60 CHECK(grade5_min BETWEEN 5 AND 180),
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO exam_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS push_subscriptions(
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback(
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  question_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_works(
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_results_user_created ON results(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_grade_subject ON results(grade,subject);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student ON submissions(assignment_id,student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_deadline ON assignments(class_id,deadline);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_bank_grade_subject ON question_bank(grade,subject);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

COMMIT;
