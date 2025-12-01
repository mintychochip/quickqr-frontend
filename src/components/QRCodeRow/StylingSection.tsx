import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface StylingSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  compact?: boolean;
  className?: string;
}

export default function StylingSection({
  title,
  children,
  defaultExpanded = false,
  compact = false,
  className = '',
}: StylingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const containerClasses = compact
    ? 'bg-black/30 rounded-lg border border-white/10'
    : 'bg-black/30 rounded-lg border border-white/10';

  const buttonClasses = compact
    ? 'w-full px-3 py-2 flex items-center justify-between text-left hover:bg-white/5 transition-colors'
    : 'w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors';

  const titleClasses = compact
    ? 'text-white font-semibold text-sm'
    : 'text-white font-semibold';

  const contentClasses = compact
    ? 'p-3 pt-0'
    : 'p-4 pt-0';

  return (
    <div className={`${containerClasses} ${className}`}>
      <button
        onClick={toggleExpanded}
        className={buttonClasses}
      >
        <span className={titleClasses}>{title}</span>
        <div className="flex items-center gap-2 text-purple-400">
          <span className="text-xs">
            {isExpanded ? 'Click to collapse' : 'Click to expand'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={contentClasses}>
          {children}
        </div>
      </div>
    </div>
  );
}