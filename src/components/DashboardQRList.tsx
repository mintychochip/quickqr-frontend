import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabase';
import toast, { Toaster } from 'react-hot-toast';

interface QRCode {
  id: string;
  name: string;
  type: string;
  mode: string;
  content: any;
  styling?: any;
  scan_count: number;
  created_at: string;
}

interface ScanData {
  scanned_at: string;
  os: string;
}

const ITEMS_PER_PAGE = 10;

const DashboardQRList = () => {
  const [allQrCodes, setAllQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scanData, setScanData] = useState<Record<string, ScanData[]>>({});
  const [previewQr, setPreviewQr] = useState<QRCode | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'scans'>('newest');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    loadQRCodes();
  }, []);

  async function loadQRCodes() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from('qrcodes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      setAllQrCodes(data || []);
    } catch (err) {
      toast.error('Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  }

  const filteredCodes = useMemo(() => {
    let filtered = allQrCodes;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(qr => 
        qr.name?.toLowerCase().includes(q) ||
        qr.type?.toLowerCase().includes(q)
      );
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
  }, [allQrCodes, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredCodes.length / ITEMS_PER_PAGE);
  const paginatedCodes = filteredCodes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const copyUrl = (qr: QRCode) => {
    navigator.clipboard.writeText(`${baseUrl}/r/${qr.id}`);
    toast.success('URL copied!');
  };

  const downloadQR = (qr: QRCode, format: 'png' | 'svg') => {
    // Implementation would use canvas/svg export
    toast.success(`Downloading ${format.toUpperCase()}...`);
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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard-qr-list">
      <Toaster />
      
      {/* Toolbar */}
      <div className="toolbar">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A-Z</option>
          <option value="scans">Most Scans</option>
        </select>
        {selectedIds.size > 0 && (
          <button onClick={bulkDelete} className="bulk-delete">
            Delete {selectedIds.size}
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="qr-grid-enhanced">
        {paginatedCodes.map(qr => (
          <div key={qr.id} className={`qr-card ${expandedId === qr.id ? 'expanded' : ''}`}>
            <input 
              type="checkbox" 
              checked={selectedIds.has(qr.id)}
              onChange={() => toggleSelect(qr.id)}
            />
            
            <div className="qr-preview" onClick={() => setPreviewQr(qr)}>
              <QRCodeSVG
                value={qr.type === 'url' ? qr.content?.url : `${baseUrl}/r/${qr.id}`}
                size={80}
                bgColor={qr.styling?.bgColor || '#fff'}
                fgColor={qr.styling?.dotsColor || '#000'}
              />
            </div>
            
            <div className="qr-info">
              <h3>{qr.name || 'Unnamed'}</h3>
              <p>{qr.type.toUpperCase()} • {qr.scan_count || 0} scans</p>
              {qr.mode === 'dynamic' && <span className="badge">Dynamic</span>}
            </div>
            
            <div className="qr-actions">
              <button onClick={() => copyUrl(qr)} title="Copy URL">📋</button>
              <button onClick={() => downloadQR(qr, 'png')} title="Download PNG">⬇️</button>
              <button onClick={() => duplicateQR(qr)} title="Duplicate">📄</button>
              <button onClick={() => deleteQR(qr.id)} disabled={deletingId === qr.id} title="Delete">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>→</button>
        </div>
      )}

      {/* Preview Modal */}
      {previewQr && (
        <div className="modal-overlay" onClick={() => setPreviewQr(null)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <h3>{previewQr.name}</h3>
            <QRCodeSVG
              value={previewQr.type === 'url' ? previewQr.content?.url : `${baseUrl}/r/${previewQr.id}`}
              size={300}
              bgColor={previewQr.styling?.bgColor || '#fff'}
              fgColor={previewQr.styling?.dotsColor || '#000'}
            />
            <div className="preview-actions">
              <button onClick={() => downloadQR(previewQr, 'png')}>Download PNG</button>
              <button onClick={() => downloadQR(previewQr, 'svg')}>Download SVG</button>
              <button onClick={() => setPreviewQr(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardQRList;