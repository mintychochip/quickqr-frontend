import { useState, useEffect } from 'react';
import { 
  Webhook, 
  Plus, 
  Settings, 
  Trash2, 
  ToggleRight, 
  ToggleLeft, 
  History, 
  CheckCircle, 
  XCircle,
  Copy,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { webhookService, type Webhook as WebhookType, type WebhookDelivery } from '../../services/webhookService';

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookType | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<WebhookDelivery[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>(['qr.scan']);

  useEffect(() => {
    loadWebhooks();
  }, []);

  async function loadWebhooks() {
    try {
      setLoading(true);
      const data = await webhookService.getWebhooks();
      setWebhooks(data);
    } catch (err) {
      toast.error('Failed to load webhooks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDeliveryLogs(webhookId: string) {
    try {
      setLogsLoading(true);
      const logs = await webhookService.getDeliveryLogs(webhookId);
      setDeliveryLogs(logs);
    } catch (err) {
      toast.error('Failed to load delivery logs');
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  }

  function resetForm() {
    setFormName('');
    setFormUrl('');
    setFormSecret('');
    setFormEvents(['qr.scan']);
    setEditingWebhook(null);
  }

  function startEdit(webhook: WebhookType) {
    setEditingWebhook(webhook);
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormSecret(webhook.secret || '');
    setFormEvents(webhook.event_types);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingWebhook) {
        await webhookService.updateWebhook(editingWebhook.id, {
          name: formName,
          url: formUrl,
          secret: formSecret || undefined,
          event_types: formEvents,
        });
        toast.success('Webhook updated');
      } else {
        await webhookService.createWebhook({
          name: formName,
          url: formUrl,
          secret: formSecret || undefined,
          event_types: formEvents,
        });
        toast.success('Webhook created');
      }

      resetForm();
      setShowForm(false);
      await loadWebhooks();
    } catch (err) {
      toast.error('Failed to save webhook');
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await webhookService.deleteWebhook(id);
      toast.success('Webhook deleted');
      await loadWebhooks();
    } catch (err) {
      toast.error('Failed to delete webhook');
      console.error(err);
    }
  }

  async function handleToggle(webhook: WebhookType) {
    try {
      await webhookService.toggleWebhook(webhook.id, !webhook.is_active);
      toast.success(`Webhook ${webhook.is_active ? 'disabled' : 'enabled'}`);
      await loadWebhooks();
    } catch (err) {
      toast.error('Failed to toggle webhook');
      console.error(err);
    }
  }

  function viewLogs(webhook: WebhookType) {
    setSelectedWebhook(webhook);
    setShowLogs(true);
    loadDeliveryLogs(webhook.id);
  }

  function getStatusIcon(status: number | null) {
    if (!status) return <RefreshCw size={16} className="spin" style={{ color: '#6b7280' }} />;
    if (status >= 200 && status < 300) {
      return <CheckCircle size={16} style={{ color: '#10b981' }} />;
    }
    return <XCircle size={16} style={{ color: '#ef4444' }} />;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Webhooks</h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
            Get notified when your QR codes are scanned
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <Plus size={18} />
          Add Webhook
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
            {editingWebhook ? 'Edit Webhook' : 'New Webhook'}
          </h3>

          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Zapier Integration"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Webhook URL
              </label>
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Secret (optional)
                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '0.25rem' }}>
                  For HMAC signature verification
                </span>
              </label>
              <input
                type="text"
                value={formSecret}
                onChange={(e) => setFormSecret(e.target.value)}
                placeholder="whsec_..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Event Types
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['qr.scan', 'qr.created', 'qr.updated'].map((event) => (
                  <label
                    key={event}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      background: formEvents.includes(event) ? '#dbeafe' : '#f3f4f6',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formEvents.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormEvents([...formEvents, event]);
                        } else {
                          setFormEvents(formEvents.filter((ev) => ev !== event));
                        }
                      }}
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {editingWebhook ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              style={{
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showLogs && selectedWebhook && (
        <div
          style={{
            background: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              Delivery Logs: {selectedWebhook.name}
            </h3>
            <button
              onClick={() => setShowLogs(false)}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#6b7280',
              }}
            >
              Close
            </button>
          </div>

          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading...</div>
          ) : deliveryLogs.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>No delivery logs yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {deliveryLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'white',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {getStatusIcon(log.response_status)}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{log.event_type}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {log.delivered_at ? new Date(log.delivered_at).toLocaleString() : 'Pending'}
                      {log.response_status && ` · Status: ${log.response_status}`}
                      {log.retry_count > 0 && ` · Retries: ${log.retry_count}`}
                    </div>
                    {log.error_message && (
                      <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                        {log.error_message}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(log.payload, null, 2))}
                    style={{
                      padding: '0.25rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                    }}
                    title="Copy payload"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {webhooks.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            background: '#f9fafb',
            borderRadius: '0.75rem',
            border: '2px dashed #e5e7eb',
          }}
        >
          <Webhook size={48} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
          <p style={{ color: '#6b7280', margin: 0 }}>No webhooks configured yet</p>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0.5rem 0 0 0' }}>
            Add a webhook to get notified when your QR codes are scanned
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: 'white',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                opacity: webhook.is_active ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '0.5rem',
                  background: webhook.is_active ? '#dbeafe' : '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Webhook size={20} style={{ color: webhook.is_active ? '#3b82f6' : '#9ca3af' }} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>{webhook.name}</span>
                  {!webhook.is_active && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.375rem',
                        background: '#f3f4f6',
                        color: '#6b7280',
                        borderRadius: '0.25rem',
                      }}
                    >
                      Disabled
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: '0.25rem 0 0 0',
                    fontFamily: 'monospace',
                  }}
                >
                  {webhook.url}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {webhook.event_types.map((event) => (
                    <span
                      key={event}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.375rem',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '0.25rem',
                      }}
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => viewLogs(webhook)}
                  style={{
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    borderRadius: '0.375rem',
                  }}
                  title="View logs"
                >
                  <History size={18} />
                </button>
                <button
                  onClick={() => startEdit(webhook)}
                  style={{
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    borderRadius: '0.375rem',
                  }}
                  title="Edit"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={() => handleToggle(webhook)}
                  style={{
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: webhook.is_active ? '#3b82f6' : '#9ca3af',
                    borderRadius: '0.375rem',
                  }}
                  title={webhook.is_active ? 'Disable' : 'Enable'}
                >
                  {webhook.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button
                  onClick={() => handleDelete(webhook.id)}
                  style={{
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ef4444',
                    borderRadius: '0.375rem',
                  }}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#f0f9ff',
          borderRadius: '0.5rem',
          border: '1px solid #bae6fd',
        }}
      >
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: '#0369a1' }}>
          Webhook Payload Format
        </h4>
        <pre
          style={{
            fontSize: '0.75rem',
            background: '#f1f5f9',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            overflow: 'auto',
            margin: 0,
          }}
        >
{`{
  "event": "qr.scan",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "qr_id": "uuid-here",
    "qr_name": "My QR Code",
    "scan": {
      "os": "iOS",
      "browser": "Safari",
      "country": "US",
      "city": "San Francisco",
      "referrer": "https://example.com"
    }
  }
}`}
        </pre>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
          All webhooks include an <code>X-Webhook-Signature</code> header for verification.
        </p>
      </div>
    </div>
  );
}
