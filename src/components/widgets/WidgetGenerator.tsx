import { useState } from 'react';
import { Code, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WidgetGenerator({ qrId }) {
  const [size, setSize] = useState(150);
  const [style, setStyle] = useState('default');

  const embedCode = `<iframe src="https://quickqr.app/widget/${qrId}?size=${size}&style=${style}" width="${size}" height="${size}" frameborder="0"></iframe>`;

  return (
    <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem' }}>
      <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Embed Widget</h3>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Size: {size}px</label>
        <input type="range" min="100" max="300" value={size} onChange={(e) => setSize(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <pre style={{ padding: '1rem', background: '#1f2937', color: '#e5e7eb', borderRadius: '0.25rem', fontSize: '0.75rem', overflow: 'auto' }}>{embedCode}</pre>
      <button onClick={() => { navigator.clipboard.writeText(embedCode); toast.success('Copied!'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#14b8a6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', marginTop: '0.5rem' }}>
        <Copy size={16} /> Copy Code
      </button>
    </div>
  );
}
