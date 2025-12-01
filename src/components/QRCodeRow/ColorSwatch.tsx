interface ColorSwatchProps {
  color: string;
  label?: string;
  size?: 'tiny' | 'small' | 'medium';
  showHex?: boolean;
  className?: string;
}

export default function ColorSwatch({
  color,
  label,
  size = 'medium',
  showHex = true,
  className = '',
}: ColorSwatchProps) {
  const sizeClasses = {
    tiny: 'w-3 h-3 text-xs',
    small: 'w-4 h-4 text-xs',
    medium: 'w-6 h-6 text-sm',
  };

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded border-2 border-white/20 shadow-inner flex-shrink-0 relative overflow-hidden bg-white`}
        style={{
          backgroundColor: color || '#000000',
          minWidth: sizeClasses[size].split(' ')[0],
          minHeight: sizeClasses[size].split(' ')[1],
        }}
        title={color}
      >
        {color && (
          <div
            className="absolute inset-0 border border-white/30 opacity-0"
            style={{ backgroundColor: color }}
          />
        )}
      </div>
      {label && (
        <span className="text-gray-400 text-xs whitespace-nowrap flex-shrink-0">{label}:</span>
      )}
      {showHex && (
        <span className="text-white text-xs font-mono bg-black/30 px-2 py-1 rounded whitespace-nowrap min-w-0">
          {color || '#000000'}
        </span>
      )}
    </div>
  );
}