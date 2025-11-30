import React from 'react';

interface GradientPreviewProps {
  type: 'linear' | 'radial';
  color1: string;
  color2: string;
  label?: string;
  size?: 'small' | 'medium';
  showColors?: boolean;
  className?: string;
}

export default function GradientPreview({
  type,
  color1,
  color2,
  label,
  size = 'medium',
  showColors = true,
  className = '',
}: GradientPreviewProps) {
  const sizeClasses = {
    small: 'w-4 h-4 text-xs',
    medium: 'w-6 h-6 text-sm',
  };

  const gradientStyle = {
    background: type === 'linear'
      ? `linear-gradient(90deg, ${color1}, ${color2})`
      : `radial-gradient(circle, ${color1}, ${color2})`,
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded border-2 border-white/20 shadow-inner flex-shrink-0 relative overflow-hidden`}
        style={gradientStyle}
        title={`${type === 'linear' ? 'Linear' : 'Radial'} gradient: ${color1} → ${color2}`}
      >
        <div className="absolute inset-0 border border-white/30 opacity-0" />
      </div>
      {label && (
        <span className="text-gray-400 text-xs">{label}:</span>
      )}
      {showColors && (
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 text-xs">
            <div
              className="w-3 h-3 rounded border border-white/20 flex-shrink-0"
              style={{ backgroundColor: color1 }}
              title={`Color 1: ${color1}`}
            />
            <span className="text-gray-500 font-mono text-xs">
              {color1?.substring(1, 4).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div
              className="w-3 h-3 rounded border border-white/20 flex-shrink-0"
              style={{ backgroundColor: color2 }}
              title={`Color 2: ${color2}`}
            />
            <span className="text-gray-500 font-mono text-xs">
              {color2?.substring(1, 4).toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}