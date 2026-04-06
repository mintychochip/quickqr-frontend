import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

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

const DashboardQRList = () => {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl] = useState(() => typeof window !== 'undefined' ? window.location.origin : '');
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState<any>(null);
  const [scanData, setScanData] = useState<Record<string, ScanData[]>>({});
  const [loadingAnalytics, setLoadingAnalytics] = useState<Record<string, boolean>>({});

  // Fetch QR codes on mount
  useEffect(() => {
    async function loadQRCodes() {
      try {
        setLoading(true);
        setError(null);

        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError || !session?.user) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const user = session.user;

        const { data: codes, error: qrError } = await supabase
          .from('qrcodes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (qrError) {
          setError(qrError.message);
        } else {
          setQrCodes(codes || []);
          
          // Update stats in parent
          const totalEl = document.getElementById('stat-total');
          const scansEl = document.getElementById('stat-scans');
          const dynamicEl = document.getElementById('stat-dynamic');
          
          if (totalEl) totalEl.textContent = String(codes?.length || 0);
          if (scansEl) scansEl.textContent = String(codes?.reduce((sum, qr) => sum + (qr.scan_count || 0), 0) || 0);
          if (dynamicEl) dynamicEl.textContent = String(codes?.filter(qr => qr.mode === 'dynamic').length || 0);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadQRCodes();
  }, []);

  const getQRUrl = (qr: QRCode) => {
    return `${baseUrl}/r/${qr.id}`;
  };

  const getQRValue = (qr: QRCode) => {
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
    if (scanData[qrId]) return;
    
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

  if (loading) {
    return (
      <div className="qr-grid-loading">
        <div className="loading-spinner"></div>
        <p>Loading QR codes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qr-grid-error">
        <p>Error: {error}</p>
      </div>
    );
  }

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
                    <line x1="12" y1="20" x2="12" y4="4"></line>
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
                    <div className="scans-table-container">
                      <table className="scans-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Device</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scans.map((scan, i) => {
                            const date = new Date(scan.scanned_at);
                            return (
                              <tr key={i}>
                                <td>{date.toLocaleDateString()}</td>
                                <td>{date.toLocaleTimeString()}</td>
                                <td>
                                  <span className={`device-badge device-${scan.os.toLowerCase()}`}>
                                    {scan.os}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="os-summary">
                      <h5>Summary</h5>
                      <div className="os-pills">
                        {Object.entries(osCounts)
                          .sort(([,a], [,b]) => b - a)
                          .map(([os, count]) => (
                            <span key={os} className="os-pill">
                              {os}: {count}
                            </span>
                          ))}
                      </div>
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
