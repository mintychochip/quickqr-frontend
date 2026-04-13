-- Create UTM templates table for saving and reusing custom UTM parameter templates
CREATE TABLE IF NOT EXISTS utm_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    medium TEXT NOT NULL,
    campaign TEXT,
    term TEXT,
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE utm_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own templates
CREATE POLICY "Users can view their own UTM templates"
    ON utm_templates
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own templates
CREATE POLICY "Users can create their own UTM templates"
    ON utm_templates
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own templates
CREATE POLICY "Users can update their own UTM templates"
    ON utm_templates
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own templates
CREATE POLICY "Users can delete their own UTM templates"
    ON utm_templates
    FOR DELETE
    USING (auth.uid() = user_id);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_utm_templates_user_id ON utm_templates(user_id);

-- Index for sorting by created_at
CREATE INDEX IF NOT EXISTS idx_utm_templates_created_at ON utm_templates(created_at DESC);

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_utm_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_utm_templates_updated_at
    BEFORE UPDATE ON utm_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_utm_templates_updated_at();

-- Enable realtime for utm_templates
ALTER PUBLICATION supabase_realtime ADD TABLE utm_templates;
