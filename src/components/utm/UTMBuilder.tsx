import { useState, useEffect } from 'react';
import { Link, Tag, Copy, Check, Save, Trash2, ChevronDown, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchUserUTMTemplates,
  createUTMTemplate,
  deleteUTMTemplate,
  applyTemplate,
  type UTMTemplate,
} from '../../services/utmTemplateService';

interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

interface UTMBuilderProps {
  baseUrl?: string;
  onUTMChange?: (url: string, params: UTMParams) => void;
}

const PRESETS = {
  social: {
    source: 'social',
    medium: 'social',
  },
  email: {
    source: 'newsletter',
    medium: 'email',
  },
  search: {
    source: 'google',
    medium: 'cpc',
  },
  organic: {
    source: 'google',
    medium: 'organic',
  },
  affiliate: {
    source: 'affiliate',
    medium: 'referral',
  },
};

export default function UTMBuilder({ baseUrl = '', onUTMChange }: UTMBuilderProps) {
  const [params, setParams] = useState<UTMParams>({
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
  });
  const [copied, setCopied] = useState(false);
  
  // Template state
  const [templates, setTemplates] = useState<UTMTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (onUTMChange) {
      onUTMChange(buildURL(), params);
    }
  }, [params, baseUrl]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setIsLoadingTemplates(true);
    const result = await fetchUserUTMTemplates();
    if (result.success && result.templates) {
      setTemplates(result.templates);
    }
    setIsLoadingTemplates(false);
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const newParams = applyTemplate(template);
      setParams(newParams);
      toast.success(`Loaded template: ${template.name}`);
    }
  }

  async function handleSaveTemplate() {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!params.source || !params.medium) {
      toast.error('Source and medium are required');
      return;
    }

    setIsSaving(true);
    const result = await createUTMTemplate({
      name: newTemplateName,
      source: params.source,
      medium: params.medium,
      campaign: params.campaign,
      term: params.term,
      content: params.content,
    });

    if (result.success && result.template) {
      toast.success('Template saved!');
      setTemplates(prev => [result.template!, ...prev]);
      setNewTemplateName('');
      setShowSaveForm(false);
    } else {
      toast.error(result.error || 'Failed to save template');
    }
    setIsSaving(false);
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm('Delete this template?')) return;

    setIsDeleting(templateId);
    const result = await deleteUTMTemplate(templateId);

    if (result.success) {
      toast.success('Template deleted');
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
      }
    } else {
      toast.error(result.error || 'Failed to delete template');
    }
    setIsDeleting(null);
  }

  function buildURL(): string {
    if (!baseUrl) return '';
    
    try {
      const url = new URL(baseUrl);
      const utmKeys: (keyof UTMParams)[] = ['source', 'medium', 'campaign', 'term', 'content'];
      
      utmKeys.forEach(key => {
        const value = params[key];
        if (value && value.trim()) {
          url.searchParams.set(`utm_${key}`, value.trim());
        }
      });
      
      return url.toString();
    } catch {
      return baseUrl;
    }
  }

  function updateParam(key: keyof UTMParams, value: string) {
    setParams(prev => ({ ...prev, [key]: value }));
  }

  function applyPreset(name: keyof typeof PRESETS) {
    const preset = PRESETS[name];
    setParams(prev => ({
      ...prev,
      source: preset.source || prev.source,
      medium: preset.medium || prev.medium,
    }));
    toast.success(`Applied ${name} preset`);
  }

  async function copyURL() {
    const url = buildURL();
    if (!url) {
      toast.error('No URL to copy');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('URL with UTM copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }

  const utmURL = buildURL();
  const isValidURL = baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://'));

  return (
    <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Link size={18} color="#0284c7" />
        <h3 style={{ fontWeight: 600, color: '#0369a1' }}>UTM Campaign Tracking</h3>
      </div>

      {/* Presets */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '0.5rem' }}>
          Quick Presets
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Object.keys(PRESETS).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset as keyof typeof PRESETS)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                background: '#e0f2fe',
                color: '#0369a1',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Templates */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
            Saved Templates
          </label>
          <button
            onClick={() => setShowSaveForm(!showSaveForm)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              background: '#e0f2fe',
              color: '#0369a1',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            <Save size={12} />
            Save Current
          </button>
        </div>

        {/* Template selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: showSaveForm ? '0.75rem' : 0 }}>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            disabled={isLoadingTemplates || templates.length === 0}
            style={{
              flex: 1,
              padding: '0.5rem',
              fontSize: '0.875rem',
              border: '1px solid #cbd5e1',
              borderRadius: '0.25rem',
              background: isLoadingTemplates || templates.length === 0 ? '#f1f5f9' : 'white',
              cursor: isLoadingTemplates || templates.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">
              {isLoadingTemplates ? 'Loading...' : templates.length === 0 ? 'No saved templates' : 'Select a template'}
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {selectedTemplateId && (
            <button
              onClick={() => handleDeleteTemplate(selectedTemplateId)}
              disabled={isDeleting === selectedTemplateId}
              style={{
                padding: '0.5rem',
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                opacity: isDeleting === selectedTemplateId ? 0.5 : 1,
              }}
              title="Delete template"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Save form */}
        {showSaveForm && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name..."
              style={{
                flex: 1,
                padding: '0.5rem',
                fontSize: '0.875rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.25rem',
              }}
            />
            <button
              onClick={handleSaveTemplate}
              disabled={isSaving || !newTemplateName.trim()}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                background: isSaving || !newTemplateName.trim() ? '#94a3b8' : '#0284c7',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: isSaving || !newTemplateName.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* UTM Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>
              utm_source <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={params.source}
              onChange={(e) => updateParam('source', e.target.value)}
              placeholder="google, facebook, newsletter"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>
              utm_medium <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={params.medium}
              onChange={(e) => updateParam('medium', e.target.value)}
              placeholder="cpc, email, social"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>
            utm_campaign
          </label>
          <input
            type="text"
            value={params.campaign}
            onChange={(e) => updateParam('campaign', e.target.value)}
            placeholder="summer_sale, product_launch"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #cbd5e1',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>
              utm_term
            </label>
            <input
              type="text"
              value={params.term}
              onChange={(e) => updateParam('term', e.target.value)}
              placeholder="keywords"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>
              utm_content
            </label>
            <input
              type="text"
              value={params.content}
              onChange={(e) => updateParam('content', e.target.value)}
              placeholder="banner_a, text_link"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      {isValidURL && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'white', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
              Generated URL
            </label>
            <button
              onClick={copyURL}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                background: copied ? '#22c55e' : '#0284c7',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <code
            style={{
              display: 'block',
              fontSize: '0.75rem',
              color: '#334155',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}
          >
            {utmURL}
          </code>
        </div>
      )}

      {/* Validation hint */}
      {!isValidURL && baseUrl && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#ef4444' }}>
          Please enter a valid URL (starting with http:// or https://)
        </p>
      )}

      <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
        <Tag size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
        UTM parameters help you track where your traffic comes from in Google Analytics and other analytics tools.
      </p>
    </div>
  );
}
