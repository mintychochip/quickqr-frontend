import { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';

interface QRGeneratorProps {
  url?: string;
  size?: number;
}

export default function QRGenerator({ url = 'https://quickqr.com', size = 300 }: QRGeneratorProps) {
  const [qrCode] = useState(
    new QRCodeStyling({
      width: size,
      height: size,
      data: url,
      margin: 10,
      qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'Q' },
      imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 0 },
      dotsOptions: {
        type: 'rounded',
        color: '#3b82f6',
        gradient: {
          type: 'linear',
          rotation: 0,
          colorStops: [
            { offset: 0, color: '#6366f1' },
            { offset: 1, color: '#3b82f6' }
          ]
        }
      },
      backgroundOptions: { color: '#0a0a0a' },
      cornersSquareOptions: { type: 'extra-rounded', color: '#8b5cf6' },
      cornersDotOptions: { type: 'dot', color: '#8b5cf6' }
    })
  );

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      qrCode.append(ref.current);
    }
  }, [qrCode]);

  useEffect(() => {
    qrCode.update({ data: url });
  }, [url, qrCode]);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/20 ring-1 ring-white/10"
      />
    </div>
  );
}
