import { Link } from 'react-router-dom';
import { Zap, QrCode, Download, Eye, Settings, Plus, TrendingUp, BarChart3, User, Search, ArrowUpDown, ChevronDown, CreditCard, RefreshCw } from 'lucide-react';
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
      const result = await fetchUserQRCodes(Number(userId));

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
  const handleDeleteQRCode = async (qrId: string) => {
    try {
      // Call the actual API to delete from backend
      const result = await deleteQRCode(qrId);

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

  // Fetch QR codes on mount
  useEffect(() => {
    loadQRCodes();
  }, [user]);

  // Transform API data to component format
  const allQRCodes = useMemo(() => {
    console.log('Transforming QR codes:', qrCodes);
    const transformed = qrCodes.map((qr, index) => {
      const name = getQRCodeName(qr);
      const url = getQRCodeDisplayUrl(qr);
      console.log('Transformed QR:', { name, url, qr });
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
    console.log('All transformed QR codes:', transformed);
    return transformed;
  }, [qrCodes]);

  // Filter and sort QR codes
  const filteredAndSortedQRCodes = useMemo(() => {
    console.log('Filtering QR codes, allQRCodes:', allQRCodes);
    console.log('Search query:', searchQuery);

    let filtered = allQRCodes.filter(qr =>
      qr.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    console.log('Filtered QR codes:', filtered);

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

    console.log('Final filtered and sorted:', filtered);
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

  const stats = [
    { label: 'Total QR Codes', value: '24', icon: QrCode, color: 'from-purple-600 to-blue-600' },
    { label: 'Total Scans', value: '12.4K', icon: Eye, color: 'from-blue-600 to-cyan-600' },
    { label: 'This Month', value: '3.2K', icon: TrendingUp, color: 'from-cyan-600 to-teal-600' },
  ];

  return (
    <div className="min-h-screen bg-black pt-16">
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-black border-r border-white/10 p-6">
          <nav className="space-y-6">
            {/* QR Codes Section */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">QR Codes</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveView('active')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    activeView === 'active'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="font-medium">Active</span>
                </button>
                <button
                  onClick={() => setActiveView('stats')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    activeView === 'stats'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </button>
                <button
                  onClick={() => setActiveView('billing')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    activeView === 'billing'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
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
        <div className="ml-64 flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              {activeView === 'active' && 'Active QR Codes'}
              {activeView === 'stats' && 'Statistics'}
              {activeView === 'settings' && 'Settings'}
              {activeView === 'billing' && 'Billing'}
            </h1>
            <p className="text-gray-400">
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
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-2xl blur opacity-25"></div>

                <div className="relative bg-black border border-white/10 rounded-2xl p-6">
                  {/* Header with Search and Create Button */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Your QR Codes</h2>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={loadQRCodes}
                        disabled={loading}
                        className="flex items-center justify-center p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh QR codes"
                      >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                      <Link to="/create" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
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
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400">Loading your QR codes...</p>
                      </div>
                    ) : error ? (
                      <div className="text-center py-12">
                        <p className="text-red-400 mb-2">{error}</p>
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all"
                        >
                          Retry
                        </button>
                      </div>
                    ) : filteredAndSortedQRCodes.length === 0 ? (
                      <div className="text-center py-12">
                        <QrCode className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        {searchQuery ? (
                          <p className="text-gray-400">No QR codes found matching "{searchQuery}"</p>
                        ) : (
                          <>
                            <p className="text-gray-400 mb-4">You haven't created any QR codes yet</p>
                            <Link to="/create" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all mx-auto">
                              <Plus className="w-4 h-4" />
                              Create Your First QR Code
                            </Link>
                          </>
                        )}
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-4">
                              <button
                                onClick={() => handleSort('name')}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-semibold text-sm uppercase tracking-wider"
                              >
                                Name
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </th>
                            <th className="text-left py-3 px-4">
                              <span className="text-gray-400 font-semibold text-sm uppercase tracking-wider">Content</span>
                            </th>
                            <th className="text-left py-3 px-4">
                              <button
                                onClick={() => handleSort('scans')}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-semibold text-sm uppercase tracking-wider"
                              >
                                Scans
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </th>
                            <th className="text-left py-3 px-4">
                              <button
                                onClick={() => handleSort('created')}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-semibold text-sm uppercase tracking-wider"
                              >
                                Created
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </th>
                            <th className="text-right py-3 px-4">
                              <span className="text-gray-400 font-semibold text-sm uppercase tracking-wider">Actions</span>
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
                            />
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Results count */}
                  <div className="mt-4 text-sm text-gray-400">
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
                  <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all">
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
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25"></div>
                  <div className="relative bg-black border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-purple-500" />
                        QR Code Scans (last 30 days)
                      </h3>
                      <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-all flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export as CSV
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-white/10">
                      <div className="text-center py-12 text-gray-400">
                        No Data
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operating Systems Table */}
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25"></div>
                  <div className="relative bg-black border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-500" />
                        Operating Systems (last 30 days)
                      </h3>
                      <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-all flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export as CSV
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-white/10">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-purple-600 to-blue-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">#</th>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">Operating System</th>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">Scans</th>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">%</th>
                          </tr>
                        </thead>
                      </table>
                      <div className="text-center py-12 text-gray-400">
                        No Data
                      </div>
                    </div>
                  </div>
                </div>

                {/* Countries Table */}
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25"></div>
                  <div className="relative bg-black border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-purple-500" />
                        Countries (last 30 days)
                      </h3>
                      <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-all flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export as CSV
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-white/10">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-purple-600 to-blue-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">#</th>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">Country</th>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">Scans</th>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">%</th>
                          </tr>
                        </thead>
                      </table>
                      <div className="text-center py-12 text-gray-400">
                        No Data
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cities Table */}
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25"></div>
                  <div className="relative bg-black border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-purple-500" />
                        Cities (last 30 days)
                      </h3>
                      <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-all flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export as CSV
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-white/10">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-purple-600 to-blue-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">#</th>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">City</th>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">Scans</th>
                            <th className="px-4 py-3 text-left text-white font-semibold text-sm">%</th>
                          </tr>
                        </thead>
                      </table>
                      <div className="text-center py-12 text-gray-400">
                        No Data
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scans by QR Code - Full Width */}
              <div className="relative mt-6">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25"></div>
                <div className="relative bg-black border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-purple-500" />
                      Scans by QR Code (last 30 days)
                    </h3>
                    <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-all flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export as CSV
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-white/10">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-purple-600 to-blue-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-white font-semibold text-sm">ID</th>
                          <th className="px-4 py-3 text-left text-white font-semibold text-sm">Name</th>
                          <th className="px-4 py-3 text-left text-white font-semibold text-sm">Scans</th>
                          <th className="px-4 py-3 text-left text-white font-semibold text-sm">%</th>
                        </tr>
                      </thead>
                    </table>
                    <div className="text-center py-12 text-gray-400">
                      No Data
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'stats' && (
            <div className="space-y-8">
              <StatsCharts qrCodes={qrCodes} />
            </div>
          )}

          {activeView === 'settings' && (
            <div className="max-w-2xl">
              <div className="relative mb-6">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25"></div>
                <div className="relative bg-black border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Profile Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                    <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25"></div>
                <div className="relative bg-black border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
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
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25"></div>
                <div className="relative bg-black border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Current Plan</h3>
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-sm font-medium text-white">
                      Active
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Plan</div>
                        <div className="text-lg font-semibold text-white">Growth</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Monthly Scans</div>
                        <div className="text-lg font-semibold text-white">12,400 / 100,000</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Current Cost</div>
                        <div className="text-lg font-semibold text-white">$37.20</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Link
                        to="/pricing"
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-sm font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                      >
                        Upgrade Plan
                      </Link>
                      <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-all">
                        View Usage Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="relative mb-6">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25"></div>
                <div className="relative bg-black border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Payment Method</h3>
                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-all">
                      Add Payment Method
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">•••• •••• •••• 4242</div>
                          <div className="text-sm text-gray-400">Expires 12/2025</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white transition-all">
                          Edit
                        </button>
                        <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-red-400 transition-all">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing History */}
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25"></div>
                <div className="relative bg-black border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Billing History</h3>
                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download All
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm uppercase tracking-wider">Date</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm uppercase tracking-wider">Description</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm uppercase tracking-wider">Amount</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm uppercase tracking-wider">Status</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm uppercase tracking-wider">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 text-gray-400">Nov 1, 2024</td>
                          <td className="py-4 px-4 text-white">Monthly Subscription - Growth Plan</td>
                          <td className="py-4 px-4 text-white font-semibold">$37.20</td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">Paid</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Download Invoice">
                              <Download className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                          </td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 text-gray-400">Oct 1, 2024</td>
                          <td className="py-4 px-4 text-white">Monthly Subscription - Growth Plan</td>
                          <td className="py-4 px-4 text-white font-semibold">$42.15</td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">Paid</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Download Invoice">
                              <Download className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                          </td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 text-gray-400">Sep 1, 2024</td>
                          <td className="py-4 px-4 text-white">Monthly Subscription - Starter Plan</td>
                          <td className="py-4 px-4 text-white font-semibold">$28.50</td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">Paid</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Download Invoice">
                              <Download className="w-4 h-4 text-gray-400 hover:text-white" />
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
