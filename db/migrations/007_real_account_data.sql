BEGIN;
-- True per-account data. Restrict access to backend DB role; clients use protected APIs.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_path TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE results ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE results ADD COLUMN IF NOT EXISTS grading_status TEXT NOT NULL DEFAULT 'self_reported';
CREATE TABLE IF NOT EXISTS login_devices (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 device_id TEXT NOT NULL,
 device TEXT NOT NULL,
 browser TEXT NOT NULL,
 ip INET,
 first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,device_id)
);
CREATE INDEX IF NOT EXISTS idx_login_devices_recent ON login_devices(user_id,last_seen_at DESC);
CREATE TABLE IF NOT EXISTS client_error_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 route TEXT NOT NULL,
 message TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_error_created ON client_error_events(created_at DESC);
CREATE TABLE IF NOT EXISTS database_backups (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sha256 TEXT NOT NULL,
 bytes BIGINT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No direct client permissions. Only authenticated, authorized application APIs.
ALTER TABLE login_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE login_devices, client_error_events, database_backups FROM anon, authenticated;
COMMIT;
