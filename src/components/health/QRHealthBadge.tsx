import { useState, useEffect } from 'react';
import { Check, AlertTriangle, X, HelpCircle } from 'lucide-react';
import { fetchQRHealthStatus, type QRHealthData } from '../../services/healthService';

interface QRHealthBadgeProps {
  qrId: string;
  compact?: boolean;
}

export function QRHealthBadge({ qrId, compact = true }: QRHealthBadgeProps) {
  const [healthData, setHealthData] = useState<QRHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    async function loadHealth() {
      try {
        setLoading(true);
        const result = await fetchQRHealthStatus(qrId);
        if (result.success) {
          setHealthData(result.data);
        } else {
          setError(result.error || 'Failed to load health status');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadHealth();
  }, [qrId]);

  if (loading) {
    return compact ? (
      <span className="health-badge loading" style={{
        display: 'inline-flex',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: '#e5e7eb',
        animation: 'pulse 1.5s infinite'
      }} />
    ) : (
      <span className="health-badge loading" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '12px',
        background: '#f3f4f6',
        color: '#6b7280',
        fontSize: '12px'
      }}>
        Loading...
      </span>
    );
  }

  if (error || !healthData) {
    const status = 'unknown';
    return renderBadge(status, null, compact, showTooltip, setShowTooltip);
  }

  const status = healthData.current_status?.status || 'unknown';
  return renderBadge(status, healthData, compact, showTooltip, setShowTooltip);
}

function renderBadge(
  status: string,
  data: QRHealthData | null,
  compact: boolean,
  showTooltip: boolean,
  setShowTooltip: (show: boolean) => void
) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  const badgeContent = compact ? (
    <span
      className={`health-badge ${status}`}
      data-testid="health-badge"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: config.bgColor,
        color: config.color,
        cursor: 'pointer',
        fontSize: '12px',
        position: 'relative'
      }}
    >
      <Icon size={12} />
      {showTooltip && data && (
        <TooltipContent data={data} status={status} />
      )}
    </span>
  ) : (
    <span
      className={`health-badge ${status}`}
      data-testid="health-badge"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '12px',
        background: config.bgColor,
        color: config.color,
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        position: 'relative'
      }}
    >
      <Icon size={14} />
      <span>{config.label}</span>
      {showTooltip && data && (
        <TooltipContent data={data} status={status} />
      )}
    </span>
  );

  return badgeContent;
}

function TooltipContent({ data, status }: { data: QRHealthData; status: string }) {
  const check = data.current_status;
  
  return (
    <div
      className="health-tooltip"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: '8px',
        padding: '12px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '1px solid #e5e7eb',
        zIndex: 1000,
        minWidth: '220px',
        fontSize: '13px',
        color: '#374151'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ 
        fontWeight: 600, 
        marginBottom: '4px',
        color: getStatusConfig(status).color
      }}>
        {getStatusConfig(status).label}
      </div>
      
      {check ? (
        <>
          <div style={{ marginBottom: '4px' }}>
            Last checked: {new Date(check.checked_at).toLocaleString()}
          </div>
          <div style={{ marginBottom: '4px' }}>
            Response time: {check.response_time_ms}ms
          </div>
          {check.http_status && (
            <div style={{ marginBottom: '4px' }}>
              HTTP status: {check.http_status}
            </div>
          )}
          {check.error_message && (
            <div style={{ 
              marginTop: '8px',
              padding: '6px 8px',
              background: '#fef2f2',
              borderRadius: '4px',
              color: '#dc2626',
              fontSize: '12px'
            }}>
              Error: {check.error_message}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
          No health check data available
        </div>
      )}
      
      <div
        style={{
          position: 'absolute',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid white'
        }}
      />
    </div>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'healthy':
      return {
        icon: Check,
        label: 'Healthy',
        bgColor: '#d1fae5',
        color: '#059669'
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        label: 'Warning',
        bgColor: '#fef3c7',
        color: '#d97706'
      };
    case 'critical':
      return {
        icon: X,
        label: 'Critical',
        bgColor: '#fee2e2',
        color: '#dc2626'
      };
    default:
      return {
        icon: HelpCircle,
        label: 'Unknown',
        bgColor: '#f3f4f6',
        color: '#6b7280'
      };
  }
}
