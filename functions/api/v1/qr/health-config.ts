import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthConfigRequest {
  enabled?: boolean;
  check_frequency?: 'hourly' | 'daily' | 'weekly';
  alert_threshold?: 'any' | 'warning' | 'critical';
  content_match_enabled?: boolean;
  content_match_selector?: string;
  content_match_expected?: string;
}

interface HealthConfigResponse {
  id: string;
  qr_code_id: string;
  enabled: boolean;
  check_frequency: 'hourly' | 'daily' | 'weekly';
  alert_threshold: 'any' | 'warning' | 'critical';
  content_match_enabled: boolean;
  content_match_selector: string | null;
  content_match_expected: string | null;
  created_at: string;
  updated_at: string;
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

    // Verify QR code ownership
    const { data: qrCode, error: qrError } = await supabaseClient
      .from('qr_codes')
      .select('id, user_id')
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

    // GET - Retrieve health config
    if (req.method === 'GET') {
      const { data: config, error: configError } = await supabaseClient
        .from('qr_health_configs')
        .select('*')
        .eq('qr_code_id', qrId)
        .single();

      if (configError && configError.code !== 'PGRST116') { // Not found is ok
        return new Response(JSON.stringify({ error: configError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Type': 'application/json' },
        });
      }

      // Return default config if none exists
      const responseConfig: HealthConfigResponse = config || {
        id: '',
        qr_code_id: qrId,
        enabled: true,
        check_frequency: 'daily',
        alert_threshold: 'critical',
        content_match_enabled: false,
        content_match_selector: null,
        content_match_expected: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return new Response(JSON.stringify({
        success: true,
        data: responseConfig,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update health config
    if (req.method === 'PUT') {
      const body: HealthConfigRequest = await req.json().catch(() => ({}));
      
      // Validate inputs
      if (body.check_frequency && !['hourly', 'daily', 'weekly'].includes(body.check_frequency)) {
        return new Response(JSON.stringify({ error: 'Invalid check_frequency. Must be hourly, daily, or weekly' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (body.alert_threshold && !['any', 'warning', 'critical'].includes(body.alert_threshold)) {
        return new Response(JSON.stringify({ error: 'Invalid alert_threshold. Must be any, warning, or critical' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build update object
      const updateData: Partial<HealthConfigRequest> & { updated_at: string } = {
        updated_at: new Date().toISOString(),
      };
      
      if (body.enabled !== undefined) updateData.enabled = body.enabled;
      if (body.check_frequency) updateData.check_frequency = body.check_frequency;
      if (body.alert_threshold) updateData.alert_threshold = body.alert_threshold;
      if (body.content_match_enabled !== undefined) updateData.content_match_enabled = body.content_match_enabled;
      if (body.content_match_selector !== undefined) updateData.content_match_selector = body.content_match_selector;
      if (body.content_match_expected !== undefined) updateData.content_match_expected = body.content_match_expected;

      // Upsert the config (insert if not exists, update if exists)
      const { data: config, error: upsertError } = await supabaseClient
        .from('qr_health_configs')
        .upsert({
          qr_code_id: qrId,
          ...updateData,
        }, {
          onConflict: 'qr_code_id',
        })
        .select()
        .single();

      if (upsertError) {
        return new Response(JSON.stringify({ error: upsertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: config,
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
