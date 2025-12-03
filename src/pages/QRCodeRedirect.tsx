import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://artemis.cs.csub.edu/~quickqr';

interface RedirectResponse {
  type: string;
  content: string;
  contentDecoded: {
    [key: string]: any;
  };
  scanid: string | number;
  redirect: string;
}

interface ClientDetails {
  userAgent: string;
  platform: string;
  operating_system: string;
  language: string;
  screenResolution: string;
  timezone: string;
  referrer: string;
  timestamp: string;
}

// Function to detect operating system from user agent
const detectOperatingSystem = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();

  // Check for Windows first (most specific)
  if (userAgent.includes('windows nt') || userAgent.includes('win32') || userAgent.includes('win64') || platform.includes('win')) {
    return 'Windows';
  }

  // Check for macOS
  if (userAgent.includes('mac os') || userAgent.includes('macintosh') || platform.includes('mac')) {
    return 'macOS';
  }

  // Check for Android (must be before Linux since Android UA contains 'Linux')
  if (userAgent.includes('android')) {
    return 'Android';
  }

  // Check for iOS devices
  if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
    return 'iOS';
  }

  // Check for Linux (most specific patterns to avoid false positives)
  if (userAgent.includes('linux x86_64') || userAgent.includes('linux i686') ||
      (userAgent.includes('linux') && !userAgent.includes('android') && platform.includes('linux'))) {
    return 'Linux';
  }

  return 'Unknown';
};

// Function to get client details
const getClientDetails = (): ClientDetails => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    operating_system: detectOperatingSystem(),
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer,
    timestamp: new Date().toISOString(),
  };
};

export default function QRCodeRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);
  const hasExecuted = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const fetchRedirectUrl = async () => {
      if (!slug) {
        setError('Invalid QR code');
        return;
      }

      try {
        const clientDetails = getClientDetails();

        // Send client details and operating_system in POST body
        const response = await fetch(`${API_BASE_URL}/redirect.php`, {
          method: 'POST',
          credentials: 'include',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            qrcodeid: slug,
            operating_system: clientDetails.operating_system,
            clientDetails: clientDetails,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: RedirectResponse = await response.json();

        // Use the redirect URL provided by the PHP script
        if (data.redirect) {
          window.location.href = data.redirect;
        } else {
          setError('Invalid redirect URL received');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load QR code');
      }
    };

    fetchRedirectUrl();
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-block p-4 bg-red-600/20 rounded-lg mb-4">
            <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">QR Code Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block p-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg mb-4">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Redirecting...</h2>
        <p className="text-gray-400">Processing QR code: {slug}</p>
      </div>
    </div>
  );
}
