import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { logger } from '../utils/logger';
import QRScheduler from './scheduling/QRScheduler';
import PasswordProtection from './password/PasswordProtection';
import ABTestManager from './abtesting/ABTestManager';
import ScanLimits from './scanlimits/ScanLimits';
import WebhookManager from './webhooks/WebhookManager';
import SocialShare from './social/SocialShare';
import PixelManager from './pixels/PixelManager';
import { QRHealthBadge } from './health';

interface QRCode {
  id: string;
  name: string;
  type: string;
  mode: string;
  content: any;
  styling?: any;
  scan_count: number;
  created_at: string;
  folder_id?: string;
}

interface ScanData {
  scanned_at: string;
  os: string;
}

const ITEMS_PER_PAGE = 10;

interface DashboardQRListProps {
  selectedFolder?: string | null;
  selectedTags?: string[];
}

const DashboardQRList = ({ selectedFolder, selectedTags }: DashboardQRListProps) => {
  const [allQrCodes, setAllQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderMap, setFolderMap] = useState<Record<string, string>>({});
  const [tagMap, setTagMap] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduling' | 'protection' | 'abtesting' | 'limits' | 'webhooks' | 'pixels'>('scheduling');
  const [scanData, setScanData] = useState<Record<string, ScanData[]>>({});
  const [previewQr, setPreviewQr] = useState<QRCode | null>(null);
  const [shareQr, setShareQr] = useState<QRCode | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'scans'>('newest');
  

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    loadQRCodes();
    
    // Subscribe to realtime updates for scan counts
    logger.log('[Dashboard] Setting up realtime subscription...');
    const subscription = supabase
      .channel('qr-scans')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'qrcodes' },
        (payload) => {
          logger.log('[Dashboard] Realtime update received:', payload);
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as QRCode;
            logger.log('[Dashboard] QR updated:', updated.id, 'New count:', updated.scan_count);
            setAllQrCodes(prev => prev.map(qr => 
              qr.id === updated.id ? { ...qr, scan_count: updated.scan_count } : qr
            ));
            toast.success(`${updated.name || 'QR'}: ${updated.scan_count} scans`);
          }
        }
      )
      .subscribe((status) => {
        logger.log('[Dashboard] Subscription status:', status);
      });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadQRCodes() {
    try {
      setLoading(true);
      logger.log('[Dashboard] Loading QR codes...');
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      logger.log('[Dashboard] Session:', session?.user?.id, 'Error:', authError);
      if (!session?.user) {
        logger.log('[Dashboard] No session, not loading');
        return;
      }

      const { data, error } = await supabase
        .from('qrcodes')
        .select('*, folder_id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      logger.log('[Dashboard] Query result:', data?.length, 'items, Error:', error);

      setAllQrCodes(data || []);
      
      // Load folder and tag mappings if QR codes exist
      if (data && data.length > 0) {
        const qrIds = data.map(qr => qr.id);
        
        // Load folder names for reference
        try {
          const { data: folderData } = await supabase
            .from('qr_folders')
            .select('id, name');
          if (folderData) {
            const folderMapping: Record<string, string> = {};
            folderData.forEach((f: any) => {
              folderMapping[f.id] = f.name;
            });
            setFolderMap(folderMapping);
          }
        } catch (e) {
          logger.log('qr_folders table may not exist yet');
        }
        
        // Load tag mappings if qr_tags table exists
        try {
          const { data: tagData } = await supabase
            .from('qr_tags')
            .select('qr_id, tag_id');
          if (tagData) {
            const tagMapping: Record<string, string[]> = {};
            tagData.forEach((t: any) => {
              if (!tagMapping[t.qr_id]) tagMapping[t.qr_id] = [];
              tagMapping[t.qr_id].push(t.tag_id);
            });
            setTagMap(tagMapping);
          }
        } catch (e) {
          logger.log('qr_tags table may not exist yet');
        }
      }
      
      // Update stats in parent dashboard
      const totalEl = document.getElementById('stat-total');
      const scansEl = document.getElementById('stat-scans');
      const dynamicEl = document.getElementById('stat-dynamic');
      
      if (totalEl) totalEl.textContent = String(data?.length || 0);
      if (scansEl) scansEl.textContent = String(data?.reduce((sum, qr) => sum + (qr.scan_count || 0), 0) || 0);
      if (dynamicEl) dynamicEl.textContent = String(data?.filter(qr => qr.mode === 'dynamic').length || 0);
    } catch (err) {
      toast.error('Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  }

  const filteredCodes = useMemo(() => {
    let filtered = allQrCodes;
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(qr => 
        qr.name?.toLowerCase().includes(q) ||
        qr.type?.toLowerCase().includes(q)
      );
    }
    
    // Folder filter - filter by folder_id on QR codes directly
    if (selectedFolder) {
      filtered = filtered.filter(qr => qr.folder_id === selectedFolder);
    }
    
    // Tag filter - filter by loaded tag relationships
    if (selectedTags && selectedTags.length > 0) {
      filtered = filtered.filter(qr => {
        const qrTagIds = tagMap[qr.id] || [];
        return selectedTags.some(tagId => qrTagIds.includes(tagId));
      });
    }
    
    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'scans': return (b.scan_count || 0) - (a.scan_count || 0);
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    return filtered;
  }, [allQrCodes, searchQuery, sortBy, selectedFolder, selectedTags]);

  const totalPages = Math.ceil(filteredCodes.length / ITEMS_PER_PAGE);
  const paginatedCodes = filteredCodes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const copyUrl = (qr: QRCode) => {
    navigator.clipboard.writeText(`${baseUrl}/r/${qr.id}`);
    toast.success('URL copied!');
  };

  const downloadQR = async (qr: QRCode, format: 'png' | 'svg') => {
    try {
      const mod = await import('qr-code-styling');
      const QRCodeStyling = mod.default || mod;
      
      // Get the QR code URL
      const qrUrl = `${baseUrl}/r/${qr.id}`;
      
      // Create QR instance with the same styling
      const qrInstance = new QRCodeStyling({
        width: 800,
        height: 800,
        data: qrUrl,
        dotsOptions: {
          color: qr.styling?.dotsColor || '#000000',
          type: 'square',
        },
        backgroundOptions: {
          color: qr.styling?.bgColor || '#ffffff',
        },
        cornersSquareOptions: { type: 'square' },
        cornersDotOptions: { type: 'square' },
      });
      
      if (format === 'png') {
        await qrInstance.download({ name: qr.name || 'quickqr', extension: 'png' });
        toast.success('PNG downloaded!');
      } else {
        // SVG export
        const svgData = await qrInstance.getRawData('svg');
        if (!svgData) {
          toast.error('Failed to generate SVG');
          return;
        }
        
        const blob = new Blob([svgData instanceof Blob ? svgData : new Uint8Array(Buffer.from(svgData))], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${qr.name || 'quickqr'}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('SVG downloaded!');
      }
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download');
    }
  };

  const duplicateQR = async (qr: QRCode) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('qrcodes')
      .insert({
        user_id: session.user.id,
        name: `${qr.name} (Copy)`,
        type: qr.type,
        content: qr.content,
        styling: qr.styling,
        mode: qr.mode,
      })
      .select()
      .single();

    if (!error && data) {
      setAllQrCodes(prev => [data, ...prev]);
      toast.success('Duplicated!');
    }
  };

  const deleteQR = async (id: string) => {
    if (!confirm('Delete this QR code?')) return;
    setDeletingId(id);
    
    const { error } = await supabase.from('qrcodes').delete().eq('id', id);
    
    if (!error) {
      setAllQrCodes(prev => prev.filter(q => q.id !== id));
      toast.success('Deleted');
    } else {
      toast.error('Failed to delete');
    }
    setDeletingId(null);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} QR codes?`)) return;
    
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('qrcodes').delete().in('id', ids);
    
    if (!error) {
      setAllQrCodes(prev => prev.filter(q => !selectedIds.has(q.id)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} deleted`);
    }
  };

  const bulkUpdateStyling = async (stylingUpdate: any) => {
    if (selectedIds.size === 0) {
      toast.error('Select QR codes to update');
      return;
    }
    
    const ids = Array.from(selectedIds);
    
    for (const id of ids) {
      const qr = allQrCodes.find(q => q.id === id);
      if (qr) {
        await supabase.from('qrcodes').update({
          styling: { ...qr.styling, ...stylingUpdate }
        }).eq('id', id);
      }
    }
    
    setAllQrCodes(prev => prev.map(qr => 
      selectedIds.has(qr.id) 
        ? { ...qr, styling: { ...qr.styling, ...stylingUpdate } }
        : qr
    ));
    
    toast.success(`${ids.length} QR codes updated`);
  };

  const exportCSV = (qr: QRCode) => {
    const scans = scanData[qr.id];
    if (!scans?.length) {
      toast.error('No data to export');
      return;
    }
    
    const csv = scans.map(s => `${new Date(s.scanned_at).toLocaleString()},${s.os}`).join('\n');
    const blob = new Blob([`Date,Device\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${qr.name}-scans.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const allSelected = paginatedCodes.every(qr => selectedIds.has(qr.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      paginatedCodes.forEach(qr => {
        allSelected ? next.delete(qr.id) : next.add(qr.id);
      });
      return next;
    });
  };

  if (loading) return (
    <div className="qr-grid-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '1rem' }}>
      <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(20, 184, 166, 0.2)', borderTopColor: '#14b8a6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <p style={{ color: '#6b7280' }}>Loading QR codes...</p>
    </div>
  );

  return (
    <div className="dashboard-qr-list">
      <Toaster />
      
      {/* Toolbar */}
      <div className="toolbar" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search QR codes..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="search-input"
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', minWidth: '200px' }}
        />
        <button 
          onClick={loadQRCodes}
          style={{ padding: '0.5rem 1rem', background: '#f3f4f6', borderRadius: '0.5rem', border: '1px solid #e5e7eb', cursor: 'pointer' }}
        >
          🔄 Refresh
        </button>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A-Z</option>
          <option value="scans">Most Scans</option>
        </select>
        {selectedIds.size > 0 && (
          <button 
            onClick={bulkDelete} 
            className="bulk-delete"
            style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
          >
            Delete {selectedIds.size} selected
          </button>
        )}
      </div>
      
      <div className="results-info" style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
        Showing {paginatedCodes.length} of {filteredCodes.length} QR codes
        {selectedIds.size > 0 && ` • ${selectedIds.size} selected`}
      </div>

      {/* Grid */}
      <div className="qr-grid-enhanced">
        {paginatedCodes.map(qr => (
          <div key={qr.id} className={`qr-card-enhanced ${expandedId === qr.id ? 'expanded' : ''}`}>
            <div className="qr-card-main">
              <input 
                type="checkbox" 
                checked={selectedIds.has(qr.id)}
                onChange={() => toggleSelect(qr.id)}
                className="qr-checkbox"
              />
              
              <div className="qr-preview-enhanced" onClick={() => setPreviewQr(qr)} style={{ cursor: 'pointer' }}>
                <QRCodeSVG
                  value={`${baseUrl}/r/${qr.id}`}
                  size={60}
                  bgColor={qr.styling?.bgColor || '#ffffff'}
                  fgColor={qr.styling?.dotsColor || '#000000'}
                />
                <div style={{fontSize: '10px', color: '#999', textAlign: 'center', marginTop: '2px'}}>{qr.id.slice(0,8)}</div>
              </div>
              
              <div className="qr-info-enhanced">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 className="qr-name">{qr.name || 'Unnamed QR'}</h3>
                  {qr.mode === 'dynamic' && <QRHealthBadge qrId={qr.id} compact={true} />}
                </div>
                <p className="qr-type">{(qr.type || 'QR').toUpperCase()}</p>
                {qr.mode === 'dynamic' ? (
                  <p className="qr-scans">{qr.scan_count || 0} scans (ID: {qr.id.slice(0,8)})</p>
                ) : (
                  <p className="qr-scans static">Static — scans not tracked</p>
                )}
                {qr.mode === 'dynamic' && <span className="qr-badge dynamic">Dynamic</span>}
              </div>
              
              <div className="qr-actions-enhanced">
                <button onClick={() => copyUrl(qr)} className="action-btn copy" title="Copy URL">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button onClick={() => downloadQR(qr, 'png')} className="action-btn download" title="Download PNG">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <button onClick={() => duplicateQR(qr)} className="action-btn duplicate" title="Duplicate">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button onClick={() => setShareQr(qr)} className="action-btn share" title="Share QR Code" style={{ background: '#0ea5e9', color: 'white' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                </button>
                <button onClick={() => setExpandedId(qr.id)} className="action-btn advanced" title="Advanced Settings">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m18 9l-3-3m-3 3l3-3M6 15l-3 3m3-3l3 3"></path>
                  </svg>
                </button>
                <button onClick={() => deleteQR(qr.id)} disabled={deletingId === qr.id} className="action-btn delete" title="Delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
                <button 
                  onClick={() => { setExpandedId(qr.id); setActiveTab('scheduling'); }} 
                  className="action-btn advanced" 
                  title="Advanced Settings"
                  style={{ background: '#f59e0b', color: 'white' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24M6.34 17.66l-4.24 4.24M23 12h-6m-6 0H1m20.24 4.24l-4.24-4.24M6.34 6.34L2.1 2.1"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '0.5rem', 
              border: '1px solid #e5e7eb', 
              background: 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            ← Previous
          </button>
          <span style={{ color: '#6b7280' }}>Page {currentPage} of {totalPages}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '0.5rem', 
              border: '1px solid #e5e7eb', 
              background: 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewQr && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setPreviewQr(null)}>
          <div className="modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '1rem', maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>{previewQr.name}</h3>
            <div style={{ marginBottom: '1.5rem' }}>
              <QRCodeSVG
                value={`${baseUrl}/r/${previewQr.id}`}
                size={300}
                bgColor={previewQr.styling?.bgColor || '#ffffff'}
                fgColor={previewQr.styling?.dotsColor || '#000000'}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button onClick={() => downloadQR(previewQr, 'png')} style={{ padding: '0.5rem 1rem', background: '#14b8a6', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>Download PNG</button>
              <button onClick={() => downloadQR(previewQr, 'svg')} style={{ padding: '0.5rem 1rem', background: '#14b8a6', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>Download SVG</button>
              <button onClick={() => setPreviewQr(null)} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Advanced Settings Modal */}
      {expandedId && (
        <div className="advanced-modal" style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }} onClick={() => setExpandedId(null)}>
          <div className="modal-content" style={{ 
            background: 'white', 
            padding: '0', 
            borderRadius: '1rem', 
            maxWidth: '600px', 
            width: '90%', 
            maxHeight: '90vh', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ 
              padding: '1rem 1.5rem', 
              borderBottom: '1px solid #e5e7eb', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <h3 style={{ margin: 0 }}>Advanced Settings for {allQrCodes.find(qr => qr.id === expandedId)?.name || 'Unnamed QR'}</h3>
              <button 
                onClick={() => setExpandedId(null)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.5rem', 
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body" style={{ 
              padding: '0',
              overflow: 'hidden',
              flex: 1
            }}>
              <div className="tabs" style={{ 
                display: 'flex', 
                borderBottom: '1px solid #e5e7eb' 
              }}>
                <button 
                  onClick={() => setActiveTab('scheduling')}
                  style={{ 
                    padding: '1rem 1.5rem', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 500,
                    borderBottom: `3px solid ${activeTab === 'scheduling' ? '#14b8a6' : 'transparent'}`
                  }}
                >
                  Scheduling
                </button>
                <button 
                  onClick={() => setActiveTab('protection')}
                  style={{ 
                    padding: '1rem 1.5rem', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 500,
                    borderBottom: `3px solid ${activeTab === 'protection' ? '#14b8a6' : 'transparent'}`
                  }}
                >
                  Protection
                </button>
                <button 
                  onClick={() => setActiveTab('abtesting')}
                  style={{ 
                    padding: '1rem 1.5rem', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 500,
                    borderBottom: `3px solid ${activeTab === 'abtesting' ? '#14b8a6' : 'transparent'}`
                  }}
                >
                  A/B Testing
                </button>
                <button 
                  onClick={() => setActiveTab('limits')}
                  style={{ 
                    padding: '1rem 1.5rem', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 500,
                    borderBottom: `3px solid ${activeTab === 'limits' ? '#14b8a6' : 'transparent'}`
                  }}
                >
                  Limits
                </button>
                <button 
                  onClick={() => setActiveTab('webhooks')}
                  style={{ 
                    padding: '1rem 1.5rem', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 500,
                    borderBottom: `3px solid ${activeTab === 'webhooks' ? '#14b8a6' : 'transparent'}`
                  }}
                >
                  Webhooks
                </button>
                <button 
                  onClick={() => setActiveTab('pixels')}
                  style={{ 
                    padding: '1rem 1.5rem', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 500,
                    borderBottom: `3px solid ${activeTab === 'pixels' ? '#14b8a6' : 'transparent'}`
                  }}
                >
                  Pixels
                </button>
              </div>
              
              <div className="tab-content" style={{ padding: '1.5rem' }}>
                {activeTab === 'scheduling' && <QRScheduler qrId={expandedId} />}
                {activeTab === 'protection' && <PasswordProtection qrId={expandedId} />}
                {activeTab === 'abtesting' && <ABTestManager qrId={expandedId} />}
                {activeTab === 'limits' && <ScanLimits qrId={expandedId} />}
                {activeTab === 'webhooks' && <WebhookManager />}
                {activeTab === 'pixels' && <PixelManager />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareQr && (
        <div className="share-modal" style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }} onClick={() => setShareQr(null)}>
          <div className="modal-content" style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '1rem', 
            maxWidth: '500px', 
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Share {shareQr.name || 'QR Code'}</h3>
              <button 
                onClick={() => setShareQr(null)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.5rem', 
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <SocialShare 
              qrUrl={`${baseUrl}/r/${shareQr.id}`} 
              qrName={shareQr.name || 'QR Code'} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardQRList;