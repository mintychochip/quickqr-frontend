import { useState, useEffect } from 'react';
import { QrCode, Settings, Download } from 'lucide-react';
import { fetchOperatingSystems, fetchScansByQRCode, type OperatingSystemStat, type QRCodeStat } from '../services/statsService';

export default function DetailedStatsPanel() {
  const days = 30;
  const [osStats, setOsStats] = useState<OperatingSystemStat[]>([]);
  const [qrStats, setQrStats] = useState<QRCodeStat[]>([]);
  const [loadingOs, setLoadingOs] = useState(true);
  const [loadingQr, setLoadingQr] = useState(true);
  const [errorOs, setErrorOs] = useState<string | null>(null);
  const [errorQr, setErrorQr] = useState<string | null>(null);

  useEffect(() => {
    loadOperatingSystems();
    loadQRCodeStats();
  }, [days]);

  const loadOperatingSystems = async () => {
    try {
      setLoadingOs(true);
      setErrorOs(null);
      const result = await fetchOperatingSystems(days);

      if (result.success && result.data) {
        setOsStats(result.data as OperatingSystemStat[]);
      } else {
        setErrorOs(result.error || 'Failed to load operating systems statistics');
      }
    } catch (err) {
      setErrorOs('An error occurred while loading operating systems statistics');
    } finally {
      setLoadingOs(false);
    }
  };

  const loadQRCodeStats = async () => {
    try {
      setLoadingQr(true);
      setErrorQr(null);
      const result = await fetchScansByQRCode(days);

      if (result.success && result.data) {
        setQrStats(result.data as QRCodeStat[]);
      } else {
        setErrorQr(result.error || 'Failed to load QR code statistics');
      }
    } catch (err) {
      setErrorQr('An error occurred while loading QR code statistics');
    } finally {
      setLoadingQr(false);
    }
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const key = header.toLowerCase().replace(' ', '_');
        return row[key] || '';
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportQRStatsToCSV = () => {
    const headers = ['Name', 'Type', 'Data', 'Scans', 'Percentage'];
    const csvContent = [
      headers.join(','),
      ...qrStats.map(stat => [
        stat.name,
        formatQRType(stat.type),
        getQRCodeData(stat),
        stat.scan_count,
        Number(stat.percentage || 0).toFixed(1) + '%'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-scans-${days}days.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatOsName = (os: string): string => {
    if (!os) return 'Other';
    const lower = os.toLowerCase();
    if (lower === 'windows') return 'Windows';
    if (lower === 'macos' || lower === 'mac os' || lower === 'iphone' || lower === 'ipad' || lower === 'ios') return 'iOS';
    if (lower === 'android') return 'Android';
    if (lower === 'linux') return 'Linux';
    if (lower === 'unknown') return 'Other';
    return os.charAt(0).toUpperCase() + os.slice(1);
  };

  const formatQRType = (type: string): string => {
    if (!type) return 'Other';
    const lower = type.toLowerCase();
    if (lower === 'url') return 'URL';
    if (lower === 'sms') return 'SMS';
    if (lower === 'wifi') return 'WiFi';
    if (lower === 'vcard') return 'vCard';
    if (lower === 'mecard') return 'MeCard';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getQRCodeData = (stat: QRCodeStat): string => {
    try {
      if (!stat.content) return 'N/A';

      const contentDecoded = typeof stat.content === 'string'
        ? JSON.parse(stat.content)
        : stat.content;

      switch (stat.type.toLowerCase()) {
        case 'url':
          return contentDecoded.url || 'N/A';
        case 'text':
          const text = contentDecoded.text || '';
          return text.length > 50 ? text.substring(0, 50) + '...' : text;
        case 'email':
          return contentDecoded.email || 'N/A';
        case 'phone':
          return contentDecoded.phone || 'N/A';
        case 'sms':
          return contentDecoded.number || 'N/A';
        case 'location':
          return `${contentDecoded.latitude || ''},${contentDecoded.longitude || ''}`;
        case 'vcard':
        case 'mecard':
          return contentDecoded.name || 'Contact Card';
        case 'wifi':
          return contentDecoded.ssid || 'WiFi Network';
        case 'event':
          return contentDecoded.title || 'Event';
        default:
          return stat.type;
      }
    } catch (e) {
      return stat.content?.substring(0, 50) || 'N/A';
    }
  };

  const totalOsScans = osStats.reduce((sum, stat) => sum + stat.scan_count, 0);
  const totalQrScans = qrStats.reduce((sum, stat) => sum + stat.scan_count, 0);

  return (
    <div className="space-y-6">
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operating Systems Table */}
        <div className="relative">
          <div className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600" />
                Operating Systems (last {days} days)
              </h3>
              <button
                onClick={() => exportToCSV(osStats, `os-stats-${days}days.csv`, ['Operating System', 'Scans', 'Percentage'])}
                disabled={osStats.length === 0}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export as CSV
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              {loadingOs ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-gray-600 text-sm">Loading...</p>
                </div>
              ) : errorOs ? (
                <div className="text-center py-12 text-red-600 text-sm">{errorOs}</div>
              ) : osStats.length === 0 ? (
                <div className="text-center py-12 text-gray-600">No Data</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">#</th>
                      <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Operating System</th>
                      <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Scans</th>
                      <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {osStats.map((stat, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{formatOsName(stat.operating_system)}</td>
                        <td className="px-4 py-3 text-gray-900">{stat.scan_count}</td>
                        <td className="px-4 py-3 text-gray-600">{Number(stat.percentage || 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Countries Table - Placeholder */}
        <div className="relative">
          <div className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-teal-600" />
                Countries (last {days} days)
              </h3>
              <button
                disabled
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-400 transition-all flex items-center gap-2 shadow-sm cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export as CSV
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="text-center py-12 text-gray-500 text-sm">
                <p className="mb-1">Geolocation tracking not available</p>
                <p className="text-xs">Enable geolocation to see country data</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scans by QR Code - Full Width */}
      <div className="relative">
        <div className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-teal-600" />
              Scans by QR Code (last {days} days)
            </h3>
            <button
              onClick={exportQRStatsToCSV}
              disabled={qrStats.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export as CSV
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            {loadingQr ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-gray-600 text-sm">Loading...</p>
              </div>
            ) : errorQr ? (
              <div className="text-center py-12 text-red-600 text-sm">{errorQr}</div>
            ) : qrStats.length === 0 ? (
              <div className="text-center py-12 text-gray-600">No Data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Name</th>
                      <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Type</th>
                      <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Content</th>
                      <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">Scans</th>
                      <th className="px-4 py-3 text-left text-gray-900 font-semibold text-sm">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qrStats.map((stat, index) => (
                      <tr key={stat.qrcodeid} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-900 font-medium">{stat.name}</td>
                        <td className="px-4 py-3 text-gray-600">{formatQRType(stat.type)}</td>
                        <td className="px-4 py-3 text-gray-600 truncate max-w-xs" title={getQRCodeData(stat)}>{getQRCodeData(stat)}</td>
                        <td className="px-4 py-3 text-gray-900">{stat.scan_count}</td>
                        <td className="px-4 py-3 text-gray-600">{Number(stat.percentage || 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
