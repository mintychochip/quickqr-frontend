/**
 * Integration tests for webhook functionality
 * Verifies webhook CRUD operations and delivery logging
 */
import { supabase } from '../../config/supabase';
import { webhookService } from '../webhookService';

// Helper to check if supabase is available
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    
    const { error } = await supabase
      .from('qrcodes')
      .select('count', { count: 'exact', head: true });
    
    clearTimeout(timeout);
    
    return !error?.message?.includes('fetch failed') && !error?.message?.includes('ECONNREFUSED');
  } catch {
    return false;
  }
}

// Helper to check if table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count', { count: 'exact', head: true });
    
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

describe('webhook service exports', () => {
  test('webhookService is defined', () => {
    expect(webhookService).toBeDefined();
    expect(typeof webhookService.getWebhooks).toBe('function');
    expect(typeof webhookService.createWebhook).toBe('function');
    expect(typeof webhookService.updateWebhook).toBe('function');
    expect(typeof webhookService.deleteWebhook).toBe('function');
    expect(typeof webhookService.toggleWebhook).toBe('function');
    expect(typeof webhookService.getDeliveryLogs).toBe('function');
  });
});

describe('webhook functionality', () => {
  let supabaseAvailable = false;
  let webhooksTableExists = false;
  let testWebhookId: string | null = null;

  beforeAll(async () => {
    supabaseAvailable = await isSupabaseAvailable();
    if (supabaseAvailable) {
      webhooksTableExists = await tableExists('webhooks');
    }
  });

  beforeEach(async () => {
    if (!supabaseAvailable || !webhooksTableExists) {
      return;
    }
    
    // Clean up any existing test webhooks
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('webhooks')
        .delete()
        .eq('user_id', session.user.id)
        .ilike('name', 'Test%');
    }
  });

  afterAll(async () => {
    if (!supabaseAvailable || !webhooksTableExists) {
      return;
    }
    
    // Clean up test webhooks
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('webhooks')
        .delete()
        .eq('user_id', session.user.id)
        .ilike('name', 'Test%');
    }
  });

  test('can create webhook', async () => {
    if (!supabaseAvailable) {
      console.warn('Supabase not available - skipping test');
      return;
    }
    if (!webhooksTableExists) {
      console.warn('webhooks table does not exist - skipping test');
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No authenticated session - skipping test');
      return;
    }

    const newWebhook = await webhookService.createWebhook({
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      secret: 'test-secret',
      event_types: ['qr.scan'],
    });

    expect(newWebhook).toBeDefined();
    expect(newWebhook.name).toBe('Test Webhook');
    expect(newWebhook.url).toBe('https://example.com/webhook');
    expect(newWebhook.secret).toBe('test-secret');
    expect(newWebhook.event_types).toContain('qr.scan');
    expect(newWebhook.is_active).toBe(true);
    expect(newWebhook.user_id).toBe(session.user.id);

    testWebhookId = newWebhook.id;
  });

  test('can retrieve webhooks', async () => {
    if (!supabaseAvailable || !webhooksTableExists) {
      console.warn('Supabase/webhooks table not available - skipping test');
      return;
    }

    const webhooks = await webhookService.getWebhooks();
    expect(Array.isArray(webhooks)).toBe(true);
    
    if (testWebhookId) {
      const found = webhooks.find(w => w.id === testWebhookId);
      expect(found).toBeDefined();
    }
  });

  test('can update webhook', async () => {
    if (!supabaseAvailable || !webhooksTableExists || !testWebhookId) {
      console.warn('Cannot run update test - skipping');
      return;
    }

    const updated = await webhookService.updateWebhook(testWebhookId, {
      name: 'Updated Test Webhook',
      url: 'https://updated.example.com/webhook',
    });

    expect(updated.name).toBe('Updated Test Webhook');
    expect(updated.url).toBe('https://updated.example.com/webhook');
    expect(updated.secret).toBe('test-secret'); // Should be preserved
  });

  test('can toggle webhook active state', async () => {
    if (!supabaseAvailable || !webhooksTableExists || !testWebhookId) {
      console.warn('Cannot run toggle test - skipping');
      return;
    }

    const disabled = await webhookService.toggleWebhook(testWebhookId, false);
    expect(disabled.is_active).toBe(false);

    const enabled = await webhookService.toggleWebhook(testWebhookId, true);
    expect(enabled.is_active).toBe(true);
  });

  test('can get single webhook', async () => {
    if (!supabaseAvailable || !webhooksTableExists || !testWebhookId) {
      console.warn('Cannot run get test - skipping');
      return;
    }

    const webhook = await webhookService.getWebhook(testWebhookId);
    expect(webhook).toBeDefined();
    expect(webhook?.id).toBe(testWebhookId);
  });

  test('can get delivery logs', async () => {
    if (!supabaseAvailable || !webhooksTableExists || !testWebhookId) {
      console.warn('Cannot run delivery logs test - skipping');
      return;
    }

    const deliveriesTableExists = await tableExists('webhook_deliveries');
    if (!deliveriesTableExists) {
      console.warn('webhook_deliveries table does not exist - skipping test');
      return;
    }

    const logs = await webhookService.getDeliveryLogs(testWebhookId);
    expect(Array.isArray(logs)).toBe(true);
  });

  test('can delete webhook', async () => {
    if (!supabaseAvailable || !webhooksTableExists || !testWebhookId) {
      console.warn('Cannot run delete test - skipping');
      return;
    }

    await webhookService.deleteWebhook(testWebhookId);

    const webhook = await webhookService.getWebhook(testWebhookId);
    expect(webhook).toBeNull();

    testWebhookId = null;
  });

  test('create webhook without secret', async () => {
    if (!supabaseAvailable || !webhooksTableExists) {
      console.warn('Supabase/webhooks table not available - skipping test');
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No authenticated session - skipping test');
      return;
    }

    const webhook = await webhookService.createWebhook({
      name: 'Test Webhook No Secret',
      url: 'https://example.com/webhook2',
      event_types: ['qr.scan', 'qr.created'],
    });

    expect(webhook).toBeDefined();
    expect(webhook.secret).toBeNull();
    expect(webhook.event_types).toContain('qr.scan');
    expect(webhook.event_types).toContain('qr.created');

    // Clean up
    await webhookService.deleteWebhook(webhook.id);
  });

  test('throws error when creating webhook with invalid URL', async () => {
    if (!supabaseAvailable || !webhooksTableExists) {
      console.warn('Supabase/webhooks table not available - skipping test');
      return;
    }

    // Note: The client-side service doesn't validate URLs, 
    // but the API endpoint does. This test documents that behavior.
    await expect(
      webhookService.createWebhook({
        name: 'Invalid Webhook',
        url: 'not-a-valid-url',
      })
    ).rejects.toThrow();
  });
});

// Run a quick connectivity test
describe('webhook service connectivity', () => {
  test('supabase client is defined', async () => {
    // Simple check that supabase client exists without requiring network
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});
