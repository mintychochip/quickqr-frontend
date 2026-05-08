import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation helpers
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
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

    // GET - Retrieve user's notification preferences
    if (req.method === 'GET') {
      const { data: prefs, error } = await supabaseClient
        .from('user_health_notification_prefs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Return defaults if no prefs exist yet
      return new Response(JSON.stringify({
        success: true,
        data: prefs || {
          user_id: user.id,
          email_enabled: true,
          email_address: null,
          slack_enabled: false,
          slack_webhook_url: null,
          slack_channel: null,
          webhook_enabled: false,
          webhook_url: null,
          webhook_headers: null,
          daily_digest_enabled: false,
          digest_time: '09:00',
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update notification preferences
    if (req.method === 'PUT') {
      const body = await req.json();
      
      // Validate inputs
      const errors: string[] = [];
      
      if (body.email_address && !isValidEmail(body.email_address)) {
        errors.push('Invalid email address format');
      }
      
      if (body.slack_webhook_url && !isValidUrl(body.slack_webhook_url)) {
        errors.push('Invalid Slack webhook URL');
      }
      
      if (body.webhook_url && !isValidUrl(body.webhook_url)) {
        errors.push('Invalid webhook URL');
      }
      
      if (body.digest_time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(body.digest_time)) {
        errors.push('Invalid digest time format (expected HH:MM)');
      }
      
      if (errors.length > 0) {
        return new Response(JSON.stringify({ error: errors.join(', ') }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Build update object with only provided fields
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (body.email_enabled !== undefined) updateData.email_enabled = body.email_enabled;
      if (body.email_address !== undefined) updateData.email_address = body.email_address || null;
      if (body.slack_enabled !== undefined) updateData.slack_enabled = body.slack_enabled;
      if (body.slack_webhook_url !== undefined) updateData.slack_webhook_url = body.slack_webhook_url || null;
      if (body.slack_channel !== undefined) updateData.slack_channel = body.slack_channel || null;
      if (body.webhook_enabled !== undefined) updateData.webhook_enabled = body.webhook_enabled;
      if (body.webhook_url !== undefined) updateData.webhook_url = body.webhook_url || null;
      if (body.webhook_headers !== undefined) updateData.webhook_headers = body.webhook_headers || null;
      if (body.daily_digest_enabled !== undefined) updateData.daily_digest_enabled = body.daily_digest_enabled;
      if (body.digest_time !== undefined) updateData.digest_time = body.digest_time;

      // Upsert the preferences
      const { data: prefs, error } = await supabaseClient
        .from('user_health_notification_prefs')
        .upsert({
          user_id: user.id,
          ...updateData,
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: prefs,
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