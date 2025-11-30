import React from 'react';
import { Circle, Square, Diamond } from 'lucide-react';

interface ShapeIndicatorProps {
  type: 'dots' | 'corners';
  shape: string;
  label?: string;
  className?: string;
}

// Shape visual representations based on QR code styling types
const getShapeVisual = (type: 'dots' | 'corners', shape: string) => {
  switch (type) {
    case 'dots':
      switch (shape) {
        case 'rounded':
          return <Circle className="w-full h-full" />;
        case 'dots':
          return (
            <div className="grid grid-cols-2 gap-0.5 p-1">
              <Circle className="w-full h-full" />
              <Circle className="w-full h-full" />
            </div>
          );
        case 'classy':
          return (
            <div className="relative w-full h-full">
              <Circle className="absolute inset-0 m-1" />
            </div>
          );
        case 'classy-rounded':
          return (
            <div className="relative w-full h-full">
              <Circle className="absolute inset-0 m-0.5 rounded-full" />
            </div>
          );
        case 'square':
          return <Square className="w-full h-full" />;
        case 'extra-rounded':
          return (
            <div className="relative w-full h-full">
              <Square className="w-full h-full rounded-lg" />
            </div>
          );
        default:
          return <Circle className="w-full h-full" />;
      }
    case 'corners':
      switch (shape) {
        case 'dot':
          return <Circle className="w-full h-full" />;
        case 'square':
          return <Square className="w-full h-full" />;
        case 'extra-rounded':
          return (
            <div className="relative w-full h-full">
              <Square className="w-full h-full rounded-lg" />
            </div>
          );
        default:
          return <Square className="w-full h-full" />;
      }
    default:
      return <Circle className="w-full h-full" />;
  }
};

const getShapeName = (shape: string): string => {
  return shape.charAt(0).toUpperCase() + shape.slice(1);
};

export default function ShapeIndicator({
  type,
  shape,
  label,
  className = '',
}: ShapeIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-6 h-6 text-purple-400 flex items-center justify-center border border-white/20 rounded p-1 bg-black/30">
        {getShapeVisual(type, shape)}
      </div>
      {label && (
        <span className="text-gray-400 text-xs">{label}:</span>
      )}
      <span className="text-white text-sm font-medium">
        {getShapeName(shape)}
      </span>
    </div>
  );
}