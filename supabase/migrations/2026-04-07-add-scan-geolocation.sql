-- Migration: Add geolocation fields to scans table
-- Created: 2026-04-07

-- Add location columns to scans table
ALTER TABLE IF EXISTS scans 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS ip_address INET;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_scans_country ON scans(country);
CREATE INDEX IF NOT EXISTS idx_scans_city ON scans(city);

-- Create a view for scan analytics with location
CREATE OR REPLACE VIEW scan_analytics AS
SELECT 
    s.id,
    s.qrcode_id,
    s.scanned_at,
    s.os,
    s.country,
    s.country_code,
    s.city,
    s.region,
    q.user_id,
    q.name as qr_name,
    q.type as qr_type
FROM scans s
JOIN qrcodes q ON s.qrcode_id = q.id;
