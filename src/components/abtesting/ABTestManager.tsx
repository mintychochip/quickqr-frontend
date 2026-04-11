import { useState } from 'react';
import { Split, Plus } from 'lucide-react';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

export default function ABTestManager({ qrId }: { qrId: string }) {
  const [variants, setVariants] = useState([{ name: 'A', url: '', weight: 50 }]);

  async function createTest() {
    const { data: test } = await supabase.from('ab_tests').insert({ qr_id: qrId, name: 'Test' }).select().single();
    if (test) {
      await supabase.from('ab_variants').insert(variants.map(v => ({ ...v, test_id: test.id })));
      toast.success('A/B test created');
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>A/B Testing</h3>
      {variants.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input placeholder="Variant name" value={v.name} onChange={(e) => {
            const newVariants = [...variants];
            newVariants[i].name = e.target.value;
            setVariants(newVariants);
          }} style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }} />
          <input placeholder="URL" value={v.url} onChange={(e) => {
            const newVariants = [...variants];
            newVariants[i].url = e.target.value;
            setVariants(newVariants);
          }} style={{ flex: 1, padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }} />
          <input type="number" placeholder="%" value={v.weight} onChange={(e) => {
            const newVariants = [...variants];
            newVariants[i].weight = parseInt(e.target.value);
            setVariants(newVariants);
          }} style={{ width: '60px', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }} />
        </div>
      ))}
      <button onClick={() => setVariants([...variants, { name: String.fromCharCode(65 + variants.length), url: '', weight: 50 }])} style={{ padding: '0.5rem 1rem', background: '#14b8a6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Add Variant</button>
      <button onClick={createTest} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', marginLeft: '0.5rem' }}>Create Test</button>
    </div>
  );
}
