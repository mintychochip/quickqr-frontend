-- Create scan_logs table for detailed analytics
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID REFERENCES qrcodes(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  device_type TEXT, -- mobile/desktop/tablet
  os TEXT, -- iOS, Android, Windows, macOS, Linux
  os_version TEXT,
  browser TEXT, -- Chrome, Safari, Firefox, Edge
  browser_version TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast queries
CREATE INDEX idx_scan_logs_qr_id ON scan_logs(qr_id);
CREATE INDEX idx_scan_logs_scanned_at ON scan_logs(scanned_at);
CREATE INDEX idx_scan_logs_country ON scan_logs(country);

-- Create aggregated daily stats table
CREATE TABLE IF NOT EXISTS qr_stats_daily (
  qr_id UUID REFERENCES qrcodes(id) ON DELETE CASCADE,
  date DATE,
  scan_count INT DEFAULT 0,
  unique_ips INT DEFAULT 0,
  mobile_count INT DEFAULT 0,
  desktop_count INT DEFAULT 0,
  PRIMARY KEY (qr_id, date)
);

-- Create hourly stats for heatmaps
CREATE TABLE IF NOT EXISTS qr_stats_hourly (
  qr_id UUID REFERENCES qrcodes(id) ON DELETE CASCADE,
  hour TIMESTAMP,
  scan_count INT DEFAULT 0,
  PRIMARY KEY (qr_id, hour)
);

-- Function to update daily stats (trigger)
CREATE OR REPLACE FUNCTION update_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO qr_stats_daily (qr_id, date, scan_count, unique_ips)
  VALUES (NEW.qr_id, DATE(NEW.scanned_at), 1, 1)
  ON CONFLICT (qr_id, date)
  DO UPDATE SET 
    scan_count = qr_stats_daily.scan_count + 1,
    unique_ips = qr_stats_daily.unique_ips + CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM scan_logs 
        WHERE qr_id = NEW.qr_id 
        AND DATE(scanned_at) = DATE(NEW.scanned_at)
        AND ip_address = NEW.ip_address
        AND id != NEW.id
      ) THEN 1 ELSE 0 
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on scan_logs insert
DROP TRIGGER IF EXISTS trigger_update_daily_stats ON scan_logs;
CREATE TRIGGER trigger_update_daily_stats
  AFTER INSERT ON scan_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_stats();
