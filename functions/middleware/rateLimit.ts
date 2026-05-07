import type { APIContext } from 'astro';
import type { AuthenticatedContext } from './apiAuth.js';

// Rate limit tiers configuration
export const RATE_LIMIT_TIERS = {
  free: {
    requestsPerMinute: 60,
    burstSize: 10,
    bulkMax: 10,
  },
  standard: {
    requestsPerMinute: 600,
    burstSize: 100,
    bulkMax: 100,
  },
  pro: {
    requestsPerMinute: 3000,
    burstSize: 500,
    bulkMax: 500,
  },
  enterprise: {
    requestsPerMinute: 10000,
    burstSize: 2000,
    bulkMax: 1000,
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

export interface RateLimitState {
  count: number;
  resetTime: number;
  windowStart: number;
}

// In-memory rate limit storage (per-worker instance)
const rateLimitStore = new Map<string, RateLimitState>();

/**
 * Get rate limit key for an API key
 */
export function getRateLimitKey(apiKeyId: string, tier: RateLimitTier): string {
  return `${apiKeyId}:${tier}`;
}

/**
 * Check if a request is allowed based on rate limits
 * Uses sliding window algorithm
 */
export function checkRateLimit(
  apiKeyId: string,
  tier: RateLimitTier = 'standard'
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const limits = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.standard;
  const windowMs = 60000; // 1 minute in milliseconds
  
  const key = getRateLimitKey(apiKeyId, tier);
  let state = rateLimitStore.get(key);
  
  // Initialize or reset if window has passed
  if (!state || now > state.resetTime) {
    state = {
      count: 0,
      resetTime: now + windowMs,
      windowStart: now,
    };
  }
  
  const timeElapsed = now - state.windowStart;
  const windowProgress = timeElapsed / windowMs;
  
  // Calculate how many requests should have been "refilled" in the sliding window
  const requestsToRefill = Math.floor(windowProgress * limits.requestsPerMinute);
  const effectiveCount = Math.max(0, state.count - requestsToRefill);
  
  // Check burst limit
  const burstLimit = limits.burstSize;
  const allowed = effectiveCount < burstLimit;
  
  if (allowed) {
    state.count = effectiveCount + 1;
    rateLimitStore.set(key, state);
  }
  
  const remaining = Math.max(0, burstLimit - effectiveCount - (allowed ? 1 : 0));
  
  return {
    allowed,
    remaining,
    resetAt: state.resetTime,
  };
}

/**
 * Log API request for analytics and rate limiting
 */
export async function logAPIRequest(
  context: AuthenticatedContext,
  statusCode: number,
  responseTimeMs: number
): Promise<void> {
  const { request, locals } = context;
  const supabase = locals.supabase;
  
  // Get client IP
  const ip = request.headers.get('cf-connecting-ip') || 
             request.headers.get('x-forwarded-for')?.split(',')[0] || 
             '0.0.0.0';
  
  // Extract endpoint from URL
  const url = new URL(request.url);
  const endpoint = url.pathname;
  const method = request.method;
  
  // Log asynchronously (don't block response)
  try {
    await supabase.from('api_request_logs').insert({
      api_key_id: locals.apiKeyId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip,
    });
  } catch (error) {
    // Log failures shouldn't break the API
    console.error('Failed to log API request:', error);
  }
}

/**
 * Rate limit middleware
 * Returns 429 if rate limit exceeded
 */
export async function rateLimitMiddleware(
  context: AuthenticatedContext
): Promise<Response | AuthenticatedContext> {
  const { locals } = context;
  const tier = (locals.apiKeyTier as RateLimitTier) || 'standard';
  const apiKeyId = locals.apiKeyId;
  
  if (!apiKeyId) {
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Rate limiting requires authentication'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const result = checkRateLimit(apiKeyId, tier);
  
  if (!result.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate Limit Exceeded',
      message: `Rate limit exceeded for tier: ${tier}. Please retry after ${new Date(result.resetAt).toISOString()}`,
      tier,
      reset_at: new Date(result.resetAt).toISOString(),
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(RATE_LIMIT_TIERS[tier].requestsPerMinute),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      }
    });
  }
  
  // Add rate limit headers to response context
  return {
    ...context,
    locals: {
      ...locals,
      rateLimitRemaining: result.remaining,
      rateLimitResetAt: result.resetAt,
    }
  } as AuthenticatedContext;
}

/**
 * Wrap a handler with rate limiting
 */
export function withRateLimit(
  handler: (context: AuthenticatedContext) => Promise<Response>
): (context: AuthenticatedContext) => Promise<Response> {
  return async (context: AuthenticatedContext) => {
    const startTime = Date.now();
    
    // Check rate limit
    const rateLimitResult = await rateLimitMiddleware(context);
    
    if (rateLimitResult instanceof Response) {
      return rateLimitResult;
    }
    
    // Call handler
    const response = await handler(rateLimitResult);
    
    // Log the request
    const responseTime = Date.now() - startTime;
    await logAPIRequest(rateLimitResult, response.status, responseTime);
    
    // Add rate limit headers to successful responses
    const newHeaders = new Headers(response.headers);
    const tier = (context.locals.apiKeyTier as RateLimitTier) || 'standard';
    newHeaders.set('X-RateLimit-Limit', String(RATE_LIMIT_TIERS[tier].requestsPerMinute));
    newHeaders.set('X-RateLimit-Remaining', String(context.locals.rateLimitRemaining ?? 0));
    newHeaders.set('X-RateLimit-Reset', String(Math.ceil((context.locals.rateLimitResetAt ?? Date.now() + 60000) / 1000)));
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}

/**
 * Check if bulk operation size is within tier limits
 */
export function checkBulkLimit(
  itemCount: number,
  tier: RateLimitTier = 'standard'
): { allowed: boolean; maxAllowed: number } {
  const limits = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.standard;
  const maxAllowed = limits.bulkMax;
  
  return {
    allowed: itemCount <= maxAllowed,
    maxAllowed,
  };
}
