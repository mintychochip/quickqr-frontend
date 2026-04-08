import { useState, useEffect } from 'react';
import { Users, Plus, Settings, Trash2 } from 'lucide-react';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

export default function TeamManager() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data } = await supabase
      .from('team_members')
      .select('*, teams(*)')
      .eq('user_id', session.user.id);
    
    setTeams(data || []);
    setLoading(false);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Team Workspaces</h2>
      {teams.map((membership) => (
        <div key={membership.id} style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
          <h3>{membership.teams?.name}</h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Role: {membership.role}</p>
        </div>
      ))}
    </div>
  );
}
