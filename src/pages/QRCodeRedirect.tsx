import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { runAbuseDetection } from '../services/abuseDetectionService';

const detectOperatingSystem = (): string => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const uaLower = ua.toLowerCase();

  if (uaLower.includes('iphone') || uaLower.includes('ipad')) return 'iOS';
  if (uaLower.includes('android')) return 'Android';
  if (uaLower.includes('macintosh') || uaLower.includes('mac os')) return 'iOS';
  if (uaLower.includes('win')) return 'Windows';
  if (uaLower.includes('linux')) return 'Linux';
  return 'Other';
};

interface QRCodeData {
  type: string;
  content: Record<string, unknown>;
  expirytime: string | null;
  scan_count: number;
}

export default function QRCodeRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);
  const hasExecuted = useRef(false);

  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const handleRedirect = async () => {
      if (!slug) {
        setError('Invalid QR code');
        return;
      }

      try {
        const os = detectOperatingSystem();

        // Fetch QR code data
        const { data: qrCode, error: fetchError } = await supabase
          .from('qrcodes')
          .select('type, content, expirytime')
          .eq('id', slug)
          .single();

        if (fetchError || !qrCode) {
          setError('QR code not found');
          return;
        }

        // Check if expired
        if (qrCode.expirytime && new Date(qrCode.expirytime) < new Date()) {
          setError('This QR code has expired');
          return;
        }

        // Record scan (fire and forget, don't block redirect)
        supabase
          .from('scans')
          .insert({
            qrcode_id: slug,
            os,
          })
          .then(({ error: scanError }) => {
            if (scanError) {
              console.error('Failed to record scan:', scanError);
            }
            // Run abuse detection on scan (async, doesn't block redirect)
            // IP is passed from client via X-Forwarded-For header or detected server-side
            // Fingerprint detection is deferred — scan bot detection uses IP-based detection initially
            runAbuseDetection(slug, 'scan', {
              slug,
              os,
              ip: (window as any).__QR_SCAN_IP__ || 'unknown',
            });
          });

        // Increment scan count
        supabase
          .rpc('increment_scan_count', { qr_id: slug })
          .then(({ error: rpcError }) => {
            if (rpcError) console.error('Failed to increment scan count:', rpcError);
          });

        // Redirect based on type
        const content = qrCode.content as Record<string, unknown>;

        switch (qrCode.type) {
          case 'url':
            if (content.url) {
              window.location.href = content.url as string;
            } else {
              setError('No URL found in QR code');
            }
            break;
          case 'email':
            window.location.href = `mailto:${content.email as string}`;
            break;
          case 'phone':
            window.location.href = `tel:${content.phone as string}`;
            break;
          case 'sms':
            window.location.href = `sms:${content.number as string}`;
            break;
          case 'location':
            window.location.href = `https://www.google.com/maps?q=${content.latitude},${content.longitude}`;
            break;
          default:
            setError('Unsupported QR code type');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load QR code');
      }
    };

    handleRedirect();
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-block p-4 bg-red-50 rounded-lg mb-4 border border-red-200">
            <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">QR Code Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block p-4 bg-white rounded-lg mb-4 border border-gray-200 shadow-sm">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Redirecting...</h2>
        <p className="text-gray-600">Processing QR code: {slug}</p>
      </div>
    </div>
  );
}
