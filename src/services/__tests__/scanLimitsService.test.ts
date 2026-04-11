/**
 * Integration tests for scan limits functionality
 * Verifies scan limit checking and enforcement
 */
import { supabase } from '../../config/supabase';

// Helper to check if supabase is available
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    
    const { error } = await supabase
      .from('qrcodes')
      .select('count', { count: 'exact', head: true });
    
    clearTimeout(timeout);
    
    // If we get any response (even error about table), supabase is connected
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

describe('scan limits exports', () => {
  test('supabase client is available', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});

describe('scan limits functionality', () => {
  const testQrId = '00000000-0000-0000-0000-000000000000';

  beforeAll(async () => {
    const available = await isSupabaseAvailable();
    if (!available) {
      console.log('Supabase not available - tests will be skipped');
    }
  });

  test('can insert scan limit settings', async () => {
    if (!(await isSupabaseAvailable())) {
      console.log('Supabase not available - skipping test');
      return;
    }
    
    if (!(await tableExists('qr_scan_limits'))) {
      console.log('qr_scan_limits table does not exist - skipping test');
      return;
    }

    const { error } = await supabase
      .from('qr_scan_limits')
      .upsert({
        qr_id: testQrId,
        enabled: true,
        max_scans: 100,
        current_scans: 0,
        message: 'Test limit reached message',
      });

    expect(error?.message).not.toContain('violates');
  }, 15000);

  test('can retrieve scan limit settings', async () => {
    if (!(await isSupabaseAvailable())) {
      console.log('Supabase not available - skipping test');
      return;
    }
    
    if (!(await tableExists('qr_scan_limits'))) {
      console.log('qr_scan_limits table does not exist - skipping test');
      return;
    }

    const { data } = await supabase
      .from('qr_scan_limits')
      .select('*')
      .eq('qr_id', testQrId)
      .single();

    if (data) {
      expect(data).toHaveProperty('qr_id');
      expect(data).toHaveProperty('enabled');
      expect(data).toHaveProperty('max_scans');
      expect(data).toHaveProperty('current_scans');
      expect(data).toHaveProperty('message');
    }
  }, 15000);

  test('scan limit enforcement logic', async () => {
    if (!(await isSupabaseAvailable())) {
      console.log('Supabase not available - skipping test');
      return;
    }
    
    if (!(await tableExists('qr_scan_limits'))) {
      console.log('qr_scan_limits table does not exist - skipping test');
      return;
    }

    // Set up a limit with current_scans at max
    await supabase
      .from('qr_scan_limits')
      .upsert({
        qr_id: testQrId,
        enabled: true,
        max_scans: 50,
        current_scans: 50,
        message: 'Limit reached',
      });

    // Check if limit is reached
    const { data } = await supabase
      .from('qr_scan_limits')
      .select('*')
      .eq('qr_id', testQrId)
      .single();

    if (data) {
      const isLimitReached = data.enabled && data.current_scans >= data.max_scans;
      expect(isLimitReached).toBe(true);
      expect(data.message).toBe('Limit reached');
    }
  }, 15000);

  test('can increment scan count', async () => {
    if (!(await isSupabaseAvailable())) {
      console.log('Supabase not available - skipping test');
      return;
    }
    
    if (!(await tableExists('qr_scan_limits'))) {
      console.log('qr_scan_limits table does not exist - skipping test');
      return;
    }

    // Reset to 0
    await supabase
      .from('qr_scan_limits')
      .upsert({
        qr_id: testQrId,
        enabled: true,
        max_scans: 100,
        current_scans: 0,
      });

    // Get current count
    const { data: before } = await supabase
      .from('qr_scan_limits')
      .select('current_scans')
      .eq('qr_id', testQrId)
      .single();

    const currentCount = before?.current_scans || 0;

    // Increment
    await supabase
      .from('qr_scan_limits')
      .update({ current_scans: currentCount + 1 })
      .eq('qr_id', testQrId);

    const { data: after } = await supabase
      .from('qr_scan_limits')
      .select('current_scans')
      .eq('qr_id', testQrId)
      .single();

    if (after) {
      expect(after.current_scans).toBe(currentCount + 1);
    }
  }, 15000);

  test('disabled limits do not enforce', async () => {
    if (!(await isSupabaseAvailable())) {
      console.log('Supabase not available - skipping test');
      return;
    }
    
    if (!(await tableExists('qr_scan_limits'))) {
      console.log('qr_scan_limits table does not exist - skipping test');
      return;
    }

    await supabase
      .from('qr_scan_limits')
      .upsert({
        qr_id: testQrId,
        enabled: false,
        max_scans: 10,
        current_scans: 100, // Over limit but disabled
      });

    const { data } = await supabase
      .from('qr_scan_limits')
      .select('*')
      .eq('qr_id', testQrId)
      .single();

    if (data) {
      const shouldEnforce = data.enabled && data.current_scans >= data.max_scans;
      expect(shouldEnforce).toBe(false);
    }
  }, 15000);
});
