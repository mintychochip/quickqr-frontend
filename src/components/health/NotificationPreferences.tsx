import React, { useState, useEffect } from 'react';
import { Bell, Mail, Slack, Webhook, Clock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../config/supabase';

interface NotificationPrefs {
  email_enabled: boolean;
  email_address: string | null;
  slack_enabled: boolean;
  slack_webhook_url: string | null;
  slack_channel: string | null;
  webhook_enabled: boolean;
  webhook_url: string | null;
  webhook_headers: Record<string, string> | null;
  daily_digest_enabled: boolean;
  digest_time: string;
}

interface NotificationPreferencesProps {
  className?: string;
}

export function NotificationPreferences({ className = '' }: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email_enabled: true,
    email_address: null,
    slack_enabled: false,
    slack_webhook_url: null,
    slack_channel: null,
    webhook_enabled: false,
    webhook_url: null,
    webhook_headers: null,
    daily_digest_enabled: false,
    digest_time: '09:00',
  });
  const [originalPrefs, setOriginalPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [webhookHeadersJson, setWebhookHeadersJson] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    if (originalPrefs) {
      const changed = JSON.stringify(prefs) !== JSON.stringify(originalPrefs);
      setHasChanges(changed);
    }
  }, [prefs, originalPrefs]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user/notification-prefs`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }

      const result = await response.json();
      const loadedPrefs = result.data;
      
      setPrefs(loadedPrefs);
      setOriginalPrefs(loadedPrefs);
      
      if (loadedPrefs.webhook_headers) {
        setWebhookHeadersJson(JSON.stringify(loadedPrefs.webhook_headers, null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Parse webhook headers JSON
      let parsedHeaders = null;
      if (webhookHeadersJson.trim()) {
        try {
          parsedHeaders = JSON.parse(webhookHeadersJson);
        } catch {
          setError('Invalid webhook headers JSON format');
          return;
        }
      }

      const payload = {
        ...prefs,
        webhook_headers: parsedHeaders,
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user/notification-prefs`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save preferences');
      }

      const result = await response.json();
      setPrefs(result.data);
      setOriginalPrefs(result.data);
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePref = <K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K]
  ) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
            <p className="text-sm text-gray-600">
              Configure how you want to be notified when your QR codes have issues
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 py-3 bg-red-50 border-b border-red-100"
          >
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 py-3 bg-green-50 border-b border-green-100"
          >
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Preferences saved successfully!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Email Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-600">Get alerts sent to your email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={prefs.email_enabled}
                onChange={(e) => updatePref('email_enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
          
          {prefs.email_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="ml-14"
            >
              <input
                type="email"
                placeholder="Leave blank to use your account email"
                value={prefs.email_address || ''}
                onChange={(e) => updatePref('email_address', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                If left blank, we'll use the email associated with your account
              </p>
            </motion.div>
          )}
        </div>

        <div className="border-t border-gray-200" />

        {/* Slack Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Slack className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Slack Notifications</h3>
                <p className="text-sm text-gray-600">Send alerts to a Slack channel</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={prefs.slack_enabled}
                onChange={(e) => updatePref('slack_enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
          
          {prefs.slack_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="ml-14 space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={prefs.slack_webhook_url || ''}
                  onChange={(e) => updatePref('slack_webhook_url', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel (optional)
                </label>
                <input
                  type="text"
                  placeholder="#alerts or @username"
                  value={prefs.slack_channel || ''}
                  onChange={(e) => updatePref('slack_channel', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </motion.div>
          )}
        </div>

        <div className="border-t border-gray-200" />

        {/* Webhook Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Webhook className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Custom Webhook</h3>
                <p className="text-sm text-gray-600">POST alerts to your own endpoint</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={prefs.webhook_enabled}
                onChange={(e) => updatePref('webhook_enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
          
          {prefs.webhook_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="ml-14 space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://api.yourservice.com/webhooks/qr-health"
                  value={prefs.webhook_url || ''}
                  onChange={(e) => updatePref('webhook_url', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Headers (JSON)
                </label>
                <textarea
                  placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
                  value={webhookHeadersJson}
                  onChange={(e) => setWebhookHeadersJson(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional JSON object with custom headers to send with each request
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="border-t border-gray-200" />

        {/* Daily Digest */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Daily Digest</h3>
                <p className="text-sm text-gray-600">Get a summary of all issues daily</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={prefs.daily_digest_enabled}
                onChange={(e) => updatePref('daily_digest_enabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
          
          {prefs.daily_digest_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="ml-14"
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Time
              </label>
              <input
                type="time"
                value={prefs.digest_time}
                onChange={(e) => updatePref('digest_time', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Time when you want to receive the daily summary (your local timezone)
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
          </p>
          <button
            onClick={savePreferences}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
