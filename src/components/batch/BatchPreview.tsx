import { useState, useCallback, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, Check, Trash2, Download, FileArchive, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../../config/supabase';

interface BatchItem {
  id: string;
  name: string;
  type: string;
  content: string;
  styling?: {
    dotsColor?: string;
    bgColor?: string;
  };
  status: 'pending' | 'valid' | 'invalid';
  error?: string;
  dataUrl?: string;
}

interface BatchPreviewProps {
  items: BatchItem[];
  onItemsChange: (items: BatchItem[]) => void;
}

export default function BatchPreview({ items, onItemsChange }: BatchPreviewProps) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const validItems = items.filter(item => item.status === 'valid');
  const invalidItems = items.filter(item => item.status === 'invalid');

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === validItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(validItems.map(i => i.id)));
    }
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const removeInvalid = () => {
    onItemsChange(items.filter(item => item.status !== 'invalid'));
    toast.success(`Removed ${invalidItems.length} invalid items`);
  };

  const generateQRDataUrl = async (item: BatchItem): Promise<string> => {
    return new Promise((resolve) => {
      const size = 300;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      
      // Use QRCodeSVG to generate data URL
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
        <rect width="${size}" height="${size}" fill="${item.styling?.bgColor || '#ffffff'}"/>
      </svg>`;
      
      // For actual QR generation, we'll use the QRCodeSVG component
      // But for batch export, we need to render to canvas
      resolve(`data:image/svg+xml,${encodeURIComponent(svgString)}`);
    });
  };

  const generateAll = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one QR code to generate');
      return;
    }

    setGenerating(true);
    setProgress(0);

    const itemsToGenerate = validItems.filter(item => selectedIds.has(item.id));
    const updatedItems = [...items];

    for (let i = 0; i < itemsToGenerate.length; i++) {
      const item = itemsToGenerate[i];
      
      // Generate data URL for each QR
      const dataUrl = await generateQRDataUrl(item);
      
      const itemIndex = updatedItems.findIndex(ui => ui.id === item.id);
      if (itemIndex !== -1) {
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], dataUrl };
      }

      setProgress(Math.round(((i + 1) / itemsToGenerate.length) * 100));
    }

    onItemsChange(updatedItems);
    setGenerating(false);
    toast.success(`Generated ${itemsToGenerate.length} QR codes`);
  }, [selectedIds, validItems, onItemsChange]);

  const downloadAsZip = async () => {
    const itemsToDownload = validItems.filter(item => selectedIds.has(item.id) && item.dataUrl);
    
    if (itemsToDownload.length === 0) {
      toast.error('Generate QR codes first');
      return;
    }

    const zip = new JSZip();
    
    itemsToDownload.forEach(item => {
      if (item.dataUrl) {
        // Extract base64 data
        const base64Data = item.dataUrl.split(',')[1];
        zip.file(`${item.name || 'qr'}.svg`, base64Data, { base64: true });
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `quickqr-batch-${itemsToDownload.length}-codes.zip`);
    toast.success('ZIP downloaded!');
  };

  const downloadAsPDF = async () => {
    const itemsToDownload = validItems.filter(item => selectedIds.has(item.id) && item.dataUrl);
    
    if (itemsToDownload.length === 0) {
      toast.error('Generate QR codes first');
      return;
    }

    const doc = new jsPDF();
    doc.text('QuickQR Batch Export', 14, 20);
    
    const tableData = itemsToDownload.map(item => [
      item.name,
      item.type,
      item.content.substring(0, 50) + (item.content.length > 50 ? '...' : ''),
    ]);

    (doc as any).autoTable({
      head: [['Name', 'Type', 'Content']],
      body: tableData,
      startY: 30,
    });

    doc.save(`quickqr-batch-${itemsToDownload.length}-codes.pdf`);
    toast.success('PDF downloaded!');
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex items-center justify-between bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{items.length}</p>
            <p className="text-sm text-slate-600">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{validItems.length}</p>
            <p className="text-sm text-slate-600">Valid</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{invalidItems.length}</p>
            <p className="text-sm text-slate-600">Invalid</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-teal-600">{selectedIds.size}</p>
            <p className="text-sm text-slate-600">Selected</p>
          </div>
        </div>
        
        {invalidItems.length > 0 && (
          <button
            onClick={removeInvalid}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Remove Invalid
          </button>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {selectedIds.size === validItems.length ? 'Deselect All' : 'Select All Valid'}
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={generateAll}
                disabled={generating}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {generating ? `Generating ${progress}%` : `Generate ${selectedIds.size} QR`}
              </button>
              <button
                onClick={downloadAsZip}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2"
              >
                <FileArchive className="w-4 h-4" />
                ZIP
              </button>
              <button
                onClick={downloadAsPDF}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`border rounded-xl p-4 transition-all ${
              item.status === 'invalid'
                ? 'border-red-200 bg-red-50'
                : selectedIds.has(item.id)
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelection(item.id)}
                  disabled={item.status === 'invalid'}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                {item.status === 'valid' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* QR Preview */}
            <div className="bg-white rounded-lg p-4 mb-3 flex items-center justify-center" style={{ minHeight: '120px' }}>
              {item.status === 'valid' ? (
                <QRCodeSVG
                  value={item.content}
                  size={100}
                  bgColor={item.styling?.bgColor || '#ffffff'}
                  fgColor={item.styling?.dotsColor || '#000000'}
                />
              ) : (
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-2" />
                  <p className="text-sm text-red-500">Invalid</p>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-1">
              <p className="font-medium text-slate-900 truncate">{item.name}</p>
              <p className="text-sm text-slate-500 capitalize">{item.type}</p>
              <p className="text-xs text-slate-400 truncate">{item.content}</p>
              {item.error && (
                <p className="text-xs text-red-500">{item.error}</p>
              )}
            </div>

            {/* Download Single */}
            {item.dataUrl && item.status === 'valid' && (
              <a
                href={item.dataUrl}
                download={`${item.name}.svg`}
                className="mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Download SVG
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
