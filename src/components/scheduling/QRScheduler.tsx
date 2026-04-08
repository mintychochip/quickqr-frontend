import { useState, useEffect } from 'react';
import { Clock, Calendar, Check, X } from 'lucide-react';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

interface SchedulingOptions {
  activationDate?: string;
  activationTime?: string;
  expirationDate?: string;
  expirationTime?: string;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface QRSchedulerProps {
  qrId?: string;
  onScheduleChange?: (options: SchedulingOptions) => void;
}

export default function QRScheduler({ qrId, onScheduleChange }: QRSchedulerProps) {
  const [options, setOptions] = useState<SchedulingOptions>({
    recurring: 'none',
  });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (qrId) {
      loadSchedule();
    }
  }, [qrId]);

  async function loadSchedule() {
    const { data } = await supabase
      .from('qr_schedules')
      .select('*')
      .eq('qr_id', qrId)
      .single();
    
    if (data) {
      setOptions({
        activationDate: data.activation_date,
        activationTime: data.activation_time,
        expirationDate: data.expiration_date,
        expirationTime: data.expiration_time,
        recurring: data.recurring || 'none',
      });
      setIsActive(true);
    }
  }

  async function saveSchedule() {
    if (!qrId) {
      onScheduleChange?.(options);
      return;
    }

    const { error } = await supabase
      .from('qr_schedules')
      .upsert({
        qr_id: qrId,
        activation_date: options.activationDate,
        activation_time: options.activationTime,
        expiration_date: options.expirationDate,
        expiration_time: options.expirationTime,
        recurring: options.recurring,
      });

    if (error) {
      toast.error('Failed to save schedule');
    } else {
      toast.success('Schedule saved');
    }
  }

  return (
    <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Clock size={18} />
        <h3 style={{ fontWeight: 600 }}>Schedule QR Code</h3>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Enable scheduling
      </label>

      {isActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Activation */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Activation Date
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="date"
                value={options.activationDate || ''}
                onChange={(e) => setOptions({ ...options, activationDate: e.target.value })}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }}
              />
              <input
                type="time"
                value={options.activationTime || ''}
                onChange={(e) => setOptions({ ...options, activationTime: e.target.value })}
                style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }}
              />
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Expiration Date
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="date"
                value={options.expirationDate || ''}
                onChange={(e) => setOptions({ ...options, expirationDate: e.target.value })}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }}
              />
              <input
                type="time"
                value={options.expirationTime || ''}
                onChange={(e) => setOptions({ ...options, expirationTime: e.target.value })}
                style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }}
              />
            </div>
          </div>

          {/* Recurring */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              Recurring
            </label>
            <select
              value={options.recurring}
              onChange={(e) => setOptions({ ...options, recurring: e.target.value as any })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }}
            >
              <option value="none">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <button
            onClick={saveSchedule}
            style={{
              padding: '0.5rem 1rem',
              background: '#14b8a6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Save Schedule
          </button>
        </div>
      )}
    </div>
  );
}
