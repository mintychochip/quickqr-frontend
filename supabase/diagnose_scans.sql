-- DIAGNOSTIC: Check if QR code exists and view recent scans
-- Run this in Supabase Dashboard → SQL Editor

-- Check if the specific QR code exists
SELECT 
    id, 
    name, 
    type, 
    mode, 
    scan_count,
    user_id,
    created_at
FROM qrcodes 
WHERE id = 'fe50098f' 
   OR id LIKE 'fe50098f%'
ORDER BY created_at DESC;

-- Check all QR codes for this user (if you know your user_id)
-- SELECT * FROM qrcodes WHERE user_id = 'your-user-id-here' ORDER BY created_at DESC;

-- Check recent scans
SELECT * FROM scans ORDER BY scanned_at DESC LIMIT 10;

-- Check RLS policies are working
SELECT * FROM pg_policies WHERE tablename = 'qrcodes';

-- Test if increment function exists
SELECT proname FROM pg_proc WHERE proname = 'increment_scan_count';