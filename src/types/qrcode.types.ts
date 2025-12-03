// TypeScript type definitions for QR Code functionality

export type QRDotType = 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
export type QRCornerSquareType = 'dot' | 'square' | 'extra-rounded';
export type QRCornerDotType = 'dot' | 'square';
export type QRContentType = 'url' | 'text' | 'email' | 'phone' | 'vcard' | 'wifi';
export type QRStatus = 'active' | 'inactive';

export interface DotsOptions {
  type: QRDotType;
  color: string;
}

export interface CornersSquareOptions {
  type: QRCornerSquareType;
  color: string;
}

export interface CornersDotOptions {
  type: QRCornerDotType;
  color: string;
}

export interface BackgroundOptions {
  color: string;
}

export interface ImageOptions {
  hideBackgroundDots?: boolean;
  imageSize?: number;
  margin?: number;
  crossOrigin?: string;
}

export interface QRCodeOptions {
  width: number;
  height: number;
  data: string;
  dotsOptions: DotsOptions;
  cornersSquareOptions: CornersSquareOptions;
  cornersDotOptions: CornersDotOptions;
  backgroundOptions: BackgroundOptions;
  imageOptions?: ImageOptions;
  image?: string;
}

export interface QRCodeStylingProps {
  dotsType: QRDotType;
  dotsColor: string;
  bgColor: string;
  cornerSquareType: QRCornerSquareType;
  cornerSquareColor: string;
  cornerDotType: QRCornerDotType;
  cornerDotColor: string;
  logoUrl?: string;
}

export interface QRCodeData {
  id: number;
  qrcodeid?: string;
  name: string;
  url: string;
  scans: number;
  created: string;
  status: QRStatus;
  content: string;
  type: QRContentType;
  styling: string | null;
  mode: 'static' | 'dynamic';
}

export interface QRContentObject {
  url?: string;
  text?: string;
  email?: string;
  phone?: string;
  name?: string;
  organization?: string;
  ssid?: string;
  password?: string;
  [key: string]: string | undefined;
}

export interface CreateQRCodeResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    qrcodeid: string;
    name: string;
    content: string;
    type: string;
    styling?: QRCodeStylingProps;
    createdat: string;
    expirytime?: string;
  };
}

export interface UpdateQRCodeData {
  qrcodeid: string;
  name?: string;
  content?: string;
  type?: string;
  styling?: string;
}
