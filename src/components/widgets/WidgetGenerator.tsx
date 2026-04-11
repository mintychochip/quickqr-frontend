import { useState } from 'react';
import { Copy, Sun, Moon, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

interface WidgetGeneratorProps {
  qrId: string;
}

type Theme = 'light' | 'dark';
type Style = 'default' | 'minimal' | 'rounded';

export default function WidgetGenerator({ qrId }: WidgetGeneratorProps) {
  const [size, setSize] = useState(150);
  const [style, setStyle] = useState<Style>('default');
  const [theme, setTheme] = useState<Theme>('light');

  const embedCode = `<iframe src="https://quickqr.app/widget/${qrId}?size=${size}&style=${style}&theme=${theme}" width="${size}" height="${size}" frameborder="0"></iframe>`;

  const previewBg = theme === 'dark' ? '#1f2937' : '#ffffff';
  const previewBorder = theme === 'dark' ? '#374151' : '#e5e7eb';
  const previewQrColor = theme === 'dark' ? '#ffffff' : '#000000';

  return (
    <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem' }}>
      <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Embed Widget</h3>
      
      {/* Preview */}
      <div style={{ 
        marginBottom: '1rem', 
        padding: '1rem', 
        background: previewBg, 
        borderRadius: '0.5rem',
        border: `2px solid ${previewBorder}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          border: `2px solid ${previewQrColor}`,
          borderRadius: style === 'rounded' ? '12px' : style === 'minimal' ? '4px' : '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme === 'dark' ? '#111827' : '#f9fafb'
        }}>
          <QrCode size={40} color={previewQrColor} />
        </div>
        <span style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
          Preview ({theme} mode)
        </span>
      </div>

      {/* Controls */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Size: {size}px</label>
        <input 
          type="range" 
          min="100" 
          max="300" 
          value={size} 
          onChange={(e) => setSize(parseInt(e.target.value))} 
          style={{ width: '100%' }} 
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Style</label>
        <select 
          value={style} 
          onChange={(e) => setStyle(e.target.value as Style)}
          style={{ 
            width: '100%', 
            padding: '0.5rem', 
            borderRadius: '0.375rem', 
            border: '1px solid #d1d5db',
            fontSize: '0.875rem'
          }}
        >
          <option value="default">Default</option>
          <option value="minimal">Minimal</option>
          <option value="rounded">Rounded</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Theme</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setTheme('light')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: theme === 'light' ? '#14b8a6' : '#f3f4f6',
              color: theme === 'light' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <Sun size={16} /> Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: theme === 'dark' ? '#14b8a6' : '#f3f4f6',
              color: theme === 'dark' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <Moon size={16} /> Dark
          </button>
        </div>
      </div>

      <pre style={{ padding: '1rem', background: '#1f2937', color: '#e5e7eb', borderRadius: '0.25rem', fontSize: '0.75rem', overflow: 'auto' }}>{embedCode}</pre>
      <button 
        onClick={() => { navigator.clipboard.writeText(embedCode); toast.success('Copied!'); }} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.5rem 1rem', 
          background: '#14b8a6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '0.375rem', 
          cursor: 'pointer', 
          marginTop: '0.5rem',
          width: '100%',
          justifyContent: 'center'
        }}
      >
        <Copy size={16} /> Copy Code
      </button>
    </div>
  );
}
