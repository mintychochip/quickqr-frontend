import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate HMAC signature for webhook payload
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Deliver webhook with retry logic
async function deliverWebhook(
  webhook: { id: string; url: string; secret: string | null },
  eventType: string,
  payload: Record<string, unknown>,
  supabaseClient: any
): Promise<{ success: boolean; status?: number; error?: string }> {
  const payloadString = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': eventType,
    'X-Webhook-Timestamp': timestamp,
    'User-Agent': 'QuickQR-Webhook/1.0',
  };
  
  // Add signature if secret is configured
  if (webhook.secret) {
    const signature = await generateSignature(payloadString, webhook.secret);
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }
  
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
    });
    
    const responseBody = await response.text().catch(() => '');
    
    // Log the delivery
    await supabaseClient
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload,
        response_status: response.status,
        response_body: responseBody.slice(0, 10000), // Limit response size
        delivered_at: new Date().toISOString(),
        retry_count: 0,
      });
    
    if (response.ok) {
      return { success: true, status: response.status };
    } else {
      return { 
        success: false, 
        status: response.status,
        error: `HTTP ${response.status}: ${responseBody.slice(0, 200)}`
      };
    }
  } catch (err: any) {
    const errorMessage = err.message || 'Unknown error';
    
    // Log the failed delivery
    await supabaseClient
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload,
        response_status: null,
        error_message: errorMessage,
        delivered_at: null,
        retry_count: 0,
      });
    
    return { success: false, error: errorMessage };
  }
}

export async function onRequest(context: any) {
  const { request, env } = context;
  
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseClient = createClient(
      env.SUPABASE_URL ?? '',
      env.SUPABASE_ANON_KEY ?? '',
    );

    // Parse request body
    const body = await request.json();
    const { qr_id, event_type = 'qr.scan', scan_data } = body;

    if (!qr_id) {
      return new Response(JSON.stringify({ error: 'qr_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get QR code details to find the user
    const { data: qrCode, error: qrError } = await supabaseClient
      .from('qrcodes')
      .select('id, name, user_id')
      .eq('id', qr_id)
      .single();

    if (qrError || !qrCode) {
      return new Response(JSON.stringify({ error: 'QR code not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get active webhooks for this user that subscribe to this event type
    const { data: webhooks, error: webhooksError } = await supabaseClient
      .from('webhooks')
      .select('*')
      .eq('user_id', qrCode.user_id)
      .eq('is_active', true)
      .contains('event_types', [event_type]);

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError);
      return new Response(JSON.stringify({ error: 'Failed to fetch webhooks' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No webhooks configured for this event',
        delivered: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the webhook payload
    const payload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      data: {
        qr_id: qrCode.id,
        qr_name: qrCode.name,
        scan: scan_data || {},
      },
    };

    // Deliver to all webhooks in parallel
    const deliveryPromises = webhooks.map(async (webhook: any) => {
      const result = await deliverWebhook(webhook, event_type, payload, supabaseClient);
      return {
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        ...result,
      };
    });

    const results = await Promise.all(deliveryPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      message: `Delivered to ${successful} of ${webhooks.length} webhooks`,
      delivered: successful,
      failed: failed,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Webhook delivery error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
