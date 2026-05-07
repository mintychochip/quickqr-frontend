import type { APIContext } from 'astro';
import { withAuth, extractWorkspaceId } from '../../../middleware/apiAuth.js';
import { withRateLimit, checkBulkLimit, RATE_LIMIT_TIERS } from '../../../middleware/rateLimit.js';
import type { AuthenticatedContext } from '../../../middleware/apiAuth.js';
import type { RateLimitTier } from '../../../middleware/rateLimit.js';

// QR Code types
interface QRCodeInput {
  name: string;
  type: string;
  content: string;
  mode?: 'static' | 'dynamic';
  slug?: string;
  folder_id?: string;
  styling?: Record<string, unknown>;
  design?: {
    dot_color?: string;
    bg_color?: string;
    corner_style?: string;
    logo_url?: string;
  };
  destination_url?: string;
}

interface QRCodeUpdateInput {
  name?: string;
  content?: string;
  slug?: string;
  folder_id?: string | null;
  styling?: Record<string, unknown>;
  design?: {
    dot_color?: string;
    bg_color?: string;
    corner_style?: string;
    logo_url?: string;
  };
  destination_url?: string;
  mode?: 'static' | 'dynamic';
}

// Valid QR code types
const VALID_QR_TYPES = ['url', 'text', 'email', 'phone', 'sms', 'wifi', 'vcard', 'location', 'calendar', 'crypto', 'event'];

// Generate short code for QR
function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Merge design into styling object
function mergeDesignIntoStyling(
  existingStyling: Record<string, unknown> = {},
  design?: QRCodeInput['design']
): Record<string, unknown> {
  if (!design) return existingStyling;
  
  return {
    ...existingStyling,
    ...(design.dot_color && { dotColor: design.dot_color }),
    ...(design.bg_color && { backgroundColor: design.bg_color }),
    ...(design.corner_style && { cornerStyle: design.corner_style }),
    ...(design.logo_url && { logo: { url: design.logo_url } }),
  };
}

