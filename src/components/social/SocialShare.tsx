import { useState } from 'react';
import { Share2, Twitter, Facebook, Linkedin, Link2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

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
        <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem', background: '#1da1f2', color: 'white', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', textDecoration: 'none' }}>
          <Twitter size={16} /> Twitter
        </a>
        <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem', background: '#4267B2', color: 'white', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', textDecoration: 'none' }}>
          <Facebook size={16} /> Facebook
        </a>
        <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem', background: '#0077b5', color: 'white', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', textDecoration: 'none' }}>
          <Linkedin size={16} /> LinkedIn
        </a>
        <button onClick={copyLink} style={{ padding: '0.5rem', background: '#14b8a6', color: 'white', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>
          {copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}
