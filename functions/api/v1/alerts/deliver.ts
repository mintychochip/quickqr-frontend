import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_ALERTS_PER_WINDOW = 10; // Max 10 alerts per hour per QR code

interface AlertPayload {
  qr_code_id: string;
  health_check_id: string;
  status: 'warning' | 'critical';
  message: string;
  details: {
    http_status?: number;
    response_time_ms?: number;
    error_message?: string;
    error_type?: string;
    destination_url: string;
    qr_code_name?: string;
  };
}

interface NotificationSettings {
  email_enabled: boolean;
  email_address: string | null;
  slack_enabled: boolean;
  slack_webhook_url: string | null;
  slack_channel: string | null;
  webhook_enabled: boolean;
  webhook_url: string | null;
  webhook_headers: Record<string, string> | null;
}

// Check rate limit for a QR code
async function checkRateLimit(
  supabase: any,
  qrCodeId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  
  const { count, error } = await supabase
    .from('qr_health_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('qr_code_id', qrCodeId)
    .gte('created_at', windowStart);

  if (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: false, remaining: 0 };
  }

  const remaining = Math.max(0, MAX_ALERTS_PER_WINDOW - (count || 0));
  return { allowed: remaining > 0, remaining };
}

// Send email via Resend
async function sendEmailAlert(
  to: string,
  payload: AlertPayload,
  settings: NotificationSettings
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const subject = payload.status === 'critical' 
    ? `🚨 CRITICAL: QR Code "${payload.details.qr_code_name || 'Unnamed'}" is down`
    : `⚠️ WARNING: QR Code "${payload.details.qr_code_name || 'Unnamed'}" has issues`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${payload.status === 'critical' ? '#dc2626' : '#ea580c'};">${subject}</h2>
      <p>Your QR code health check has detected an issue:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>QR Code</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${payload.details.qr_code_name || 'Unnamed'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Destination URL</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${payload.details.destination_url}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Status</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb; color: ${payload.status === 'critical' ? '#dc2626' : '#ea580c'}; font-weight: bold;">${payload.status.toUpperCase()}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Error</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${payload.details.error_message || 'Unknown error'}</td></tr>
        ${payload.details.http_status ? `<tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>HTTP Status</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${payload.details.http_status}</td></tr>` : ''}
        ${payload.details.response_time_ms ? `<tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Response Time</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${payload.details.response_time_ms}ms</td></tr>` : ''}
      </table>
      <p style="color: #6b7280; font-size: 14px;">This alert was sent by QuickQR Health Monitoring.</p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'QuickQR Alerts <alerts@quickqr.app>',
        to,
        subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Resend API error: ${error}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Send Slack webhook alert
async function sendSlackAlert(
  payload: AlertPayload,
  settings: NotificationSettings
): Promise<{ success: boolean; error?: string }> {
  if (!settings.slack_webhook_url) {
    return { success: false, error: 'Slack webhook URL not configured' };
  }

  const color = payload.status === 'critical' ? '#dc2626' : '#ea580c';
  const emoji = payload.status === 'critical' ? '🚨' : '⚠️';

  const slackPayload = {
    channel: settings.slack_channel,
    username: 'QuickQR Health Bot',
    icon_emoji: ':qr_code:',
    attachments: [{
      color,
      title: `${emoji} QR Code Health Alert`,
      fields: [
        { title: 'QR Code', value: payload.details.qr_code_name || 'Unnamed', short: true },
        { title: 'Status', value: payload.status.toUpperCase(), short: true },
        { title: 'URL', value: payload.details.destination_url, short: false },
        { title: 'Error', value: payload.details.error_message || 'Unknown error', short: false },
        ...(payload.details.http_status ? [{ title: 'HTTP Status', value: String(payload.details.http_status), short: true }] : []),
        ...(payload.details.response_time_ms ? [{ title: 'Response Time', value: `${payload.details.response_time_ms}ms`, short: true }] : []),
      ],
      footer: 'QuickQR Health Monitoring',
      ts: Math.floor(Date.now() / 1000),
    }],
  };

  try {
    const response = await fetch(settings.slack_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Slack webhook error: ${error}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Send custom webhook alert
async function sendCustomWebhook(
  payload: AlertPayload,
  settings: NotificationSettings
): Promise<{ success: boolean; error?: string }> {
  if (!settings.webhook_url) {
    return { success: false, error: 'Custom webhook URL not configured' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((settings.webhook_headers as Record<string, string>) || {}),
  };

  const webhookPayload = {
    event: 'qr_health_alert',
    timestamp: new Date().toISOString(),
    qr_code_id: payload.qr_code_id,
    health_check_id: payload.health_check_id,
    status: payload.status,
    message: payload.message,
    details: payload.details,
  };

  try {
    const response = await fetch(settings.webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Webhook error: ${response.status} ${error}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Log alert to database
async function logAlert(
  supabase: any,
  payload: AlertPayload,
  alertType: 'email' | 'slack' | 'webhook',
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  await supabase.from('qr_health_alerts').insert({
    qr_code_id: payload.qr_code_id,
    health_check_id: payload.health_check_id,
    alert_type: alertType,
    status,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
    error_message: errorMessage || null,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse request body
    const payload: AlertPayload = await req.json();

    // Validate payload
    if (!payload.qr_code_id || !payload.health_check_id || !payload.status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    const { allowed, remaining } = await checkRateLimit(supabaseClient, payload.qr_code_id);
    if (!allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: `Maximum ${MAX_ALERTS_PER_WINDOW} alerts per hour exceeded for this QR code`,
        remaining: 0,
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get QR code details
    const { data: qrCode } = await supabaseClient
      .from('qr_codes')
      .select('id, user_id, name, destination_url')
      .eq('id', payload.qr_code_id)
      .single();

    if (!qrCode) {
      return new Response(JSON.stringify({ error: 'QR code not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payload with QR code name
    payload.details.qr_code_name = qrCode.name;
    payload.details.destination_url = qrCode.destination_url;

    // Get notification settings
    const { data: settings } = await supabaseClient
      .rpc('get_qr_health_notification_settings', { p_qr_code_id: payload.qr_code_id })
      .single();

    if (!settings) {
      return new Response(JSON.stringify({ 
        error: 'No notification settings found',
        message: 'User has not configured notification preferences',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { type: string; success: boolean; error?: string }[] = [];

    // Send email alert
    if (settings.email_enabled) {
      const emailResult = await sendEmailAlert(
        settings.email_address || qrCode.user_id, // Fallback: would need to fetch user email
        payload,
        settings
      );
      await logAlert(supabaseClient, payload, 'email', emailResult.success ? 'sent' : 'failed', emailResult.error);
      results.push({ type: 'email', ...emailResult });
    }

    // Send Slack alert
    if (settings.slack_enabled) {
      const slackResult = await sendSlackAlert(payload, settings);
      await logAlert(supabaseClient, payload, 'slack', slackResult.success ? 'sent' : 'failed', slackResult.error);
      results.push({ type: 'slack', ...slackResult });
    }

    // Send custom webhook alert
    if (settings.webhook_enabled) {
      const webhookResult = await sendCustomWebhook(payload, settings);
      await logAlert(supabaseClient, payload, 'webhook', webhookResult.success ? 'sent' : 'failed', webhookResult.error);
      results.push({ type: 'webhook', ...webhookResult });
    }

    const allFailed = results.length > 0 && results.every(r => !r.success);
    const someSuccess = results.some(r => r.success);

    return new Response(JSON.stringify({
      success: someSuccess,
      rate_limit_remaining: remaining - 1,
      results,
    }), {
      status: allFailed ? 500 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
