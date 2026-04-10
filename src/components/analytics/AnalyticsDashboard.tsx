import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Globe, Smartphone, Monitor, Clock, Calendar, Download, MapPin } from 'lucide-react';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

interface AnalyticsData {
  totalScans: number;
  uniqueVisitors: number;
  scansByDay: Array<{ date: string; count: number; unique: number }>;
  scansByHour: Array<{ hour: number; count: number }>;
  deviceBreakdown: Array<{ name: string; value: number; color: string }>;
  osBreakdown: Array<{ name: string; value: number }>;
  browserBreakdown: Array<{ name: string; value: number }>;
  topCountries: Array<{ country: string; count: number; code: string }>;
  topCities: Array<{ city: string; country: string; count: number }>;
  referrers: Array<{ url: string; count: number }>;
}

interface AnalyticsDashboardProps {
  qrId: string;
}

const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

export default function AnalyticsDashboard({ qrId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'geo' | 'referrers'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [qrId, dateRange]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get scan logs
      const { data: logs, error } = await supabase
        .from('scan_logs')
        .select('*')
        .eq('qr_id', qrId)
        .gte('scanned_at', startDate.toISOString())
        .order('scanned_at', { ascending: true });

      if (error) throw error;

      // Process data
      const analytics = processAnalyticsData(logs || []);
      setData(analytics);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  function processAnalyticsData(logs: any[]): AnalyticsData {
    const uniqueIps = new Set(logs.map(l => l.ip_address));
    
    // Scans by day
    const scansByDay = logs.reduce((acc, log) => {
      const date = new Date(log.scanned_at).toLocaleDateString();
      const existing = acc.find((d: any) => d.date === date);
      if (existing) {
        existing.count++;
        if (!existing.ips.includes(log.ip_address)) {
          existing.unique++;
          existing.ips.push(log.ip_address);
        }
      } else {
        acc.push({ date, count: 1, unique: 1, ips: [log.ip_address] });
      }
      return acc;
    }, [] as any[]).map((d: any) => ({ date: d.date, count: d.count, unique: d.unique }));

    // Scans by hour (for heatmap)
    const scansByHour = logs.reduce((acc, log) => {
      const hour = new Date(log.scanned_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const hourData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: scansByHour[i] || 0,
    }));

    // Device breakdown
    const devices = logs.reduce((acc, log) => {
      const type = log.device_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const deviceData = Object.entries(devices).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: name === 'mobile' ? '#14b8a6' : name === 'desktop' ? '#3b82f6' : '#8b5cf6',
    }));

    // OS breakdown
    const osData = Object.entries(
      logs.reduce((acc, log) => {
        acc[log.os || 'Unknown'] = (acc[log.os || 'Unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value: value as number }));

    // Browser breakdown
    const browserColors: Record<string, string> = {
      Chrome: '#4285F4',
      Safari: '#00D8FF',
      Firefox: '#FF7139',
      Edge: '#0078D7',
      'Samsung Internet': '#1428A0',
      Opera: '#FF1B2D',
      Brave: '#FB542B',
      Unknown: '#9CA3AF'
    };

    const browserCounts = logs.reduce((acc, log) => {
      const browser = log.browser || 'Unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const browserData = Object.entries(browserCounts)
      .map(([name, value]) => ({
        name,
        value: value as number,
        color: browserColors[name] || COLORS[Object.keys(browserCounts).indexOf(name) % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

    // Top countries
    const countryData = Object.entries(
      logs.reduce((acc, log) => {
        if (log.country) {
          if (!acc[log.country]) {
            acc[log.country] = { count: 0, code: log.country.toLowerCase() };
          }
          acc[log.country].count++;
        }
        return acc;
      }, {} as Record<string, { count: number; code: string }>)
    )
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top cities
    const cityData = logs
      .filter(l => l.city && l.country)
      .reduce((acc, log) => {
        const key = `${log.city}, ${log.country}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topCities = Object.entries(cityData)
      .map(([key, count]) => {
        const [city, country] = key.split(', ');
        return { city, country, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Referrers
    const referrerData = Object.entries(
      logs.reduce((acc, log) => {
        if (log.referrer) {
          acc[log.referrer] = (acc[log.referrer] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalScans: logs.length,
      uniqueVisitors: uniqueIps.size,
      scansByDay,
      scansByHour: hourData,
      deviceBreakdown: deviceData,
      osBreakdown: osData,
      browserBreakdown: browserData,
      topCountries: countryData,
      topCities,
      referrers: referrerData,
    };
  }

  const exportCSV = () => {
    if (!data) return;
    const csv = data.scansByDay.map(d => `${d.date},${d.count},${d.unique}`).join('\n');
    const blob = new Blob([`Date,Total Scans,Unique Visitors\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${qrId}-${dateRange}.csv`;
    a.click();
    toast.success('Analytics exported!');
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(20, 184, 166, 0.2)', borderTopColor: '#14b8a6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (!data || data.totalScans === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
        <Calendar size={48} style={{ margin: '0 auto 1rem', color: '#9ca3af' }} />
        <p>No scan data yet. Share your QR code to see analytics!</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Analytics</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {data.totalScans.toLocaleString()} total scans · {data.uniqueVisitors.toLocaleString()} unique visitors
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={exportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#14b8a6', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        {['overview', 'devices', 'geo', 'referrers'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #14b8a6' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab ? '#14b8a6' : '#6b7280',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Clock size={20} color="#14b8a6" />
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Avg per day</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {Math.round(data.totalScans / (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90))}
              </p>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Smartphone size={20} color="#3b82f6" />
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Mobile %</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {data.deviceBreakdown.find(d => d.name === 'Mobile')?.value 
                  ? Math.round((data.deviceBreakdown.find(d => d.name === 'Mobile')!.value / data.totalScans) * 100)
                  : 0}%
              </p>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Globe size={20} color="#8b5cf6" />
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Countries</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.topCountries.length}</p>
            </div>
          </div>

          {/* Time Series Chart */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Scans Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.scansByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={2} dot={{ r: 4 }} name="Total" />
                <Line type="monotone" dataKey="unique" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Unique" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly Heatmap */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Scans by Hour</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.scansByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} tickFormatter={(h) => `${h}:00`} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} scans`, 'Count']} />
                <Bar dataKey="count" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Device Types</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.deviceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.deviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {data.deviceBreakdown.map((device) => (
                <div key={device.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: device.color }} />
                  <span style={{ fontSize: '0.875rem' }}>
                    {device.name}: {Math.round((device.value / data.totalScans) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Operating Systems</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.osBreakdown.map((os) => (
                <div key={os.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '60px', fontSize: '0.875rem', fontWeight: 500 }}>{os.name}</span>
                  <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(os.value / data.totalScans) * 100}%`,
                        height: '100%',
                        background: '#14b8a6',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  <span style={{ width: '40px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600 }}>
                    {os.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Browsers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.browserBreakdown.map((browser) => (
                <div key={browser.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '100px', fontSize: '0.875rem', fontWeight: 500 }}>{browser.name}</span>
                  <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(browser.value / data.totalScans) * 100}%`,
                        height: '100%',
                        background: browser.color || '#14b8a6',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  <span style={{ width: '40px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600 }}>
                    {browser.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Geo Tab */}
      {activeTab === 'geo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={18} />
              Top Countries
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.topCountries.map((country, idx) => (
                <div key={country.country} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '30px', textAlign: 'center', fontSize: '1.25rem' }}>
                    {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `${idx + 1}.`}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.875rem' }}>{country.country}</span>
                  <div style={{ width: '100px', height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(country.count / data.topCountries[0].count) * 100}%`,
                        height: '100%',
                        background: idx < 3 ? '#14b8a6' : '#9ca3af',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                  <span style={{ width: '50px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600 }}>
                    {country.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} />
              Top Cities
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.topCities.map((city, idx) => (
                <div key={`${city.city}-${city.country}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: idx % 2 === 0 ? '#f9fafb' : 'white', borderRadius: '0.375rem' }}>
                  <span style={{ width: '24px', textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
                    {idx + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.875rem' }}>
                    {city.city}, {city.country}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#14b8a6' }}>
                    {city.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Referrers Tab */}
      {activeTab === 'referrers' && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Top Referrers</h3>
          {data.referrers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.referrers.map((ref, idx) => (
                <div key={ref.url} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: idx % 2 === 0 ? '#f9fafb' : 'white', borderRadius: '0.375rem' }}>
                  <span style={{ width: '30px', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                    {idx + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ref.url}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '60px', height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(ref.count / data.referrers[0].count) * 100}%`,
                          height: '100%',
                          background: '#14b8a6',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>
                      {ref.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No referrer data available</p>
          )}
        </div>
      )}
    </div>
  );
}
