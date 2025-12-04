import { useEffect, useRef } from 'react';
import { X, Download } from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import type { AdminQRCode } from '../services/adminService';
import { proxifyImageUrl } from '../utils/imageProxy';

interface QRCodeViewModalProps {
  qrCode: AdminQRCode | null;
  onClose: () => void;
}

export default function QRCodeViewModal({ qrCode, onClose }: QRCodeViewModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!qrCode || !qrRef.current) return;

    // Parse styling if available
    let styling = {};
    try {
      if (qrCode.styling) {
        styling = JSON.parse(qrCode.styling);
      }
    } catch (e) {
      // Use default styling if parsing fails
    }

    // Get QR code data from content
    let qrData = qrCode.content;
    try {
      const contentJson = JSON.parse(qrCode.content);
      // Generate appropriate data based on type
      switch (qrCode.type) {
        case 'url':
          qrData = contentJson.url || qrCode.content;
          break;
        case 'text':
          qrData = contentJson.text || qrCode.content;
          break;
        case 'email':
          qrData = `mailto:${contentJson.email}${contentJson.subject ? `?subject=${encodeURIComponent(contentJson.subject)}` : ''}${contentJson.body ? `${contentJson.subject ? '&' : '?'}body=${encodeURIComponent(contentJson.body)}` : ''}`;
          break;
        case 'phone':
          qrData = `tel:${contentJson.phone}`;
          break;
        case 'sms':
          qrData = `sms:${contentJson.number}${contentJson.message ? `?body=${encodeURIComponent(contentJson.message)}` : ''}`;
          break;
        case 'wifi':
          qrData = `WIFI:T:${contentJson.encryption};S:${contentJson.ssid};P:${contentJson.password};H:${contentJson.hidden || false};;`;
          break;
        case 'vcard':
        case 'mecard':
          // These should already be in the proper format
          qrData = qrCode.content;
          break;
        default:
          qrData = qrCode.content;
      }
    } catch (e) {
      // Use raw content if parsing fails
      qrData = qrCode.content;
    }

    // Create QR code options
    const options: any = {
      width: 400,
      height: 400,
      type: 'svg',
      data: qrData,
      margin: (styling as any).margin || 10,
      qrOptions: {
        errorCorrectionLevel: (styling as any).errorCorrectionLevel || 'M',
      },
      dotsOptions: {
        color: (styling as any).dotsColor || '#000000',
        type: (styling as any).dotsType || 'rounded',
      },
      backgroundOptions: {
        color: (styling as any).bgColor || '#ffffff',
      },
      cornersSquareOptions: {
        color: (styling as any).cornerSquareColor || '#14b8a6',
        type: (styling as any).cornerSquareType || 'extra-rounded',
      },
      cornersDotOptions: {
        color: (styling as any).cornerDotColor || '#14b8a6',
        type: (styling as any).cornerDotType || 'dot',
      },
    };

    // Add logo if available
    if ((styling as any).logoUrl) {
      options.imageOptions = {
        hideBackgroundDots: true,
        imageSize: (styling as any).imageSize || 0.4,
        margin: (styling as any).imageMargin || 0,
        crossOrigin: 'anonymous',
      };
      options.image = proxifyImageUrl((styling as any).logoUrl);
    }

    // Clear previous QR code
    if (qrRef.current) {
      qrRef.current.innerHTML = '';
    }

    // Create and render QR code
    qrCodeInstance.current = new QRCodeStyling(options);
    qrCodeInstance.current.append(qrRef.current);

    return () => {
      if (qrRef.current) {
        qrRef.current.innerHTML = '';
      }
    };
  }, [qrCode]);

  const handleDownload = (extension: 'png' | 'svg' | 'jpeg') => {
    if (qrCodeInstance.current) {
      qrCodeInstance.current.download({
        name: qrCode?.name || 'qr-code',
        extension: extension,
      });
    }
  };

  if (!qrCode) return null;

  const getDisplayName = () => {
    if (!qrCode.name || qrCode.name.trim() === '' || qrCode.name === 'null') {
      return 'Unnamed QR Code';
    }
    return qrCode.name;
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{getDisplayName()}</h3>
            <p className="text-sm text-gray-500 capitalize mt-1">{qrCode.type} QR Code</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Display */}
        <div className="p-8 flex items-center justify-center bg-gray-50">
          <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-lg"></div>
        </div>

        {/* Info */}
        <div className="px-6 pb-4">
          <div className="text-sm text-gray-600">
            <p className="mb-1"><strong>Owner:</strong> {qrCode.user_email}</p>
            <p className="mb-1"><strong>Scans:</strong> {qrCode.scan_count}</p>
            <p><strong>Created:</strong> {new Date(qrCode.createdat).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => handleDownload('png')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            PNG
          </button>
          <button
            onClick={() => handleDownload('svg')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg font-medium text-gray-900 transition-all"
          >
            <Download className="w-4 h-4" />
            SVG
          </button>
          <button
            onClick={() => handleDownload('jpeg')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg font-medium text-gray-900 transition-all"
          >
            <Download className="w-4 h-4" />
            JPEG
          </button>
        </div>
      </div>
    </div>
  );
}
