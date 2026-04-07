-- Create folders table first (needed for foreign key)
CREATE TABLE IF NOT EXISTS qr_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#14b8a6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add password protection and folder support to qrcodes table
ALTER TABLE qrcodes 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES qr_folders(id),
ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS schedule_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS schedule_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS schedule_alternate_content JSONB;

-- Create team shares table
CREATE TABLE IF NOT EXISTS qr_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qrcode_id UUID REFERENCES qrcodes(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission TEXT CHECK (permission IN ('view', 'edit', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(qrcode_id, shared_with_user_id)
);

-- Add referrer and location tracking to scans
ALTER TABLE scans 
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS ip_hash TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Enable RLS on new tables
ALTER TABLE qr_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for folders
CREATE POLICY "Users can view own folders" ON qr_folders
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own folders" ON qr_folders
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own folders" ON qr_folders
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own folders" ON qr_folders
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- RLS policies for shares
CREATE POLICY "Users can view shares they gave" ON qr_shares
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM qrcodes WHERE qrcodes.id = qr_shares.qrcode_id AND qrcodes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view shares they received" ON qr_shares
    FOR SELECT TO authenticated
    USING (shared_with_user_id = auth.uid());

CREATE POLICY "QR owners can create shares" ON qr_shares
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM qrcodes WHERE qrcodes.id = qr_shares.qrcode_id AND qrcodes.user_id = auth.uid()
        )
    );

CREATE POLICY "QR owners can delete shares" ON qr_shares
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM qrcodes WHERE qrcodes.id = qr_shares.qrcode_id AND qrcodes.user_id = auth.uid()
        )
    );