import { useState, useEffect } from 'react';
import { ScanLine, BarChart3, AlertCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

interface ScanLimitsSettings {
  enabled: boolean;
  maxScans: number;
  currentScans: number;
  message: string;
}

interface ScanLimitsProps {
  qrId?: string;
  onLimitsChange?: (settings: ScanLimitsSettings) => void;
}

export default function ScanLimits({ qrId, onLimitsChange }: ScanLimitsProps) {
  const [settings, setSettings] = useState<ScanLimitsSettings>({
    enabled: false,
    maxScans: 100,
    currentScans: 0,
    message: 'This QR code has reached its scan limit.',
  });

  useEffect(() => {
    if (qrId) {
      loadLimits();
    }
  }, [qrId]);

  async function loadLimits() {
    const { data } = await supabase
      .from('qr_scan_limits')
      .select('*')
      .eq('qr_id', qrId)
      .single();

    if (data) {
      setSettings({
        enabled: data.enabled,
        maxScans: data.max_scans || 100,
        currentScans: data.current_scans || 0,
        message: data.message || 'This QR code has reached its scan limit.',
      });
    }
  }

  async function saveLimits() {
    if (!qrId) {
      onLimitsChange?.(settings);
      return;
    }

    const { error } = await supabase
      .from('qr_scan_limits')
      .upsert({
        qr_id: qrId,
        enabled: settings.enabled,
        max_scans: settings.maxScans,
        message: settings.message,
      });

    if (error) {
      toast.error('Failed to save scan limits');
    } else {
      toast.success('Scan limits saved');
    }
  }

  const progressPercent = settings.maxScans > 0 
    ? Math.min((settings.currentScans / settings.maxScans) * 100, 100)
    : 0;

  return (
    <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fcd34d' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <ScanLine size={18} color="#d97706" />
        <h3 style={{ fontWeight: 600, color: '#92400e' }}>Scan Limits</h3>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
        />
        <span style={{ color: '#92400e' }}>Enable scan count limits</span>
      </label>

      {settings.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Progress indicator */}
          {qrId && (
            <div style={{ 
              padding: '0.75rem', 
              background: 'white', 
              borderRadius: '0.375rem',
              border: '1px solid #fcd34d'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <BarChart3 size={16} color="#d97706" />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#92400e' }}>
                  Usage: {settings.currentScans} / {settings.maxScans} scans
                </span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '8px', 
                background: '#fed7aa', 
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${progressPercent}%`, 
                  height: '100%', 
                  background: progressPercent >= 100 ? '#ef4444' : '#f59e0b',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              {progressPercent >= 100 && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  marginTop: '0.5rem',
                  color: '#dc2626',
                  fontSize: '0.75rem'
                }}>
                  <AlertCircle size={12} />
                  <span>Limit reached - QR code is now inactive</span>
                </div>
              )}
            </div>
          )}

          {/* Max scans input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#92400e' }}>
              Maximum Scans Allowed
            </label>
            <input
              type="number"
              min={1}
              max={1000000}
              value={settings.maxScans}
              onChange={(e) => setSettings({ ...settings, maxScans: parseInt(e.target.value) || 1 })}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                border: '1px solid #fcd34d', 
                borderRadius: '0.25rem'
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#a16207', marginTop: '0.25rem', display: 'block' }}>
              The QR code will become inactive after this many scans
            </span>
          </div>

          {/* Custom message */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#92400e' }}>
              Limit Reached Message
            </label>
            <textarea
              value={settings.message}
              onChange={(e) => setSettings({ ...settings, message: e.target.value })}
              placeholder="Message shown when scan limit is reached"
              rows={3}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                border: '1px solid #fcd34d', 
                borderRadius: '0.25rem',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            onClick={saveLimits}
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
            Save Limits
          </button>
        </div>
      )}
    </div>
  );
}
