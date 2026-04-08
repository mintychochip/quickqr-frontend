import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

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
}

interface BatchUploadProps {
  onItemsLoaded: (items: BatchItem[]) => void;
}

const QR_TYPES = ['url', 'text', 'email', 'phone', 'sms', 'wifi', 'vcard', 'location', 'calendar', 'crypto'];

export default function BatchUpload({ onItemsLoaded }: BatchUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const downloadTemplate = () => {
    const template = `name,type,content,filename,dot_color,bg_color
Product A,url,https://example.com/product-a,product-a,#000000,#ffffff
Guest WiFi,wifi,WIFI:T:WPA;S:GuestNetwork;P:password123;,guest-wifi,#14b8a6,#f0fdfa
Contact Card,vcard,"BEGIN:VCARD\\nVERSION:3.0\\nN:Doe;John\\nTEL:555-1234\\nEMAIL:john@example.com\\nEND:VCARD",john-doe,#000000,#ffffff
Email Link,email,mailto:sales@example.com?subject=Inquiry,sales-inquiry,#000000,#ffffff
Phone Number,phone,tel:+15551234567,call-us,#000000,#ffffff`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quickqr-batch-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  const parseCSV = (text: string): BatchItem[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIndex = headers.indexOf('name');
    const typeIndex = headers.indexOf('type');
    const contentIndex = headers.indexOf('content');
    
    if (nameIndex === -1 || typeIndex === -1 || contentIndex === -1) {
      toast.error('CSV must have name, type, and content columns');
      return [];
    }

    return lines.slice(1).map((line, idx) => {
      // Handle quoted fields with commas
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const type = values[typeIndex]?.toLowerCase() || '';
      const content = values[contentIndex] || '';
      
      // Validate
      let status: BatchItem['status'] = 'valid';
      let error = '';
      
      if (!QR_TYPES.includes(type)) {
        status = 'invalid';
        error = `Invalid type: ${type}`;
      } else if (!content) {
        status = 'invalid';
        error = 'Content is required';
      } else if (type === 'url' && !content.startsWith('http')) {
        status = 'invalid';
        error = 'URL must start with http:// or https://';
      }

      return {
        id: `batch-${idx}`,
        name: values[nameIndex] || `QR ${idx + 1}`,
        type,
        content,
        styling: {
          dotsColor: values[headers.indexOf('dot_color')] || '#000000',
          bgColor: values[headers.indexOf('bg_color')] || '#ffffff',
        },
        status,
        error,
      };
    });
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsLoading(true);
    
    try {
      const text = await file.text();
      const items = parseCSV(text);
      
      if (items.length === 0) {
        toast.error('No valid QR codes found in CSV');
      } else {
        const validCount = items.filter(i => i.status === 'valid').length;
        const invalidCount = items.length - validCount;
        
        toast.success(`Loaded ${validCount} valid QR codes${invalidCount > 0 ? ` (${invalidCount} invalid)` : ''}`);
        onItemsLoaded(items);
      }
    } catch (err) {
      toast.error('Failed to parse CSV');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onItemsLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-teal-600" />
          <div className="flex-1">
            <h3 className="font-medium text-slate-900">CSV Template</h3>
            <p className="text-sm text-slate-600">
              Download a template CSV file with the correct format
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragging 
            ? 'border-teal-500 bg-teal-50' 
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          className="hidden"
          id="csv-input"
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full" />
            <p className="text-slate-600">Parsing CSV...</p>
          </div>
        ) : (
          <label htmlFor="csv-input" className="cursor-pointer">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">
              Drop your CSV file here
            </h3>
            <p className="text-slate-600 mb-4">
              or click to browse files
            </p>
            <p className="text-sm text-slate-500">
              Supports .csv files with columns: name, type, content, filename, dot_color, bg_color
            </p>
          </label>
        )}
      </div>

      {/* CSV Format Help */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          CSV Format
        </h4>
        <div className="text-sm text-slate-600 space-y-1">
          <p><strong>Required columns:</strong> name, type, content</p>
          <p><strong>Optional columns:</strong> filename, dot_color, bg_color</p>
          <p><strong>Supported types:</strong> {QR_TYPES.join(', ')}</p>
          <p className="text-xs text-slate-500 mt-2">
            For WiFi: content format is <code>WIFI:T:WPA;S:SSID;P:password;;</code>
          </p>
        </div>
      </div>
    </div>
  );
}
