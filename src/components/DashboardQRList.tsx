import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Chart from 'chart.js/auto';

interface QRCode {
  id: string;
  name: string;
  type: string;
  mode: string;
  content: any;
  scan_count: number;
  created_at: string;
  expirytime?: string;
}

interface ScanData {
  scanned_at: string;
  os: string;
}

declare global {
  interface Window {
    __DASHBOARD_DATA__?: {
      qrCodes: QRCode[];
      baseUrl: string;
      userId: string;
    };
  }
}

const DashboardQRList = () => {
  // Get data from window
  const [data] = useState(() => window.__DASHBOARD_DATA__ || { qrCodes: [], baseUrl: '', userId: '' });
  const [qrCodes, setQrCodes] = useState<QRCode[]>(data.qrCodes);
  const [baseUrl] = useState(data.baseUrl);
  
  // Initialize Supabase client
  const [supabase] = useState(() => {
    const supabaseUrl = (import.meta as any).env?.PUBLIC_SUPABASE_URL || '';
    const supabaseKey = (import.meta as any).env?.PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    return createClient(supabaseUrl, supabaseKey);
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState<any>(null);
  const [scanData, setScanData] = useState<Record<string, ScanData[]>>({});
  const [loadingAnalytics, setLoadingAnalytics] = useState<Record<string, boolean>>({});
  const chartRefs = useRef<Record<string, Chart | null>>({});
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const getQRUrl = (qr: QRCode) => {
    return `${baseUrl}/r/${qr.id}`;
  };

  const getQRValue = (qr: QRCode) => {
    // Generate the actual content that the QR code encodes
    switch (qr.type) {
      case 'url':
        return qr.content?.url || getQRUrl(qr);
      case 'email':
        return `mailto:${qr.content?.email}`;
      case 'phone':
        return `tel:${qr.content?.phone}`;
      case 'sms':
        return `sms:${qr.content?.number}`;
      case 'location':
        return `https://www.google.com/maps?q=${qr.content?.latitude},${qr.content?.longitude}`;
      default:
        return getQRUrl(qr);
    }
  };

  const loadAnalytics = async (qrId: string) => {
    if (scanData[qrId]) return; // Already loaded
    
    setLoadingAnalytics(prev => ({ ...prev, [qrId]: true }));
    
    const { data, error } = await supabase
      .from('scans')
      .select('scanned_at, os')
      .eq('qrcode_id', qrId)
      .order('scanned_at', { ascending: false })
      .limit(100);
    
    if (!error && data) {
      setScanData(prev => ({ ...prev, [qrId]: data }));
    }
    
    setLoadingAnalytics(prev => ({ ...prev, [qrId]: false }));
  };

  const toggleAnalytics = (qrId: string) => {
    if (expandedId === qrId) {
      setExpandedId(null);
    } else {
      setExpandedId(qrId);
      loadAnalytics(qrId);
    }
  };

  const startEdit = (qr: QRCode) => {
    setEditingId(qr.id);
    setEditName(qr.name || '');
    setEditContent(qr.content ? JSON.parse(JSON.stringify(qr.content)) : {});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditContent(null);
  };

  const saveEdit = async (qr: QRCode) => {
    const updates: any = { name: editName };
    
    if (editContent && JSON.stringify(editContent) !== JSON.stringify(qr.content)) {
      updates.content = editContent;
    }

    const { error } = await supabase
      .from('qrcodes')
      .update(updates)
      .eq('id', qr.id);

    if (!error) {
      // Update local state
      setQrCodes(prev => prev.map(q => 
        q.id === qr.id 
          ? { ...q, name: editName, ...(updates.content && { content: editContent }) }
          : q
      ));
      setEditingId(null);
    } else {
      alert('Failed to save: ' + error.message);
    }
  };

  const deleteQR = async (qrId: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return;
    
    const { error } = await supabase
      .from('qrcodes')
      .delete()
      .eq('id', qrId);
    
    if (!error) {
      setQrCodes(prev => prev.filter(q => q.id !== qrId));
    } else {
      alert('Failed to delete: ' + error.message);
    }
  };

  // Render charts when analytics are expanded
  useEffect(() => {
    if (!expandedId || !scanData[expandedId]) return;

    const scans = scanData[expandedId];
    if (scans.length === 0) return;

    // Destroy existing chart
    if (chartRefs.current[expandedId]) {
      chartRefs.current[expandedId]?.destroy();
    }

    // Prepare data for charts
    const osCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};
    
    scans.forEach(scan => {
      // OS breakdown
      osCounts[scan.os] = (osCounts[scan.os] || 0) + 1;
      
      // Daily timeline
      const date = new Date(scan.scanned_at).toLocaleDateString();
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const canvas = canvasRefs.current[expandedId];
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chartRefs.current[expandedId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(dailyCounts).slice(-14), // Last 14 days
        datasets: [{
          label: 'Scans',
          data: Object.values(dailyCounts).slice(-14),
          borderColor: '#14b8a6',
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });

    return () => {
      chartRefs.current[expandedId]?.destroy();
    };
  }, [expandedId, scanData]);

  if (!qrCodes || qrCodes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </div>
        <h3>No QR codes yet</h3>
        <p>Create your first QR code to get started</p>
        <a href="/create" className="create-btn">Create QR Code</a>
      </div>
    );
  }

  return (
    <div className="qr-grid-enhanced">
      {qrCodes.map(qr => {
        const isExpanded = expandedId === qr.id;
        const isEditing = editingId === qr.id;
        const scans = scanData[qr.id] || [];
        const osCounts: Record<string, number> = {};
        scans.forEach(s => { osCounts[s.os] = (osCounts[s.os] || 0) + 1; });

        return (
          <div key={qr.id} className={`qr-card-enhanced ${isExpanded ? 'expanded' : ''}`}>
            <div className="qr-card-main">
              <div className="qr-preview-enhanced">
                <QRCodeSVG
                  value={getQRValue(qr)}
                  size={80}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              
              <div className="qr-info-enhanced">
                {isEditing ? (
                  <div className="qr-edit-form">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="QR Code Name"
                      className="edit-input"
                    />
                    {qr.type === 'url' && (
                      <input
                        type="url"
                        value={editContent?.url || ''}
                        onChange={(e) => setEditContent({ ...editContent, url: e.target.value })}
                        placeholder="URL"
                        className="edit-input"
                      />
                    )}
                    {qr.type === 'email' && (
                      <input
                        type="email"
                        value={editContent?.email || ''}
                        onChange={(e) => setEditContent({ ...editContent, email: e.target.value })}
                        placeholder="Email"
                        className="edit-input"
                      />
                    )}
                    {qr.type === 'phone' && (
                      <input
                        type="tel"
                        value={editContent?.phone || ''}
                        onChange={(e) => setEditContent({ ...editContent, phone: e.target.value })}
                        placeholder="Phone"
                        className="edit-input"
                      />
                    )}
                    <div className="edit-actions">
                      <button onClick={() => saveEdit(qr)} className="edit-btn save">Save</button>
                      <button onClick={cancelEdit} className="edit-btn cancel">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="qr-name">{qr.name || 'Unnamed QR'}</h3>
                    <p className="qr-type">{(qr.type || 'QR').toUpperCase()}</p>
                    <p className="qr-scans">{qr.scan_count || 0} scans</p>
                    {qr.mode === 'dynamic' && <span className="qr-badge dynamic">Dynamic</span>}
                  </>
                )}
              </div>
              
              <div className="qr-actions-enhanced">
                <button 
                  onClick={() => toggleAnalytics(qr.id)} 
                  className={`action-btn analytics ${isExpanded ? 'active' : ''}`}
                  title="Analytics"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </button>
                <button 
                  onClick={() => startEdit(qr)} 
                  className="action-btn edit"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <a 
                  href={`/r/${qr.id}`} 
                  target="_blank"
                  className="action-btn view"
                  title="View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </a>
                <button 
                  onClick={() => deleteQR(qr.id)} 
                  className="action-btn delete"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            {isExpanded && (
              <div className="qr-analytics-dropdown">
                <div className="analytics-header">
                  <h4>Analytics</h4>
                  <span className="scan-total">{qr.scan_count || 0} total scans</span>
                </div>
                
                {loadingAnalytics[qr.id] ? (
                  <div className="analytics-loading">Loading...</div>
                ) : scans.length === 0 ? (
                  <div className="analytics-empty">No scan data yet</div>
                ) : (
                  <div className="analytics-content">
                    <div className="chart-container">
                      <canvas 
                        ref={(el) => { canvasRefs.current[qr.id] = el; }}
                        width={400}
                        height={150}
                      />
                    </div>
                    
                    <div className="os-breakdown">
                      <h5>By Device</h5>
                      <div className="os-bars">
                        {Object.entries(osCounts)
                          .sort(([,a], [,b]) => b - a)
                          .map(([os, count]) => (
                            <div key={os} className="os-bar">
                              <span className="os-label">{os}</span>
                              <div className="os-bar-track">
                                <div 
                                  className="os-bar-fill" 
                                  style={{ width: `${(count / scans.length) * 100}%` }}
                                />
                              </div>
                              <span className="os-count">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                    
                    <div className="recent-scans">
                      <h5>Recent Activity</h5>
                      <ul>
                        {scans.slice(0, 5).map((scan, i) => (
                          <li key={i}>
                            <span className="scan-os">{scan.os}</span>
                            <span className="scan-time">
                              {new Date(scan.scanned_at).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DashboardQRList;
