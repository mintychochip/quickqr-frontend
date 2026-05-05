import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HistoryDataPoint {
  date: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  responseTimeMs: number | null;
  uptimePercentage: number;
  checksCount: number;
  errorsCount: number;
}

interface HealthHistoryResponse {
  success: boolean;
  data: {
    qr_code_id: string;
    days: number;
    history: HistoryDataPoint[];
    summary: {
      overallUptimePercentage: number;
      averageResponseTimeMs: number | null;
      totalChecks: number;
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

    // Parse URL parameters
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const qrId = pathParts[pathParts.length - 1];

    // Get days parameter (default 30, max 90)
    const daysParam = url.searchParams.get('days');
    const days = Math.min(Math.max(parseInt(daysParam || '30', 10), 1), 90);

    if (!qrId || qrId === 'health-history') {
      return new Response(JSON.stringify({ error: 'QR code ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get health checks within date range
    const { data: checks, error: checksError } = await supabaseClient
      .from('qr_health_checks')
      .select('checked_at, status, response_time_ms, error_type')
      .eq('qr_code_id', qrId)
      .gte('checked_at', startDate.toISOString())
      .lte('checked_at', endDate.toISOString())
      .order('checked_at', { ascending: true });

    if (checksError) {
      return new Response(JSON.stringify({ error: checksError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aggregate data by day
    const dailyData = new Map<string, {
      statuses: string[];
      responseTimes: number[];
      errors: number;
    }>();

    // Initialize all days in range
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData.set(dateKey, { statuses: [], responseTimes: [], errors: 0 });
    }

    // Aggregate check data
    (checks || []).forEach((check) => {
      const dateKey = new Date(check.checked_at).toISOString().split('T')[0];
      const dayData = dailyData.get(dateKey);
      
      if (dayData) {
        dayData.statuses.push(check.status);
        if (check.response_time_ms !== null && check.response_time_ms !== undefined) {
          dayData.responseTimes.push(check.response_time_ms);
        }
        if (check.error_type && check.error_type !== 'unknown') {
          dayData.errors++;
        }
      }
    });

    // Build history array with aggregated metrics
    const history: HistoryDataPoint[] = [];
    let totalChecks = 0;
    let totalHealthyChecks = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    dailyData.forEach((data, date) => {
      const checksCount = data.statuses.length;
      
      // Determine dominant status for the day
      let status: 'healthy' | 'warning' | 'critical' | 'unknown' = 'unknown';
      if (checksCount > 0) {
        const statusCounts = data.statuses.reduce((acc, s) => {
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Priority: critical > warning > healthy > unknown
        if (statusCounts['critical']) status = 'critical';
        else if (statusCounts['warning']) status = 'warning';
        else if (statusCounts['healthy']) status = 'healthy';
      }

      // Calculate average response time
      const avgResponseTime = data.responseTimes.length > 0
        ? Math.round(data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length)
        : null;

      // Calculate uptime percentage for the day
      const healthyChecks = data.statuses.filter(s => s === 'healthy').length;
      const uptimePercentage = checksCount > 0
        ? Math.round((healthyChecks / checksCount) * 100)
        : 0;

      // Update totals for summary
      totalChecks += checksCount;
      totalHealthyChecks += healthyChecks;
      if (avgResponseTime !== null) {
        totalResponseTime += avgResponseTime;
        responseTimeCount++;
      }

      history.push({
        date,
        status,
        responseTimeMs: avgResponseTime,
        uptimePercentage,
        checksCount,
        errorsCount: data.errors,
      });
    });

    // Sort by date
    history.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate summary statistics
    const overallUptimePercentage = totalChecks > 0
      ? Math.round((totalHealthyChecks / totalChecks) * 100)
      : 0;
    
    const averageResponseTimeMs = responseTimeCount > 0
      ? Math.round(totalResponseTime / responseTimeCount)
      : null;

    const response: HealthHistoryResponse = {
      success: true,
      data: {
        qr_code_id: qrId,
        days,
        history,
        summary: {
          overallUptimePercentage,
          averageResponseTimeMs,
          totalChecks,
        },
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
