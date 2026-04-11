import { supabase } from '../config/supabase';

export interface Webhook {
  id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string | null;
  event_types: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  delivered_at: string | null;
  retry_count: number;
  error_message: string | null;
  created_at: string;
}

export interface CreateWebhookInput {
  name: string;
  url: string;
  secret?: string;
  event_types?: string[];
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  secret?: string;
  event_types?: string[];
  is_active?: boolean;
}

export const webhookService = {
  async getWebhooks(): Promise<Webhook[]> {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getWebhook(id: string): Promise<Webhook | null> {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  async createWebhook(input: CreateWebhookInput): Promise<Webhook> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        user_id: session.user.id,
        name: input.name,
        url: input.url,
        secret: input.secret || null,
        event_types: input.event_types || ['qr.scan'],
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateWebhook(id: string, input: UpdateWebhookInput): Promise<Webhook> {
    const { data, error } = await supabase
      .from('webhooks')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteWebhook(id: string): Promise<void> {
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleWebhook(id: string, isActive: boolean): Promise<Webhook> {
    return this.updateWebhook(id, { is_active: isActive });
  },

  async getDeliveryLogs(webhookId: string, limit = 20): Promise<WebhookDelivery[]> {
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getAllDeliveryLogs(limit = 50): Promise<WebhookDelivery[]> {
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*, webhooks!inner(user_id)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};

export default webhookService;
