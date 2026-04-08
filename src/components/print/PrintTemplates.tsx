import { useState } from 'react';
import { Printer, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const templates = [
  { id: 'business-card', name: 'Business Card', size: '3.5x2 inches' },
  { id: 'poster', name: 'Poster (A4)', size: '8.27x11.69 inches' },
  { id: 'flyer', name: 'Flyer (A5)', size: '5.83x8.27 inches' },
  { id: 'label-2x2', name: 'Label 2"x2"', size: '2x2 inches' },
  { id: 'label-4x4', name: 'Label 4"x4"', size: '4x4 inches' },
  { id: 'name-badge', name: 'Name Badge', size: '4x3 inches' },
];

export default function PrintTemplates({ qrDataUrl }: { qrDataUrl: string }) {
  const [selected, setSelected] = useState('business-card');

  const generatePDF = () => {
    toast.success('Print template generated!');
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Printer size={24} />
        Print Templates
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {templates.map((template) => (
          <div key={template.id} onClick={() => setSelected(template.id)} style={{ padding: '1rem', border: selected === template.id ? '2px solid #14b8a6' : '1px solid #e5e7eb', borderRadius: '0.5rem', cursor: 'pointer', background: selected === template.id ? '#f0fdfa' : 'white' }}>
            <h4 style={{ fontWeight: 600 }}>{template.name}</h4>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{template.size}</p>
          </div>
        ))}
      </div>
      <button onClick={generatePDF} style={{ padding: '0.75rem 1.5rem', background: '#14b8a6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Download size={18} />
        Generate Print PDF
      </button>
    </div>
  );
}
