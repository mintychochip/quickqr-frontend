import { Link } from 'react-router-dom';
import { QrCode, Download, Settings, Plus, BarChart3, Search, ArrowUpDown, CreditCard, RefreshCw } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import QRCodeRow from '../components/QRCodeRow';
import StatsCharts from '../components/StatsCharts';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserQRCodes, getQRCodeDisplayUrl, getQRCodeName, deleteQRCode, type QRCode as QRCodeType } from '../services/qrCodeService';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'scans' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [qrCodes, setQrCodes] = useState<QRCodeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch QR codes function
  const loadQRCodes = async () => {
    const userId = user?.userid || user?.id;

    if (!userId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetchUserQRCodes();

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

  // Handle QR code deletion
  const handleDeleteQRCode = async (qrId: string | number) => {
    try {
      // Call the actual API to delete from backend
      const result = await deleteQRCode(String(qrId));

      if (result.success) {
        // Remove from local state on successful deletion
        setQrCodes(prevQrCodes => prevQrCodes.filter(qr => qr.qrcodeid !== qrId));
      } else {
        // Show error message if deletion failed
        alert(`Failed to delete QR code: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
      alert('Failed to delete QR code');
    }
  };

  const handleUpdateQRCode = (qrId: string, updatedData: any) => {
    setQrCodes(prevQrCodes =>
      prevQrCodes.map(qr =>
        qr.qrcodeid === qrId
          ? { ...qr, ...updatedData }
          : qr
      )
    );
  };

  // Fetch QR codes on mount
  useEffect(() => {
    loadQRCodes();
  }, [user]);

  // Transform API data to component format
  const allQRCodes = useMemo(() => {
    const transformed = qrCodes.map((qr, index) => {
      const name = getQRCodeName(qr);
      const url = getQRCodeDisplayUrl(qr);
      return {
        id: index + 1,
        qrcodeid: qr.qrcodeid,
        name: name,
        url: url,
        scans: qr.scan_count || 0,
        created: qr.createdat,
        status: 'active',
        // Pass the raw content and type for detailed display
        content: qr.content,
        type: qr.type,
        styling: qr.styling,
      };
    });
    return transformed;
  }, [qrCodes]);

  // Filter and sort QR codes
  const filteredAndSortedQRCodes = useMemo(() => {
    let filtered = allQRCodes.filter(qr =>
      qr.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'scans') {
        comparison = a.scans - b.scans;
      } else if (sortBy === 'created') {
        comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allQRCodes, searchQuery, sortBy, sortOrder]);

  const handleSort = (column: 'name' | 'scans' | 'created') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="flex">
        {/* Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 p-6">
          <nav className="space-y-6">
            {/* QR Codes Section */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">QR Codes</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveView('active')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    activeView === 'active'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="font-medium">Active</span>
                </button>
                <button
                  onClick={() => setActiveView('stats')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    activeView === 'stats'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Stats</span>
                </button>
              </div>
            </div>

            {/* Account Section */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Account</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveView('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    activeView === 'settings'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </button>
                <button
                  onClick={() => setActiveView('billing')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    activeView === 'billing'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="font-medium">Billing</span>
                </button>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="lg:ml-64 flex-1 p-4 lg:p-8">
          {/* Mobile Navigation Tabs */}
          <div className="lg:hidden mb-6 overflow-x-auto">
            <div className="flex gap-2 pb-2 min-w-max">
              <button
                onClick={() => setActiveView('active')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeView === 'active'
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span className="text-sm font-medium">Active</span>
              </button>
              <button
                onClick={() => setActiveView('stats')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeView === 'stats'
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">Stats</span>
              </button>
              <button
                onClick={() => setActiveView('settings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeView === 'settings'
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Settings</span>
              </button>
              <button
                onClick={() => setActiveView('billing')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeView === 'billing'
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Billing</span>
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {activeView === 'active' && 'Active QR Codes'}
              {activeView === 'stats' && 'Statistics'}
              {activeView === 'settings' && 'Settings'}
              {activeView === 'billing' && 'Billing'}
            </h1>
            <p className="text-gray-600">
              {activeView === 'active' && 'Manage your QR codes and track analytics'}
              {activeView === 'stats' && 'View detailed analytics and performance'}
              {activeView === 'settings' && 'Manage your account and preferences'}
              {activeView === 'billing' && 'Manage your subscription and payment methods'}
            </p>
          </div>

          {/* Content based on active view */}
          {activeView === 'active' && (
            <>
              {/* QR Codes Table */}
              <div className="relative">
                <div className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  {/* Header with Search and Create Button */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Your QR Codes</h2>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={loadQRCodes}
                        disabled={loading}
                        className="flex items-center justify-center p-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Refresh QR codes"
                      >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                      <Link to="/create" className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <Plus className="w-4 h-4" />
                        Create New
                      </Link>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search QR codes by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="inline-block w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Loading your QR codes...</p>
                      </div>
                    ) : error ? (
                      <div className="text-center py-12">
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                          onClick={loadQRCodes}
                          disabled={loading}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          Retry
                        </button>
                      </div>
                    ) : filteredAndSortedQRCodes.length === 0 ? (
                      <div className="text-center py-12">
                        <QrCode className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        {searchQuery ? (
                          <p className="text-gray-600">No QR codes found matching "{searchQuery}"</p>
                        ) : (
                          <>
                            <p className="text-gray-600 mb-4">You haven't created any QR codes yet</p>
                            <Link to="/create" className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all mx-auto">
                              <Plus className="w-4 h-4" />
                              Create Your First QR Code
                            </Link>
                          </>
                        )}
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4">
                              <button
                                onClick={() => handleSort('name')}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-semibold text-sm uppercase tracking-wider"
                              >
                                Name
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </th>
                            <th className="text-left py-3 px-4">
                              <span className="text-gray-600 font-semibold text-sm uppercase tracking-wider">Content</span>
                            </th>
                            <th className="text-left py-3 px-4">
                              <button
                                onClick={() => handleSort('scans')}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-semibold text-sm uppercase tracking-wider"
                              >
                                Scans
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </th>
                            <th className="text-left py-3 px-4">
                              <button
                                onClick={() => handleSort('created')}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-semibold text-sm uppercase tracking-wider"
                              >
                                Created
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </th>
                            <th className="text-right py-3 px-4">
                              <span className="text-gray-600 font-semibold text-sm uppercase tracking-wider">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedQRCodes.map((qr) => (
                            <QRCodeRow
                              key={qr.id}
                              qr={qr}
                              formatDate={formatDate}
                              onDelete={handleDeleteQRCode}
                              onUpdate={handleUpdateQRCode}
                            />
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Results count */}
                  <div className="mt-4 text-sm text-gray-600">
                    Showing {filteredAndSortedQRCodes.length} of {allQRCodes.length} QR codes
                  </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'stats' && (
            <>
              {/* Date Range Selector */}
              <div className="mb-6 flex justify-between items-center">
                <div className="relative">
                  <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                    Data Range
                  </label>
                  <select
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all appearance-none cursor-pointer shadow-sm"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 12px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '20px'
                    }}
                  >
                    <option value="30">Last 30 days</option>
                    <option value="7">Last 7 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                  </select>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* QR Code Scans Table */}
                <div className="relative">
                  <div className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-teal-600" />
                        QR Code Scans (last 30 days)
                      </h3>
                      <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition-all flex items-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" />
                        Export as CSV
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <div className="text-center py-12 text-gray-600">
                        No Data
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operating Systems Table */}
                <div className="relative">
                  <div className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-teal-600" />
                        Operating Systems (last 30 days)
                      </h3>
                      <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition-all flex items-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" />
                        Export as CSV
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">#</th>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Operating System</th>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Scans</th>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">%</th>
                          </tr>
                        </thead>
                      </table>
                      <div className="text-center py-12 text-gray-600">
                        No Data
                      </div>
                    </div>
                  </div>
                </div>

                {/* Countries Table */}
                <div className="relative">
                  <div className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-teal-600" />
                        Countries (last 30 days)
                      </h3>
                      <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition-all flex items-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" />
                        Export as CSV
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">#</th>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Country</th>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Scans</th>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">%</th>
                          </tr>
                        </thead>
                      </table>
                      <div className="text-center py-12 text-gray-600">
                        No Data
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cities Table */}
                <div className="relative">
                  <div className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-teal-600" />
                        Cities (last 30 days)
                      </h3>
                      <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition-all flex items-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" />
                        Export as CSV
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">#</th>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">City</th>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Scans</th>
                            <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">%</th>
                          </tr>
                        </thead>
                      </table>
                      <div className="text-center py-12 text-gray-600">
                        No Data
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scans by QR Code - Full Width */}
              <div className="relative mt-6">
                <div className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-teal-600" />
                      Scans by QR Code (last 30 days)
                    </h3>
                    <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition-all flex items-center gap-2 shadow-sm">
                      <Download className="w-4 h-4" />
                      Export as CSV
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">ID</th>
                          <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Name</th>
                          <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Scans</th>
                          <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">%</th>
                        </tr>
                      </thead>
                    </table>
                    <div className="text-center py-12 text-gray-600">
                      No Data
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'stats' && (
            <div className="space-y-8">
              <StatsCharts />
            </div>
          )}

          {activeView === 'settings' && (
            <div className="max-w-2xl">
              <div className="relative mb-6">
                <div className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Profile Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm"
                        placeholder="john@example.com"
                      />
                    </div>
                    <button className="px-6 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm"
                        placeholder="••••••••"
                      />
                    </div>
                    <button className="px-6 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'billing' && (
            <div className="max-w-4xl">
              {/* Current Plan */}
              <div className="relative mb-6">
                <div className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Current Plan</h3>
                    <span className="px-3 py-1 bg-teal-500 rounded-full text-sm font-medium text-white">
                      Active
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                        <div className="text-sm text-gray-600 mb-1">Plan</div>
                        <div className="text-lg font-semibold text-gray-900">Growth</div>
                      </div>
                      <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                        <div className="text-sm text-gray-600 mb-1">Monthly Scans</div>
                        <div className="text-lg font-semibold text-gray-900">12,400 / 100,000</div>
                      </div>
                      <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                        <div className="text-sm text-gray-600 mb-1">Current Cost</div>
                        <div className="text-lg font-semibold text-gray-900">$37.20</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Link
                        to="/pricing"
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
                      >
                        Upgrade Plan
                      </Link>
                      <button className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 transition-all shadow-sm">
                        View Usage Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="relative mb-6">
                <div className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Payment Method</h3>
                    <button className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 transition-all shadow-sm">
                      Add Payment Method
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-teal-500 rounded flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-gray-900 font-medium">•••• •••• •••• 4242</div>
                          <div className="text-sm text-gray-600">Expires 12/2025</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 transition-all shadow-sm">
                          Edit
                        </button>
                        <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-xs font-medium text-red-400 transition-all shadow-sm">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing History */}
              <div className="relative">
                <div className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Billing History</h3>
                    <button className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 transition-all flex items-center gap-2 shadow-sm">
                      <Download className="w-4 h-4" />
                      Download All
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">Date</th>
                          <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">Description</th>
                          <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">Amount</th>
                          <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">Status</th>
                          <th className="text-right py-3 px-4 text-gray-600 font-semibold text-sm uppercase tracking-wider">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200 hover:bg-gray-100 transition-colors">
                          <td className="py-4 px-4 text-gray-600">Nov 1, 2024</td>
                          <td className="py-4 px-4 text-gray-900">Monthly Subscription - Growth Plan</td>
                          <td className="py-4 px-4 text-gray-900 font-semibold">$37.20</td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">Paid</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Download Invoice">
                              <Download className="w-4 h-4 text-gray-600 hover:text-gray-900" />
                            </button>
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-100 transition-colors">
                          <td className="py-4 px-4 text-gray-600">Oct 1, 2024</td>
                          <td className="py-4 px-4 text-gray-900">Monthly Subscription - Growth Plan</td>
                          <td className="py-4 px-4 text-gray-900 font-semibold">$42.15</td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">Paid</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Download Invoice">
                              <Download className="w-4 h-4 text-gray-600 hover:text-gray-900" />
                            </button>
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-100 transition-colors">
                          <td className="py-4 px-4 text-gray-600">Sep 1, 2024</td>
                          <td className="py-4 px-4 text-gray-900">Monthly Subscription - Starter Plan</td>
                          <td className="py-4 px-4 text-gray-900 font-semibold">$28.50</td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">Paid</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Download Invoice">
                              <Download className="w-4 h-4 text-gray-600 hover:text-gray-900" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
