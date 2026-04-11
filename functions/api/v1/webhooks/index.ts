import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  // Get auth token from header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  // Set auth token
  supabase.auth.setSession({ access_token: token, refresh_token: '' });
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    switch (request.method) {
      case 'GET':
        // List webhooks or get delivery logs
        const logWebhookId = url.searchParams.get('logs');
        
        if (logWebhookId) {
          // Get delivery logs for a specific webhook
          const { data: logs, error: logsError } = await supabase
            .from('webhook_deliveries')
            .select('*')
            .eq('webhook_id', logWebhookId)
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (logsError) throw logsError;
          
          return new Response(JSON.stringify({ logs }), { headers: corsHeaders });
        } else {
          // List all webhooks for user
          const { data: webhooks, error } = await supabase
            .from('webhooks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          return new Response(JSON.stringify({ webhooks }), { headers: corsHeaders });
        }
      
      case 'POST':
        // Create new webhook
        const body = await request.json();
        const { name, url: webhookUrl, secret, event_types } = body;
        
        if (!name || !webhookUrl) {
          return new Response(JSON.stringify({ error: 'Name and URL are required' }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        
        // Validate URL
        try {
          new URL(webhookUrl);
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        
        const { data: newWebhook, error: createError } = await supabase
          .from('webhooks')
          .insert({
            user_id: user.id,
            name,
            url: webhookUrl,
            secret: secret || null,
            event_types: event_types || ['qr.scan'],
            is_active: true,
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        return new Response(JSON.stringify({ webhook: newWebhook }), {
          status: 201,
          headers: corsHeaders,
        });
      
      case 'PUT':
        // Update webhook
        const updateBody = await request.json();
        const { id, ...updates } = updateBody;
        
        if (!id) {
          return new Response(JSON.stringify({ error: 'Webhook ID is required' }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        
        // Verify ownership
        const { data: existing } = await supabase
          .from('webhooks')
          .select('id')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        
        if (!existing) {
          return new Response(JSON.stringify({ error: 'Webhook not found' }), {
            status: 404,
            headers: corsHeaders,
          });
        }
        
        // Validate URL if provided
        if (updates.url) {
          try {
            new URL(updates.url);
          } catch {
            return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
              status: 400,
              headers: corsHeaders,
            });
          }
        }
        
        const { data: updated, error: updateError } = await supabase
          .from('webhooks')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        
        return new Response(JSON.stringify({ webhook: updated }), { headers: corsHeaders });
      
      case 'DELETE':
        // Delete webhook
        const deleteId = url.searchParams.get('id');
        
        if (!deleteId) {
          return new Response(JSON.stringify({ error: 'Webhook ID is required' }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        
        // Verify ownership and delete
        const { error: deleteError } = await supabase
          .from('webhooks')
          .delete()
          .eq('id', deleteId)
          .eq('user_id', user.id);
        
        if (deleteError) throw deleteError;
        
        return new Response(JSON.stringify({ message: 'Webhook deleted' }), { headers: corsHeaders });
      
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: corsHeaders,
        });
    }
  } catch (err: any) {
    console.error('Webhook API error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
