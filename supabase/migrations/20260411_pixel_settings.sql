-- Migration: Add pixel_settings table for marketing pixel integration
-- Created: 2026-04-11

-- Create pixel_settings table
CREATE TABLE IF NOT EXISTS pixel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Facebook Pixel
  facebook_pixel_id TEXT,
  facebook_events JSONB DEFAULT '["PageView"]'::jsonb,
  facebook_enabled BOOLEAN DEFAULT false,
  
  -- Google Ads
  google_conversion_id TEXT,
  google_conversion_label TEXT,
  google_enabled BOOLEAN DEFAULT false,
  
  -- LinkedIn Insight Tag
  linkedin_partner_id TEXT,
  linkedin_enabled BOOLEAN DEFAULT false,
  
  -- Common fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index on qr_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_pixel_settings_qr_id ON pixel_settings(qr_id);
CREATE INDEX IF NOT EXISTS idx_pixel_settings_user_id ON pixel_settings(user_id);

-- Add RLS policies
ALTER TABLE pixel_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own pixel settings
CREATE POLICY pixel_settings_select_own ON pixel_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own pixel settings
CREATE POLICY pixel_settings_insert_own ON pixel_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own pixel settings
CREATE POLICY pixel_settings_update_own ON pixel_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own pixel settings
CREATE POLICY pixel_settings_delete_own ON pixel_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pixel_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pixel_settings_updated_at
  BEFORE UPDATE ON pixel_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_pixel_settings_updated_at();
