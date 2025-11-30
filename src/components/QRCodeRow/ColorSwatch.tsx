interface ColorSwatchProps {
  color: string;
  label?: string;
  size?: 'small' | 'medium';
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
    small: 'w-4 h-4 text-xs',
    medium: 'w-6 h-6 text-sm',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded border-2 border-white/20 shadow-inner flex-shrink-0 relative overflow-hidden bg-white`}
        style={{
          backgroundColor: color || '#000000',
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
        <span className="text-gray-400 text-xs">{label}:</span>
      )}
      {showHex && (
        <span className="text-white text-xs font-mono bg-black/30 px-2 py-1 rounded">
          {color || '#000000'}
        </span>
      )}
    </div>
  );
}