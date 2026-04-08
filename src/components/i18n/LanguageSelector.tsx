import { useState } from 'react';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
];

export default function LanguageSelector() {
  const [current, setCurrent] = useState('en');
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', background: 'white', cursor: 'pointer' }}>
        <Globe size={18} />
        {languages.find(l => l.code === current)?.name}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50 }}>
          {languages.map((lang) => (
            <button key={lang.code} onClick={() => { setCurrent(lang.code); setOpen(false); }} style={{ display: 'block', width: '100%', padding: '0.5rem 1rem', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: current === lang.code ? 600 : 400 }}>
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
