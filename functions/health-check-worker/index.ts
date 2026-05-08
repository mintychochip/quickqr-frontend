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

async function getQRCodeDetails(supabaseClient: any, qrId: string): Promise<{name: string, destination_url: string, user_id: string} | null> {
  const { data: qr } = await supabaseClient
    .from('qr_codes')
    .select('name, destination_url, user_id')
    .eq('id', qrId)
    .single();
  return qr;
}

async function getUserEmail(supabaseClient: any, userId: string): Promise<string | null> {
  const { data: prefs } = await supabaseClient
    .from('user_health_notification_prefs')
    .select('email_address, email_enabled')
    .eq('user_id', userId)
    .single();
  
  if (prefs?.email_enabled === false) return null;
  return prefs?.email_address || null;
}

async function sendEmailAlert(
  qrName: string,
  qrUrl: string,
  status: string,
  errorMessage: string | undefined,
  userEmail: string
): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email alert');
    return false;
  }

  const statusEmoji = status === 'critical' ? '🔴' : '🟡';
  const statusText = status === 'critical' ? 'Critical' : 'Warning';
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'QuickQR Health Alerts <health@quickqr.app>',
        to: userEmail,
        subject: `${statusEmoji} QR Code Health Alert: ${qrName} is ${statusText}`,
        html: `
          <h2>QR Code Health Alert</h2>
          <p>Your QR code <strong>${qrName}</strong> is experiencing issues.</p>
          <ul>
            <li><strong>Status:</strong> ${statusText}</li>
            <li><strong>Destination URL:</strong> ${qrUrl}</li>
            ${errorMessage ? `<li><strong>Error:</strong> ${errorMessage}</li>` : ''}
          </ul>
          <p><a href="https://quickqr.app/dashboard">View your dashboard</a> for more details.</p>
        `,
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('Failed to send email alert:', err);
    return false;
  }
}

async function sendSlackAlert(
  qrName: string,
  qrUrl: string,
  status: string,
  errorMessage: string | undefined,
  slackWebhookUrl: string
): Promise<boolean> {
  const statusEmoji = status === 'critical' ? '🔴' : '🟡';
  const statusText = status === 'critical' ? 'Critical' : 'Warning';
  
  try {
    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${statusEmoji} QR Code Health Alert`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${statusEmoji} QR Code Health Alert`,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*QR Code:*\n${qrName}` },
              { type: 'mrkdwn', text: `*Status:*\n${statusText}` },
              { type: 'mrkdwn', text: `*URL:*\n${qrUrl}` },
              ...(errorMessage ? [{ type: 'mrkdwn', text: `*Error:*\n${errorMessage}` }] : []),
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Dashboard' },
                url: 'https://quickqr.app/dashboard',
              },
            ],
          },
        ],
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('Failed to send Slack alert:', err);
    return false;
  }
}

async function sendWebhookAlert(
  qrName: string,
  qrUrl: string,
  status: string,
  errorMessage: string | undefined,
  webhookUrl: string,
  customHeaders: Record<string, string> | null
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: 'qr_health_alert',
        timestamp: new Date().toISOString(),
        data: {
          qr_name: qrName,
          qr_url: qrUrl,
          status,
          error_message: errorMessage,
        },
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('Failed to send webhook alert:', err);
    return false;
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

  // Get QR code details for notifications
  const qrDetails = await getQRCodeDetails(supabaseClient, qrId);
  if (!qrDetails) return;

  // Get user's notification preferences
  const { data: notifPrefs } = await supabaseClient
    .from('user_health_notification_prefs')
    .select('*')
    .eq('user_id', qrDetails.user_id)
    .single();

  // Create in-app alert (always)
  const alertsToInsert: Array<{
    qr_code_id: string;
    health_check_id: string;
    alert_type: 'email' | 'slack' | 'webhook' | 'in_app';
    status: 'pending' | 'sent' | 'failed';
  }> = [
    {
      qr_code_id: qrId,
      health_check_id: latestCheck.id,
      alert_type: 'in_app',
      status: 'sent', // In-app is immediate
    },
  ];
  
  // Send email alert if enabled
  if (notifPrefs?.email_enabled !== false) {
    const userEmail = notifPrefs?.email_address || await getUserEmail(supabaseClient, qrDetails.user_id);
    if (userEmail) {
      const sent = await sendEmailAlert(
        qrDetails.name || 'Unnamed QR',
        qrDetails.destination_url,
        result.status,
        result.error_message,
        userEmail
      );
      alertsToInsert.push({
        qr_code_id: qrId,
        health_check_id: latestCheck.id,
        alert_type: 'email',
        status: sent ? 'sent' : 'failed',
      });
    }
  }
  
  // Send Slack alert if enabled
  if (notifPrefs?.slack_enabled && notifPrefs?.slack_webhook_url) {
    const sent = await sendSlackAlert(
      qrDetails.name || 'Unnamed QR',
      qrDetails.destination_url,
      result.status,
      result.error_message,
      notifPrefs.slack_webhook_url
    );
    alertsToInsert.push({
      qr_code_id: qrId,
      health_check_id: latestCheck.id,
      alert_type: 'slack',
      status: sent ? 'sent' : 'failed',
    });
  }
  
  // Send webhook alert if enabled
  if (notifPrefs?.webhook_enabled && notifPrefs?.webhook_url) {
    const sent = await sendWebhookAlert(
      qrDetails.name || 'Unnamed QR',
      qrDetails.destination_url,
      result.status,
      result.error_message,
      notifPrefs.webhook_url,
      notifPrefs.webhook_headers
    );
    alertsToInsert.push({
      qr_code_id: qrId,
      health_check_id: latestCheck.id,
      alert_type: 'webhook',
      status: sent ? 'sent' : 'failed',
    });
  }
  
  // Insert all alert records
  const { error } = await supabaseClient
    .from('qr_health_alerts')
    .insert(alertsToInsert);
    
  if (error) {
    console.error(`Error creating alerts for QR ${qrId}:`, error);
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
