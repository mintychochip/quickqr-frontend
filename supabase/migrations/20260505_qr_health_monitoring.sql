-- QR Health Monitoring System
-- Migration: 2026-05-05

-- Health check results table - stores periodic URL health checks
CREATE TABLE IF NOT EXISTS qr_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  http_status INTEGER,
  response_time_ms INTEGER,
  ssl_valid BOOLEAN,
  ssl_expires_at TIMESTAMP WITH TIME ZONE,
  redirect_count INTEGER,
  final_url TEXT,
  error_message TEXT,
  error_type VARCHAR(50) CHECK (error_type IN ('timeout', 'dns_error', 'ssl_error', 'http_error', 'redirect_loop', 'unknown')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health check configuration per QR code
CREATE TABLE IF NOT EXISTS qr_health_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  check_frequency VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (check_frequency IN ('hourly', 'daily', 'weekly')),
  alert_threshold VARCHAR(20) NOT NULL DEFAULT 'critical' CHECK (alert_threshold IN ('any', 'warning', 'critical')),
  content_match_enabled BOOLEAN DEFAULT FALSE,
  content_match_selector TEXT,
  content_match_expected TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(qr_code_id)
);

-- Health check alerts log - tracks when notifications were sent
CREATE TABLE IF NOT EXISTS qr_health_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  health_check_id UUID NOT NULL REFERENCES qr_health_checks(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('email', 'slack', 'webhook', 'in_app')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all health tables
ALTER TABLE qr_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_health_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_health_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see health checks for their own QR codes
CREATE POLICY "Users can only see health checks for their own QR codes"
  ON qr_health_checks
  FOR ALL
  TO authenticated
  USING (
    qr_code_id IN (
      SELECT id FROM qr_codes WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    qr_code_id IN (
      SELECT id FROM qr_codes WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only see health configs for their own QR codes
CREATE POLICY "Users can only see health configs for their own QR codes"
  ON qr_health_configs
  FOR ALL
  TO authenticated
  USING (
    qr_code_id IN (
      SELECT id FROM qr_codes WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    qr_code_id IN (
      SELECT id FROM qr_codes WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only see alerts for their own QR codes
CREATE POLICY "Users can only see alerts for their own QR codes"
  ON qr_health_alerts
  FOR ALL
  TO authenticated
  USING (
    qr_code_id IN (
      SELECT id FROM qr_codes WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    qr_code_id IN (
      SELECT id FROM qr_codes WHERE user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_health_checks_qr_code_id ON qr_health_checks(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_health_checks_qr_code_checked_at ON qr_health_checks(qr_code_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_health_checks_status ON qr_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_qr_health_configs_qr_code_id ON qr_health_configs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_health_alerts_qr_code_id ON qr_health_alerts(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_health_alerts_health_check_id ON qr_health_alerts(health_check_id);

-- Function to get latest health status for a QR code
CREATE OR REPLACE FUNCTION get_qr_health_status(p_qr_code_id UUID)
RETURNS TABLE (
  status VARCHAR(20),
  checked_at TIMESTAMP WITH TIME ZONE,
  http_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.status,
    h.checked_at,
    h.http_status,
    h.response_time_ms,
    h.error_message
  FROM qr_health_checks h
  WHERE h.qr_code_id = p_qr_code_id
  ORDER BY h.checked_at DESC
  LIMIT 1;
END;
$$;

-- Function to get health stats for a user
CREATE OR REPLACE FUNCTION get_user_health_stats(p_user_id UUID)
RETURNS TABLE (
  total_qr_codes BIGINT,
  healthy_count BIGINT,
  warning_count BIGINT,
  critical_count BIGINT,
  unknown_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT q.id) as total_qr_codes,
    COUNT(DISTINCT CASE WHEN h.status = 'healthy' THEN q.id END) as healthy_count,
    COUNT(DISTINCT CASE WHEN h.status = 'warning' THEN q.id END) as warning_count,
    COUNT(DISTINCT CASE WHEN h.status = 'critical' THEN q.id END) as critical_count,
    COUNT(DISTINCT CASE WHEN h.status IS NULL OR h.status = 'unknown' THEN q.id END) as unknown_count
  FROM qr_codes q
  LEFT JOIN LATERAL (
    SELECT status FROM qr_health_checks 
    WHERE qr_code_id = q.id 
    ORDER BY checked_at DESC 
    LIMIT 1
  ) h ON true
  WHERE q.user_id = p_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_qr_health_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_health_stats TO authenticated;
