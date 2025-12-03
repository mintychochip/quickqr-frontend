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

export default function StatsCharts() {
  // Sample data for demonstration
  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'QR Code Scans',
        data: [65, 78, 90, 81, 96, 125],
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
      },
      {
        label: 'New QR Codes',
        data: [28, 48, 40, 59, 86, 97],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const doughnutData = {
    labels: ['URL', 'Text', 'Email', 'Phone', 'WiFi', 'Other'],
    datasets: [
      {
        data: [30, 25, 20, 15, 8, 2],
        backgroundColor: [
          'rgba(147, 51, 234, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(107, 114, 128, 0.8)',
        ],
        borderColor: [
          'rgb(147, 51, 234)',
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(251, 146, 60)',
          'rgb(239, 68, 68)',
          'rgb(107, 114, 128)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: ['URL', 'Text', 'Email', 'Phone', 'SMS', 'WiFi'],
    datasets: [
      {
        label: 'Total Scans',
        data: [450, 320, 280, 195, 120, 85],
        backgroundColor: 'rgba(147, 51, 234, 0.6)',
        borderColor: 'rgb(147, 51, 234)',
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
          usePointStyle: true,
          padding: 15,
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.datasets.length) {
              return data.datasets.map((dataset: any, i: number) => {
                const meta = chart.getDatasetMeta(i);
                const style = meta.controller.getStyle(i);
                return {
                  text: dataset.label,
                  fillStyle: style.backgroundColor,
                  strokeStyle: style.borderColor,
                  lineWidth: style.borderWidth,
                  hidden: !chart.isDatasetVisible(i),
                  index: i,
                  fontColor: !chart.isDatasetVisible(i) ? '#9CA3AF' : '#111827', // gray-400 when hidden, gray-900 when visible
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

  return (
    <div className="space-y-6">
      {/* Line Chart - Scans Over Time */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Scans Over Time (Sample Data)</h3>
        <div className="h-80">
          <Line data={lineData} options={options} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doughnut Chart - QR Code Types */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">QR Code Types (Sample Data)</h3>
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
                      usePointStyle: true,
                      padding: 15,
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
                              fontColor: hidden ? '#9CA3AF' : '#111827', // gray-400 when hidden, gray-900 when visible
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
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Scans by Type (Sample Data)</h3>
          <div className="h-64">
            <Bar data={barData} options={options} />
          </div>
        </div>
      </div>
    </div>
  );
}