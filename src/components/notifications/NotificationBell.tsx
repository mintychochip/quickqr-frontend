import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { supabase } from '../../config/supabase';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setNotifications(data || []);
    setUnread(data?.filter(n => !n.read).length || 0);
  }

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    loadNotifications();
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ position: 'relative', padding: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>
        <Bell size={24} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white', fontSize: '0.75rem', padding: '0.125rem 0.375rem', borderRadius: '9999px' }}>
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50 }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
              No notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} onClick={() => markAsRead(n.id)} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: n.read ? 'white' : '#f0fdfa' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: n.read ? 400 : 600 }}>{n.title}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{n.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
