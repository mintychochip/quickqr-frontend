import { useState, useEffect, useRef } from 'react';
import {
  Globe,
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  User,
  MapPin,
  Facebook,
  Twitter,
  Youtube,
  Wifi,
  Calendar,
  Download,
} from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';

type DataType =
  | 'url'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'vcard'
  | 'mecard'
  | 'location'
  | 'facebook'
  | 'twitter'
  | 'youtube'
  | 'wifi'
  | 'event';

type CustomizationTab = 'shape' | 'colors' | 'logo';
type DotType = 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
type CornerSquareType = 'dot' | 'square' | 'extra-rounded';
type CornerDotType = 'dot' | 'square';

export default function InteractiveQRGenerator() {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<any>(null);

  // Step 1: Data Type
  const [dataType, setDataType] = useState<DataType>('url');

  // Step 2: Content
  const [url, setUrl] = useState('https://quickqr.example.com');
  const [text, setText] = useState('Hello, World!');
  const [email, setEmail] = useState('contact@example.com');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [phone, setPhone] = useState('+1234567890');
  const [smsNumber, setSmsNumber] = useState('+1234567890');
  const [smsMessage, setSmsMessage] = useState('');
  const [vcardName, setVcardName] = useState('John Doe');
  const [vcardOrg, setVcardOrg] = useState('QuickQR Inc.');
  const [vcardPhone, setVcardPhone] = useState('+1234567890');
  const [vcardEmail, setVcardEmail] = useState('john@example.com');
  const [vcardUrl, setVcardUrl] = useState('https://example.com');
  const [mecardName, setMecardName] = useState('John Doe');
  const [mecardPhone, setMecardPhone] = useState('+1234567890');
  const [mecardEmail, setMecardEmail] = useState('john@example.com');
  const [latitude, setLatitude] = useState('37.7749');
  const [longitude, setLongitude] = useState('-122.4194');
  const [facebookUrl, setFacebookUrl] = useState('https://facebook.com/yourpage');
  const [twitterUrl, setTwitterUrl] = useState('https://twitter.com/yourusername');
  const [youtubeUrl, setYoutubeUrl] = useState('https://youtube.com/@yourchannel');
  const [wifiSsid, setWifiSsid] = useState('MyNetwork');
  const [wifiPassword, setWifiPassword] = useState('password123');
  const [wifiEncryption, setWifiEncryption] = useState('WPA');
  const [eventTitle, setEventTitle] = useState('Meeting');
  const [eventLocation, setEventLocation] = useState('Conference Room');
  const [eventStart, setEventStart] = useState('20250101T100000');
  const [eventEnd, setEventEnd] = useState('20250101T110000');

  // Step 3: Design
  const [customizationTab, setCustomizationTab] = useState<CustomizationTab>('shape');
  const [qrSize, setQrSize] = useState(300);
  const [margin, setMargin] = useState(10);

  // Shape/Dots
  const [dotsType, setDotsType] = useState<DotType>('rounded');
  const [dotsColor, setDotsColor] = useState('#000000');
  const [dotsGradient, setDotsGradient] = useState(false);
  const [dotsGradientColor1, setDotsGradientColor1] = useState('#000000');
  const [dotsGradientColor2, setDotsGradientColor2] = useState('#7c3aed');
  const [dotsGradientType, setDotsGradientType] = useState<'linear' | 'radial'>('linear');

  // Background
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [bgGradient, setBgGradient] = useState(false);
  const [bgGradientColor1, setBgGradientColor1] = useState('#FFFFFF');
  const [bgGradientColor2, setBgGradientColor2] = useState('#e0e7ff');
  const [bgGradientType, setBgGradientType] = useState<'linear' | 'radial'>('linear');

  // Corner Squares
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('extra-rounded');
  const [cornerSquareColor, setCornerSquareColor] = useState('#000000');

  // Corner Dots
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>('dot');
  const [cornerDotColor, setCornerDotColor] = useState('#000000');

  // Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState(0.3);
  const [logoMargin, setLogoMargin] = useState(5);

  const dataTypes = [
    { id: 'url', label: 'Link', icon: Globe },
    { id: 'text', label: 'Text', icon: MessageSquare },
    { id: 'email', label: 'E-mail', icon: Mail },
    { id: 'phone', label: 'Call', icon: Phone },
    { id: 'sms', label: 'SMS', icon: MessageCircle },
    { id: 'vcard', label: 'V-card', icon: User },
    { id: 'mecard', label: 'MeCard', icon: User },
    { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'facebook', label: 'Facebook', icon: Facebook },
    { id: 'twitter', label: 'X', icon: Twitter },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
    { id: 'event', label: 'Event', icon: Calendar },
  ];

  const generateQRValue = (type: DataType): string => {
    switch (type) {
      case 'url':
        return url;
      case 'text':
        return text;
      case 'email':
        return `mailto:${email}${emailSubject ? `?subject=${encodeURIComponent(emailSubject)}` : ''}${emailBody ? `${emailSubject ? '&' : '?'}body=${encodeURIComponent(emailBody)}` : ''}`;
      case 'phone':
        return `tel:${phone}`;
      case 'sms':
        return `sms:${smsNumber}${smsMessage ? `?body=${encodeURIComponent(smsMessage)}` : ''}`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${vcardName}\nORG:${vcardOrg}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nURL:${vcardUrl}\nEND:VCARD`;
      case 'mecard':
        return `MECARD:N:${mecardName};TEL:${mecardPhone};EMAIL:${mecardEmail};;`;
      case 'location':
        return `geo:${latitude},${longitude}`;
      case 'facebook':
        return facebookUrl;
      case 'twitter':
        return twitterUrl;
      case 'youtube':
        return youtubeUrl;
      case 'wifi':
        return `WIFI:T:${wifiEncryption};S:${wifiSsid};P:${wifiPassword};;`;
      case 'event':
        return `BEGIN:VEVENT\nSUMMARY:${eventTitle}\nLOCATION:${eventLocation}\nDTSTART:${eventStart}\nDTEND:${eventEnd}\nEND:VEVENT`;
      default:
        return '';
    }
  };

  const qrValue = generateQRValue(dataType);

  // Initialize QR Code once
  useEffect(() => {
    if (!qrRef.current) return;

    try {
      const options: any = {
        width: qrSize,
        height: qrSize,
        data: qrValue,
        margin: margin,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'H'
        },
        dotsOptions: {
          type: dotsType,
          color: dotsGradient
            ? undefined
            : dotsColor,
          gradient: dotsGradient
            ? {
                type: dotsGradientType,
                rotation: 0,
                colorStops: [
                  { offset: 0, color: dotsGradientColor1 },
                  { offset: 1, color: dotsGradientColor2 }
                ]
              }
            : undefined
        },
        backgroundOptions: {
          color: bgGradient
            ? undefined
            : bgColor,
          gradient: bgGradient
            ? {
                type: bgGradientType,
                rotation: 0,
                colorStops: [
                  { offset: 0, color: bgGradientColor1 },
                  { offset: 1, color: bgGradientColor2 }
                ]
              }
            : undefined
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
        options.imageOptions = {
          hideBackgroundDots: true,
          imageSize: logoSize,
          margin: logoMargin,
          crossOrigin: 'anonymous',
        };
        options.image = logoUrl;
      }

      qrCodeRef.current = new QRCodeStyling(options);

      qrCodeRef.current.append(qrRef.current);
    } catch (error) {
      console.error('Error initializing QR Code:', error);
    }
  }, []);

  // Update QR Code when settings change
  useEffect(() => {
    if (!qrCodeRef.current) return;

    try {
      const updateOptions: any = {
        width: qrSize,
        height: qrSize,
        data: qrValue,
        margin: margin,
        dotsOptions: {
          type: dotsType,
          color: dotsGradient
            ? undefined
            : dotsColor,
          gradient: dotsGradient
            ? {
                type: dotsGradientType,
                rotation: 0,
                colorStops: [
                  { offset: 0, color: dotsGradientColor1 },
                  { offset: 1, color: dotsGradientColor2 }
                ]
              }
            : undefined
        },
        backgroundOptions: {
          color: bgGradient
            ? undefined
            : bgColor,
          gradient: bgGradient
            ? {
                type: bgGradientType,
                rotation: 0,
                colorStops: [
                  { offset: 0, color: bgGradientColor1 },
                  { offset: 1, color: bgGradientColor2 }
                ]
              }
            : undefined
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
        updateOptions.imageOptions = {
          hideBackgroundDots: true,
          imageSize: logoSize,
          margin: logoMargin,
          crossOrigin: 'anonymous',
        };
        updateOptions.image = logoUrl;
      }

      qrCodeRef.current.update(updateOptions);
    } catch (error) {
      console.error('Error updating QR Code:', error);
    }
  }, [
    qrValue,
    qrSize,
    margin,
    dotsType,
    dotsColor,
    dotsGradient,
    dotsGradientColor1,
    dotsGradientColor2,
    dotsGradientType,
    bgColor,
    bgGradient,
    bgGradientColor1,
    bgGradientColor2,
    bgGradientType,
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        );
      case 'text':
        return (
          <textarea
            value={text}
            onChange={(e) => handleInputChange(setText, e.target.value)}
            placeholder="Enter your text"
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
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
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => handleInputChange(setEmailSubject, e.target.value)}
              placeholder="Subject (optional)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <textarea
              value={emailBody}
              onChange={(e) => handleInputChange(setEmailBody, e.target.value)}
              placeholder="Message (optional)"
              rows={2}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
            />
          </div>
        );
      case 'phone':
        return (
          <input
            type="tel"
            value={phone}
            onChange={(e) => handleInputChange(setPhone, e.target.value)}
            placeholder="+1234567890"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        );
      case 'sms':
        return (
          <div className="space-y-3">
            <input
              type="tel"
              value={smsNumber}
              onChange={(e) => handleInputChange(setSmsNumber, e.target.value)}
              placeholder="+1234567890"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <textarea
              value={smsMessage}
              onChange={(e) => handleInputChange(setSmsMessage, e.target.value)}
              placeholder="Message (optional)"
              rows={2}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
            />
          </div>
        );
      case 'vcard':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={vcardName}
              onChange={(e) => handleInputChange(setVcardName, e.target.value)}
              placeholder="Full Name"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="text"
              value={vcardOrg}
              onChange={(e) => handleInputChange(setVcardOrg, e.target.value)}
              placeholder="Organization"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="tel"
              value={vcardPhone}
              onChange={(e) => handleInputChange(setVcardPhone, e.target.value)}
              placeholder="Phone"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="email"
              value={vcardEmail}
              onChange={(e) => handleInputChange(setVcardEmail, e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="url"
              value={vcardUrl}
              onChange={(e) => handleInputChange(setVcardUrl, e.target.value)}
              placeholder="Website"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
          </div>
        );
      case 'mecard':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={mecardName}
              onChange={(e) => handleInputChange(setMecardName, e.target.value)}
              placeholder="Full Name"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="tel"
              value={mecardPhone}
              onChange={(e) => handleInputChange(setMecardPhone, e.target.value)}
              placeholder="Phone"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="email"
              value={mecardEmail}
              onChange={(e) => handleInputChange(setMecardEmail, e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
          </div>
        );
      case 'location':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={latitude}
              onChange={(e) => handleInputChange(setLatitude, e.target.value)}
              placeholder="Latitude (e.g., 37.7749)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="text"
              value={longitude}
              onChange={(e) => handleInputChange(setLongitude, e.target.value)}
              placeholder="Longitude (e.g., -122.4194)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
          </div>
        );
      case 'facebook':
        return (
          <input
            type="url"
            value={facebookUrl}
            onChange={(e) => handleInputChange(setFacebookUrl, e.target.value)}
            placeholder="https://facebook.com/yourpage"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        );
      case 'twitter':
        return (
          <input
            type="url"
            value={twitterUrl}
            onChange={(e) => handleInputChange(setTwitterUrl, e.target.value)}
            placeholder="https://twitter.com/yourusername"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        );
      case 'youtube':
        return (
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => handleInputChange(setYoutubeUrl, e.target.value)}
            placeholder="https://youtube.com/@yourchannel"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        );
      case 'wifi':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={wifiSsid}
              onChange={(e) => handleInputChange(setWifiSsid, e.target.value)}
              placeholder="Network Name (SSID)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="text"
              value={wifiPassword}
              onChange={(e) => handleInputChange(setWifiPassword, e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <select
              value={wifiEncryption}
              onChange={(e) => handleInputChange(setWifiEncryption, e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent [&>option]:bg-gray-900 [&>option]:text-gray-100 [&>option:hover]:bg-white/10"
            >
              <option value="WPA">WPA/WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">None</option>
            </select>
          </div>
        );
      case 'event':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => handleInputChange(setEventTitle, e.target.value)}
              placeholder="Event Title"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="text"
              value={eventLocation}
              onChange={(e) => handleInputChange(setEventLocation, e.target.value)}
              placeholder="Location"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="text"
              value={eventStart}
              onChange={(e) => handleInputChange(setEventStart, e.target.value)}
              placeholder="Start (YYYYMMDDTHHMMSS)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <input
              type="text"
              value={eventEnd}
              onChange={(e) => handleInputChange(setEventEnd, e.target.value)}
              placeholder="End (YYYYMMDDTHHMMSS)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
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
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              1
            </div>
            <h3 className="text-xl font-bold text-white">Choose Data Type</h3>
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
                      ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-600 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-600/50 hover:text-white'
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
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              2
            </div>
            <h3 className="text-xl font-bold text-white">Complete the Content</h3>
          </div>

          {renderContentForm()}
        </div>

        {/* Step 3: Design Your QR Code */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              3
            </div>
            <h3 className="text-xl font-bold text-white">Design Your QR Code</h3>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCustomizationTab('shape')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                customizationTab === 'shape'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Shape
            </button>
            <button
              onClick={() => setCustomizationTab('colors')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                customizationTab === 'colors'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Colors
            </button>
            <button
              onClick={() => setCustomizationTab('logo')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                customizationTab === 'logo'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
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
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Dot Style
                  </label>
                  <select
                    value={dotsType}
                    onChange={(e) => setDotsType(e.target.value as DotType)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 [&>option]:bg-gray-900 [&>option]:text-gray-100 [&>option:hover]:bg-white/10"
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
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Corner Square Style
                  </label>
                  <select
                    value={cornerSquareType}
                    onChange={(e) => setCornerSquareType(e.target.value as CornerSquareType)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 [&>option]:bg-gray-900 [&>option]:text-gray-100 [&>option:hover]:bg-white/10"
                  >
                    <option value="dot">Dot</option>
                    <option value="square">Square</option>
                    <option value="extra-rounded">Extra Rounded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Corner Dot Style
                  </label>
                  <select
                    value={cornerDotType}
                    onChange={(e) => setCornerDotType(e.target.value as CornerDotType)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 [&>option]:bg-gray-900 [&>option]:text-gray-100 [&>option:hover]:bg-white/10"
                  >
                    <option value="dot">Dot</option>
                    <option value="square">Square</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
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
                  <div className="text-sm text-gray-400 mt-1">{qrSize}px</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
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
                  <div className="text-sm text-gray-400 mt-1">{margin}px</div>
                </div>
              </>
            )}

            {customizationTab === 'colors' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-400">
                      Dots Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="dotsGradient"
                        checked={dotsGradient}
                        onChange={(e) => setDotsGradient(e.target.checked)}
                        className="w-4 h-4 rounded bg-white/5 border-white/10 text-purple-600 focus:ring-purple-600"
                      />
                      <label htmlFor="dotsGradient" className="text-sm text-gray-400">
                        Gradient
                      </label>
                    </div>
                  </div>

                  {!dotsGradient ? (
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={dotsColor}
                        onChange={(e) => setDotsColor(e.target.value)}
                        className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={dotsColor}
                        onChange={(e) => setDotsColor(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={dotsGradientColor1}
                          onChange={(e) => setDotsGradientColor1(e.target.value)}
                          className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={dotsGradientColor1}
                          onChange={(e) => setDotsGradientColor1(e.target.value)}
                          placeholder="Color 1"
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={dotsGradientColor2}
                          onChange={(e) => setDotsGradientColor2(e.target.value)}
                          className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={dotsGradientColor2}
                          onChange={(e) => setDotsGradientColor2(e.target.value)}
                          placeholder="Color 2"
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                      <select
                        value={dotsGradientType}
                        onChange={(e) => setDotsGradientType(e.target.value as 'linear' | 'radial')}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 [&>option]:bg-gray-900 [&>option]:text-gray-100 [&>option:hover]:bg-white/10"
                      >
                        <option value="linear">Linear</option>
                        <option value="radial">Radial</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-400">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="bgGradient"
                        checked={bgGradient}
                        onChange={(e) => setBgGradient(e.target.checked)}
                        className="w-4 h-4 rounded bg-white/5 border-white/10 text-purple-600 focus:ring-purple-600"
                      />
                      <label htmlFor="bgGradient" className="text-sm text-gray-400">
                        Gradient
                      </label>
                    </div>
                  </div>

                  {!bgGradient ? (
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={bgGradientColor1}
                          onChange={(e) => setBgGradientColor1(e.target.value)}
                          className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={bgGradientColor1}
                          onChange={(e) => setBgGradientColor1(e.target.value)}
                          placeholder="Color 1"
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={bgGradientColor2}
                          onChange={(e) => setBgGradientColor2(e.target.value)}
                          className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={bgGradientColor2}
                          onChange={(e) => setBgGradientColor2(e.target.value)}
                          placeholder="Color 2"
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                      <select
                        value={bgGradientType}
                        onChange={(e) => setBgGradientType(e.target.value as 'linear' | 'radial')}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 [&>option]:bg-gray-900 [&>option]:text-gray-100 [&>option:hover]:bg-white/10"
                      >
                        <option value="linear">Linear</option>
                        <option value="radial">Radial</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Corner Square Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={cornerSquareColor}
                      onChange={(e) => setCornerSquareColor(e.target.value)}
                      className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cornerSquareColor}
                      onChange={(e) => setCornerSquareColor(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Corner Dot Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={cornerDotColor}
                      onChange={(e) => setCornerDotColor(e.target.value)}
                      className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cornerDotColor}
                      onChange={(e) => setCornerDotColor(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>
              </>
            )}

            {customizationTab === 'logo' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                {logoUrl && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
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
                      <div className="text-sm text-gray-400 mt-1">{logoSize}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
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
                      <div className="text-sm text-gray-400 mt-1">{logoMargin}px</div>
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
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              4
            </div>
            <h3 className="text-xl font-bold text-white">Download QR Code</h3>
          </div>

          <div className="flex justify-center mb-6">
            <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-2xl" />
          </div>

          <p className="text-sm text-gray-400 mb-4 text-center">
            Scan with your phone to test
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDownload('png')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-[1.02]"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
            <button
              onClick={() => handleDownload('svg')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg font-medium text-white hover:bg-white/10 transition-all"
            >
              <Download className="w-4 h-4" />
              SVG
            </button>
            <button
              onClick={() => handleDownload('jpeg')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg font-medium text-white hover:bg-white/10 transition-all"
            >
              <Download className="w-4 h-4" />
              JPEG
            </button>
            <button
              onClick={() => handleDownload('webp')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg font-medium text-white hover:bg-white/10 transition-all"
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
