import { useState, useEffect, useRef } from 'react';
import {
  Globe,
  MessageSquare,
  Mail,
  MessageCircle,
  Wifi,
  Download,
} from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import { QRCodeStylingProps } from '../types/qrcode.types';
import { proxifyImageUrl } from '../utils/imageProxy';

type DataType =
  | 'url'
  | 'text'
  | 'email'
  | 'sms'
  | 'wifi';

type CustomizationTab = 'shape' | 'colors' | 'logo';
type DotType = 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
type CornerSquareType = 'dot' | 'square' | 'extra-rounded';
type CornerDotType = 'dot' | 'square';

export default function InteractiveQRGenerator() {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  // Step 1: Data Type
  const [dataType, setDataType] = useState<DataType>('url');

  // Step 2: Content
  const [url, setUrl] = useState('https://quickqr.example.com');
  const [text, setText] = useState('Hello, World!');
  const [email, setEmail] = useState('contact@example.com');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsNumber, setSmsNumber] = useState('+1234567890');
  const [smsMessage, setSmsMessage] = useState('');
  const [wifiSsid, setWifiSsid] = useState('MyNetwork');
  const [wifiPassword, setWifiPassword] = useState('password123');
  const [wifiEncryption, setWifiEncryption] = useState('WPA');

  // Step 3: Design
  const [customizationTab, setCustomizationTab] = useState<CustomizationTab>('shape');
  const [qrSize, setQrSize] = useState(300);
  const [margin, setMargin] = useState(10);

  // Shape/Dots
  const [dotsType, setDotsType] = useState<DotType>('rounded');
  const [dotsColor, setDotsColor] = useState('#212529');

  // Background
  const [bgColor, setBgColor] = useState('#FFFFFF');

  // Corner Squares
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('extra-rounded');
  const [cornerSquareColor, setCornerSquareColor] = useState('#20c997');

  // Corner Dots
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>('dot');
  const [cornerDotColor, setCornerDotColor] = useState('#20c997');

  // Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState(0.3);
  const [logoMargin, setLogoMargin] = useState(5);

  const dataTypes = [
    { id: 'url', label: 'Link', icon: Globe },
    { id: 'text', label: 'Text', icon: MessageSquare },
    { id: 'email', label: 'E-mail', icon: Mail },
    { id: 'sms', label: 'SMS', icon: MessageCircle },
    { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
  ];

  const generateQRValue = (type: DataType): string => {
    switch (type) {
      case 'url':
        return url;
      case 'text':
        return text;
      case 'email':
        return `mailto:${email}${emailSubject ? `?subject=${encodeURIComponent(emailSubject)}` : ''}${emailBody ? `${emailSubject ? '&' : '?'}body=${encodeURIComponent(emailBody)}` : ''}`;
      case 'sms':
        return `sms:${smsNumber}${smsMessage ? `?body=${encodeURIComponent(smsMessage)}` : ''}`;
      case 'wifi':
        return `WIFI:T:${wifiEncryption};S:${wifiSsid};P:${wifiPassword};;`;
      default:
        return '';
    }
  };

  const qrValue = generateQRValue(dataType);

  // Initialize QR Code once
  useEffect(() => {
    if (!qrRef.current) return;

    try {
      const options = {
        width: qrSize,
        height: qrSize,
        data: qrValue,
        margin: margin,
        qrOptions: {
          typeNumber: 0 as any,
          mode: 'Byte' as any,
          errorCorrectionLevel: 'H' as any
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

      if (logoUrl) {
        (options as any).imageOptions = {
          hideBackgroundDots: true,
          imageSize: logoSize,
          margin: logoMargin,
          crossOrigin: 'anonymous',
        };
        (options as any).image = proxifyImageUrl(logoUrl);
      }

      qrCodeRef.current = new QRCodeStyling(options as any);

      qrCodeRef.current.append(qrRef.current);
    } catch (error) {
      // Silently fail - QR code initialization error
    }
  }, []);

  // Update QR Code when settings change
  useEffect(() => {
    if (!qrCodeRef.current) return;

    try {
      const updateOptions = {
        width: qrSize,
        height: qrSize,
        data: qrValue,
        margin: margin,
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

      if (logoUrl) {
        (updateOptions as any).imageOptions = {
          hideBackgroundDots: true,
          imageSize: logoSize,
          margin: logoMargin,
          crossOrigin: 'anonymous',
        };
        (updateOptions as any).image = proxifyImageUrl(logoUrl);
      }

      qrCodeRef.current.update(updateOptions);
    } catch (error) {
      // Silently fail - QR code update error
    }
  }, [
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
  ]);

  const handleDownload = (extension: 'png' | 'svg' | 'jpeg' | 'webp') => {
    if (qrCodeRef.current) {
      qrCodeRef.current.download({
        name: 'qr-code',
        extension: extension,
      });
    }
  };

  const handleInputChange = (setter: (value: string) => void, value: string) => {
    setter(value);
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
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        );
      case 'text':
        return (
          <textarea
            value={text}
            onChange={(e) => handleInputChange(setText, e.target.value)}
            placeholder="Enter your text"
            rows={3}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
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
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => handleInputChange(setEmailSubject, e.target.value)}
              placeholder="Subject (optional)"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <textarea
              value={emailBody}
              onChange={(e) => handleInputChange(setEmailBody, e.target.value)}
              placeholder="Message (optional)"
              rows={2}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
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
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <textarea
              value={smsMessage}
              onChange={(e) => handleInputChange(setSmsMessage, e.target.value)}
              placeholder="Message (optional)"
              rows={2}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>
        );
      case 'wifi':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={wifiSsid}
              onChange={(e) => handleInputChange(setWifiSsid, e.target.value)}
              placeholder="Network Name (SSID)"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <input
              type="text"
              value={wifiPassword}
              onChange={(e) => handleInputChange(setWifiPassword, e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <select
              value={wifiEncryption}
              onChange={(e) => handleInputChange(setWifiEncryption, e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent [&>option]:bg-white [&>option]:text-gray-900"
            >
              <option value="WPA">WPA/WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">None</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Left Column - Steps */}
      <div className="space-y-6">
        {/* Step 1: Choose Data Type */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
              1
            </div>
            <h3 className="text-xl font-bold text-gray-900">Choose Data Type</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {dataTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setDataType(type.id as DataType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    dataType === type.id
                      ? 'bg-teal-500 border-teal-600 text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-teal-500 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Complete the Content */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
              2
            </div>
            <h3 className="text-xl font-bold text-gray-900">Complete the Content</h3>
          </div>

          {renderContentForm()}
        </div>

        {/* Step 3: Design Your QR Code */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
              3
            </div>
            <h3 className="text-xl font-bold text-gray-900">Design Your QR Code</h3>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCustomizationTab('shape')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                customizationTab === 'shape'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              Shape
            </button>
            <button
              onClick={() => setCustomizationTab('colors')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                customizationTab === 'colors'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              Colors
            </button>
            <button
              onClick={() => setCustomizationTab('logo')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                customizationTab === 'logo'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              Logo
            </button>
          </div>

          {/* Customization Content */}
          <div className="space-y-4">
            {customizationTab === 'shape' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Dot Style
                  </label>
                  <select
                    value={dotsType}
                    onChange={(e) => setDotsType(e.target.value as DotType)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 [&>option]:bg-white [&>option]:text-gray-900"
                  >
                    <option value="rounded">Rounded</option>
                    <option value="dots">Dots</option>
                    <option value="classy">Classy</option>
                    <option value="classy-rounded">Classy Rounded</option>
                    <option value="square">Square</option>
                    <option value="extra-rounded">Extra Rounded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Corner Square Style
                  </label>
                  <select
                    value={cornerSquareType}
                    onChange={(e) => setCornerSquareType(e.target.value as CornerSquareType)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 [&>option]:bg-white [&>option]:text-gray-900"
                  >
                    <option value="dot">Dot</option>
                    <option value="square">Square</option>
                    <option value="extra-rounded">Extra Rounded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Corner Dot Style
                  </label>
                  <select
                    value={cornerDotType}
                    onChange={(e) => setCornerDotType(e.target.value as CornerDotType)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 [&>option]:bg-white [&>option]:text-gray-900"
                  >
                    <option value="dot">Dot</option>
                    <option value="square">Square</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    QR Code Size
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="500"
                    step="10"
                    value={qrSize}
                    onChange={(e) => setQrSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600 mt-1">{qrSize}px</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Margin
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="5"
                    value={margin}
                    onChange={(e) => setMargin(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600 mt-1">{margin}px</div>
                </div>
              </>
            )}

            {customizationTab === 'colors' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Dots Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={dotsColor}
                      onChange={(e) => setDotsColor(e.target.value)}
                      className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={dotsColor}
                      onChange={(e) => setDotsColor(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Corner Square Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={cornerSquareColor}
                      onChange={(e) => setCornerSquareColor(e.target.value)}
                      className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cornerSquareColor}
                      onChange={(e) => setCornerSquareColor(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Corner Dot Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={cornerDotColor}
                      onChange={(e) => setCornerDotColor(e.target.value)}
                      className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cornerDotColor}
                      onChange={(e) => setCornerDotColor(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </>
            )}

            {customizationTab === 'logo' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {logoUrl && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Logo Size (ratio)
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="0.5"
                        step="0.05"
                        value={logoSize}
                        onChange={(e) => setLogoSize(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-600 mt-1">{logoSize}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Logo Margin
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={logoMargin}
                        onChange={(e) => setLogoMargin(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-sm text-gray-600 mt-1">{logoMargin}px</div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Column - QR Preview */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
              4
            </div>
            <h3 className="text-xl font-bold text-gray-900">Download QR Code</h3>
          </div>

          <div className="flex justify-center mb-6">
            <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-2xl" />
          </div>

          <p className="text-sm text-gray-600 mb-4 text-center">
            Scan with your phone to test
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDownload('png')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
            <button
              onClick={() => handleDownload('svg')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              SVG
            </button>
            <button
              onClick={() => handleDownload('jpeg')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              JPEG
            </button>
            <button
              onClick={() => handleDownload('webp')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              WebP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
