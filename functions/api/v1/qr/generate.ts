import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting storage (in-memory, per worker)
const rateLimits = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS = {
  free: { requests: 100, window: 3600000 }, // 100 per hour
  pro: { requests: 1000, window: 3600000 }, // 1000 per hour
  enterprise: { requests: 10000, window: 3600000 }, // 10000 per hour
};

async function checkRateLimit(apiKey: string, tier: keyof typeof RATE_LIMITS = 'free'): Promise<boolean> {
  const now = Date.now();
  const limit = RATE_LIMITS[tier];
  const keyData = rateLimits.get(apiKey);
  
  if (!keyData || now > keyData.resetTime) {
    rateLimits.set(apiKey, { count: 1, resetTime: now + limit.window });
    return true;
  }
  
  if (keyData.count >= limit.requests) {
    return false;
  }
  
  keyData.count++;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get API key from header
    const authHeader = req.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    const allowed = await checkRateLimit(apiKey, 'free');
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify API key and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const { name, type, content, styling, mode = 'static' } = body;

    // Validate required fields
    if (!name || !type || !content) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name, type, content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate QR type
    const validTypes = ['url', 'text', 'email', 'phone', 'sms', 'wifi', 'vcard', 'location', 'calendar', 'crypto'];
    if (!validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert QR code
    const { data, error } = await supabaseClient
      .from('qrcodes')
      .insert({
        user_id: user.id,
        name: name.trim(),
        type,
        content,
        styling: styling || {},
        mode,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate response
    const baseUrl = Deno.env.get('APP_URL') || 'https://quickqr.app';
    const response = {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        type: data.type,
        mode: data.mode,
        redirect_url: `${baseUrl}/r/${data.id}`,
        download_url: {
          png: `${baseUrl}/api/v1/qr/${data.id}/download?format=png`,
          svg: `${baseUrl}/api/v1/qr/${data.id}/download?format=svg`,
        },
        created_at: data.created_at,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
