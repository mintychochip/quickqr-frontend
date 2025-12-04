import { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Mail,
  MessageCircle,
  User,
  Save,
  Sparkles,
  Zap,
  Search,
  Download,
} from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import { QRCodeStylingProps, QRContentObject } from '../types/qrcode.types';
import { proxifyImageUrl } from '../utils/imageProxy';

type QRMode = 'static' | 'dynamic';

type DataType =
  | 'url'
  | 'email'
  | 'sms';

type DotType = 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
type CornerSquareType = 'dot' | 'square' | 'extra-rounded';
type CornerDotType = 'dot' | 'square';

interface SaveData {
  name: string;
  content: QRContentObject | string;
  type: string;
  styling: QRCodeStylingProps;
  mode: 'static' | 'dynamic';
}

interface QRCodeGeneratorProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onSave?: (data: SaveData) => void;
  saving?: boolean;
  qrName?: string;
  onNameChange?: (name: string) => void;
  qrMode?: QRMode;
  onModeChange?: (mode: QRMode) => void;
}

export default function QRCodeGenerator({
  currentStep,
  onStepChange,
  onSave,
  saving = false,
  qrName = '',
  onNameChange,
  qrMode: externalQrMode,
  onModeChange
}: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  // QR Mode (Static or Dynamic) - use external if provided
  const qrMode = externalQrMode || 'dynamic';
  const setQrMode = (mode: QRMode) => {
    if (onModeChange) {
      onModeChange(mode);
    }
  };

  // Step 1: Data Type
  const [dataType, setDataType] = useState<DataType>('url');

  // Search for data types
  const [searchQuery, setSearchQuery] = useState('');

  // Step 2: Content
  const [url, setUrl] = useState('https://example.com');
  const [email, setEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsNumber, setSmsNumber] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  // Step 4: Expiration
  const [expirationEnabled, setExpirationEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [expirationTime, setExpirationTime] = useState('23:59');

  // Step 3: Styling
  const [qrSize, setQrSize] = useState(300);
  const [margin, setMargin] = useState(10);

  // Shape/Dots
  const [dotsType, setDotsType] = useState<DotType>('square');
  const [dotsColor, setDotsColor] = useState('#000000');

  // Background
  const [bgColor, setBgColor] = useState('#FFFFFF');

  // Corner Squares
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('square');
  const [cornerSquareColor, setCornerSquareColor] = useState('#000000');

  // Corner Dots
  const cornerDotType: CornerDotType = 'square';
  const [cornerDotColor, setCornerDotColor] = useState('#000000');

  // Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState(0.3);
  const [logoMargin, setLogoMargin] = useState(5);

  // Error Correction Level
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');

  const dataTypes = [
    { id: 'url', label: 'Link', icon: Globe },
    { id: 'email', label: 'E-mail', icon: Mail },
    { id: 'sms', label: 'SMS', icon: MessageCircle },
  ];

  const generateQRValue = (type: DataType): string => {
    switch (type) {
      case 'url':
        return url;
      case 'email':
        return `mailto:${email}${emailSubject ? `?subject=${encodeURIComponent(emailSubject)}` : ''}${emailBody ? `${emailSubject ? '&' : '?'}body=${encodeURIComponent(emailBody)}` : ''}`;
      case 'sms':
        return `sms:${smsNumber}${smsMessage ? `?body=${encodeURIComponent(smsMessage)}` : ''}`;
      default:
        return '';
    }
  };

  const qrValue = generateQRValue(dataType);

  // Initialize QR Code
  useEffect(() => {
    // Use a timeout to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!qrRef.current) {
        return;
      }

      try {
        // Clear any existing QR code
        qrRef.current.innerHTML = '';

        // Start with basic options to ensure it works
        const options = {
          width: qrSize,
          height: qrSize,
          data: qrValue || 'https://example.com',
          margin: margin,
          qrOptions: {
            errorCorrectionLevel: errorCorrectionLevel
          },
          dotsOptions: {
            type: dotsType,
            color: dotsColor
          },
          backgroundOptions: {
            color: bgColor
          },
          cornersSquareOptions: {
            type: cornerSquareType,
            color: cornerSquareColor
          },
          cornersDotOptions: {
            type: cornerDotType,
            color: cornerDotColor
          }
        };

        // Only add logo if it exists
        if (logoUrl) {
          (options as any).image = proxifyImageUrl(logoUrl);
          (options as any).imageOptions = {
            hideBackgroundDots: true,
            imageSize: logoSize,
            margin: logoMargin,
            crossOrigin: 'anonymous'
          };
        }

        qrCodeRef.current = new QRCodeStyling(options);
        qrCodeRef.current.append(qrRef.current);

      } catch (error) {
        // Silently fail - QR code initialization error
      }
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [qrMode, qrValue]);

  // Update QR Code when settings change
  useEffect(() => {
    if (!qrCodeRef.current) return;

    try {
      // Simplified update options to match initialization
      const updateOptions = {
        width: qrSize,
        height: qrSize,
        data: qrValue || 'https://example.com',
        margin: margin,
        qrOptions: {
          errorCorrectionLevel: errorCorrectionLevel
        },
        dotsOptions: {
          type: dotsType,
          color: dotsColor
        },
        backgroundOptions: {
          color: bgColor
        },
        cornersSquareOptions: {
          type: cornerSquareType,
          color: cornerSquareColor
        },
        cornersDotOptions: {
          type: cornerDotType,
          color: cornerDotColor
        }
      };

      // Only add logo if it exists
      if (logoUrl) {
        (updateOptions as any).image = proxifyImageUrl(logoUrl);
        (updateOptions as any).imageOptions = {
          hideBackgroundDots: true,
          imageSize: logoSize,
          margin: logoMargin,
          crossOrigin: 'anonymous'
        };
      }

      qrCodeRef.current.update(updateOptions);
    } catch (error) {
      // Silently fail - QR code update error
    }
  }, [
    qrMode,
    qrValue,
    qrSize,
    margin,
    dotsType,
    dotsColor,
    bgColor,
    cornerSquareType,
    cornerSquareColor,
    cornerDotType,
    cornerDotColor,
    logoUrl,
    logoSize,
    logoMargin,
    errorCorrectionLevel,
  ]);

  const handleInputChange = (setter: (value: string) => void, value: string) => {
    setter(value);
  };

  const handleSave = () => {
    const qrData: SaveData = {
      name: '', // Will be filled by parent component
      type: dataType,
      content: generateContentObject(),
      styling: {
        dotsType,
        dotsColor,
        bgColor,
        cornerSquareType,
        cornerSquareColor,
        cornerDotType,
        cornerDotColor,
        logoUrl
      },
      mode: qrMode
    };

    if (onSave) {
      onSave(qrData);
    }
  };

  const handleDownload = (format: 'png' | 'jpg' | 'webp' | 'svg') => {
    if (qrCodeRef.current) {
      qrCodeRef.current.download({
        name: `qr-code-${dataType}`,
        extension: format
      });
    }
  };

  const generateContentObject = () => {
    switch (dataType) {
      case 'url':
        return { url };
      case 'email':
        return { email, subject: emailSubject, body: emailBody };
      case 'sms':
        return { number: smsNumber, message: smsMessage };
      default:
        return {};
    }
  };

  const renderContentForm = () => {
    switch (dataType) {
      case 'url':
        return (
          <input
            type="url"
            value={url}
            onChange={(e) => handleInputChange(setUrl, e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        );
      case 'email':
        return (
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => handleInputChange(setEmail, e.target.value)}
              placeholder="email@example.com"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => handleInputChange(setEmailSubject, e.target.value)}
              placeholder="Subject (optional)"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <textarea
              value={emailBody}
              onChange={(e) => handleInputChange(setEmailBody, e.target.value)}
              placeholder="Message (optional)"
              rows={3}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>
        );
      case 'sms':
        return (
          <div className="space-y-3">
            <input
              type="tel"
              value={smsNumber}
              onChange={(e) => handleInputChange(setSmsNumber, e.target.value)}
              placeholder="+1234567890"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <textarea
              value={smsMessage}
              onChange={(e) => handleInputChange(setSmsMessage, e.target.value)}
              placeholder="Message (optional)"
              rows={3}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderStepContent = () => {
    return renderAllInOne();
  };

  const renderAllInOne = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left Column - All Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-6">
            {/* QR Type & Content Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Type */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setQrMode('static')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      qrMode === 'static'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4" />
                      <span className={`text-sm font-medium ${qrMode === 'static' ? 'text-teal-700' : 'text-gray-700'}`}>Static</span>
                    </div>
                    <p className="text-xs text-gray-600">Free, permanent</p>
                  </button>
                  <button
                    onClick={() => setQrMode('dynamic')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      qrMode === 'dynamic'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4" />
                      <span className={`text-sm font-medium ${qrMode === 'dynamic' ? 'text-amber-700' : 'text-gray-700'}`}>Dynamic</span>
                    </div>
                    <p className="text-xs text-gray-600">Editable, trackable</p>
                  </button>
                </div>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">Content</label>
                <div className="grid grid-cols-3 gap-3">
                  {dataTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setDataType(type.id as DataType)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                          dataType === type.id
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4 inline mr-2" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Content Form */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Content</h3>
              {renderContentForm()}
            </div>

            {/* Styling */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Style</h3>
              <div className="space-y-4">
                {/* Styles Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dot Style</label>
                    <select
                      value={dotsType}
                      onChange={(e) => setDotsType(e.target.value as DotType)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                        backgroundPosition: 'right 12px center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '16px'
                      }}
                    >
                      <option value="rounded">Rounded</option>
                      <option value="dots">Dots</option>
                      <option value="classy">Classy</option>
                      <option value="square">Square</option>
                      <option value="extra-rounded">Extra Rounded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Corner Style</label>
                    <select
                      value={cornerSquareType}
                      onChange={(e) => setCornerSquareType(e.target.value as CornerSquareType)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                        backgroundPosition: 'right 12px center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '16px'
                      }}
                    >
                      <option value="dot">Dot</option>
                      <option value="square">Square</option>
                      <option value="extra-rounded">Extra Rounded</option>
                    </select>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dots</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={dotsColor}
                        onChange={(e) => setDotsColor(e.target.value)}
                        className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={dotsColor}
                        onChange={(e) => setDotsColor(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Background</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Corner Square</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cornerSquareColor}
                        onChange={(e) => setCornerSquareColor(e.target.value)}
                        className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cornerSquareColor}
                        onChange={(e) => setCornerSquareColor(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Corner Dot</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cornerDotColor}
                        onChange={(e) => setCornerDotColor(e.target.value)}
                        className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cornerDotColor}
                        onChange={(e) => setCornerDotColor(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Size and Margin */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Size: {qrSize}px</label>
                    <input
                      type="range"
                      min="200"
                      max="500"
                      value={qrSize}
                      onChange={(e) => setQrSize(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Margin: {margin}px</label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={margin}
                      onChange={(e) => setMargin(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Preview (Static) or Settings (Dynamic) */}
        <div className="space-y-6">
          {qrMode === 'static' ? (
            /* Static Mode - Preview & Download */
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Preview</h3>
              <div className="flex justify-center items-center p-6 mb-6">
                <div ref={qrRef} className="flex justify-center items-center shadow-lg"></div>
              </div>

              {/* Download Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDownload('png')}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md transition-all duration-200 text-sm"
                >
                  <Download className="w-4 h-4" />
                  PNG
                </button>
                <button
                  onClick={() => handleDownload('svg')}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-100 transition-all duration-200 text-sm"
                >
                  <Download className="w-4 h-4" />
                  SVG
                </button>
                <button
                  onClick={() => handleDownload('jpg')}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-100 transition-all duration-200 text-sm"
                >
                  <Download className="w-4 h-4" />
                  JPEG
                </button>
                <button
                  onClick={() => handleDownload('webp')}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-100 transition-all duration-200 text-sm"
                >
                  <Download className="w-4 h-4" />
                  WebP
                </button>
              </div>
            </div>
          ) : (
            /* Dynamic Mode - Name & Expiration */
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">QR Code Name</h3>
                <input
                  type="text"
                  value={qrName}
                  onChange={(e) => onNameChange?.(e.target.value)}
                  placeholder="Enter a name"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Expiration</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expirationEnabled}
                      onChange={(e) => setExpirationEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500 relative"></div>
                    <span className="text-sm text-gray-600">Enable</span>
                  </label>
                </div>

                {expirationEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                      <input
                        type="time"
                        value={expirationTime}
                        onChange={(e) => setExpirationTime(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button for Dynamic */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <button
                  onClick={handleSave}
                  disabled={saving || !qrName?.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save QR Code'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };


  return renderStepContent();
}
