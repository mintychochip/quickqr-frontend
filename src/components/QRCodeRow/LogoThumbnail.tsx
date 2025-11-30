import { useState } from 'react';
import { ImageIcon, ExternalLink } from 'lucide-react';

interface LogoThumbnailProps {
  url: string;
  size: number;
  margin: number;
  label?: string;
  showThumbnail?: boolean;
  className?: string;
}

export default function LogoThumbnail({
  url,
  size,
  margin,
  label,
  showThumbnail = false,
  className = '',
}: LogoThumbnailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showImage, setShowImage] = useState(false);

  // Show thumbnail when user explicitly requests or when section is expanded
  const shouldShowImage = showThumbnail || showImage;

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const toggleImage = () => {
    setShowImage(!showImage);
  };

  // Extract filename from URL
  const getFilename = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'logo.png';
      return filename.length > 20 ? filename.substring(0, 17) + '...' : filename;
    } catch {
      return url.length > 30 ? url.substring(0, 27) + '...' : url || 'logo.png';
    }
  };

  const formatSize = (size: number): string => {
    return `${Math.round(size * 100)}%`;
  };

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="w-8 h-8 flex items-center justify-center text-purple-400">
        <ImageIcon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        {label && (
          <span className="text-gray-400 text-xs block mb-1">{label}:</span>
        )}
        <div className="space-y-1">
          {/* File information */}
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-white text-sm font-medium truncate block">
                {getFilename(url)}
              </span>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>Size: {formatSize(size)}</span>
                <span>Margin: {margin}px</span>
              </div>
            </div>
          </div>

          {/* Toggle thumbnail button */}
          {url && (
            <button
              onClick={toggleImage}
              className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1 transition-colors"
            >
              {shouldShowImage ? 'Hide Preview' : 'Show Preview'}
            </button>
          )}

          {/* Thumbnail preview */}
          {shouldShowImage && url && !imageError && (
            <div className="mt-2 relative">
              <div className="relative inline-block bg-black/50 rounded-lg p-2 border border-white/10">
                <img
                  src={url}
                  alt="Logo preview"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className="max-w-[120px] max-h-[60px] object-contain"
                  style={{ maxHeight: '60px' }}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                    <div className="text-white text-xs">Loading...</div>
                  </div>
                )}
                {imageError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                    <div className="text-red-400 text-xs text-center">Failed to load</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}