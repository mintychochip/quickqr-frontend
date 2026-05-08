-- QR Health Monitoring Phase 3: User Notification Preferences
-- Migration: 2026-05-08

-- User notification preferences for health alerts
CREATE TABLE IF NOT EXISTS user_health_notification_prefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email notifications
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_address TEXT, -- NULL = use user's auth email
  
  -- Slack notifications  
  slack_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  slack_webhook_url TEXT,
  slack_channel TEXT,
  
  -- Webhook notifications
  webhook_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_url TEXT,
  webhook_headers JSONB, -- Custom headers for webhook requests
  
  -- Notification settings
  daily_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  digest_time TIME NOT NULL DEFAULT '09:00',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Per-QR notification overrides (optional, inherits from user prefs by default)
CREATE TABLE IF NOT EXISTS qr_health_notification_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  
  -- Override settings (NULL = inherit from user prefs)
  email_enabled BOOLEAN,
  slack_enabled BOOLEAN,
  webhook_enabled BOOLEAN,
  custom_webhook_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(qr_code_id)
);

-- Enable RLS
ALTER TABLE user_health_notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_health_notification_overrides ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own notification prefs
CREATE POLICY "Users can only see their own notification prefs"
  ON user_health_notification_prefs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: Users can only see notification overrides for their own QR codes
CREATE POLICY "Users can only see their own QR notification overrides"
  ON qr_health_notification_overrides
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_health_notif_prefs_user_id ON user_health_notification_prefs(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_health_notif_overrides_qr_id ON qr_health_notification_overrides(qr_code_id);

-- Grant permissions
GRANT ALL ON user_health_notification_prefs TO authenticated;
GRANT ALL ON qr_health_notification_overrides TO authenticated;

-- Function to get effective notification settings for a QR code
CREATE OR REPLACE FUNCTION get_qr_health_notification_settings(p_qr_code_id UUID)
RETURNS TABLE (
  email_enabled BOOLEAN,
  email_address TEXT,
  slack_enabled BOOLEAN,
  slack_webhook_url TEXT,
  slack_channel TEXT,
  webhook_enabled BOOLEAN,
  webhook_url TEXT,
  webhook_headers JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_qr_override qr_health_notification_overrides%ROWTYPE;
  v_user_prefs user_health_notification_prefs%ROWTYPE;
BEGIN
  -- Get QR code owner
  SELECT user_id INTO v_user_id FROM qr_codes WHERE id = p_qr_code_id;
  
  -- Get user preferences
  SELECT * INTO v_user_prefs FROM user_health_notification_prefs WHERE user_id = v_user_id;
  
  -- Get QR override if exists
  SELECT * INTO v_qr_override FROM qr_health_notification_overrides WHERE qr_code_id = p_qr_code_id;
  
  -- Return effective settings (QR override > user prefs > defaults)
  RETURN QUERY
  SELECT
    COALESCE(v_qr_override.email_enabled, v_user_prefs.email_enabled, TRUE) as email_enabled,
    v_user_prefs.email_address as email_address,
    COALESCE(v_qr_override.slack_enabled, v_user_prefs.slack_enabled, FALSE) as slack_enabled,
    v_user_prefs.slack_webhook_url as slack_webhook_url,
    v_user_prefs.slack_channel as slack_channel,
    COALESCE(v_qr_override.webhook_enabled, v_qr_override.custom_webhook_url IS NOT NULL, v_user_prefs.webhook_enabled, FALSE) as webhook_enabled,
    COALESCE(v_qr_override.custom_webhook_url, v_user_prefs.webhook_url) as webhook_url,
    v_user_prefs.webhook_headers as webhook_headers;
END;
$$;

GRANT EXECUTE ON FUNCTION get_qr_health_notification_settings TO authenticated;
