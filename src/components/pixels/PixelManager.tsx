import { useState, useEffect } from 'react';
import {
  Target,
  Facebook,
  Globe,
  Linkedin,
  Plus,
  Settings,
  Trash2,
  ToggleRight,
  ToggleLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Pixel,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pixelService, type PixelSettings } from '../../services/pixelService';

interface PixelFormData {
  qrId: string;
  facebookPixelId: string;
  facebookEvents: string[];
  facebookEnabled: boolean;
  googleConversionId: string;
  googleConversionLabel: string;
  googleEnabled: boolean;
  linkedinPartnerId: string;
  linkedinEnabled: boolean;
}

const DEFAULT_FACEBOOK_EVENTS = ['PageView', 'Lead', 'ViewContent'];

export default function PixelManager() {
  const [pixelSettings, setPixelSettings] = useState<PixelSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPixel, setEditingPixel] = useState<PixelSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<PixelFormData>({
    qrId: '',
    facebookPixelId: '',
    facebookEvents: ['PageView'],
    facebookEnabled: false,
    googleConversionId: '',
    googleConversionLabel: '',
    googleEnabled: false,
    linkedinPartnerId: '',
    linkedinEnabled: false,
  });

  // Validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof PixelFormData, string>>>({});

  useEffect(() => {
    loadPixelSettings();
  }, []);

  async function loadPixelSettings() {
    try {
      setLoading(true);
      // Note: In a real implementation, you'd fetch all pixel settings for the user
      // This is a simplified version
      setPixelSettings([]);
    } catch (err) {
      toast.error('Failed to load pixel settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      qrId: '',
      facebookPixelId: '',
      facebookEvents: ['PageView'],
      facebookEnabled: false,
      googleConversionId: '',
      googleConversionLabel: '',
      googleEnabled: false,
      linkedinPartnerId: '',
      linkedinEnabled: false,
    });
    setErrors({});
    setEditingPixel(null);
  }

  function startEdit(pixel: PixelSettings) {
    setEditingPixel(pixel);
    setFormData({
      qrId: pixel.qr_id,
      facebookPixelId: pixel.facebook_pixel_id || '',
      facebookEvents: pixel.facebook_events || ['PageView'],
      facebookEnabled: pixel.facebook_enabled,
      googleConversionId: pixel.google_conversion_id || '',
      googleConversionLabel: pixel.google_conversion_label || '',
      googleEnabled: pixel.google_enabled,
      linkedinPartnerId: pixel.linkedin_partner_id || '',
      linkedinEnabled: pixel.linkedin_enabled,
    });
    setShowForm(true);
  }

  function validateForm(): boolean {
    const newErrors: Partial<Record<keyof PixelFormData, string>> = {};

    if (!formData.qrId.trim()) {
      newErrors.qrId = 'QR Code ID is required';
    }

    if (formData.facebookEnabled && formData.facebookPixelId) {
      if (!pixelService.validateFacebookPixelId(formData.facebookPixelId)) {
        newErrors.facebookPixelId = 'Invalid Facebook Pixel ID (should be numeric)';
      }
    }

    if (formData.googleEnabled && formData.googleConversionId) {
      if (!pixelService.validateGoogleConversionId(formData.googleConversionId)) {
        newErrors.googleConversionId = 'Invalid Conversion ID (format: AW-XXXXXXXXX)';
      }
    }

    if (formData.linkedinEnabled && formData.linkedinPartnerId) {
      if (!pixelService.validateLinkedInPartnerId(formData.linkedinPartnerId)) {
        newErrors.linkedinPartnerId = 'Invalid LinkedIn Partner ID (should be numeric)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setIsSaving(true);

    try {
      if (editingPixel) {
        await pixelService.updatePixelSettings(formData.qrId, {
          facebook_pixel_id: formData.facebookPixelId || undefined,
          facebook_events: formData.facebookEvents,
          facebook_enabled: formData.facebookEnabled,
          google_conversion_id: formData.googleConversionId || undefined,
          google_conversion_label: formData.googleConversionLabel || undefined,
          google_enabled: formData.googleEnabled,
          linkedin_partner_id: formData.linkedinPartnerId || undefined,
          linkedin_enabled: formData.linkedinEnabled,
        });
        toast.success('Pixel settings updated');
      } else {
        await pixelService.createPixelSettings({
          qr_id: formData.qrId,
          facebook_pixel_id: formData.facebookPixelId || undefined,
          facebook_events: formData.facebookEvents,
          facebook_enabled: formData.facebookEnabled,
          google_conversion_id: formData.googleConversionId || undefined,
          google_conversion_label: formData.googleConversionLabel || undefined,
          google_enabled: formData.googleEnabled,
          linkedin_partner_id: formData.linkedinPartnerId || undefined,
          linkedin_enabled: formData.linkedinEnabled,
        });
        toast.success('Pixel settings created');
      }

      resetForm();
      setShowForm(false);
      await loadPixelSettings();
    } catch (err) {
      toast.error('Failed to save pixel settings');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(qrId: string) {
    if (!confirm('Are you sure you want to delete these pixel settings?')) return;

    try {
      await pixelService.deletePixelSettings(qrId);
      toast.success('Pixel settings deleted');
      await loadPixelSettings();
    } catch (err) {
      toast.error('Failed to delete pixel settings');
      console.error(err);
    }
  }

  async function handleToggle(pixel: PixelSettings, type: 'facebook' | 'google' | 'linkedin') {
    const enabledField = `${type}_enabled` as const;
    const newEnabled = !pixel[enabledField];

    try {
      await pixelService.togglePixel(pixel.qr_id, type, newEnabled);
      toast.success(`${type} pixel ${newEnabled ? 'enabled' : 'disabled'}`);
      await loadPixelSettings();
    } catch (err) {
      toast.error('Failed to toggle pixel');
      console.error(err);
    }
  }

  function toggleFacebookEvent(event: string) {
    setFormData(prev => ({
      ...prev,
      facebookEvents: prev.facebookEvents.includes(event)
        ? prev.facebookEvents.filter(e => e !== event)
        : [...prev.facebookEvents, event],
    }));
  }

  function updateFormField<K extends keyof PixelFormData>(field: K, value: PixelFormData[K]) {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
            <Target size={24} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Marketing Pixels</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
              Track conversions with Facebook Pixel, Google Ads, and LinkedIn Insight Tag
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Add Pixel Settings
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Settings size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {editingPixel ? 'Edit Pixel Settings' : 'Create Pixel Settings'}
            </h3>
          </div>

          <form onSubmit={handleSubmit}>
            {/* QR Code ID */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                QR Code ID <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.qrId}
                onChange={(e) => updateFormField('qrId', e.target.value)}
                placeholder="Enter QR code ID"
                disabled={!!editingPixel}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: errors.qrId ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  background: editingPixel ? '#f3f4f6' : 'white',
                }}
              />
              {errors.qrId && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', marginBottom: 0 }}>
                  {errors.qrId}
                </p>
              )}
            </div>

            {/* Facebook Pixel Section */}
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Facebook size={20} style={{ color: '#1877f2' }} />
                  <span style={{ fontWeight: 500 }}>Facebook Pixel</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateFormField('facebookEnabled', !formData.facebookEnabled)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {formData.facebookEnabled ? (
                    <ToggleRight size={28} style={{ color: '#10b981' }} />
                  ) : (
                    <ToggleLeft size={28} style={{ color: '#9ca3af' }} />
                  )}
                </button>
              </div>

              {formData.facebookEnabled && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Pixel ID
                    </label>
                    <input
                      type="text"
                      value={formData.facebookPixelId}
                      onChange={(e) => updateFormField('facebookPixelId', e.target.value)}
                      placeholder="1234567890"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: errors.facebookPixelId ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                      }}
                    />
                    {errors.facebookPixelId && (
                      <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', marginBottom: 0 }}>
                        {errors.facebookPixelId}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Events to Track
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {DEFAULT_FACEBOOK_EVENTS.map((event) => (
                        <button
                          key={event}
                          type="button"
                          onClick={() => toggleFacebookEvent(event)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.875rem',
                            borderRadius: '0.25rem',
                            border: '1px solid',
                            borderColor: formData.facebookEvents.includes(event) ? '#1877f2' : '#d1d5db',
                            background: formData.facebookEvents.includes(event) ? '#eff6ff' : 'white',
                            color: formData.facebookEvents.includes(event) ? '#1877f2' : '#374151',
                            cursor: 'pointer',
                          }}
                        >
                          {formData.facebookEvents.includes(event) && (
                            <CheckCircle size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          )}
                          {event}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Google Ads Section */}
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={20} style={{ color: '#ea4335' }} />
                  <span style={{ fontWeight: 500 }}>Google Ads</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateFormField('googleEnabled', !formData.googleEnabled)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {formData.googleEnabled ? (
                    <ToggleRight size={28} style={{ color: '#10b981' }} />
                  ) : (
                    <ToggleLeft size={28} style={{ color: '#9ca3af' }} />
                  )}
                </button>
              </div>

              {formData.googleEnabled && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Conversion ID
                    </label>
                    <input
                      type="text"
                      value={formData.googleConversionId}
                      onChange={(e) => updateFormField('googleConversionId', e.target.value)}
                      placeholder="AW-123456789"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: errors.googleConversionId ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                      }}
                    />
                    {errors.googleConversionId && (
                      <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', marginBottom: 0 }}>
                        {errors.googleConversionId}
                      </p>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Conversion Label
                    </label>
                    <input
                      type="text"
                      value={formData.googleConversionLabel}
                      onChange={(e) => updateFormField('googleConversionLabel', e.target.value)}
                      placeholder="AbCdEfGhIjK"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* LinkedIn Section */}
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Linkedin size={20} style={{ color: '#0a66c2' }} />
                  <span style={{ fontWeight: 500 }}>LinkedIn Insight Tag</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateFormField('linkedinEnabled', !formData.linkedinEnabled)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {formData.linkedinEnabled ? (
                    <ToggleRight size={28} style={{ color: '#10b981' }} />
                  ) : (
                    <ToggleLeft size={28} style={{ color: '#9ca3af' }} />
                  )}
                </button>
              </div>

              {formData.linkedinEnabled && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Partner ID
                  </label>
                  <input
                    type="text"
                    value={formData.linkedinPartnerId}
                    onChange={(e) => updateFormField('linkedinPartnerId', e.target.value)}
                    placeholder="1234567"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: errors.linkedinPartnerId ? '1px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                    }}
                  />
                  {errors.linkedinPartnerId && (
                    <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', marginBottom: 0 }}>
                      {errors.linkedinPartnerId}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  background: isSaving ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : editingPixel ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty State */}
      {!loading && pixelSettings.length === 0 && !showForm && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: '#f9fafb',
            borderRadius: '0.5rem',
            border: '2px dashed #e5e7eb',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem',
              background: '#fef3c7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pixel size={32} style={{ color: '#f59e0b' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No pixel settings yet
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Add Facebook Pixel, Google Ads, or LinkedIn Insight Tag to track conversions from your QR code scans.
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Add Your First Pixel
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading pixel settings...</p>
        </div>
      )}

      {/* Info Card */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#eff6ff',
          borderRadius: '0.5rem',
          border: '1px solid #dbeafe',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <AlertCircle size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e40af', margin: '0 0 0.25rem 0' }}>
              How it works
            </p>
            <p style={{ fontSize: '0.875rem', color: '#3b82f6', margin: 0 }}>
              When someone scans your QR code, we&apos;ll fire the enabled pixels server-side for accurate tracking.
              This works even if the user has ad blockers enabled.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
