import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { useState, useEffect } from 'react';
import { fetchScansTimeline, fetchScansByQRCode, type TimelineStat, type QRCodeStat } from '../services/statsService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface StatsChartsProps {
  days?: number;
}

export default function StatsCharts({ days = 30 }: StatsChartsProps) {
  const [timelineData, setTimelineData] = useState<TimelineStat[]>([]);
  const [qrCodeData, setQrCodeData] = useState<QRCodeStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [days]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const [timelineResult, qrCodeResult] = await Promise.all([
        fetchScansTimeline(days),
        fetchScansByQRCode(days)
      ]);

      if (timelineResult.success && timelineResult.data) {
        setTimelineData(timelineResult.data as TimelineStat[]);
      }

      if (qrCodeResult.success && qrCodeResult.data) {
        setQrCodeData(qrCodeResult.data as QRCodeStat[]);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate QR code data by type
  const aggregateByType = () => {
    const typeMap = new Map<string, number>();
    qrCodeData.forEach(qr => {
      const type = qr.type || 'other';
      typeMap.set(type, (typeMap.get(type) || 0) + qr.scan_count);
    });
    return typeMap;
  };

  const typeColors: { [key: string]: { bg: string; border: string } } = {
    url: { bg: 'rgba(20, 184, 166, 0.8)', border: 'rgb(20, 184, 166)' }, // teal
    text: { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgb(59, 130, 246)' }, // blue
    email: { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(34, 197, 94)' }, // green
    phone: { bg: 'rgba(251, 146, 60, 0.8)', border: 'rgb(251, 146, 60)' }, // orange
    sms: { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgb(239, 68, 68)' }, // red
    wifi: { bg: 'rgba(147, 51, 234, 0.8)', border: 'rgb(147, 51, 234)' }, // purple
    other: { bg: 'rgba(107, 114, 128, 0.8)', border: 'rgb(107, 114, 128)' }, // gray
  };

  const typeAggregation = aggregateByType();
  const types = Array.from(typeAggregation.keys()).sort();
  const typeCounts = types.map(type => typeAggregation.get(type) || 0);

  const lineData = {
    labels: timelineData.map(stat => {
      const date = new Date(stat.scan_date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'QR Code Scans',
        data: timelineData.map(stat => stat.scan_count),
        borderColor: 'rgb(20, 184, 166)', // teal
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const doughnutData = {
    labels: types.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
    datasets: [
      {
        data: typeCounts,
        backgroundColor: types.map(type => typeColors[type]?.bg || typeColors.other.bg),
        borderColor: types.map(type => typeColors[type]?.border || typeColors.other.border),
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: types.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
    datasets: [
      {
        label: 'Total Scans',
        data: typeCounts,
        backgroundColor: 'rgba(20, 184, 166, 0.6)', // teal
        borderColor: 'rgb(20, 184, 166)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#111827', // gray-900
          padding: 15,
          boxWidth: 15,
          boxHeight: 15,
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.datasets.length) {
              return data.datasets.map((dataset: any, i: number) => {
                const meta = chart.getDatasetMeta(i);
                const style = meta.controller.getStyle(i);
                const hidden = !chart.isDatasetVisible(i);
                return {
                  text: dataset.label,
                  fillStyle: style.backgroundColor,
                  strokeStyle: style.borderColor,
                  lineWidth: style.borderWidth,
                  hidden: hidden,
                  index: i,
                  fontColor: hidden ? '#9CA3AF' : '#111827',
                  textDecoration: hidden ? 'line-through' : '',
                };
              });
            }
            return [];
          },
        },
        onClick: (e: any, legendItem: any, legend: any) => {
          const index = legendItem.index;
          const chart = legend.chart;
          const meta = chart.getDatasetMeta(index);

          meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
          chart.update();
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(229, 231, 235, 0.8)', // gray-200
        },
        ticks: {
          color: '#4B5563', // gray-600
        },
      },
      y: {
        grid: {
          color: 'rgba(229, 231, 235, 0.8)', // gray-200
        },
        ticks: {
          color: '#4B5563', // gray-600
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-gray-600 text-sm">Loading charts...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasData = timelineData.length > 0 || qrCodeData.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="text-center py-12 text-gray-600">
            No scan data available for the selected period
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Line Chart - Scans Over Time */}
      {timelineData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Scans Over Time (Last {days} Days)</h3>
          <div className="h-80">
            <Line data={lineData} options={options} />
          </div>
        </div>
      )}

      {types.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Doughnut Chart - QR Code Types */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">QR Code Types Distribution</h3>
            <div className="h-64">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: '#111827', // gray-900
                        padding: 15,
                        boxWidth: 15,
                        boxHeight: 15,
                        generateLabels: (chart: any) => {
                          const data = chart.data;
                          if (data.labels && data.datasets.length) {
                            return data.labels.map((label: string, i: number) => {
                              const meta = chart.getDatasetMeta(0);
                              const style = meta.controller.getStyle(i);
                              const hidden = meta.data[i].hidden;
                              return {
                                text: label,
                                fillStyle: style.backgroundColor,
                                strokeStyle: style.borderColor,
                                lineWidth: style.borderWidth,
                                hidden: hidden,
                                index: i,
                                fontColor: hidden ? '#9CA3AF' : '#111827',
                                textDecoration: hidden ? 'line-through' : '',
                              };
                            });
                          }
                          return [];
                        },
                      },
                      onClick: (e: any, legendItem: any, legend: any) => {
                        const index = legendItem.index;
                        const chart = legend.chart;
                        const meta = chart.getDatasetMeta(0);

                        meta.data[index].hidden = !meta.data[index].hidden;
                        chart.update();
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Bar Chart - Scans by Type */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Scans by QR Code Type</h3>
            <div className="h-64">
              <Bar data={barData} options={options} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}