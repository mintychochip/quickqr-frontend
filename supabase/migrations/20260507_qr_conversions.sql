-- Create qr_conversions table for detailed conversion tracking
-- This table tracks conversion events that happen after someone scans a QR code
CREATE TABLE IF NOT EXISTS qr_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code_id UUID REFERENCES qrcodes(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  revenue DECIMAL,
  currency VARCHAR(3),
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_fingerprint TEXT,
  metadata JSONB,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_qr_conversions_qr_code_id ON qr_conversions(qr_code_id);
CREATE INDEX idx_qr_conversions_scan_id ON qr_conversions(scan_id);
CREATE INDEX idx_qr_conversions_event_type ON qr_conversions(event_type);
CREATE INDEX idx_qr_conversions_converted_at ON qr_conversions(converted_at);

-- Row Level Security (RLS) policies for user data isolation
ALTER TABLE qr_conversions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversion data
CREATE POLICY qr_conversions_select_policy ON qr_conversions
FOR SELECT USING (
  (SELECT qr.user_id FROM qrcodes qr WHERE qr.id = qr_code_id) = auth.uid()
);

CREATE POLICY qr_conversions_insert_policy ON qr_conversions
FOR INSERT WITH CHECK (
  (SELECT qr.user_id FROM qrcodes qr WHERE qr.id = qr_code_id) = auth.uid()
);

CREATE POLICY qr_conversions_update_policy ON qr_conversions
FOR UPDATE USING (
  (SELECT qr.user_id FROM qrcodes qr WHERE qr.id = qr_code_id) = auth.uid()
);

CREATE POLICY qr_conversions_delete_policy ON qr_conversions
FOR DELETE USING (
  (SELECT qr.user_id FROM qrcodes qr WHERE qr.id = qr_code_id) = auth.uid()
);

-- Grant permissions
GRANT ALL ON qr_conversions TO authenticated;