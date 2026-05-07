import { createClient } from "@supabase/supabase-js";

export async function onRequest(context) {
  const { id } = context.params;
  const supabase = createClient(context.env.SUPABASE_URL, context.env.SUPABASE_ANON_KEY);
  
  const { data: logs } = await supabase
    .from('scan_logs')
    .select('*')
    .eq('qr_id', id);
  
  const stats = {
    total: logs?.length || 0,
    unique: new Set(logs?.map(l => l.ip_address)).size || 0,
    devices: {},
    countries: {}
  };
  
  logs?.forEach(log => {
    stats.devices[log.device_type] = (stats.devices[log.device_type] || 0) + 1;
    stats.countries[log.country] = (stats.countries[log.country] || 0) + 1;
  });
  
  return new Response(JSON.stringify(stats), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}