// Validate QR code input
function validateQRCodeInput(input: QRCodeInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!input.name || input.name.trim() === '') {
    errors.push('name is required');
  }
  
  if (!input.type || !VALID_QR_TYPES.includes(input.type)) {
    errors.push(`type must be one of: ${VALID_QR_TYPES.join(', ')}`);
  }
  
  if (!input.content || input.content.trim() === '') {
    errors.push('content is required');
  }
  
  // Validate URL type
  if (input.type === 'url' && input.content) {
    const urlPattern = /^https?:\/\//;
    if (!urlPattern.test(input.content)) {
      errors.push('URL content must start with http:// or https://');
    }
  }
  
  // Validate mode
  if (input.mode && !['static', 'dynamic'].includes(input.mode)) {
    errors.push('mode must be either "static" or "dynamic"');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate slug format
function validateSlug(slug: string): { valid: boolean; error?: string } {
  const slugPattern = /^[a-zA-Z0-9_-]+$/;
  if (!slugPattern.test(slug)) {
    return { valid: false, error: 'Slug can only contain letters, numbers, hyphens, and underscores' };
  }
  if (slug.length < 3 || slug.length > 50) {
    return { valid: false, error: 'Slug must be between 3 and 50 characters' };
  }
  return { valid: true };
}

// Build QR code response
function buildQRCodeResponse(qr: Record<string, unknown>, baseUrl: string): Record<string, unknown> {
  const shortCode = qr.short_code as string;
  const id = qr.id as string;
  
  return {
    id,
    name: qr.name,
    type: qr.type,
    mode: qr.mode,
    content: qr.content,
    slug: shortCode,
    short_url: `${baseUrl}/s/${shortCode}`,
    qr_image_url: `${baseUrl}/api/v1/qr/${id}/download?format=png`,
    folder_id: qr.folder_id,
    styling: qr.styling,
    created_at: qr.created_at,
    updated_at: qr.updated_at,
  };
}

// ============================================
// Main route handlers
// ============================================

export async function GET(context: APIContext) {
  const { params, locals, request } = context;
  const route = params.route as string[] | undefined;
  
  // List QR codes - GET /api/v1/qrcodes
  if (!route || route.length === 0) {
    return withAuth(withRateLimit(handleListQRCodes), ['qrcodes:read'])(context);
  }
  
  // Get single QR code - GET /api/v1/qrcodes/:id
  if (route.length === 1) {
    return withAuth(withRateLimit((ctx) => handleGetQRCode(ctx, route[0])), ['qrcodes:read'])(context);
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(context: APIContext) {
  const { params } = context;
  const route = params.route as string[] | undefined;
  
  // Create QR code - POST /api/v1/qrcodes
  if (!route || route.length === 0) {
    return withAuth(withRateLimit(handleCreateQRCode), ['qrcodes:write'])(context);
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PATCH(context: APIContext) {
  const { params } = context;
  const route = params.route as string[] | undefined;
  
  // Update QR code - PATCH /api/v1/qrcodes/:id
  if (route && route.length === 1) {
    return withAuth(withRateLimit((ctx) => handleUpdateQRCode(ctx, route[0])), ['qrcodes:write'])(context);
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE(context: APIContext) {
  const { params } = context;
  const route = params.route as string[] | undefined;
  
  // Delete QR code - DELETE /api/v1/qrcodes/:id
  if (route && route.length === 1) {
    return withAuth(withRateLimit((ctx) => handleDeleteQRCode(ctx, route[0])), ['qrcodes:write'])(context);
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============================================
// Handler implementations
// ============================================

async function handleListQRCodes(context: AuthenticatedContext): Promise<Response> {
  const { locals, request } = context;
  const supabase = locals.supabase;
  
  // Get workspace ID from header or use API key's default
  const workspaceId = extractWorkspaceId(request) || locals.apiKeyWorkspaceId;
  
  if (!workspaceId) {
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'X-Workspace-ID header is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Parse query parameters
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const type = url.searchParams.get('type');
  const folderId = url.searchParams.get('folder_id');
  const mode = url.searchParams.get('mode');
  
  // Build query
  let query = supabase
    .from('qrcodes')
    .select('*', { count: 'exact' })
    .eq('user_id', locals.apiKeyUserId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (type) query = query.eq('type', type);
  if (folderId) query = query.eq('folder_id', folderId);
  if (mode) query = query.eq('mode', mode);
  
  const { data, error, count } = await query;
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const baseUrl = 'https://quickqr.app';
  const qrcodes = (data || []).map(qr => buildQRCodeResponse(qr, baseUrl));
  
  return new Response(JSON.stringify({
    data: qrcodes,
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGetQRCode(context: AuthenticatedContext, id: string): Promise<Response> {
  const { locals, request } = context;
  const supabase = locals.supabase;
  
  const { data, error } = await supabase
    .from('qrcodes')
    .select('*')
    .eq('id', id)
    .eq('user_id', locals.apiKeyUserId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return new Response(JSON.stringify({ error: 'QR code not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const baseUrl = 'https://quickqr.app';
  
  return new Response(JSON.stringify({
    data: buildQRCodeResponse(data, baseUrl)
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleCreateQRCode(context: AuthenticatedContext): Promise<Response> {
  const { request, locals } = context;
  const supabase = locals.supabase;
  
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateQRCodeInput(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Validation Error',
        message: validation.errors.join(', ')
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate custom slug if provided
    if (body.slug) {
      const slugValidation = validateSlug(body.slug);
      if (!slugValidation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation Error',
          message: slugValidation.error
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if slug is already taken
      const { data: existingQR } = await supabase
        .from('qrcodes')
        .select('id')
        .eq('short_code', body.slug)
        .single();
      
      if (existingQR) {
        return new Response(JSON.stringify({
          error: 'Conflict',
          message: 'This slug is already taken. Please choose another.'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Verify folder exists and belongs to user if provided
    if (body.folder_id) {
      const { data: folder, error: folderError } = await supabase
        .from('qr_folders')
        .select('id')
        .eq('id', body.folder_id)
        .eq('user_id', locals.apiKeyUserId)
        .single();
      
      if (folderError || !folder) {
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid folder_id. Folder not found or access denied.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Merge design into styling
    const styling = mergeDesignIntoStyling(body.styling, body.design);
    
    // Generate short code
    const shortCode = body.slug || generateShortCode();
    
    // Create QR code
    const { data, error } = await supabase
      .from('qrcodes')
      .insert({
        user_id: locals.apiKeyUserId,
        name: body.name.trim(),
        type: body.type,
        content: body.content,
        mode: body.mode || 'dynamic',
        short_code: shortCode,
        folder_id: body.folder_id,
        styling: styling,
      })
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const baseUrl = 'https://quickqr.app';
    
    return new Response(JSON.stringify({
      data: buildQRCodeResponse(data, baseUrl)
    }), {
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

async function handleUpdateQRCode(context: AuthenticatedContext, id: string): Promise<Response> {
  const { request, locals } = context;
  const supabase = locals.supabase;
  
  try {
    // First verify the QR code exists and belongs to the user
    const { data: existingQR, error: fetchError } = await supabase
      .from('qrcodes')
      .select('*')
      .eq('id', id)
      .eq('user_id', locals.apiKeyUserId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'QR code not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const body = await request.json() as QRCodeUpdateInput;
    
    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.content !== undefined) updates.content = body.content;
    if (body.mode !== undefined) updates.mode = body.mode;
    if (body.folder_id !== undefined) updates.folder_id = body.folder_id;
    if (body.destination_url !== undefined) updates.destination_url = body.destination_url;
    
    // Handle slug change
    if (body.slug !== undefined) {
      const slugValidation = validateSlug(body.slug);
      if (!slugValidation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation Error',
          message: slugValidation.error
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if slug is already taken by a different QR
      if (body.slug !== existingQR.short_code) {
        const { data: existing } = await supabase
          .from('qrcodes')
          .select('id')
          .eq('short_code', body.slug)
          .neq('id', id)
          .single();
        
        if (existing) {
          return new Response(JSON.stringify({
            error: 'Conflict',
            message: 'This slug is already taken. Please choose another.'
          }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      updates.short_code = body.slug;
    }
    
    // Handle styling/design merge
    if (body.design !== undefined || body.styling !== undefined) {
      const currentStyling = (existingQR.styling as Record<string, unknown>) || {};
      const newStyling = body.styling || currentStyling;
      updates.styling = mergeDesignIntoStyling(newStyling, body.design);
    }
    
    updates.updated_at = new Date().toISOString();
    
    // Perform update
    const { data, error } = await supabase
      .from('qrcodes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', locals.apiKeyUserId)
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const baseUrl = 'https://quickqr.app';
    
    return new Response(JSON.stringify({
      data: buildQRCodeResponse(data, baseUrl)
    }), {
      status: 200,
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

async function handleDeleteQRCode(context: AuthenticatedContext, id: string): Promise<Response> {
  const { locals } = context;
  const supabase = locals.supabase;
  
  try {
    // Verify the QR code exists and belongs to the user
    const { data: existingQR, error: fetchError } = await supabase
      .from('qrcodes')
      .select('id')
      .eq('id', id)
      .eq('user_id', locals.apiKeyUserId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'QR code not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Delete the QR code
    const { error } = await supabase
      .from('qrcodes')
      .delete()
      .eq('id', id)
      .eq('user_id', locals.apiKeyUserId);
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'QR code deleted successfully'
    }), {
      status: 200,
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

// Export helper functions for testing
export {
  generateShortCode,
  validateQRCodeInput,
  validateSlug,
  buildQRCodeResponse,
  mergeDesignIntoStyling,
  VALID_QR_TYPES,
};
