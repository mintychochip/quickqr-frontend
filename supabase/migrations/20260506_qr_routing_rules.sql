-- Dynamic QR Routing Rules Migration
-- Phase 1: Core Rule Engine Database Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Routing rules table for dynamic QR code destinations
CREATE TABLE qr_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_id UUID NOT NULL REFERENCES qrcodes(id) ON DELETE CASCADE,
    
    -- Rule metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Rule type and configuration
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('time', 'geo', 'device', 'scan_count', 'ab_test', 'utm_inject', 'custom')),
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Destination when rule matches
    destination_url TEXT NOT NULL,
    
    -- Match behavior
    match_behavior VARCHAR(20) NOT NULL DEFAULT 'redirect' CHECK (match_behavior IN ('redirect', 'block', 'allow')),
    
    -- Analytics tracking
    track_as_conversion BOOLEAN DEFAULT FALSE,
    conversion_value DECIMAL(10,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_destination_url CHECK (destination_url ~ '^https?://')
);

-- Indexes for qr_routing_rules
CREATE INDEX idx_qr_routing_rules_qr_id_priority ON qr_routing_rules(qr_id, priority DESC);
CREATE INDEX idx_qr_routing_rules_enabled ON qr_routing_rules(enabled);
CREATE INDEX idx_qr_routing_rules_rule_type ON qr_routing_rules(rule_type);
CREATE INDEX idx_qr_routing_rules_created_by ON qr_routing_rules(created_by);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_qr_routing_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_qr_routing_rules_updated_at
    BEFORE UPDATE ON qr_routing_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_routing_rules_updated_at();

-- Routing rule execution logs for analytics
CREATE TABLE qr_routing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_id UUID NOT NULL REFERENCES qrcodes(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES qr_routing_rules(id) ON DELETE SET NULL,
    scan_id UUID,
    
    -- Request context
    matched BOOLEAN NOT NULL,
    source_url TEXT NOT NULL,
    destination_url TEXT,
    
    -- Match details
    rule_type VARCHAR(50),
    match_reason JSONB,
    
    -- Request metadata
    country_code VARCHAR(2),
    region TEXT,
    city TEXT,
    user_agent TEXT,
    device_type VARCHAR(50),
    scan_count INTEGER,
    
    -- Performance
    evaluation_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for qr_routing_logs
CREATE INDEX idx_qr_routing_logs_qr_id_created ON qr_routing_logs(qr_id, created_at DESC);
CREATE INDEX idx_qr_routing_logs_rule_id ON qr_routing_logs(rule_id);
CREATE INDEX idx_qr_routing_logs_scan_id ON qr_routing_logs(scan_id);
CREATE INDEX idx_qr_routing_logs_created_at ON qr_routing_logs(created_at DESC);

-- Partitioning for high-volume logging (optional, can be enabled later)
-- CREATE INDEX idx_qr_routing_logs_created_at_brin ON qr_routing_logs USING BRIN (created_at);

-- Default fallbacks when no rules match
CREATE TABLE qr_routing_defaults (
    qr_id UUID PRIMARY KEY REFERENCES qrcodes(id) ON DELETE CASCADE,
    default_url TEXT NOT NULL,
    fallback_behavior VARCHAR(20) NOT NULL DEFAULT 'redirect' CHECK (fallback_behavior IN ('redirect', 'block', 'show_message')),
    fallback_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_default_url CHECK (default_url ~ '^https?://')
);

-- Trigger to auto-update updated_at on defaults
CREATE TRIGGER trigger_update_qr_routing_defaults_updated_at
    BEFORE UPDATE ON qr_routing_defaults
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_routing_rules_updated_at();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE qr_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_routing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_routing_defaults ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/manage rules for QR codes they own
CREATE POLICY qr_routing_rules_select_policy ON qr_routing_rules
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM qrcodes q
            JOIN profiles p ON q.user_id = p.id
            WHERE q.id = qr_routing_rules.qr_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY qr_routing_rules_insert_policy ON qr_routing_rules
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM qrcodes q
            JOIN profiles p ON q.user_id = p.id
            WHERE q.id = qr_routing_rules.qr_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY qr_routing_rules_update_policy ON qr_routing_rules
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM qrcodes q
            JOIN profiles p ON q.user_id = p.id
            WHERE q.id = qr_routing_rules.qr_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY qr_routing_rules_delete_policy ON qr_routing_rules
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM qrcodes q
            JOIN profiles p ON q.user_id = p.id
            WHERE q.id = qr_routing_rules.qr_id AND p.user_id = auth.uid()
        )
    );

-- Policy: Routing logs are read-only for users who own the QR code
CREATE POLICY qr_routing_logs_select_policy ON qr_routing_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM qrcodes q
            JOIN profiles p ON q.user_id = p.id
            WHERE q.id = qr_routing_logs.qr_id AND p.user_id = auth.uid()
        )
    );

-- No insert/update/delete policies for logs - only edge functions should write

-- Policy: Users can only manage defaults for their own QR codes
CREATE POLICY qr_routing_defaults_select_policy ON qr_routing_defaults
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM qrcodes q
            JOIN profiles p ON q.user_id = p.id
            WHERE q.id = qr_routing_defaults.qr_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY qr_routing_defaults_insert_policy ON qr_routing_defaults
    FOR INSERT WITH CHECK (
        updated_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM qrcodes q
            JOIN profiles p ON q.user_id = p.id
            WHERE q.id = qr_routing_defaults.qr_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY qr_routing_defaults_update_policy ON qr_routing_defaults
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM qrcodes q
            JOIN profiles p ON q.user_id = p.id
            WHERE q.id = qr_routing_defaults.qr_id AND p.user_id = auth.uid()
        )
    );

-- Helper function to get routing rules with analytics summary
CREATE OR REPLACE FUNCTION get_qr_routing_stats(qr_uuid UUID)
RETURNS TABLE (
    rule_id UUID,
    rule_name VARCHAR,
    match_count BIGINT,
    last_matched TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        COUNT(l.id) as match_count,
        MAX(l.created_at) as last_matched
    FROM qr_routing_rules r
    LEFT JOIN qr_routing_logs l ON r.id = l.rule_id AND l.matched = true
    WHERE r.qr_id = qr_uuid
    GROUP BY r.id, r.name
    ORDER BY match_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_qr_routing_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_qr_routing_stats(UUID) TO anon;
