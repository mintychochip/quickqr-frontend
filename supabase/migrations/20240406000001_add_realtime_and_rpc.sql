-- Create function to safely increment scan count
CREATE OR REPLACE FUNCTION increment_scan_count(qr_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE qrcodes
  SET scan_count = COALESCE(scan_count, 0) + 1
  WHERE id = qr_id;
END;
$$;

-- Enable realtime for qrcodes table
ALTER TABLE qrcodes REPLICA IDENTITY FULL;

-- Add qrcodes to realtime publication (if not already there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'qrcodes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE qrcodes;
  END IF;
END
$$;

-- Enable realtime for scans table
ALTER TABLE scans REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'scans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE scans;
  END IF;
END
$$;