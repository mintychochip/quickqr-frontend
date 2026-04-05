-- Add abuse scoring and blocking fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS abuse_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- Index for blocked user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_blocked ON profiles (is_blocked) WHERE is_blocked = true;

-- Prevent non-admins from viewing/modifying abuse fields
-- (abuse_score and is_blocked should only be visible to admins and the owning user via RLS)
