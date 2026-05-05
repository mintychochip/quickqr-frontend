import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Health check configuration
const HEALTH_CHECK_TIMEOUT_MS = 10000; // 10 second timeout
const WARNING_RESPONSE_TIME_MS = 5000; // 5 seconds
const CRITICAL_RESPONSE_TIME_MS = 10000; // 10 seconds

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  http_status?: number;
  response_time_ms: number;
  ssl_valid?: boolean;
  ssl_expires_at?: string;
  redirect_count: number;
  final_url?: string;
  error_message?: string;
  error_type?: 'timeout' | 'dns_error' | 'ssl_error' | 'http_error' | 'redirect_loop' | 'unknown';
}

async function performHealthCheck(url: string): Promise<HealthCheckResult> {
  const startTime = Date.now();
  let redirectCount = 0;
  const maxRedirects = 10;
  let currentUrl = url;
  
  try {
    // Validate URL
    let urlObj: URL;
    try {
      urlObj = new URL(currentUrl);
    } catch {
      return {
        status: 'critical',
        response_time_ms: Date.now() - startTime,
        redirect_count: 0,
        error_message: 'Invalid URL format',
        error_type: 'unknown',
      };
    }

    // Follow redirects manually to count them
    while (redirectCount < maxRedirects) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
      
      try {
        const response = await fetch(currentUrl, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        // Handle redirects
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            return {
              status: 'warning',
              http_status: response.status,
              response_time_ms: responseTime,
              redirect_count: redirectCount,
              final_url: currentUrl,
              error_message: 'Redirect without Location header',
              error_type: 'http_error',
            };
          }
          
          // Resolve relative URLs
          currentUrl = new URL(location, currentUrl).href;
          redirectCount++;
          continue;
        }
        
        // Determine status based on response
        let status: 'healthy' | 'warning' | 'critical';
        if (response.status >= 200 && response.status < 300) {
          status = responseTime > WARNING_RESPONSE_TIME_MS ? 'warning' : 'healthy';
        } else if (response.status >= 400 && response.status < 500) {
          status = 'critical';
        } else if (response.status >= 500) {
          status = 'warning';
        } else {
          status = 'unknown';
        }
        
        return {
          status,
          http_status: response.status,
          response_time_ms: responseTime,
          ssl_valid: urlObj.protocol === 'https:' ? true : undefined,
          redirect_count: redirectCount,
          final_url: currentUrl,
        };
        
      } catch (error) {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        // Classify error
        let errorType: 'timeout' | 'dns_error' | 'ssl_error' | 'http_error' | 'unknown' = 'unknown';
        let errorMessage = error.message;
        
        if (error.name === 'AbortError') {
          errorType = 'timeout';
          errorMessage = 'Request timed out';
        } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
          errorType = 'dns_error';
          errorMessage = 'DNS resolution failed';
        } else if (error.message?.includes('SSL') || error.message?.includes('certificate') || error.message?.includes('TLS')) {
          errorType = 'ssl_error';
        }
        
        return {
          status: 'critical',
          response_time_ms: responseTime,
          redirect_count: redirectCount,
          final_url: currentUrl,
          error_message: errorMessage,
          error_type: errorType,
        };
      }
    }
    
    // Too many redirects
    return {
      status: 'critical',
      response_time_ms: Date.now() - startTime,
      redirect_count: redirectCount,
      final_url: currentUrl,
      error_message: 'Too many redirects',
      error_type: 'redirect_loop',
    };
    
  } catch (error) {
    return {
      status: 'critical',
      response_time_ms: Date.now() - startTime,
      redirect_count: redirectCount,
      error_message: error.message,
      error_type: 'unknown',
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: req.headers.get('authorization') || '' 
          } 
        } 
      }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const qrId = pathParts[pathParts.length - 1];

    // GET - Retrieve health status
    if (req.method === 'GET') {
      // Get QR code to verify ownership
      const { data: qrCode, error: qrError } = await supabaseClient
        .from('qr_codes')
        .select('id, user_id, destination_url')
        .eq('id', qrId)
        .single();

      if (qrError || !qrCode) {
        return new Response(JSON.stringify({ error: 'QR code not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (qrCode.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get latest health check
      const { data: latestHealth } = await supabaseClient
        .from('qr_health_checks')
        .select('*')
        .eq('qr_code_id', qrId)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      // Get health history (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: history } = await supabaseClient
        .from('qr_health_checks')
        .select('checked_at, status, http_status, response_time_ms')
        .eq('qr_code_id', qrId)
        .gte('checked_at', thirtyDaysAgo.toISOString())
        .order('checked_at', { ascending: true });

      // Get health config
      const { data: config } = await supabaseClient
        .from('qr_health_configs')
        .select('*')
        .eq('qr_code_id', qrId)
        .single();

      return new Response(JSON.stringify({
        success: true,
        data: {
          qr_code_id: qrId,
          destination_url: qrCode.destination_url,
          current_status: latestHealth || null,
          history: history || [],
          config: config || { enabled: true, check_frequency: 'daily', alert_threshold: 'critical' },
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Trigger health check
    if (req.method === 'POST') {
      // Get QR code
      const { data: qrCode, error: qrError } = await supabaseClient
        .from('qr_codes')
        .select('id, user_id, destination_url')
        .eq('id', qrId)
        .single();

      if (qrError || !qrCode) {
        return new Response(JSON.stringify({ error: 'QR code not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (qrCode.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Perform health check
      const healthResult = await performHealthCheck(qrCode.destination_url);

      // Store result
      const { data: healthCheck, error: insertError } = await supabaseClient
        .from('qr_health_checks')
        .insert({
          qr_code_id: qrId,
          status: healthResult.status,
          http_status: healthResult.http_status,
          response_time_ms: healthResult.response_time_ms,
          ssl_valid: healthResult.ssl_valid,
          ssl_expires_at: healthResult.ssl_expires_at,
          redirect_count: healthResult.redirect_count,
          final_url: healthResult.final_url,
          error_message: healthResult.error_message,
          error_type: healthResult.error_type,
        })
        .select()
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          health_check: healthCheck,
          result: healthResult,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
