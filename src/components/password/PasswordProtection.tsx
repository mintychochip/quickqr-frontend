import { useState } from 'react';
import { Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

interface PasswordProtectionProps {
  qrId?: string;
  onProtectionChange?: (protection: ProtectionSettings) => void;
}

interface ProtectionSettings {
  enabled: boolean;
  password: string;
  oneTime: boolean;
  timeWindow?: {
    start: string;
    end: string;
  };
  allowedIPs?: string[];
}

export default function PasswordProtection({ qrId, onProtectionChange }: PasswordProtectionProps) {
  const [settings, setSettings] = useState<ProtectionSettings>({
    enabled: false,
    password: '',
    oneTime: false,
  });

  async function saveProtection() {
    if (!qrId) {
      onProtectionChange?.(settings);
      return;
    }

    const { error } = await supabase
      .from('qr_protection')
      .upsert({
        qr_id: qrId,
        enabled: settings.enabled,
        password: settings.enabled ? settings.password : null,
        one_time: settings.oneTime,
        time_window: settings.timeWindow,
        allowed_ips: settings.allowedIPs,
      });

    if (error) {
      toast.error('Failed to save protection');
    } else {
      toast.success('Protection settings saved');
    }
  }

  return (
    <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fcd34d' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Lock size={18} color="#d97706" />
        <h3 style={{ fontWeight: 600, color: '#92400e' }}>Password Protection</h3>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
        />
        <span style={{ color: '#92400e' }}>Enable password protection</span>
      </label>

      {settings.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#92400e' }}>
              Password
            </label>
            <input
              type="password"
              value={settings.password}
              onChange={(e) => setSettings({ ...settings, password: e.target.value })}
              placeholder="Enter password"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #fcd34d', borderRadius: '0.25rem' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.oneTime}
              onChange={(e) => setSettings({ ...settings, oneTime: e.target.checked })}
            />
            <span style={{ fontSize: '0.875rem', color: '#92400e' }}>One-time password (expires after first use)</span>
          </label>

          <button
            onClick={saveProtection}
            style={{
              padding: '0.5rem 1rem',
              background: '#d97706',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Save Protection
          </button>
        </div>
      )}
    </div>
  );
}
