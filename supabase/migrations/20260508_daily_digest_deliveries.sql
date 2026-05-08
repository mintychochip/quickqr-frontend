-- Daily Digest Worker: Tracking table for digest deliveries
-- Migration: 2026-05-08

-- Table to track daily digest email deliveries
CREATE TABLE IF NOT EXISTS daily_digest_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  
  -- Summary stats from the digest
  total_qrs INTEGER NOT NULL DEFAULT 0,
  healthy_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  critical_count INTEGER NOT NULL DEFAULT 0,
  new_issues_count INTEGER NOT NULL DEFAULT 0,
  resolved_issues_count INTEGER NOT NULL DEFAULT 0,
  
  -- Delivery status
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE daily_digest_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own digest deliveries
CREATE POLICY "Users can only see their own digest deliveries"
  ON daily_digest_deliveries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_digest_deliveries_user_id ON daily_digest_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_digest_deliveries_created_at ON daily_digest_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_digest_deliveries_user_created ON daily_digest_deliveries(user_id, created_at DESC);

-- Grant permissions
GRANT ALL ON daily_digest_deliveries TO authenticated;

-- Function to get user's recent digest deliveries
CREATE OR REPLACE FUNCTION get_user_digest_history(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  email_address TEXT,
  total_qrs INTEGER,
  healthy_count INTEGER,
  warning_count INTEGER,
  critical_count INTEGER,
  new_issues_count INTEGER,
  resolved_issues_count INTEGER,
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.email_address,
    d.total_qrs,
    d.healthy_count,
    d.warning_count,
    d.critical_count,
    d.new_issues_count,
    d.resolved_issues_count,
    d.status,
    d.created_at
  FROM daily_digest_deliveries d
  WHERE d.user_id = p_user_id
  ORDER BY d.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_digest_history TO authenticated;

-- Function to get digest statistics for admin/monitoring
CREATE OR REPLACE FUNCTION get_digest_delivery_stats(p_since TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours')
RETURNS TABLE (
  total_deliveries BIGINT,
  successful_deliveries BIGINT,
  failed_deliveries BIGINT,
  unique_users BIGINT,
  avg_qrs_per_digest NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_deliveries,
    COUNT(*) FILTER (WHERE status = 'sent') as successful_deliveries,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_deliveries,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(total_qrs)::NUMERIC as avg_qrs_per_digest
  FROM daily_digest_deliveries
  WHERE created_at >= p_since;
END;
$$;

-- Only service role can access aggregate stats
REVOKE EXECUTE ON FUNCTION get_digest_delivery_stats FROM authenticated;
GRANT EXECUTE ON FUNCTION get_digest_delivery_stats TO service_role;
