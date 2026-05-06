import { useState, useEffect, useCallback } from 'react';
import { Check, AlertTriangle, X, HelpCircle, RefreshCw, Search, Activity, Clock, Zap, Eye, Play, ChevronDown, Filter } from 'lucide-react';
import { fetchUserHealthDashboard, triggerHealthCheck, type HealthDashboardData, type QRHealthData } from '../../services/healthService';
import { QRHealthBadge } from './QRHealthBadge';

// Extend HealthDashboardData to include qrCodes list (expected from API)
interface DashboardData extends HealthDashboardData {
  qrCodes?: Array<{
    id: string;
    name: string;
    current_status?: {
      status: 'healthy' | 'warning' | 'critical' | 'unknown';
      checked_at: string;
      response_time_ms: number;
    } | null;
  }>;
}

interface HealthDashboardProps {
  onViewDetails?: (qrId: string) => void;
}

export function HealthDashboard({ onViewDetails }: HealthDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [runningCheckId, setRunningCheckId] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchUserHealthDashboard();
      if (result.success && result.data) {
        setDashboardData(result.data as DashboardData);
      } else {
        setError(result.error || 'Failed to load health dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = () => {
    loadDashboard();
  };

  const handleRunCheck = async (qrId: string) => {
    try {
      setRunningCheckId(qrId);
      const result = await triggerHealthCheck(qrId);
      if (result.success) {
        // Refresh dashboard to show updated status
        await loadDashboard();
      } else {
        alert(`Failed to run health check: ${result.error}`);
      }
    } catch (err) {
      alert(`Error running health check: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRunningCheckId(null);
    }
  };

  const handleViewDetails = (qrId: string) => {
    if (onViewDetails) {
      onViewDetails(qrId);
    } else {
      // Default: navigate to QR detail page with health tab
      window.location.href = `/qr/${qrId}?tab=health`;
    }
  };

  // Filter QR codes based on search and status filter
  const filteredQRCodes = dashboardData?.qrCodes?.filter((qr) => {
    const matchesSearch = qr.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || qr.current_status?.status === statusFilter || (!qr.current_status && statusFilter === 'unknown');
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return { icon: Check, color: '#059669', bgColor: '#d1fae5', label: 'Healthy' };
      case 'warning':
        return { icon: AlertTriangle, color: '#d97706', bgColor: '#fef3c7', label: 'Warning' };
      case 'critical':
        return { icon: X, color: '#dc2626', bgColor: '#fee2e2', label: 'Critical' };
      default:
        return { icon: HelpCircle, color: '#6b7280', bgColor: '#f3f4f6', label: 'Unknown' };
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={handleRefresh} />;
  }

  if (!dashboardData || dashboardData.totalQRs === 0) {
    return <EmptyState />;
  }

  const stats = [
    { label: 'Total QR Codes', value: dashboardData.totalQRs, color: '#3b82f6', bgColor: '#dbeafe', icon: Activity },
    { label: 'Healthy', value: dashboardData.healthyCount, color: '#059669', bgColor: '#d1fae5', icon: Check },
    { label: 'Warning', value: dashboardData.warningCount, color: '#d97706', bgColor: '#fef3c7', icon: AlertTriangle },
    { label: 'Critical', value: dashboardData.criticalCount, color: '#dc2626', bgColor: '#fee2e2', icon: X },
    { label: 'Unknown', value: dashboardData.unknownCount, color: '#6b7280', bgColor: '#f3f4f6', icon: HelpCircle },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', margin: 0, marginBottom: '4px' }}>
            Health Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Monitor the health status of your QR codes
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: 'white',
            color: '#374151',
            fontSize: '14px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: stat.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                }}
              >
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                  {stat.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Health Progress */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Overall Health Score</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: getHealthScoreColor(dashboardData.overallHealthPercentage) }}>
            {Math.round(dashboardData.overallHealthPercentage)}%
          </span>
        </div>
        <div
          style={{
            height: '8px',
            background: '#f3f4f6',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${dashboardData.overallHealthPercentage}%`,
              background: getHealthScoreGradient(dashboardData.overallHealthPercentage),
              borderRadius: '4px',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* Recent Alerts */}
      {dashboardData.recentAlerts && dashboardData.recentAlerts.length > 0 && (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
            Recent Alerts
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dashboardData.recentAlerts.slice(0, 5).map((alert) => {
              const config = getStatusConfig(alert.status);
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    background: config.bgColor,
                    borderRadius: '8px',
                    border: `1px solid ${config.color}20`,
                  }}
                >
                  <div style={{ color: config.color, flexShrink: 0, marginTop: '2px' }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                      {alert.qr_name || 'Unknown QR Code'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      {alert.message}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QR Codes List */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}
      >
        {/* Search and Filter Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search QR codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: 'white',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              <Filter size={16} />
              {statusFilter === 'all' ? 'All Status' : getStatusConfig(statusFilter).label}
              <ChevronDown size={14} />
            </button>
            {showFilterDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 100,
                  minWidth: '140px',
                }}
              >
                {['all', 'healthy', 'warning', 'critical', 'unknown'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowFilterDropdown(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 16px',
                      textAlign: 'left',
                      border: 'none',
                      background: statusFilter === status ? '#f3f4f6' : 'white',
                      color: '#374151',
                      fontSize: '14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                    onMouseEnter={(e) => {
                      if (statusFilter !== status) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (statusFilter !== status) {
                        e.currentTarget.style.background = 'white';
                      }
                    }}
                  >
                    {status === 'all' ? 'All Status' : getStatusConfig(status).label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* QR Codes Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  QR Code
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  Last Checked
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  Response Time
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredQRCodes.map((qr) => (
                <tr key={qr.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6b7280',
                        }}
                      >
                        <Zap size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{qr.name}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>ID: {qr.id.slice(-8)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <QRHealthBadge qrId={qr.id} compact={false} />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#6b7280', fontSize: '13px' }}>
                      <Clock size={14} />
                      {qr.current_status?.checked_at
                        ? new Date(qr.current_status.checked_at).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      {qr.current_status?.response_time_ms
                        ? `${qr.current_status.response_time_ms}ms`
                        : '-'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleViewDetails(qr.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          background: 'white',
                          color: '#374151',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                        }}
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => handleRunCheck(qr.id)}
                        disabled={runningCheckId === qr.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#3b82f6',
                          color: 'white',
                          fontSize: '13px',
                          cursor: runningCheckId === qr.id ? 'not-allowed' : 'pointer',
                          opacity: runningCheckId === qr.id ? 0.7 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (runningCheckId !== qr.id) {
                            e.currentTarget.style.background = '#2563eb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#3b82f6';
                        }}
                      >
                        <Play size={14} style={{ opacity: runningCheckId === qr.id ? 0.5 : 1 }} />
                        {runningCheckId === qr.id ? 'Running...' : 'Check'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQRCodes.length === 0 && (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: '#6b7280',
            }}
          >
            <Search size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: '14px', margin: 0 }}>No QR codes match your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f4f6',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }}
      />
      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Loading health dashboard...</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#dc2626',
        }}
      >
        <AlertTriangle size={32} />
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
        Failed to load dashboard
      </h3>
      <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px 0' }}>{error}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          background: '#3b82f6',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#2563eb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#3b82f6';
        }}
      >
        Try Again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#9ca3af',
        }}
      >
        <Activity size={32} />
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
        No QR codes to monitor
      </h3>
      <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px 0' }}>
        Create your first QR code to start monitoring its health status
      </p>
      <a
        href="/create"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          background: '#3b82f6',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#2563eb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#3b82f6';
        }}
      >
        <Zap size={18} />
        Create QR Code
      </a>
    </div>
  );
}

function getHealthScoreColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function getHealthScoreGradient(score: number): string {
  if (score >= 80) return 'linear-gradient(90deg, #10b981, #059669)';
  if (score >= 50) return 'linear-gradient(90deg, #f59e0b, #d97706)';
  return 'linear-gradient(90deg, #ef4444, #dc2626)';
}
