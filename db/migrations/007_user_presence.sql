-- Presence is activity of an authenticated app tab, not merely a valid session.
-- No IP or browser fingerprint is needed for online/offline state.
CREATE TABLE IF NOT EXISTS public.user_presence (
 user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 session_id TEXT NOT NULL,
 last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 active BOOLEAN NOT NULL DEFAULT true,
 PRIMARY KEY (user_id,session_id)
);
CREATE INDEX IF NOT EXISTS idx_user_presence_active_seen ON public.user_presence(active,last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_seen ON public.user_presence(user_id,last_seen_at DESC);
