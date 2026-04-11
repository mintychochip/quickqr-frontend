-- Webhook Notifications System
-- Migration: 2026-04-11

-- Webhooks table - stores user webhook configurations
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT, -- For HMAC signature verification
  event_types TEXT[] DEFAULT '{qr.scan}'::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhook deliveries table - logs all webhook delivery attempts
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on webhook_deliveries
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own webhooks
CREATE POLICY "Users can only see their own webhooks"
  ON webhooks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can only see webhook deliveries for their own webhooks
CREATE POLICY "Users can only see deliveries for their own webhooks"
  ON webhook_deliveries
  FOR ALL
  TO authenticated
  USING (
    webhook_id IN (
      SELECT id FROM webhooks WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    webhook_id IN (
      SELECT id FROM webhooks WHERE user_id = auth.uid()
    )
  );

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);

-- Create index for webhook deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);

-- Function to trigger webhook delivery (will be called from edge function)
CREATE OR REPLACE FUNCTION trigger_webhook_delivery(
  p_webhook_id UUID,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_delivery_id UUID;
BEGIN
  INSERT INTO webhook_deliveries (webhook_id, event_type, payload)
  VALUES (p_webhook_id, p_event_type, p_payload)
  RETURNING id INTO v_delivery_id;
  
  RETURN v_delivery_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_webhook_delivery TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_webhook_delivery TO anon;

-- Enable realtime for webhook_deliveries (optional - for live delivery status)
BEGIN;
  -- Check if the table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'webhook_deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE webhook_deliveries;
  END IF;
COMMIT;
