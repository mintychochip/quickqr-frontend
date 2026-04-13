import { QRCodeSVG } from 'qrcode.react';
import type { FC } from 'react';

interface Props {
  url?: string;
}

const QRGenerator: FC<Props> = ({ url = '' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <QRCodeSVG
        value={url}
        size={200}
        level="M"
        bgColor="#ffffff"
        fgColor="#000000"
        style={{ borderRadius: '0.5rem' }}
      />
    </div>
  );
};

export default QRGenerator;
