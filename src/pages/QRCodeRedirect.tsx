import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE_URL = 'https://artemis.cs.csub.edu/~jlo';

interface RedirectResponse {
  type: string;
  content: string;
  contentDecoded: {
    url?: string;
    [key: string]: any;
  };
  scanid?: number;
}

interface ClientDetails {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timezone: string;
  referrer: string;
  timestamp: string;
}

// Function to get client details
const getClientDetails = (): ClientDetails => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
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
  const [success, setSuccess] = useState<string | null>(null);
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
        console.log('Client details:', clientDetails);
        console.log('Fetching redirect for QR code:', slug);

        // Send client details in POST body
        const response = await fetch(`${API_BASE_URL}/redirect.php?qrcodeid=${slug}`, {
          method: 'POST',
          credentials: 'include',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientDetails: clientDetails,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: RedirectResponse = await response.json();
        console.log('Redirect response:', data);
        console.log('Scan recorded with ID:', data.scanid);

        // Handle different content types
        switch (data.type) {
          case 'url':
            if (data.contentDecoded?.url) {
              console.log('Redirecting to URL:', data.contentDecoded.url);
              window.location.href = data.contentDecoded.url;
            } else {
              setError('Invalid URL format');
            }
            break;

          case 'text':
            if (data.contentDecoded?.text) {
              console.log('Displaying text:', data.contentDecoded.text);
              // For text, we'll show it to the user instead of redirecting
              setError(null); // Clear any errors
              // TODO: Create a text display component
              alert(data.contentDecoded.text); // Temporary solution
            } else {
              setError('Invalid text format');
            }
            break;

          case 'email':
            if (data.contentDecoded?.email) {
              const mailtoUrl = `mailto:${data.contentDecoded.email}${
                data.contentDecoded.subject ? `?subject=${encodeURIComponent(data.contentDecoded.subject)}` : ''
              }${
                data.contentDecoded.body
                  ? `${data.contentDecoded.subject ? '&' : '?'}body=${encodeURIComponent(data.contentDecoded.body)}`
                  : ''
              }`;
              console.log('Opening email client:', mailtoUrl);
              window.location.href = mailtoUrl;
              // Show success message since mailto doesn't navigate away
              setTimeout(() => {
                setSuccess(`Opening email to ${data.contentDecoded.email}...`);
              }, 500);
            } else {
              setError('Invalid email format');
            }
            break;

          case 'phone':
            if (data.contentDecoded?.phone) {
              console.log('Opening phone dialer:', data.contentDecoded.phone);
              window.location.href = `tel:${data.contentDecoded.phone}`;
              // Show success message since tel doesn't navigate away
              setTimeout(() => {
                setSuccess(`Opening phone dialer for ${data.contentDecoded.phone}...`);
              }, 500);
            } else {
              setError('Invalid phone format');
            }
            break;

          case 'sms':
            if (data.contentDecoded?.number) {
              const smsUrl = `sms:${data.contentDecoded.number}${
                data.contentDecoded.message ? `?body=${encodeURIComponent(data.contentDecoded.message)}` : ''
              }`;
              console.log('Opening SMS app:', smsUrl);
              window.location.href = smsUrl;
              // Show success message since sms doesn't navigate away
              setTimeout(() => {
                setSuccess(`Opening SMS to ${data.contentDecoded.number}...`);
              }, 500);
            } else {
              setError('Invalid SMS format');
            }
            break;

          case 'vcard':
          case 'mecard':
            // These will typically be downloaded or displayed
            console.log('Contact card data:', data.contentDecoded);
            alert('Contact card - download functionality coming soon');
            break;

          case 'location':
            if (data.contentDecoded?.latitude && data.contentDecoded?.longitude) {
              const mapsUrl = `https://www.google.com/maps?q=${data.contentDecoded.latitude},${data.contentDecoded.longitude}`;
              console.log('Opening maps:', mapsUrl);
              window.location.href = mapsUrl;
            } else {
              setError('Invalid location format');
            }
            break;

          case 'wifi':
            // WiFi credentials - show to user
            console.log('WiFi credentials:', data.contentDecoded);
            alert(`WiFi Network: ${data.contentDecoded?.ssid || 'Unknown'}`);
            break;

          case 'event':
            // Calendar event - could create .ics file
            console.log('Event data:', data.contentDecoded);
            alert('Calendar event - download functionality coming soon');
            break;

          default:
            setError('Unsupported QR code type');
        }
      } catch (error) {
        console.error('Error fetching redirect URL:', error);
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

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-block p-4 bg-green-600/20 rounded-lg mb-4">
            <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
          <p className="text-gray-400 mb-4">{success}</p>
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
