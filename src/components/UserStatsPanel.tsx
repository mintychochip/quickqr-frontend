import { useState, useEffect } from 'react';
import { BarChart3, Download, QrCode, TrendingUp, Calendar, Activity } from 'lucide-react';
import { fetchUserStats, type UserStats } from '../services/statsService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function UserStatsPanel() {
  const days = 30;
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [days]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchUserStats(days);

      if (result.success && result.stats) {
        setStats(result.stats);
      } else {
        setError(result.error || 'Failed to load statistics');
      }
    } catch (err) {
      setError('An error occurred while loading statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToPDF = () => {
    if (!stats) return;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(20, 184, 166); // Teal color
    doc.text('QR Code Scan Statistics', 14, 20);

    // Date range info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Analysis period: Last ${stats.days_analyzed} days`, 14, 34);

    // Stats summary
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary Statistics', 14, 45);

    // Create table data
    const tableData = [
      ['Total QR Codes', stats.total_qrcodes.toString()],
      ['Total Scans', stats.total_scans.toString()],
      ['Average Scans per QR Code', stats.avg_scans_per_qrcode.toFixed(2)],
      ['First Scan Time', formatDate(stats.first_scan_time)],
      ['Last Scan Time', formatDate(stats.last_scan_time)],
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [20, 184, 166], // Teal
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 11,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    doc.save(`qr-stats-${days}days-${new Date().getTime()}.pdf`);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-900 transition-all shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No statistics available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scan Statistics</h2>
          <p className="text-gray-600 text-sm mt-1">
            Analysis for the last {stats.days_analyzed} days
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total QR Codes */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-teal-100 rounded-lg">
              <QrCode className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.total_qrcodes}
          </div>
          <div className="text-sm text-gray-600">Total QR Codes</div>
        </div>

        {/* Total Scans */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.total_scans}
          </div>
          <div className="text-sm text-gray-600">Total Scans</div>
        </div>

        {/* Average Scans per QR Code */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.avg_scans_per_qrcode.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Avg Scans per QR Code</div>
        </div>
      </div>

      {/* Timeline Information */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-600" />
          Scan Timeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">First Scan</div>
            <div className="text-base font-semibold text-gray-900">
              {formatDate(stats.first_scan_time)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Last Scan</div>
            <div className="text-base font-semibold text-gray-900">
              {formatDate(stats.last_scan_time)}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
