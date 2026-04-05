import { useState, useEffect, useMemo } from 'react';
import { Shield, Search, Trash2, Edit2, RefreshCw, X, Check, QrCode, AlertTriangle } from 'lucide-react';
import { fetchAllQRCodes, updateQRCode, deleteQRCode, fetchAbuseIncidents, resolveAbuseIncident, type AdminQRCode } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import QRCodeViewModal from '../components/QRCodeViewModal';
import type { AbuseIncident } from '../types/abuse.types';

// Helper function to parse and display QR code content
function getDisplayContent(qr: AdminQRCode): string {
  try {
    if (!qr.content) {
      return 'No content';
    }

    // Content is already an object from Supabase JSONB
    const content = qr.content as Record<string, unknown>;

    // Return appropriate display based on type
    switch (qr.type) {
      case 'url':
        return (content.url as string) || 'URL';
      case 'text':
        const text = (content.text as string) || '';
        return text.length > 50 ? text.substring(0, 50) + '...' : text;
      case 'email':
        return (content.email as string) || 'Email';
      case 'phone':
        return (content.phone as string) || 'Phone';
      case 'sms':
        return (content.number as string) || 'SMS';
      case 'location':
        return `${content.latitude || ''},${content.longitude || ''}`;
      case 'vcard':
      case 'mecard':
        return (content.name as string) || 'Contact Card';
      case 'wifi':
        return (content.ssid as string) || 'WiFi';
      case 'event':
        return (content.title as string) || 'Event';
      default:
        return qr.type;
    }
  } catch (e) {
    // Fallback to stringified content
    return JSON.stringify(qr.content).substring(0, 50);
  }
}

// Helper function to get display name with indicator for missing names
function getDisplayName(qr: AdminQRCode): { name: string; isMissing: boolean } {
  if (!qr.name || qr.name.trim() === '' || qr.name === 'null') {
    return { name: 'Unnamed QR Code', isMissing: true };
  }
  return { name: qr.name, isMissing: false };
}

