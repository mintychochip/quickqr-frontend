-- Migration: API Developer Platform Tables
-- Created: 2026-05-07
-- Description: Creates tables for API keys, request logs, and bulk job tracking

-- API Keys table for developer API access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,              -- bcrypt hash of key
  scopes TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_tier TEXT NOT NULL DEFAULT 'standard', -- free, standard, pro, enterprise
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- API Request Log for rate limiting & analytics
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk Job Tracking table for async operations
CREATE TABLE IF NOT EXISTS bulk_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                  -- 'create', 'update', 'delete'
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  total INTEGER NOT NULL,
  succeeded INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  result_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_api_keys_hash ON api_keys USING hash(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_workspace ON api_keys(workspace_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_logs_key_time ON api_request_logs(api_key_id, created_at);
CREATE INDEX idx_api_logs_created_at ON api_request_logs(created_at);
CREATE INDEX idx_bulk_jobs_api_key ON bulk_jobs(api_key_id);
CREATE INDEX idx_bulk_jobs_workspace ON bulk_jobs(workspace_id);
CREATE INDEX idx_bulk_jobs_status ON bulk_jobs(status);

-- Enable RLS on new tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create API keys for themselves" ON api_keys
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for api_request_logs
-- Users can only see logs for their own API keys
CREATE POLICY "Users can view request logs for their API keys" ON api_request_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_request_logs.api_key_id
      AND api_keys.user_id = auth.uid()
    )
  );

-- RLS Policies for bulk_jobs
CREATE POLICY "Users can view bulk jobs for their workspace" ON bulk_jobs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = bulk_jobs.workspace_id
      AND workspace_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = bulk_jobs.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Helper function to check API key scope
CREATE OR REPLACE FUNCTION check_api_key_scope(key_id UUID, required_scope TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM api_keys
    WHERE id = key_id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
    AND scopes @> ARRAY[required_scope]
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update API key last_used_at
CREATE OR REPLACE FUNCTION update_api_key_last_used(key_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys SET last_used_at = NOW() WHERE id = key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
