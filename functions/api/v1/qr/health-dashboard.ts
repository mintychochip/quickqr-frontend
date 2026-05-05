import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardStats {
  totalQRs: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  unknownCount: number;
  overallHealthPercentage: number;
}

interface AlertSummary {
  id: string;
  qr_code_id: string;
  alert_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface HealthDashboardResponse {
  success: boolean;
  data: {
    stats: DashboardStats;
    recentAlerts: AlertSummary[];
    lastUpdated: string;
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

    // Get user's health stats using the RPC function
    const { data: stats, error: statsError } = await supabaseClient
      .rpc('get_user_health_stats', { p_user_id: user.id });

    if (statsError) {
      return new Response(JSON.stringify({ error: statsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate overall health percentage
    const totalQRs = Number(stats?.[0]?.total_qr_codes || 0);
    const healthyCount = Number(stats?.[0]?.healthy_count || 0);
    const warningCount = Number(stats?.[0]?.warning_count || 0);
    const criticalCount = Number(stats?.[0]?.critical_count || 0);
    const unknownCount = Number(stats?.[0]?.unknown_count || 0);
    
    const overallHealthPercentage = totalQRs > 0 
      ? Math.round((healthyCount / totalQRs) * 100) 
      : 0;

    const dashboardStats: DashboardStats = {
      totalQRs,
      healthyCount,
      warningCount,
      criticalCount,
      unknownCount,
      overallHealthPercentage,
    };

    // Get recent alerts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: alerts, error: alertsError } = await supabaseClient
      .from('qr_health_alerts')
      .select('id, qr_code_id, alert_type, status, sent_at, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (alertsError) {
      return new Response(JSON.stringify({ error: alertsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response: HealthDashboardResponse = {
      success: true,
      data: {
        stats: dashboardStats,
        recentAlerts: alerts || [],
        lastUpdated: new Date().toISOString(),
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
