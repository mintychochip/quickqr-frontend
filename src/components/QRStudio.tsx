import React, { useState, useCallback, useEffect, useRef } from 'react';
import { QrCode, ScanLine, History, FileSpreadsheet, Download, Check, Copy, RotateCcw, Upload, Camera, Eye, EyeOff, Zap, Menu, X, Trash2 } from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import { Html5Qrcode } from 'html5-qrcode';

// QR Studio Component - Dark themed to match QuickQR

export default function QRStudio() {
  const [activeTab, setActiveTab] = useState<'generate' | 'scan' | 'batch' | 'history'>('generate');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Generate Tab State
  const [qrType, setQrType] = useState<'url' | 'text' | 'email' | 'phone' | 'sms' | 'wifi' | 'vcard' | 'calendar' | 'event'>('url');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generatedQR, setGeneratedQR] = useState<{ id: string; type: string; content: string; displayContent: string; dataUrl: string; timestamp: number } | null>(null);
  const [fgColor, setFgColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#000000');
  const [showContent, setShowContent] = useState(true);
  const [history, setHistory] = useState<{ id: string; type: string; content: string; displayContent: string; dataUrl: string; timestamp: number }[]>([]);
  
  // Design Templates
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  const templates = {
    default: { name: 'Default', fgColor: '#ffffff', bgColor: '#000000', dotType: 'rounded', cornerType: 'square' },
    restaurant: { name: 'Restaurant', fgColor: '#14b8a6', bgColor: '#ffffff', dotType: 'rounded', cornerType: 'extra-rounded' },
    event: { name: 'Event', fgColor: '#8b5cf6', bgColor: '#1e1b4b', dotType: 'classy', cornerType: 'extra-rounded' },
    minimal: { name: 'Minimal', fgColor: '#1f2937', bgColor: '#f9fafb', dotType: 'square', cornerType: 'square' },
    bold: { name: 'Bold', fgColor: '#dc2626', bgColor: '#ffffff', dotType: 'dots', cornerType: 'extra-rounded' },
    neon: { name: 'Neon', fgColor: '#00ff88', bgColor: '#0a0a0f', dotType: 'rounded', cornerType: 'extra-rounded' },
    gold: { name: 'Gold', fgColor: '#f59e0b', bgColor: '#1f1f1f', dotType: 'classy-rounded', cornerType: 'extra-rounded' }
  };
  
  const [dotType, setDotType] = useState<'rounded' | 'square' | 'dots' | 'classy' | 'classy-rounded'>('rounded');
  const [cornerType, setCornerType] = useState<'square' | 'rounded' | 'extra-rounded'>('square');

  const tabs = [
    { id: 'generate' as const, label: 'Generate', icon: QrCode },
    { id: 'scan' as const, label: 'Scan', icon: ScanLine },
    { id: 'batch' as const, label: 'Batch', icon: FileSpreadsheet },
    { id: 'history' as const, label: 'History', icon: History },
  ];

  const generateQRContent = (type: string, data: Record<string, string>): string => {
    switch (type) {
      case 'url': return data.url || '';
      case 'text': return data.text || '';
      case 'email':
        const subject = data.subject ? `?subject=${encodeURIComponent(data.subject)}` : '';
        const body = data.body ? `${subject ? '&' : '?'}body=${encodeURIComponent(data.body)}` : '';
        return `mailto:${data.email || ''}${subject}${body}`;
      case 'phone': return `tel:${data.phone || ''}`;
      case 'sms':
        const smsBody = data.message ? `?body=${encodeURIComponent(data.message)}` : '';
        return `sms:${data.phone || ''}${smsBody}`;
      case 'wifi':
        return `WIFI:T:${data.encryption || 'WPA'};S:${data.ssid || ''};P:${data.password || ''};${data.hidden === 'true' ? 'H:true;' : ''};`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nN:${data.lastName || ''};${data.firstName || ''};;;\nFN:${data.firstName || ''} ${data.lastName || ''}\n${data.phone ? `TEL:${data.phone}\n` : ''}${data.email ? `EMAIL:${data.email}\n` : ''}END:VCARD`;
      case 'calendar':
        const formatDate = (dateStr: string, timeStr?: string) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          if (timeStr) {
            const [hours, minutes] = timeStr.split(':');
            date.setHours(parseInt(hours || '0'), parseInt(minutes || '0'));
          }
          return date.toISOString().replace(/[-:]/g, '').split('.')[0];
        };
        const dtstart = formatDate(data.startDate, data.startTime);
        const dtend = formatDate(data.endDate, data.endTime);
        return `BEGIN:VEVENT\nVERSION:2.0\nSUMMARY:${data.summary || ''}\nDTSTART:${dtstart}\nDTEND:${dtend}${data.location ? `\nLOCATION:${data.location}` : ''}${data.description ? `\nDESCRIPTION:${data.description}` : ''}\nEND:VEVENT`;
      case 'event':
        return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${data.title || ''}\nDTSTART:${data.startDate || ''}\nDTEND:${data.endDate || ''}${data.location ? `\nLOCATION:${data.location}` : ''}${data.description ? `\nDESCRIPTION:${data.description}` : ''}\nEND:VEVENT\nEND:VCALENDAR`;
      default: return '';
    }
  };

  const handleGenerate = useCallback(async () => {
    const content = generateQRContent(qrType, formData);
    if (!content) return;
    
    const qrCode = new QRCodeStyling({
      width: 400,
      height: 400,
      data: content,
      margin: 10,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: 'H'
      },
      dotsOptions: {
        color: fgColor,
        type: dotType
      },
      backgroundOptions: {
        color: bgColor
      },
      cornersSquareOptions: {
        type: cornerType
      },
      cornersDotOptions: {
        type: cornerType
      }
    });
    
    const rawData = await qrCode.getRawData('png');
    if (!rawData) {
      throw new Error('Failed to generate QR code');
    }
    const dataUrl = URL.createObjectURL(rawData as Blob);
    
    const qrData = {
      id: crypto.randomUUID(),
      type: qrType,
      content,
      displayContent: formData.url || formData.text || formData.email || content.slice(0, 50),
      dataUrl,
      timestamp: Date.now()
    };
    
    setGeneratedQR(qrData);
    setHistory(prev => [qrData, ...prev].slice(0, 50));
  }, [qrType, formData, fgColor, bgColor, dotType, cornerType]);

  const getFields = () => {
    switch (qrType) {
      case 'url': return [{ key: 'url', label: 'URL / Website', placeholder: 'https://example.com' }];
      case 'text': return [{ key: 'text', label: 'Text Content', placeholder: 'Enter your message here...' }];
      case 'email': return [
        { key: 'email', label: 'Email Address', placeholder: 'email@example.com' },
        { key: 'subject', label: 'Subject (optional)', placeholder: 'Email subject' },
        { key: 'body', label: 'Message (optional)', placeholder: 'Email body' }
      ];
      case 'phone': return [{ key: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567' }];
      case 'sms': return [
        { key: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567' },
        { key: 'message', label: 'Message (optional)', placeholder: 'Your SMS message' }
      ];
      case 'wifi': return [
        { key: 'ssid', label: 'Network Name (SSID)', placeholder: 'MyWiFiNetwork' },
        { key: 'password', label: 'Password', placeholder: 'WiFi password' },
        { key: 'encryption', label: 'Security', placeholder: 'WPA' },
        { key: 'hidden', label: 'Hidden Network', placeholder: 'false' }
      ];
      case 'vcard': return [
        { key: 'firstName', label: 'First Name', placeholder: 'John' },
        { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
        { key: 'phone', label: 'Phone (optional)', placeholder: '+1 (555) 123-4567' },
        { key: 'email', label: 'Email (optional)', placeholder: 'john@example.com' },
        { key: 'organization', label: 'Company (optional)', placeholder: 'Acme Inc' }
      ];
      case 'calendar': return [
        { key: 'summary', label: 'Event Title', placeholder: 'Team Meeting' },
        { key: 'startDate', label: 'Start Date', placeholder: 'YYYY-MM-DD' },
        { key: 'startTime', label: 'Start Time', placeholder: 'HH:MM' },
        { key: 'endDate', label: 'End Date', placeholder: 'YYYY-MM-DD' },
        { key: 'endTime', label: 'End Time', placeholder: 'HH:MM' },
        { key: 'location', label: 'Location (optional)', placeholder: 'Conference Room A' },
        { key: 'description', label: 'Description (optional)', placeholder: 'Weekly team sync' }
      ];
      case 'event': return [
        { key: 'title', label: 'Event Title', placeholder: 'Team Meeting' },
        { key: 'startDate', label: 'Start Date (YYYYMMDDTHHMMSS)', placeholder: '20250115T140000' },
        { key: 'endDate', label: 'End Date (YYYYMMDDTHHMMSS)', placeholder: '20250115T150000' },
        { key: 'location', label: 'Location (optional)', placeholder: 'Conference Room A' },
        { key: 'description', label: 'Description (optional)', placeholder: 'Weekly team sync' }
      ];
      default: return [];
    }
  };

  // Scan Tab State
  const [scanResult, setScanResult] = useState<{ data: string; type: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch Tab State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [batchItems, setBatchItems] = useState<{ type: string; content: string; filename: string; status: 'pending' | 'generating' | 'done' | 'error'; dataUrl?: string; variables?: Record<string, string> }[]>([]);
  const [batchTemplate, setBatchTemplate] = useState<string>('url');
  const [batchContentTemplate, setBatchContentTemplate] = useState<string>('https://example.com/{{id}}');
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('qr-studio-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('qr-studio-history', JSON.stringify(history));
  }, [history]);

  const handleFileUpload = useCallback(async (file: File) => {
    setScanError(null);
    setScanResult(null);
    
    try {
      const html5QrCode = new Html5Qrcode("temp-scan-container");
      const result = await html5QrCode.scanFile(file, false);
      
      // Detect QR type
      let type = 'text';
      if (result.startsWith('http://') || result.startsWith('https://')) type = 'url';
      else if (result.startsWith('mailto:')) type = 'email';
      else if (result.startsWith('tel:')) type = 'phone';
      else if (result.startsWith('sms:')) type = 'sms';
      else if (result.startsWith('WIFI:')) type = 'wifi';
      else if (result.startsWith('BEGIN:VCARD')) type = 'vcard';
      else if (result.startsWith('BEGIN:VEVENT')) type = 'calendar';
      else if (result.startsWith('BEGIN:VCALENDAR')) type = 'event';
      
      setScanResult({ data: result, type });
    } catch (err) {
      setScanError('Could not detect QR code in this image. Try a clearer image.');
    }
  }, []);

  const parseCSV = (text: string, contentTemplate: string) => {
    const lines = text.trim().split('\n');
    const items = [];
    
    // Check if first line is headers
    const hasHeaders = lines[0]?.toLowerCase().includes('name') || 
                      lines[0]?.toLowerCase().includes('id') ||
                      lines[0]?.toLowerCase().includes('type');
    const startIndex = hasHeaders ? 1 : 0;
    
    // Parse headers if present
    let headers: string[] = [];
    if (hasHeaders) {
      headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    } else {
      // Default headers: id, name, email, phone, etc.
      headers = ['id', 'name', 'email', 'phone', 'company', 'url'];
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      
      // Build variable map from headers
      const variables: Record<string, string> = {};
      headers.forEach((header, idx) => {
        if (parts[idx]) variables[header] = parts[idx];
      });
      
      // Generate filename from first available field
      const filename = variables['name'] || variables['id'] || variables['company'] || `qr-${i + 1}`;
      
      // Replace template variables
      let content = contentTemplate;
      Object.entries(variables).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'gi'), value);
        content = content.replace(new RegExp(`{{${key.toUpperCase()}}}`, 'gi'), value);
      });
      
      items.push({
        type: 'url',
        content,
        filename,
        status: 'pending' as const,
        variables
      });
    }
    
    return items;
  };

  const handleBatchUpload = useCallback((file: File, template: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const items = parseCSV(text, template);
      setBatchItems(items);
      setCsvFile(file);
    };
    reader.readAsText(file);
  }, []);

  const processBatch = useCallback(async () => {
    if (batchItems.length === 0) return;
    
    setBatchProcessing(true);
    setBatchProgress(0);
    
    const updated = [...batchItems];
    
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      if (item.status === 'error') continue;
      
      updated[i] = { ...item, status: 'generating' };
      setBatchItems([...updated]);
      
      try {
        const content = item.content;
        
        const qrCode = new QRCodeStyling({
          width: 400,
          height: 400,
          data: content,
          margin: 10,
          qrOptions: {
            typeNumber: 0,
            mode: 'Byte',
            errorCorrectionLevel: 'H'
          },
          dotsOptions: {
            color: fgColor,
            type: dotType
          },
          backgroundOptions: {
            color: bgColor
          },
          cornersSquareOptions: {
            type: cornerType
          },
          cornersDotOptions: {
            type: cornerType
          }
        });
        
        const rawData = await qrCode.getRawData('png');
        if (!rawData) {
          throw new Error('Failed to generate QR code');
        }
        const dataUrl = URL.createObjectURL(rawData as Blob);
        
        updated[i] = { ...item, status: 'done', dataUrl };
        
        // Add to history
        const qrData = {
          id: crypto.randomUUID(),
          type: item.type,
          content,
          displayContent: item.filename || content.slice(0, 50),
          dataUrl,
          timestamp: Date.now()
        };
        setHistory(prev => [qrData, ...prev].slice(0, 50));
      } catch (err) {
        updated[i] = { ...item, status: 'error' };
      }
      
      setBatchProgress(((i + 1) / updated.length) * 100);
      setBatchItems([...updated]);
    }
    
    setBatchProcessing(false);
  }, [batchItems]);

  const downloadBatch = useCallback(async () => {
    const doneItems = batchItems.filter(i => i.status === 'done' && i.dataUrl);
    if (doneItems.length === 0) return;
    
    // Download each file individually
    for (const item of doneItems) {
      if (item.dataUrl) {
        const link = document.createElement('a');
        link.href = item.dataUrl;
        link.download = `${item.filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small delay to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }, [batchItems]);

  const deleteHistoryItem = useCallback((id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Navigation - Matching QuickQR dark theme */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(10,10,15,0.9)] backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between h-16 max-w-[1536px] mx-auto px-4 lg:px-8">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center p-2 bg-[#14b8a6] rounded-xl shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">QuickQR</span>
            <span className="text-sm text-gray-400 ml-1 hidden sm:inline">Studio</span>
          </a>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id 
                    ? 'bg-[#14b8a6] text-white shadow-[0_0_20px_rgba(20,184,166,0.3)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[rgba(10,10,15,0.97)]">
            <div className="flex flex-col gap-1 p-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all
                    ${activeTab === tab.id 
                      ? 'bg-[#14b8a6] text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-20">
        {activeTab === 'generate' && (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Form Panel */}
              <div className="bg-[#111118] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/[0.06]">
                  <h2 className="text-xl font-bold text-white">Create QR Code</h2>
                  <p className="text-gray-400 text-sm mt-1">Select type and fill in the details</p>
                </div>
                <div className="p-6 space-y-5">
                  {/* Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">QR Code Type</label>
                    <select
                      value={qrType}
                      onChange={(e) => { setQrType(e.target.value as any); setFormData({}); setGeneratedQR(null); }}
                      className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent transition-all"
                    >
                      <option value="url" className="bg-[#111118]">🌐 URL / Website</option>
                      <option value="text" className="bg-[#111118]">📝 Plain Text</option>
                      <option value="email" className="bg-[#111118]">✉️ Email</option>
                      <option value="phone" className="bg-[#111118]">📞 Phone Number</option>
                      <option value="sms" className="bg-[#111118]">💬 SMS</option>
                      <option value="wifi" className="bg-[#111118]">📶 WiFi Network</option>
                      <option value="vcard" className="bg-[#111118]">👤 Contact Card</option>
                      <option value="calendar" className="bg-[#111118]">📅 Event / Calendar</option>
                      <option value="event" className="bg-[#111118]">📅 Event</option>
                      <option value="event" className="bg-[#111118]">📅 Event</option>
                    </select>
                  </div>

                  {/* Dynamic Fields */}
                  <div className="space-y-4">
                    {getFields().map((field: any) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{field.label}</label>
                        {field.key === 'encryption' ? (
                          <select
                            value={formData[field.key] || 'WPA'}
                            onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                          >
                            <option value="WPA" className="bg-[#111118]">WPA/WPA2</option>
                            <option value="WEP" className="bg-[#111118]">WEP</option>
                            <option value="nopass" className="bg-[#111118]">No Password</option>
                          </select>
                        ) : field.key === 'hidden' ? (
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData[field.key] === 'true'}
                              onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.checked ? 'true' : 'false' }))}
                              className="w-5 h-5 rounded border-white/[0.2] bg-[#0a0a0f] text-[#14b8a6] focus:ring-[#14b8a6]"
                            />
                            <span className="text-gray-300">Hidden Network</span>
                          </label>
                        ) : (
                          <input
                            type={field.key === 'password' ? 'password' : 'text'}
                            value={formData[field.key] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent transition-all"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Design Templates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Design Template</label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {Object.entries(templates).map(([key, template]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedTemplate(key);
                            setFgColor(template.fgColor);
                            setBgColor(template.bgColor);
                            setDotType(template.dotType as any);
                            setCornerType(template.cornerType as any);
                          }}
                          className={`p-2 rounded-lg border transition-all text-center ${
                            selectedTemplate === key
                              ? 'border-[#14b8a6] bg-[#14b8a6]/10'
                              : 'border-white/[0.08] hover:border-white/20'
                          }`}
                        >
                          <div
                            className="w-full aspect-square rounded mb-1"
                            style={{ backgroundColor: template.bgColor, border: `2px solid ${template.fgColor}` }}
                          />
                          <span className="text-[10px] text-gray-400">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Styling */}
                  <details className="group">
                    <summary className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                      <span>Advanced Styling</span>
                      <svg className="w-4 h-4 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="mt-4 space-y-4">
                      {/* Color Options */}
                      <div className="flex gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-2">Foreground</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={fgColor}
                              onChange={(e) => { setFgColor(e.target.value); setSelectedTemplate('custom'); }}
                              className="w-12 h-10 rounded-lg bg-transparent cursor-pointer border-0"
                            />
                            <span className="text-sm text-gray-400 font-mono">{fgColor}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-2">Background</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={bgColor}
                              onChange={(e) => { setBgColor(e.target.value); setSelectedTemplate('custom'); }}
                              className="w-12 h-10 rounded-lg bg-transparent cursor-pointer border-0"
                            />
                            <span className="text-sm text-gray-400 font-mono">{bgColor}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Dot Style */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Dot Style</label>
                        <div className="flex gap-2">
                          {(['rounded', 'square', 'dots', 'classy', 'classy-rounded'] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => { setDotType(type); setSelectedTemplate('custom'); }}
                              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                                dotType === type
                                  ? 'border-[#14b8a6] bg-[#14b8a6]/10 text-white'
                                  : 'border-white/[0.08] text-gray-400 hover:text-white'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Corner Style */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Corner Style</label>
                        <div className="flex gap-2">
                          {(['square', 'rounded', 'extra-rounded'] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => { setCornerType(type); setSelectedTemplate('custom'); }}
                              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                                cornerType === type
                                  ? 'border-[#14b8a6] bg-[#14b8a6]/10 text-white'
                                  : 'border-white/[0.08] text-gray-400 hover:text-white'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={handleGenerate}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] hover:-translate-y-0.5 transition-all"
                    >
                      <Zap className="w-5 h-5" />
                      Generate QR Code
                    </button>
                    <button 
                      onClick={() => { setFormData({}); setGeneratedQR(null); }}
                      className="flex items-center justify-center px-4 py-3 text-gray-400 hover:text-white bg-white/5 border border-white/[0.08] rounded-xl hover:bg-white/10 transition-all"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="bg-[#111118] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/[0.06]">
                  <h2 className="text-xl font-bold text-white">Preview</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {generatedQR ? 'Your generated QR code' : 'Fill in the form and click generate'}
                  </p>
                </div>
                <div className="p-6">
                  {generatedQR ? (
                    <div className="space-y-6">
                      {/* QR Display */}
                      <div className="bg-white p-6 rounded-2xl shadow-2xl">
                        <img src={generatedQR.dataUrl} alt="QR Code" className="w-full max-w-[300px] mx-auto" />
                      </div>

                      {/* Content Display */}
                      <div className="bg-[#0a0a0f] rounded-xl p-4 border border-white/[0.08]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Content</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowContent(!showContent)}
                              className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                            >
                              {showContent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => navigator.clipboard.writeText(generatedQR.content)}
                              className="p-2 text-gray-500 hover:text-[#14b8a6] hover:bg-[#14b8a6]/10 rounded-lg transition-all"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className={`text-sm font-mono text-gray-300 break-all ${showContent ? '' : 'blur-sm select-none'}`}>
                          {generatedQR.content}
                        </p>
                      </div>

                      {/* Download Button */}
                      <a
                        href={generatedQR.dataUrl}
                        download={`qrcode-${generatedQR.type}.png`}
                        className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#14b8a6] text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] hover:-translate-y-0.5 transition-all"
                      >
                        <Download className="w-5 h-5" />
                        Download PNG
                      </a>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                      <div className="w-24 h-24 bg-[#0a0a0f] border border-white/[0.08] rounded-2xl flex items-center justify-center mb-4">
                        <QrCode className="w-12 h-12 opacity-30" />
                      </div>
                      <p className="text-sm">Your QR code will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-8">
              {!scanResult ? (
                <div className="text-center">
                  <div className="w-20 h-20 bg-[#0a0a0f] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Camera className="w-10 h-10 text-[#14b8a6]" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Scan QR Code</h2>
                  <p className="text-gray-400 mb-6">Upload an image containing a QR code</p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/[0.08] rounded-2xl p-12 bg-[#0a0a0f] hover:border-[#14b8a6]/30 hover:bg-[#14b8a6]/5 transition-all cursor-pointer"
                  >
                    <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">Click to upload or drop image</p>
                    <p className="text-sm text-gray-500">Supports PNG, JPG, WebP</p>
                  </div>
                  
                  {/* Hidden container for html5-qrcode */}
                  <div id="temp-scan-container" className="hidden" />
                  
                  {scanError && (
                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 text-sm">{scanError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#14b8a6]/10 border border-[#14b8a6]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Check className="w-8 h-8 text-[#14b8a6]" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">QR Code Detected!</h2>
                  
                  <div className="bg-[#0a0a0f] rounded-xl p-4 border border-white/[0.08] mt-6 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-[#14b8a6]/20 text-[#14b8a6] text-xs font-medium rounded">
                        {scanResult.type}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-gray-300 break-all">{scanResult.data}</p>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => navigator.clipboard.writeText(scanResult.data)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#14b8a6] text-white font-medium rounded-xl hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    {(scanResult.data.startsWith('http://') || scanResult.data.startsWith('https://')) && (
                      <a
                        href={scanResult.data}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/[0.08] text-white font-medium rounded-xl hover:bg-white/10 transition-all"
                      >
                        Open Link
                      </a>
                    )}
                    <button
                      onClick={() => { setScanResult(null); setScanError(null); }}
                      className="px-4 py-3 text-gray-400 hover:text-white bg-white/5 border border-white/[0.08] rounded-xl hover:bg-white/10 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="max-w-3xl mx-auto px-4 py-8">
            {batchItems.length === 0 ? (
              <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-[#0a0a0f] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileSpreadsheet className="w-10 h-10 text-[#14b8a6]" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Batch Generator</h2>
                  <p className="text-gray-400 mb-2">Upload a CSV with variables to generate personalized QR codes</p>
                  
                  {/* Template Configuration */}
                  <div className="bg-[#0a0a0f] rounded-xl p-4 mb-6 text-left">
                    <label className="block text-sm font-medium text-gray-300 mb-2">URL Template (use {{variable}})</label>
                    <input
                      type="text"
                      value={batchContentTemplate}
                      onChange={(e) => setBatchContentTemplate(e.target.value)}
                      placeholder="https://example.com/{{id}}"
                      className="w-full px-4 py-2 bg-[#111118] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] mb-3"
                    />
                    <p className="text-xs text-gray-500">CSV columns become variables: {{name}}, {{id}}, {{email}}, etc.</p>
                    
                    <div className="mt-3 flex gap-2">
                      <span className="text-xs text-gray-500">Quick templates:</span>
                      {[
                        { label: 'Conference', template: 'https://check.in/{{id}}' },
                        { label: 'Tickets', template: 'https://tickets.com/{{id}}?name={{name}}' },
                        { label: 'WiFi', template: 'WIFI:T:WPA;S:Guest;P:{{password}};;' }
                      ].map((t) => (
                        <button
                          key={t.label}
                          onClick={() => setBatchContentTemplate(t.template)}
                          className="text-xs px-2 py-1 bg-[#14b8a6]/20 text-[#14b8a6] rounded hover:bg-[#14b8a6]/30 transition-all"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    id="batch-file-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBatchUpload(file, batchContentTemplate);
                    }}
                  />
                  
                  <label 
                    htmlFor="batch-file-input"
                    className="block border-2 border-dashed border-[#14b8a6]/30 rounded-2xl p-12 bg-[#0a0a0f] hover:bg-[#14b8a6]/5 hover:border-[#14b8a6]/50 transition-all cursor-pointer"
                  >
                    <Upload className="w-12 h-12 text-[#14b8a6] mx-auto mb-4" />
                    <p className="text-white font-medium mb-2">Upload CSV file</p>
                    <p className="text-sm text-gray-400">Headers: name,id,email,company,...</p>
                    <p className="text-xs text-gray-500 mt-2">Each row generates a personalized QR</p>
                  </label>
                  
                  <a
                    href={`data:text/csv,name,id,email%0AJohn Doe,jd123,john@example.com%0AJane Smith,js456,jane@example.com`}
                    download="qr-batch-template.csv"
                    className="inline-flex items-center gap-2 mt-4 text-sm text-[#14b8a6] hover:text-[#0d9488] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download sample CSV
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Batch Items ({batchItems.length})</h2>
                  <button
                    onClick={() => { setBatchItems([]); setCsvFile(null); }}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 border border-white/[0.08] rounded-lg hover:bg-white/10 transition-all"
                  >
                    Clear All
                  </button>
                </div>
                
                {/* Progress */}
                {batchProcessing && (
                  <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Processing...</span>
                      <span className="text-sm text-[#14b8a6]">{Math.round(batchProgress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#0a0a0f] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#14b8a6] to-[#0d9488] transition-all duration-300"
                        style={{ width: `${batchProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Items List */}
                <div className="bg-[#111118] border border-white/[0.06] rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
                  <div className="p-4 border-b border-white/[0.06] sticky top-0 bg-[#111118]">
                    <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="col-span-3">Filename</div>
                      <div className="col-span-6">Generated URL</div>
                      <div className="col-span-1">Vars</div>
                      <div className="col-span-2">Status</div>
                    </div>
                  </div>
                  <div className="divide-y divide-white/[0.06]">
                    {batchItems.map((item, idx) => (
                      <div key={idx} className="p-4">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-3">
                            <p className="text-sm text-gray-300 truncate">{item.filename}</p>
                            {item.variables && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {Object.entries(item.variables).slice(0, 2).map(([k, v]) => (
                                  <span key={k} className="text-[10px] px-1.5 py-0.5 bg-[#0a0a0f] text-gray-500 rounded">
                                    {k}: {v.slice(0, 10)}{v.length > 10 && '...'}
                                  </span>
                                ))}
                                {Object.keys(item.variables).length > 2 && (
                                  <span className="text-[10px] text-gray-600">+{Object.keys(item.variables).length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="col-span-6">
                            <p className="text-sm text-gray-300 truncate font-mono">{item.content}</p>
                          </div>
                          <div className="col-span-1">
                            <span className="text-xs text-gray-500">{Object.keys(item.variables || {}).length}</span>
                          </div>
                          <div className="col-span-2">
                            {item.status === 'pending' && <span className="text-sm text-gray-500">⏳</span>}
                            {item.status === 'generating' && <span className="text-sm text-[#14b8a6]">⏳</span>}
                            {item.status === 'done' && <span className="text-sm text-green-400">✅</span>}
                            {item.status === 'error' && <span className="text-sm text-red-400">❌</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={processBatch}
                    disabled={batchProcessing || batchItems.every(i => i.status === 'done' || i.status === 'error')}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Zap className="w-5 h-5" />
                    {batchProcessing ? 'Processing...' : 'Generate All'}
                  </button>
                  
                  {batchItems.some(i => i.status === 'done') && (
                    <button
                      onClick={downloadBatch}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/[0.08] text-white font-medium rounded-xl hover:bg-white/10 transition-all"
                    >
                      <Download className="w-5 h-5" />
                      Download {batchItems.filter(i => i.status === 'done').length > 1 ? 'ZIP' : 'PNG'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">History ({history.length})</h2>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>
            
            {history.length === 0 ? (
              <div className="text-center py-16 bg-[#111118] border border-white/[0.06] rounded-2xl">
                <div className="w-20 h-20 bg-[#0a0a0f] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <History className="w-10 h-10 text-gray-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No History Yet</h2>
                <p className="text-gray-400">Generated QR codes will appear here</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {history.map((item) => (
                  <div key={item.id} className="bg-[#111118] border border-white/[0.06] rounded-xl p-4 hover:border-[#14b8a6]/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-[#14b8a6] uppercase">{item.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg mb-3">
                      <img src={item.dataUrl} alt="QR" className="w-full max-w-[120px] mx-auto" />
                    </div>
                    <p className="text-sm text-gray-400 truncate">{item.displayContent}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
