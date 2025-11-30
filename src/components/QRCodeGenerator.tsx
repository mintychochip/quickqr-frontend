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
  Save,
  Sparkles,
  Zap,
  Search,
} from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';

type QRMode = 'static' | 'dynamic';

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

type DotType = 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
type CornerSquareType = 'dot' | 'square' | 'extra-rounded';
type CornerDotType = 'dot' | 'square';

interface QRCodeGeneratorProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onSave?: (data: any) => void;
  saving?: boolean;
  qrName?: string;
  onNameChange?: (name: string) => void;
}

export default function QRCodeGenerator({
  currentStep,
  onStepChange,
  onSave,
  saving = false,
  qrName = '',
  onNameChange
}: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<any>(null);

  // QR Mode (Static or Dynamic)
  const [qrMode, setQrMode] = useState<QRMode>('static');

  // Step 1: Data Type
  const [dataType, setDataType] = useState<DataType>('url');

  // Search for data types
  const [searchQuery, setSearchQuery] = useState('');

  // Step 2: Content
  const [url, setUrl] = useState('https://example.com');
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [phone, setPhone] = useState('');
  const [smsNumber, setSmsNumber] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [vcardName, setVcardName] = useState('');
  const [vcardOrg, setVcardOrg] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');
  const [vcardEmail, setVcardEmail] = useState('');
  const [vcardUrl, setVcardUrl] = useState('');
  const [mecardName, setMecardName] = useState('');
  const [mecardPhone, setMecardPhone] = useState('');
  const [mecardEmail, setMecardEmail] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiEncryption, setWifiEncryption] = useState('WPA');
  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');

  // Step 3: Styling
  const [qrSize, setQrSize] = useState(300);
  const [margin, setMargin] = useState(10);

  // Shape/Dots
  const [dotsType, setDotsType] = useState<DotType>('rounded');
  const [dotsColor, setDotsColor] = useState('#000000');
  const [dotsGradient, setDotsGradient] = useState(false);
  const [dotsGradientColor1, setDotsGradientColor1] = useState('#000000');
  const [dotsGradientColor2, setDotsGradientColor2] = useState('#7c3aed');
  const dotsGradientType: 'linear' | 'radial' = 'linear';

  // Background
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const bgGradient = false;
  const bgGradientColor1 = '#FFFFFF';
  const bgGradientColor2 = '#e0e7ff';
  const bgGradientType: 'linear' | 'radial' = 'linear';

  // Corner Squares
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('extra-rounded');
  const [cornerSquareColor, setCornerSquareColor] = useState('#000000');
  const [cornerSquareGradient, setCornerSquareGradient] = useState(false);
  const [cornerSquareGradientColor1, setCornerSquareGradientColor1] = useState('#000000');
  const [cornerSquareGradientColor2, setCornerSquareGradientColor2] = useState('#7c3aed');

  // Corner Dots
  const cornerDotType: CornerDotType = 'dot';
  const [cornerDotColor, setCornerDotColor] = useState('#000000');
  const [cornerDotGradient, setCornerDotGradient] = useState(false);
  const [cornerDotGradientColor1, setCornerDotGradientColor1] = useState('#000000');
  const [cornerDotGradientColor2, setCornerDotGradientColor2] = useState('#7c3aed');

  // Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState(0.3);
  const [logoMargin, setLogoMargin] = useState(5);

  // Error Correction Level
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');

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

  // Initialize QR Code when Step 3 or 4 is reached
  useEffect(() => {
    // Only initialize on steps 3 and 4
    if (currentStep !== 3 && currentStep !== 4) return;

    console.log('Step:', currentStep, 'Initializing QR Code...');

    // Use a timeout to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!qrRef.current) {
        console.error('QR ref element not found!');
        return;
      }

      console.log('QR ref element found:', qrRef.current);

      try {
        // Clear any existing QR code
        qrRef.current.innerHTML = '';

        // Start with basic options to ensure it works
        const options: any = {
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
          options.image = logoUrl;
          options.imageOptions = {
            hideBackgroundDots: true,
            imageSize: logoSize,
            margin: logoMargin,
            crossOrigin: 'anonymous'
          };
        }

        console.log('Creating QR Code with options:', options);
        qrCodeRef.current = new QRCodeStyling(options);

        console.log('Appending QR Code to element:', qrRef.current);
        qrCodeRef.current.append(qrRef.current);
        console.log('QR Code initialized successfully');

        // Add a test SVG to see if the container works
        if (!qrRef.current.innerHTML) {
          console.warn('QR Code container is empty after append');
          qrRef.current.innerHTML = '<div style="width: 200px; height: 200px; background: red; display: flex; align-items: center; justify-content: center; color: white;">TEST</div>';
        }

      } catch (error) {
        console.error('Error initializing QR Code:', error);
      }
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [currentStep, qrValue]);

  // Update QR Code when settings change
  useEffect(() => {
    if (!qrCodeRef.current) return;

    try {
      // Simplified update options to match initialization
      const updateOptions: any = {
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
        updateOptions.image = logoUrl;
        updateOptions.imageOptions = {
          hideBackgroundDots: true,
          imageSize: logoSize,
          margin: logoMargin,
          crossOrigin: 'anonymous'
        };
      }

      qrCodeRef.current.update(updateOptions);
    } catch (error) {
      console.error('Error updating QR Code:', error);
    }
  }, [
    qrMode,
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
    cornerSquareGradient,
    cornerSquareGradientColor1,
    cornerSquareGradientColor2,
    cornerDotType,
    cornerDotColor,
    cornerDotGradient,
    cornerDotGradientColor1,
    cornerDotGradientColor2,
    logoUrl,
    logoSize,
    logoMargin,
    errorCorrectionLevel,
  ]);

  const handleInputChange = (setter: (value: string) => void, value: string) => {
    setter(value);
  };

  const handleSave = () => {
    const qrData = {
      mode: qrMode,
      type: dataType,
      content: generateContentObject(),
      styling: {
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
        cornerSquareGradient,
        cornerSquareGradientColor1,
        cornerSquareGradientColor2,
        cornerDotType,
        cornerDotColor,
        cornerDotGradient,
        cornerDotGradientColor1,
        cornerDotGradientColor2,
        logoUrl,
        logoSize,
        logoMargin,
        errorCorrectionLevel,
      }
    };

    if (onSave) {
      onSave(qrData);
    }
  };

  const generateContentObject = () => {
    switch (dataType) {
      case 'url':
        return { url };
      case 'text':
        return { text };
      case 'email':
        return { email, subject: emailSubject, body: emailBody };
      case 'phone':
        return { phone };
      case 'sms':
        return { number: smsNumber, message: smsMessage };
      case 'vcard':
        return { name: vcardName, org: vcardOrg, phone: vcardPhone, email: vcardEmail, url: vcardUrl };
      case 'mecard':
        return { name: mecardName, phone: mecardPhone, email: mecardEmail };
      case 'location':
        return { latitude, longitude };
      case 'facebook':
        return { url: facebookUrl };
      case 'twitter':
        return { url: twitterUrl };
      case 'youtube':
        return { url: youtubeUrl };
      case 'wifi':
        return { ssid: wifiSsid, password: wifiPassword, encryption: wifiEncryption };
      case 'event':
        return { title: eventTitle, location: eventLocation, start: eventStart, end: eventEnd };
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        );
      case 'text':
        return (
          <textarea
            value={text}
            onChange={(e) => handleInputChange(setText, e.target.value)}
            placeholder="Enter your text"
            rows={4}
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
              rows={3}
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
              rows={3}
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* QR Mode Selection */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-8">
        <h3 className="text-2xl font-bold text-white mb-6">QR Code Type</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <button
            onClick={() => setQrMode('static')}
            className={`relative p-8 rounded-xl border-2 transition-all text-left ${
              qrMode === 'static'
                ? 'border-purple-400/50 bg-gradient-to-br from-purple-500/30 via-purple-600/20 to-indigo-600/20 shadow-2xl shadow-purple-400/30 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-purple-400/10 before:via-purple-500/10 before:to-transparent before:blur-sm after:absolute after:inset-0 after:rounded-xl after:bg-gradient-to-br after:from-purple-300/20 after:via-transparent after:to-purple-600/20 after:blur-md'
                : 'border-white/10 bg-white/5 hover:border-purple-600/50'
            }`}
          >
            <div className="flex flex-col gap-4">
              <Zap className={`w-10 h-10 transition-all duration-300 ${
                qrMode === 'static'
                  ? 'text-purple-400 drop-shadow-lg animate-pulse'
                  : 'text-gray-400'
              }`} />
              <div>
                <div className="text-xl font-bold text-white mb-2">Static QR Code</div>
                <div className="text-sm text-gray-400 mb-4">Perfect for permanent content</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2 text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>100% Free forever</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Works offline - content embedded in code</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>No tracking or analytics</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <span className="text-red-400 mt-0.5">✗</span>
                    <span>Cannot be edited after creation</span>
                  </li>
                </ul>
              </div>
            </div>
            {qrMode === 'static' && (
              <div className="absolute top-4 right-4 w-7 h-7 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-xl shadow-purple-400/50 animate-pulse ring-2 ring-purple-400/30 ring-offset-2 ring-offset-black/50">
                <div className="w-3 h-3 bg-white rounded-full shadow-inner"></div>
              </div>
            )}
          </button>

          <button
            onClick={() => setQrMode('dynamic')}
            className={`relative p-8 rounded-xl border-2 transition-all text-left ${
              qrMode === 'dynamic'
                ? 'border-yellow-400/50 bg-gradient-to-br from-yellow-500/30 via-amber-500/20 to-orange-600/20 shadow-2xl shadow-yellow-400/30 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-yellow-400/10 before:via-amber-500/10 before:to-transparent before:blur-sm after:absolute after:inset-0 after:rounded-xl after:bg-gradient-to-br after:from-yellow-300/20 after:via-transparent after:to-yellow-600/20 after:blur-md'
                : 'border-white/10 bg-white/5 hover:border-yellow-500/50'
            }`}
          >
            <div className="flex flex-col gap-4">
              <Sparkles className={`w-10 h-10 transition-all duration-300 ${
                qrMode === 'dynamic'
                  ? 'text-yellow-400 drop-shadow-lg animate-pulse'
                  : 'text-gray-400'
              }`} />
              <div>
                <div className="text-xl font-bold text-white mb-2">Dynamic QR Code</div>
                <div className="text-sm text-gray-400 mb-4">Flexible and trackable</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2 text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Edit content anytime without reprinting</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Full scan tracking & analytics</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Location, device & time data</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <span className="text-purple-400 mt-0.5">💰</span>
                    <span>Paid feature - pricing based on scans</span>
                  </li>
                </ul>
              </div>
            </div>
            {qrMode === 'dynamic' && (
              <div className="absolute top-4 right-4 w-7 h-7 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-xl shadow-yellow-400/50 animate-pulse ring-2 ring-yellow-400/30 ring-offset-2 ring-offset-black/50">
                <div className="w-3 h-3 bg-white rounded-full shadow-inner"></div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Next Button */}
      <div className="flex justify-end">
        <button
          onClick={() => onStepChange(2)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all"
        >
          Continue to Content Type
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    // Filter data types based on search query
    const filteredDataTypes = dataTypes.filter((type) =>
      type.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6">
        {/* Step 2: Data Type */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6">Choose Content Type</h3>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search QR code types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filteredDataTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setDataType(type.id as DataType)}
                  className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-300 ${
                    dataType === type.id
                      ? 'bg-gradient-to-br from-purple-500/30 via-purple-600/20 to-blue-600/20 border-purple-400/50 shadow-2xl shadow-purple-400/25 text-white before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-purple-400/10 before:via-purple-500/10 before:to-transparent before:blur-sm after:absolute after:inset-0 after:rounded-xl after:bg-gradient-to-br after:from-purple-300/15 after:via-transparent after:to-purple-600/15 after:blur-md'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/50 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-9 h-9 transition-all duration-300 ${
                    dataType === type.id
                      ? 'text-purple-400 drop-shadow-lg animate-pulse'
                      : 'text-current'
                  }`} />
                  <span className={`text-sm font-medium transition-all duration-300 ${
                    dataType === type.id
                      ? 'text-white drop-shadow-sm'
                      : 'text-current'
                  }`}>{type.label}</span>
                </button>
              );
            })}
          </div>

          {filteredDataTypes.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No QR code types found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Next Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={() => onStepChange(3)}
            disabled={!dataType}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Content & Style
          </button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Content & Styling */}
        <div className="lg:col-span-2 space-y-6">
        {/* Content Form */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6">Enter Content</h3>
          {renderContentForm()}
        </div>

        {/* Styling */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6">Styling Properties</h3>

          <div className="space-y-6">
            {/* Dot Style */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Dot Style</label>
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

            {/* Corner Square Style */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Corner Style</label>
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

            {/* Gradient Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Gradient</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!dotsGradient}
                    onChange={() => setDotsGradient(false)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-600"
                  />
                  <span className="text-sm text-gray-300">No</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={dotsGradient}
                    onChange={() => setDotsGradient(true)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-600"
                  />
                  <span className="text-sm text-gray-300">Yes</span>
                </label>
              </div>
            </div>

            {/* Dots Color */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {dotsGradient ? 'Gradient Colors' : 'Dots Color'}
              </label>
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
                </div>
              )}
            </div>

            {/* Corner Square Color */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {cornerSquareGradient ? 'Corner Square Gradient' : 'Corner Square Color'}
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!cornerSquareGradient}
                      onChange={() => setCornerSquareGradient(false)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-600"
                    />
                    <span className="text-sm text-gray-300">Solid</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={cornerSquareGradient}
                      onChange={() => setCornerSquareGradient(true)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-600"
                    />
                    <span className="text-sm text-gray-300">Gradient</span>
                  </label>
                </div>
                {!cornerSquareGradient ? (
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
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cornerSquareGradientColor1}
                        onChange={(e) => setCornerSquareGradientColor1(e.target.value)}
                        className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cornerSquareGradientColor1}
                        onChange={(e) => setCornerSquareGradientColor1(e.target.value)}
                        placeholder="Color 1"
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cornerSquareGradientColor2}
                        onChange={(e) => setCornerSquareGradientColor2(e.target.value)}
                        className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cornerSquareGradientColor2}
                        onChange={(e) => setCornerSquareGradientColor2(e.target.value)}
                        placeholder="Color 2"
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Corner Dot Color */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {cornerDotGradient ? 'Corner Dot Gradient' : 'Corner Dot Color'}
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!cornerDotGradient}
                      onChange={() => setCornerDotGradient(false)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-600"
                    />
                    <span className="text-sm text-gray-300">Solid</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={cornerDotGradient}
                      onChange={() => setCornerDotGradient(true)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-600"
                    />
                    <span className="text-sm text-gray-300">Gradient</span>
                  </label>
                </div>
                {!cornerDotGradient ? (
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
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cornerDotGradientColor1}
                        onChange={(e) => setCornerDotGradientColor1(e.target.value)}
                        className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cornerDotGradientColor1}
                        onChange={(e) => setCornerDotGradientColor1(e.target.value)}
                        placeholder="Color 1"
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cornerDotGradientColor2}
                        onChange={(e) => setCornerDotGradientColor2(e.target.value)}
                        className="w-12 h-10 rounded border border-white/10 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cornerDotGradientColor2}
                        onChange={(e) => setCornerDotGradientColor2(e.target.value)}
                        placeholder="Color 2"
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Background Color</label>
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
            </div>

            {/* QR Size and Margin */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">QR Size</label>
                <input
                  type="range"
                  min="200"
                  max="500"
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-400 text-center">{qrSize}px</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Margin</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-400 text-center">{margin}px</div>
              </div>
            </div>

            {/* Error Correction Level */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Error Correction Level</label>
              <select
                value={errorCorrectionLevel}
                onChange={(e) => setErrorCorrectionLevel(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 [&>option]:bg-gray-900 [&>option]:text-gray-100 [&>option:hover]:bg-white/10"
              >
                <option value="L">Low (7%)</option>
                <option value="M">Medium (15%)</option>
                <option value="Q">Quartile (25%)</option>
                <option value="H">High (30%)</option>
              </select>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Logo URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              {logoUrl && (
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Logo Size</label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.5"
                      step="0.1"
                      value={logoSize}
                      onChange={(e) => setLogoSize(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 text-center">{Math.round(logoSize * 100)}%</div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Logo Margin</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={logoMargin}
                      onChange={(e) => setLogoMargin(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 text-center">{logoMargin}px</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        </div>

        {/* Right Column - QR Preview (Sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-52 space-y-6">
            <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 rounded-xl p-8">
              <h3 className="text-lg font-bold text-white mb-4">Preview</h3>
              <div className="flex justify-center">
                <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-2xl" />
              </div>
              <p className="text-xs text-gray-400 text-center mt-4">
                {qrMode === 'static' ? 'Static QR Code' : 'Dynamic QR Code with tracking'}
              </p>
            </div>

            {/* QR Name and Save Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">QR Code Name</label>
                  <input
                    type="text"
                    value={qrName}
                    onChange={(e) => onNameChange?.(e.target.value)}
                    placeholder="Enter a name for your QR code"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !qrName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save QR Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

      
  return renderStepContent();
}
