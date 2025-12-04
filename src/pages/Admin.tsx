import { useState, useEffect, useMemo } from 'react';
import { Shield, Search, Trash2, Edit2, RefreshCw, X, Check, QrCode } from 'lucide-react';
import { fetchAllQRCodes, updateQRCode, deleteQRCode, type AdminQRCode } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import QRCodeViewModal from '../components/QRCodeViewModal';

// Helper function to parse and display QR code content
function getDisplayContent(qr: AdminQRCode): string {
  try {
    if (!qr.content) {
      return 'No content';
    }

    // Try to parse as JSON
    const contentDecoded = JSON.parse(qr.content);

    // Return appropriate display based on type
    switch (qr.type) {
      case 'url':
        return contentDecoded.url || 'URL';
      case 'text':
        const text = contentDecoded.text || '';
        return text.length > 50 ? text.substring(0, 50) + '...' : text;
      case 'email':
        return contentDecoded.email || 'Email';
      case 'phone':
        return contentDecoded.phone || 'Phone';
      case 'sms':
        return contentDecoded.number || 'SMS';
      case 'location':
        return `${contentDecoded.latitude || ''},${contentDecoded.longitude || ''}`;
      case 'vcard':
      case 'mecard':
        return contentDecoded.name || 'Contact Card';
      case 'wifi':
        return contentDecoded.ssid || 'WiFi';
      case 'event':
        return contentDecoded.title || 'Event';
      default:
        return qr.type;
    }
  } catch (e) {
    // If not JSON, return raw content (truncated)
    return qr.content.substring(0, 50) + (qr.content.length > 50 ? '...' : '');
  }
}

// Helper function to get display name with indicator for missing names
function getDisplayName(qr: AdminQRCode): { name: string; isMissing: boolean } {
  if (!qr.name || qr.name.trim() === '' || qr.name === 'null') {
    return { name: 'Unnamed QR Code', isMissing: true };
  }
  return { name: qr.name, isMissing: false };
}

export default function Admin() {
  const { user } = useAuth();
  const [qrCodes, setQrCodes] = useState<AdminQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewingQRCode, setViewingQRCode] = useState<AdminQRCode | null>(null);

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

  // Filter QR codes based on search
  const filteredQRCodes = useMemo(() => {
    if (!searchQuery) return qrCodes;

    const query = searchQuery.toLowerCase();
    return qrCodes.filter(qr =>
      qr.name.toLowerCase().includes(query) ||
      qr.content.toLowerCase().includes(query) ||
      qr.user_email.toLowerCase().includes(query) ||
      qr.qrcodeid.toLowerCase().includes(query)
    );
  }, [qrCodes, searchQuery]);

  // Handle edit start
  const handleStartEdit = (qr: AdminQRCode) => {
    setEditingId(qr.qrcodeid);
    setEditContent(qr.content);
  };

  // Handle edit cancel
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  // Handle save edit
  const handleSaveEdit = async (qrcodeid: string) => {
    if (!editContent.trim()) {
      alert('Content cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const result = await updateQRCode(qrcodeid, editContent);

      if (result.success) {
        // Update local state
        setQrCodes(prevCodes =>
          prevCodes.map(qr =>
            qr.qrcodeid === qrcodeid ? { ...qr, content: editContent } : qr
          )
        );
        setEditingId(null);
        setEditContent('');
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
      const result = await deleteQRCode(qr.qrcodeid);

      if (result.success) {
        setQrCodes(prevCodes => prevCodes.filter(code => code.qrcodeid !== qr.qrcodeid));
      } else {
        alert(`Failed to delete: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to delete QR code');
    }
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
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">
                        <span className="inline-block ml-[52px]">Name</span>
                      </th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">
                        Content
                      </th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">
                        Scans
                      </th>
                      <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">
                        Created
                      </th>
                      <th className="text-right py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQRCodes.map((qr) => {
                      const displayName = getDisplayName(qr);
                      const displayContent = getDisplayContent(qr);

                      return (
                        <tr key={qr.qrcodeid} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setViewingQRCode(qr)}
                                className="w-10 h-10 bg-teal-500 hover:bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
                                title="View QR Code"
                              >
                                <QrCode className="w-6 h-6 text-white" />
                              </button>
                              <div>
                                <div className={`font-medium ${displayName.isMissing ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                                  {displayName.name}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">{qr.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {editingId === qr.qrcodeid ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEdit(qr.qrcodeid)}
                                  disabled={saving}
                                  className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                                  title="Save"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={saving}
                                  className="p-1 text-gray-600 hover:text-gray-700 disabled:opacity-50"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-600 max-w-md truncate" title={qr.content}>
                                {displayContent}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{qr.user_email}</td>
                          <td className="py-4 px-4 text-sm text-gray-900 font-medium">{qr.scan_count}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{formatDate(qr.createdat)}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {editingId === qr.qrcodeid ? null : (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(qr)}
                                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit content"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(qr)}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* QR Code View Modal */}
      <QRCodeViewModal
        qrCode={viewingQRCode}
        onClose={() => setViewingQRCode(null)}
      />
    </div>
  );
}
