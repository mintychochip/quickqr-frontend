import type { APIContext } from 'astro';

// CSV parsing types
interface CSVRow {
  [key: string]: string;
}

interface BulkCreateItem {
  url: string;
  title: string;
  type?: 'static' | 'dynamic';
  design_template?: string;
  tags?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface BulkOperationStatus {
  id: string;
  operation_type: string;
  status: string;
  progress: {
    processed: number;
    total: number;
    percentage: number;
    success: number;
    errors: number;
  };
}

// Parse CSV content
function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

// Validate CSV row for QR creation
function validateQRRow(row: CSVRow, rowIndex: number): { valid: boolean; errors: string[]; data?: BulkCreateItem } {
  const errors: string[] = [];
  
  // Required fields
  if (!row.url || row.url.trim() === '') {
    errors.push(`Row ${rowIndex}: Missing required field 'url'`);
  } else {
    // Validate URL format
    const urlPattern = /^https?:\/\//;
    if (!urlPattern.test(row.url)) {
      errors.push(`Row ${rowIndex}: Invalid URL format '${row.url}'. Must start with http:// or https://`);
    }
  }
  
  if (!row.title || row.title.trim() === '') {
    errors.push(`Row ${rowIndex}: Missing required field 'title'`);
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    errors: [],
    data: {
      url: row.url.trim(),
      title: row.title.trim(),
      type: (row.type as 'static' | 'dynamic') || 'dynamic',
      design_template: row.design_template || undefined,
      tags: row.tags || undefined,
      utm_source: row.utm_source || undefined,
      utm_medium: row.utm_medium || undefined,
      utm_campaign: row.utm_campaign || undefined,
    }
  };
}

// Generate short code for QR
function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Main route handler
export async function POST({ request, params, locals }: APIContext) {
  const route = params.route as string[] | undefined;
  
  // Handle /api/v1/bulk-operations/upload - Upload CSV and create bulk operation
  if (route?.[0] === 'upload') {
    return handleUpload(request, locals);
  }
  
  // Handle /api/v1/bulk-operations/:id/cancel - Cancel running operation
  if (route?.[1] === 'cancel' && route[0]) {
    return handleCancel(route[0], locals);
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function GET({ params, locals }: APIContext) {
  const route = params.route as string[] | undefined;
  
  // Handle /api/v1/bulk-operations - List user operations
  if (!route || route.length === 0) {
    return listOperations(locals);
  }
  
  // Handle /api/v1/bulk-operations/:id - Get operation status
  if (route.length === 1) {
    return getOperationStatus(route[0], locals);
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Upload and validate CSV, create bulk operation
async function handleUpload(request: Request, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  
  try {
    const body = await request.json();
    const { csv_content, operation_type = 'create' } = body;
    
    if (!csv_content) {
      return new Response(JSON.stringify({ error: 'Missing csv_content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse CSV
    const rows = parseCSV(csv_content);
    
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'CSV is empty or invalid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate all rows
    const validationErrors: string[] = [];
    const validItems: BulkCreateItem[] = [];
    
    rows.forEach((row, index) => {
      const result = validateQRRow(row, index + 1);
      if (!result.valid) {
        validationErrors.push(...result.errors);
      } else if (result.data) {
        validItems.push(result.data);
      }
    });
    
    // Return validation errors if any
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({
        error: 'CSV validation failed',
        validation_errors: validationErrors,
        total_rows: rows.length,
        valid_rows: validItems.length,
        invalid_rows: validationErrors.length
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create bulk operation record
    const { data: operation, error: opError } = await supabase
      .from('bulk_operations')
      .insert({
        user_id: user.id,
        operation_type,
        status: 'pending',
        total_items: validItems.length,
        processed_items: 0,
        success_count: 0,
        error_count: 0,
        source_data: { items: validItems },
        error_details: [],
        result_summary: {}
      })
      .select()
      .single();
    
    if (opError) {
      return new Response(JSON.stringify({ error: opError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Start processing (in a real implementation, this would be a background job)
    // For now, we process synchronously for small batches (< 10 items)
    if (validItems.length <= 10) {
      await processBulkCreate(operation.id, validItems, supabase);
    }
    
    // Return operation status
    const status = await getBulkOperationStatus(operation.id, supabase);
    
    return new Response(JSON.stringify(status), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Process bulk create operation
async function processBulkCreate(
  operationId: string,
  items: BulkCreateItem[],
  supabase: APIContext['locals']['supabase']
) {
  // Update status to processing
  await supabase
    .from('bulk_operations')
    .update({ status: 'processing' })
    .eq('id', operationId);
  
  const errors: Array<{ row: number; field: string; message: string }> = [];
  let successCount = 0;
  const createdQRs: Array<{ id: string; short_code: string; title: string }> = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    try {
      // Generate short code
      const shortCode = generateShortCode();
      
      // Create QR code
      const { data: qr, error: qrError } = await supabase
        .from('qrcodes')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          name: item.title,
          type: 'url',
          content: item.url,
          short_code: shortCode,
          mode: item.type || 'dynamic',
          styling: item.design_template ? { template: item.design_template } : {},
          utm_source: item.utm_source,
          utm_medium: item.utm_medium,
          utm_campaign: item.utm_campaign,
        })
        .select()
        .single();
      
      if (qrError) {
        errors.push({
          row: i + 1,
          field: 'database',
          message: qrError.message
        });
      } else {
        successCount++;
        createdQRs.push({
          id: qr.id,
          short_code: shortCode,
          title: item.title
        });
        
        // Add tags if provided
        if (item.tags) {
          const tagNames = item.tags.split(',').map(t => t.trim()).filter(Boolean);
          for (const tagName of tagNames) {
            // Get or create tag
            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('name', tagName)
              .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
              .single();
            
            let tagId = existingTag?.id;
            if (!tagId) {
              const { data: newTag } = await supabase
                .from('tags')
                .insert({ name: tagName, user_id: (await supabase.auth.getUser()).data.user?.id })
                .select()
                .single();
              tagId = newTag?.id;
            }
            
            if (tagId) {
              await supabase.from('qr_tags').insert({
                qr_id: qr.id,
                tag_id: tagId
              });
            }
          }
        }
      }
      
      // Update progress
      await supabase
        .from('bulk_operations')
        .update({
          processed_items: i + 1,
          success_count: successCount,
          error_count: errors.length,
          error_details: errors
        })
        .eq('id', operationId);
      
    } catch (err) {
      errors.push({
        row: i + 1,
        field: 'exception',
        message: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }
  
  // Mark as completed
  const finalStatus = errors.length === 0 ? 'completed' : 'completed';
  await supabase
    .from('bulk_operations')
    .update({
      status: finalStatus,
      processed_items: items.length,
      success_count: successCount,
      error_count: errors.length,
      error_details: errors,
      result_summary: {
        created_qrs: createdQRs,
        total_created: successCount,
        total_failed: errors.length
      }
    })
    .eq('id', operationId);
}

// Get operation status
async function getOperationStatus(operationId: string, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  const status = await getBulkOperationStatus(operationId, supabase);
  
  if (!status) {
    return new Response(JSON.stringify({ error: 'Operation not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// List user's operations
async function listOperations(locals: APIContext['locals']) {
  const supabase = locals.supabase;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const { data: operations, error } = await supabase
    .from('bulk_operations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ operations: operations || [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Cancel operation
async function handleCancel(operationId: string, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Verify ownership and status
  const { data: operation } = await supabase
    .from('bulk_operations')
    .select('status, user_id')
    .eq('id', operationId)
    .single();
  
  if (!operation || operation.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Operation not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (operation.status !== 'pending' && operation.status !== 'processing') {
    return new Response(JSON.stringify({ 
      error: `Cannot cancel operation with status: ${operation.status}` 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const { error } = await supabase
    .from('bulk_operations')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id
    })
    .eq('id', operationId);
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ success: true, status: 'cancelled' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Helper to get operation status
async function getBulkOperationStatus(
  operationId: string,
  supabase: APIContext['locals']['supabase']
): Promise<BulkOperationStatus | null> {
  const { data: operation, error } = await supabase
    .from('bulk_operations')
    .select('*')
    .eq('id', operationId)
    .single();
  
  if (error || !operation) return null;
  
  return {
    id: operation.id,
    operation_type: operation.operation_type,
    status: operation.status,
    progress: {
      processed: operation.processed_items,
      total: operation.total_items,
      percentage: operation.total_items > 0
        ? Math.round((operation.processed_items / operation.total_items) * 100)
        : 0,
      success: operation.success_count,
      errors: operation.error_count
    }
  };
}

// Export for testing
export { parseCSV, validateQRRow, generateShortCode };
