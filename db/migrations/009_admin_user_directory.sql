-- Admin account directory: speed up stable newest-first pagination.
-- Role and lock-state filters can use a covering order index.
CREATE INDEX IF NOT EXISTS idx_users_admin_created_id
 ON users (created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_users_admin_role_locked_created
 ON users (role,locked,created_at DESC,id DESC);
