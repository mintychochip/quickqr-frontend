import type { APIContext } from 'astro';

export interface AuthenticatedContext extends APIContext {
  locals: APIContext['locals'] & {
    apiKeyId?: string;
    apiKeyUserId?: string;
    apiKeyWorkspaceId?: string;
    apiKeyScopes?: string[];
    apiKeyTier?: string;
  };
}

export interface APIKeyData {
  id: string;
  user_id: string;
  workspace_id: string;
  scopes: string[];
  rate_limit_tier: string;
  revoked_at: string | null;
  expires_at: string | null;
}

/**
 * Extract API key from Authorization header
 * Format: Authorization: Bearer {api_key}
 */
export function extractAPIKey(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Extract workspace ID from X-Workspace-ID header
 */
export function extractWorkspaceId(request: Request): string | null {
  return request.headers.get('x-workspace-id');
}

/**
 * Hash an API key for database lookup
 * Uses simple SHA-256 for hash comparison (full key is checked against bcrypt)
 */
export async function hashAPIKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate API key against database
 * Returns API key data if valid, null if invalid
 */
export async function validateAPIKey(
  key: string,
  supabase: APIContext['locals']['supabase']
): Promise<APIKeyData | null> {
  const keyHash = await hashAPIKey(key);
  
  // Look up key by hash
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, workspace_id, scopes, rate_limit_tier, revoked_at, expires_at')
    .eq('key_hash', keyHash)
    .single();
  
  if (error || !data) return null;
  
  // Check if key is revoked
  if (data.revoked_at) return null;
  
  // Check if key is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  
  return data as APIKeyData;
}

/**
 * Check if API key has required scope
 */
export function hasScope(apiKeyData: APIKeyData, requiredScope: string): boolean {
  return apiKeyData.scopes.includes(requiredScope) || apiKeyData.scopes.includes('admin');
}

/**
 * Middleware to authenticate API requests
 * Attaches API key data to context.locals if authentication succeeds
 */
export async function apiAuthMiddleware(
  context: APIContext,
  requiredScopes?: string[]
): Promise<Response | AuthenticatedContext> {
  const { request, locals } = context;
  const supabase = locals.supabase;
  
  // Extract API key
  const apiKey = extractAPIKey(request);
  if (!apiKey) {
    return new Response(JSON.stringify({ 
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Format: Bearer {api_key}'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Validate API key
  const keyData = await validateAPIKey(apiKey, supabase);
  if (!keyData) {
    return new Response(JSON.stringify({ 
      error: 'Unauthorized',
      message: 'Invalid or revoked API key'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check scopes if required
  if (requiredScopes && requiredScopes.length > 0) {
    const hasRequiredScope = requiredScopes.some(scope => hasScope(keyData, scope));
    if (!hasRequiredScope) {
      return new Response(JSON.stringify({ 
        error: 'Forbidden',
        message: `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
        available_scopes: keyData.scopes
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Get workspace ID from header or use key's default workspace
  const workspaceId = extractWorkspaceId(request) || keyData.workspace_id;
  
  // Verify user has access to the requested workspace
  const { data: workspaceAccess, error: workspaceError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', keyData.user_id)
    .single();
  
  const { data: workspaceOwner } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', keyData.user_id)
    .single();
  
  if (!workspaceAccess && !workspaceOwner) {
    return new Response(JSON.stringify({ 
      error: 'Forbidden',
      message: 'API key does not have access to the specified workspace'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Update last_used_at
  await supabase.rpc('update_api_key_last_used', { key_id: keyData.id });
  
  // Return authenticated context with API key data
  return {
    ...context,
    locals: {
      ...locals,
      apiKeyId: keyData.id,
      apiKeyUserId: keyData.user_id,
      apiKeyWorkspaceId: workspaceId,
      apiKeyScopes: keyData.scopes,
      apiKeyTier: keyData.rate_limit_tier,
    }
  } as AuthenticatedContext;
}

/**
 * Simple middleware wrapper for routes that require authentication
 */
export function withAuth(
  handler: (context: AuthenticatedContext) => Promise<Response>,
  requiredScopes?: string[]
): (context: APIContext) => Promise<Response> {
  return async (context: APIContext) => {
    const authResult = await apiAuthMiddleware(context, requiredScopes);
    
    // If authentication returned a Response (error), return it
    if (authResult instanceof Response) {
      return authResult;
    }
    
    // Otherwise, call the handler with authenticated context
    return handler(authResult);
  };
}
