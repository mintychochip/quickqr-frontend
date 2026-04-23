import { useState } from 'react';
import { Share2, Link2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// Social icons as inline SVGs since lucide-react v1.x removed brand icons
function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function SocialShare({ qrUrl, qrName }: { qrUrl: string; qrName: string }) {
  const [copied, setCopied] = useState(false);
  const shareText = `Check out this QR code: ${qrName}`;
  
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(qrUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(qrUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(qrUrl)}`,
  };

  const copyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem' }}>
      <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Share2 size={18} />
        Share QR Code
      </h3>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem', background: '#000000', color: 'white', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', textDecoration: 'none' }}>
          <XIcon size={16} /> X
        </a>
        <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem', background: '#4267B2', color: 'white', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', textDecoration: 'none' }}>
          <FacebookIcon size={16} /> Facebook
        </a>
        <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem', background: '#0077b5', color: 'white', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', textDecoration: 'none' }}>
          <LinkedInIcon size={16} /> LinkedIn
        </a>
        <button onClick={copyLink} style={{ padding: '0.5rem', background: '#14b8a6', color: 'white', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>
          {copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}
