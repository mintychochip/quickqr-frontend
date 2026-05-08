import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Health check configuration
const HEALTH_CHECK_TIMEOUT_MS = 10000; // 10 second timeout
const WARNING_RESPONSE_TIME_MS = 5000; // 5 seconds
const MAX_REDIRECTS = 10;
const BATCH_SIZE = 50; // Process QR codes in batches

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

interface QRCodeToCheck {
  id: string;
  destination_url: string;
  user_id: string;
  last_checked_at: string | null;
  check_frequency: string;
}

async function performHealthCheck(url: string): Promise<HealthCheckResult> {
  const startTime = Date.now();
  let redirectCount = 0;
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
    while (redirectCount < MAX_REDIRECTS) {
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
        let status: 'healthy' | 'warning' | 'critical' | 'unknown';
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

async function getQRCodesToCheck(supabaseClient: any): Promise<QRCodeToCheck[]> {
  const now = new Date();
  
  // Get QR codes that need checking based on their frequency
  // hourly: last check > 1 hour ago
  // daily: last check > 24 hours ago (default)
  // weekly: last check > 7 days ago
  const { data: qrCodes, error } = await supabaseClient
    .from('qr_codes')
    .select(`
      id,
      destination_url,
      user_id,
      qr_health_configs!left(
        check_frequency,
        enabled
      ),
      qr_health_checks!left(
        checked_at
      )
    `)
    .eq('qr_health_configs.enabled', true)
    .or('qr_health_configs.check_frequency.is.null,qr_health_configs.check_frequency.eq.daily')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('Error fetching QR codes:', error);
    return [];
  }

  // Filter by last check time based on frequency
  const codesToCheck: QRCodeToCheck[] = [];
  
  for (const qr of qrCodes || []) {
    const frequency = qr.qr_health_configs?.[0]?.check_frequency || 'daily';
    const lastCheck = qr.qr_health_checks?.[0]?.checked_at;
    
    let needsCheck = false;
    
    if (!lastCheck) {
      needsCheck = true;
    } else {
      const lastCheckDate = new Date(lastCheck);
      const hoursSinceLastCheck = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60);
      
      switch (frequency) {
        case 'hourly':
          needsCheck = hoursSinceLastCheck >= 1;
          break;
        case 'daily':
          needsCheck = hoursSinceLastCheck >= 24;
          break;
        case 'weekly':
          needsCheck = hoursSinceLastCheck >= 168; // 7 days
          break;
      }
    }
    
    if (needsCheck) {
      codesToCheck.push({
        id: qr.id,
        destination_url: qr.destination_url,
        user_id: qr.user_id,
        last_checked_at: lastCheck,
        check_frequency: frequency,
      });
    }
  }
  
  return codesToCheck;
}

async function saveHealthCheck(
  supabaseClient: any,
  qrId: string,
  result: HealthCheckResult
): Promise<void> {
  const { error } = await supabaseClient
    .from('qr_health_checks')
    .insert({
      qr_code_id: qrId,
      status: result.status,
      http_status: result.http_status,
      response_time_ms: result.response_time_ms,
      ssl_valid: result.ssl_valid,
      ssl_expires_at: result.ssl_expires_at,
      redirect_count: result.redirect_count,
      final_url: result.final_url,
      error_message: result.error_message,
      error_type: result.error_type,
    });

  if (error) {
    console.error(`Error saving health check for QR ${qrId}:`, error);
  }
}

async function maybeCreateAlert(
  supabaseClient: any,
  qrId: string,
  result: HealthCheckResult,
  previousStatus: string | null
): Promise<void> {
  // Only alert on status change to warning or critical
  if (result.status === 'healthy' || result.status === previousStatus) {
    return;
  }
  
  // Check alert threshold from config
  const { data: config } = await supabaseClient
    .from('qr_health_configs')
    .select('alert_threshold')
    .eq('qr_code_id', qrId)
    .single();
    
  const threshold = config?.alert_threshold || 'critical';
  
  // Skip if threshold is 'critical' and status is only 'warning'
  if (threshold === 'critical' && result.status === 'warning') {
    return;
  }
  
  // Get the latest health check ID
  const { data: latestCheck } = await supabaseClient
    .from('qr_health_checks')
    .select('id')
    .eq('qr_code_id', qrId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .single();
    
  if (!latestCheck) return;
  
  // Create in-app alert
  const { error } = await supabaseClient
    .from('qr_health_alerts')
    .insert({
      qr_code_id: qrId,
      health_check_id: latestCheck.id,
      alert_type: 'in_app',
      status: 'pending',
    });
    
  if (error) {
    console.error(`Error creating alert for QR ${qrId}:`, error);
  }
}

Deno.serve(async (req: Request) => {
  // This endpoint can be triggered by:
  // 1. Supabase cron job (via pg_cron extension)
  // 2. External scheduler (e.g., GitHub Actions, AWS EventBridge)
  // 3. Manual trigger for testing
  
  // Simple auth check - verify cron secret if provided
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  
  if (expectedSecret && cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase with service role key for background processing
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!serviceRoleKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not set, using anon key - RLS may block some operations');
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey || Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const startTime = Date.now();
    const stats = {
      checked: 0,
      healthy: 0,
      warning: 0,
      critical: 0,
      errors: 0,
    };

    // Get QR codes that need checking
    const qrCodes = await getQRCodesToCheck(supabaseClient);
    
    console.log(`Found ${qrCodes.length} QR codes to check`);

    // Process each QR code
    for (const qr of qrCodes) {
      try {
        // Get previous status for alert comparison
        const { data: previousCheck } = await supabaseClient
          .from('qr_health_checks')
          .select('status')
          .eq('qr_code_id', qr.id)
          .order('checked_at', { ascending: false })
          .limit(1)
          .single();

        // Perform the health check
        const result = await performHealthCheck(qr.destination_url);
        
        // Save the result
        await saveHealthCheck(supabaseClient, qr.id, result);
        
        // Update stats
        stats.checked++;
        stats[result.status]++;
        
        // Create alert if status changed to warning/critical
        await maybeCreateAlert(supabaseClient, qr.id, result, previousCheck?.status || null);
        
        // Small delay to avoid overwhelming target servers
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        console.error(`Error checking QR ${qr.id}:`, err);
        stats.errors++;
      }
    }

    const duration = Date.now() - startTime;
    
    const response = {
      success: true,
      stats,
      duration_ms: duration,
      processed_at: new Date().toISOString(),
    };
    
    console.log('Health check worker completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Health check worker error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
