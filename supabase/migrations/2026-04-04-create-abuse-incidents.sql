-- Create abuse_incidents table for logging detected abuse
CREATE TABLE IF NOT EXISTS abuse_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('malicious_content', 'scan_bot', 'qr_flooding', 'qr_hijacking')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  evidence JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Index for admin review queries
CREATE INDEX idx_abuse_incidents_unresolved ON abuse_incidents (created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_abuse_incidents_user ON abuse_incidents (user_id) WHERE resolved_at IS NULL;

-- RLS
ALTER TABLE abuse_incidents ENABLE ROW LEVEL SECURITY;

-- Admins can view all incidents
CREATE POLICY "Admins can view abuse incidents"
  ON abuse_incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND admin = true
    )
  );

-- Only service role can insert incidents (via service key)
CREATE POLICY "Service role can insert abuse incidents"
  ON abuse_incidents FOR INSERT
  TO service_role
  WITH CHECK (true);
