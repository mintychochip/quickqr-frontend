import type { APIContext } from 'astro';

interface ConversionEvent {
  scan_id: string;
  event_type: string;
  revenue?: number;
  currency?: string;
  user_fingerprint?: string;
  metadata?: Record<string, unknown>;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export async function POST({ request, params, locals }: APIContext) {
  const { route } = params;
  
  // Handle POST /conversions
  if (route === 'conversions') {
    // Get the request body
    const body = await request.json();
    
    // Validate scan_id exists and belongs to user's QR
    const { data: scanData, error: scanError } = await locals.runtime.env.SUPABASE_CLIENT
      .from('scans')
      .select('id, qr_code_id')
      .eq('id', body.scan_id)
      .single();
    
    if (scanError || !scanData) {
      return new Response(JSON.stringify({ error: 'Scan not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Insert the conversion event
    const { data, error } = await locals.runtime.env.SUPABASE_CLIENT
      .from('qr_conversions')
      .insert({
        qr_code_id: scanData.qr_code_id,
        scan_id: body.scan_id,
        event_type: body.event_type,
        revenue: body.revenue,
        currency: body.currency,
        user_fingerprint: body.user_fingerprint,
        metadata: body.metadata,
        utm_source: body.utm_source,
        utm_medium: body.utm_medium,
        utm_campaign: body.utm_campaign
      })
      .select()
      .single();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Handle GET /stats
  if (route === 'stats') {
    const url = new URL(request.url);
    const qr_code_id = url.searchParams.get('qr_code_id');
    const start_date = url.searchParams.get('start_date');
    const end_date = url.searchParams.get('end_date');
    
    if (!qr_code_id) {
      return new Response(JSON.stringify({ error: 'Missing qr_code_id parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get conversion stats
    const { data: conversions, error: statsError } = await locals.runtime.env.SUPABASE_CLIENT
      .from('qr_conversions')
      .select('*')
      .eq('qr_code_id', qr_code_id)
      .gte('converted_at', start_date)
      .lte('converted_at', end_date);
    
    if (statsError) {
      return new Response(JSON.stringify({ error: statsError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Calculate aggregates
    let total_conversions = 0;
    let total_revenue = 0;
    const events_by_type: Record<string, number> = {};
    
    conversions?.forEach((conversion: any) => {
      total_conversions++;
      if (conversion.revenue) {
        total_revenue += conversion.revenue;
      }
      if (events_by_type[conversion.event_type]) {
        events_by_type[conversion.event_type] += 1;
      } else {
        events_by_type[conversion.event_type] = 1;
      }
    });
    
    return new Response(JSON.stringify({
      total_conversions: total_conversions,
      total_revenue: total_revenue,
      events_by_type: events_by_type
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function GET({ request }: { request: Request }) {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
}