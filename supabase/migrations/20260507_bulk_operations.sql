-- Bulk QR Operations Migration
-- Enables CSV upload for bulk QR creation and management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bulk operations tracking table
CREATE TABLE bulk_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Operation metadata
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('create', 'update', 'delete', 'export')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Progress tracking
    total_items INTEGER NOT NULL DEFAULT 0,
    processed_items INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    
    -- Error details for failed items
    error_details JSONB DEFAULT '[]'::jsonb,
    
    -- Source data (for create operations)
    source_data JSONB DEFAULT '{}'::jsonb,
    
    -- Result summary
    result_summary JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Cancellation
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES auth.users(id)
);

-- Indexes for bulk_operations
CREATE INDEX idx_bulk_operations_user_id ON bulk_operations(user_id);
CREATE INDEX idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX idx_bulk_operations_created_at ON bulk_operations(created_at DESC);
CREATE INDEX idx_bulk_operations_user_status ON bulk_operations(user_id, status);

-- Trigger to auto-update timestamps
CREATE OR REPLACE FUNCTION update_bulk_operations_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'processing' AND OLD.status = 'pending' THEN
        NEW.started_at = NOW();
    END IF;
    IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bulk_operation_timestamps
    BEFORE UPDATE ON bulk_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_bulk_operations_timestamps();

-- Row Level Security Policies
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own bulk operations
CREATE POLICY bulk_operations_select_policy ON bulk_operations
    FOR SELECT USING (user_id = auth.uid());

-- Policy: Users can only insert their own bulk operations
CREATE POLICY bulk_operations_insert_policy ON bulk_operations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Users can only update their own bulk operations
CREATE POLICY bulk_operations_update_policy ON bulk_operations
    FOR UPDATE USING (user_id = auth.uid());

-- Policy: Users can only delete their own bulk operations
CREATE POLICY bulk_operations_delete_policy ON bulk_operations
    FOR DELETE USING (user_id = auth.uid());

-- Helper function to get bulk operation status summary
CREATE OR REPLACE FUNCTION get_bulk_operation_status(op_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'operation_type', operation_type,
        'status', status,
        'progress', CASE 
            WHEN total_items > 0 THEN 
                jsonb_build_object(
                    'processed', processed_items,
                    'total', total_items,
                    'percentage', ROUND((processed_items::numeric / total_items::numeric) * 100, 2),
                    'success', success_count,
                    'errors', error_count
                )
            ELSE '{}'::jsonb
        END,
        'timestamps', jsonb_build_object(
            'created', created_at,
            'started', started_at,
            'completed', completed_at
        )
    ) INTO result
    FROM bulk_operations
    WHERE id = op_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_bulk_operation_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bulk_operation_status(UUID) TO anon;