// Helper function to format QR type display
function formatQRType(type: string): string {
  const lower = type.toLowerCase();
  if (lower === 'url') return 'URL';
  if (lower === 'sms') return 'SMS';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function Admin() {
  const { user } = useAuth();
  const [qrCodes, setQrCodes] = useState<AdminQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [viewingQRCode, setViewingQRCode] = useState<AdminQRCode | null>(null);

  // Abuse incidents state
  const [abuseIncidents, setAbuseIncidents] = useState<AbuseIncident[]>([]);
  const [loadingAbuse, setLoadingAbuse] = useState(true);
  const [abuseError, setAbuseError] = useState<string | null>(null);

  // Load all QR codes
  const loadQRCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchAllQRCodes();

      if (result.success && result.codes) {
        setQrCodes(result.codes);
      } else {
        setError(result.error || 'Failed to load QR codes');
      }
    } catch (err) {
      setError('An error occurred while loading QR codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQRCodes();
  }, []);

  // Load abuse incidents
  const loadAbuseIncidents = async () => {
    try {
      setLoadingAbuse(true);
      setAbuseError(null);
      const result = await fetchAbuseIncidents();

      if (result.success && result.incidents) {
        setAbuseIncidents(result.incidents);
      } else {
        setAbuseError(result.error || 'Failed to load abuse incidents');
      }
    } catch (err) {
      setAbuseError('An error occurred while loading abuse incidents');
    } finally {
      setLoadingAbuse(false);
    }
  };

  useEffect(() => {
    loadAbuseIncidents();
  }, []);

  // Filter QR codes based on search
  const filteredQRCodes = useMemo(() => {
    if (!searchQuery) return qrCodes;

    const query = searchQuery.toLowerCase();
    return qrCodes.filter(qr =>
      qr.name.toLowerCase().includes(query) ||
      JSON.stringify(qr.content).toLowerCase().includes(query) ||
      (qr.user_email?.toLowerCase() || '').includes(query) ||
      (qr.qrcodeid?.toLowerCase() || '').includes(query)
    );
  }, [qrCodes, searchQuery]);

  // Handle edit start
  const handleStartEdit = (qr: AdminQRCode) => {
    setEditingId(qr.qrcodeid || qr.id);
    // Content is already an object from Supabase JSONB
    setEditContent(qr.content as Record<string, string>);
  };

  // Handle edit cancel
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent({});
  };

  // Handle save edit
  const handleSaveEdit = async (qrcodeid: string) => {
    try {
      setSaving(true);
      const jsonContent = JSON.stringify(editContent);
      const result = await updateQRCode(qrcodeid, jsonContent);

      if (result.success) {
        // Update local state
        setQrCodes(prevCodes =>
          prevCodes.map(qr =>
            (qr.qrcodeid || qr.id) === qrcodeid ? { ...qr, content: editContent } : qr
          )
        );
        setEditingId(null);
        setEditContent({});
      } else {
        alert(`Failed to update: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to update QR code');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (qr: AdminQRCode) => {
    if (!confirm(`Delete QR code "${qr.name}" owned by ${qr.user_email}?`)) {
      return;
    }

    try {
      const qrId = qr.qrcodeid || qr.id;
      const result = await deleteQRCode(qrId);

      if (result.success) {
        setQrCodes(prevCodes => prevCodes.filter(code => (code.qrcodeid || code.id) !== qrId));
      } else {
        alert(`Failed to delete: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to delete QR code');
    }
  };

  // Handle resolve abuse incident
  const handleResolve = async (id: string) => {
    if (!confirm('Mark this incident as resolved?')) {
      return;
    }

    try {
      const result = await resolveAbuseIncident(id);
      if (result.success) {
        setAbuseIncidents(prev => prev.filter(incident => incident.id !== id));
      } else {
        alert('Failed to resolve incident');
      }
    } catch (error) {
      alert('Failed to resolve incident');
    }
  };

  // Get severity badge color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format abuse type for display
  const formatAbuseType = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Check if user is admin
  if (!user?.admin) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have admin privileges</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 pt-16 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-shrink-0">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-teal-500" />
            <h1 className="text-4xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <p className="text-gray-600">Manage all QR codes across the system</p>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex-1 overflow-hidden flex flex-col">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden h-full">
          {/* Header with Search and Refresh */}
          <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold text-gray-900">All QR Codes</h2>
            <button
              onClick={loadQRCodes}
              disabled={loading}
              className="flex items-center justify-center p-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Refresh QR codes"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, content, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Content - Scrollable Table Area */}
          {loading ? (
            <div className="text-center py-12 flex-1 flex items-center justify-center">
              <div>
                <div className="inline-block w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Loading QR codes...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12 flex-1 flex items-center justify-center">
              <div>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadQRCodes}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-900 transition-all shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            </div>
          ) : filteredQRCodes.length === 0 ? (
            <div className="text-center py-12 flex-1 flex items-center justify-center">
              <p className="text-gray-600">
                {searchQuery ? `No QR codes found matching "${searchQuery}"` : 'No QR codes found'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 sm:px-4 text-gray-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">
                        QR Code
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-gray-600 font-semibold text-xs sm:text-sm uppercase tracking-wider hidden lg:table-cell">
                        Owner
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 text-gray-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">
                        Scans
                      </th>
                      <th className="text-right py-3 px-2 sm:px-4 text-gray-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQRCodes.map((qr) => {
                      const displayName = getDisplayName(qr);
                      const displayContent = getDisplayContent(qr);
                      const isEditing = editingId === qr.qrcodeid;

                      return (
                        <tr key={qr.qrcodeid} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          {/* QR Code Column */}
                          <td className="py-3 px-2 sm:px-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                              <button
                                onClick={() => setViewingQRCode(qr)}
                                className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-500 hover:bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
                                title="View QR Code"
                              >
                                <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium text-sm ${displayName.isMissing ? 'text-gray-400 italic' : 'text-gray-900'} truncate`}>
                                  {displayName.name}
                                </div>
                                <div className="text-xs text-gray-500">{formatQRType(qr.type)}</div>
                                <div className="text-xs text-gray-500 lg:hidden truncate">{qr.user_email}</div>
                                {isEditing && (
                                  <div className="mt-2 space-y-2">
                                    {qr.type === 'url' && (
                                      <input
                                        type="url"
                                        value={editContent.url || ''}
                                        onChange={(e) => setEditContent({ ...editContent, url: e.target.value })}
                                        placeholder="URL"
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                                      />
                                    )}
                                    {qr.type === 'email' && (
                                      <>
                                        <input
                                          type="email"
                                          value={editContent.email || ''}
                                          onChange={(e) => setEditContent({ ...editContent, email: e.target.value })}
                                          placeholder="Email"
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                        <input
                                          type="text"
                                          value={editContent.subject || ''}
                                          onChange={(e) => setEditContent({ ...editContent, subject: e.target.value })}
                                          placeholder="Subject (optional)"
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                        <textarea
                                          value={editContent.body || ''}
                                          onChange={(e) => setEditContent({ ...editContent, body: e.target.value })}
                                          placeholder="Body (optional)"
                                          rows={2}
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                      </>
                                    )}
                                    {qr.type === 'sms' && (
                                      <>
                                        <input
                                          type="tel"
                                          value={editContent.number || ''}
                                          onChange={(e) => setEditContent({ ...editContent, number: e.target.value })}
                                          placeholder="Phone Number"
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                        <textarea
                                          value={editContent.message || ''}
                                          onChange={(e) => setEditContent({ ...editContent, message: e.target.value })}
                                          placeholder="Message (optional)"
                                          rows={2}
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                      </>
                                    )}
                                    {qr.type === 'text' && (
                                      <textarea
                                        value={editContent.text || ''}
                                        onChange={(e) => setEditContent({ ...editContent, text: e.target.value })}
                                        placeholder="Text content"
                                        rows={3}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                                      />
                                    )}
                                    {qr.type === 'phone' && (
                                      <input
                                        type="tel"
                                        value={editContent.phone || ''}
                                        onChange={(e) => setEditContent({ ...editContent, phone: e.target.value })}
                                        placeholder="Phone Number"
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                                      />
                                    )}
                                  </div>
                                )}
                                {!isEditing && (
                                  <div className="text-xs text-gray-600 mt-1 truncate" title={displayContent}>
                                    {displayContent}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Owner Column - Hidden on mobile */}
                          <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                            {qr.user_email}
                          </td>

                          {/* Scans Column */}
                          <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-900 font-medium">
                            {qr.scan_count}
                          </td>

                          {/* Actions Column */}
                          <td className="py-3 px-2 sm:px-4">
                            <div className="flex items-center justify-end gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(qr.qrcodeid || qr.id)}
                                    disabled={saving}
                                    className="p-1.5 sm:p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Save"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                    className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(qr)}
                                    className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(qr)}
                                    className="p-1.5 sm:p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Results count - Fixed at bottom */}
              <div className="px-6 py-4 border-t border-gray-200 text-sm text-gray-600 flex-shrink-0">
                Showing {filteredQRCodes.length} of {qrCodes.length} QR codes
              </div>
            </>
          )}
        </div>
      </div>

      {/* Abuse Incidents Section */}
      <div className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900">Abuse Incidents</h2>
            {abuseIncidents.length > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                {abuseIncidents.length}
              </span>
            )}
          </div>
          <button
            onClick={loadAbuseIncidents}
            disabled={loadingAbuse}
            className="flex items-center justify-center p-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="Refresh abuse incidents"
          >
            <RefreshCw className={`w-5 h-5 ${loadingAbuse ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingAbuse ? (
          <div className="text-center py-12 flex-1 flex items-center justify-center">
            <div>
              <div className="inline-block w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading abuse incidents...</p>
            </div>
          </div>
        ) : abuseError ? (
          <div className="text-center py-12 flex-1 flex items-center justify-center">
            <div>
              <p className="text-red-600 mb-4">{abuseError}</p>
              <button
                onClick={loadAbuseIncidents}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-900 transition-all shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        ) : abuseIncidents.length === 0 ? (
          <div className="text-center py-12 flex-1 flex items-center justify-center">
            <p className="text-gray-600">No unresolved abuse incidents</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto max-h-96">
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    Evidence
                  </th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-right py-3 px-4 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {abuseIncidents.map((incident) => (
                  <tr key={incident.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {incident.user_id || 'Anonymous'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatAbuseType(incident.type)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(incident.severity)}`}>
                        {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 max-w-xs truncate">
                      {JSON.stringify(incident.evidence).substring(0, 60)}...
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(incident.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleResolve(incident.id)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code View Modal */}
      <QRCodeViewModal
        qrCode={viewingQRCode}
        onClose={() => setViewingQRCode(null)}
      />
    </div>
  );
}
