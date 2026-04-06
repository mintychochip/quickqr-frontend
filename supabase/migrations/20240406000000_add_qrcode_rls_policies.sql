-- Enable RLS on qrcodes if not already enabled
ALTER TABLE qrcodes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access" ON qrcodes;
DROP POLICY IF EXISTS "Allow authenticated users to read own QR codes" ON qrcodes;
DROP POLICY IF EXISTS "Allow authenticated users to insert own QR codes" ON qrcodes;
DROP POLICY IF EXISTS "Allow authenticated users to update own QR codes" ON qrcodes;
DROP POLICY IF EXISTS "Allow authenticated users to delete own QR codes" ON qrcodes;

-- Public read access (needed for redirect URLs to work)
CREATE POLICY "Allow public read access" ON qrcodes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can only insert their own QR codes
CREATE POLICY "Allow authenticated users to insert own QR codes" ON qrcodes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can only update their own QR codes
CREATE POLICY "Allow authenticated users to update own QR codes" ON qrcodes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can only delete their own QR codes
CREATE POLICY "Allow authenticated users to delete own QR codes" ON qrcodes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Also ensure scans table allows inserts from anonymous users
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert scans" ON scans;

CREATE POLICY "Allow public insert scans" ON scans
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow reading scans only for the QR code owner
DROP POLICY IF EXISTS "Allow owners to read scans" ON scans;

CREATE POLICY "Allow owners to read scans" ON scans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qrcodes
      WHERE qrcodes.id = scans.qrcode_id
      AND qrcodes.user_id = auth.uid()
    )
  );