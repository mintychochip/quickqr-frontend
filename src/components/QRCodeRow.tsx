import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { QrCode, Download, Settings, ChevronDown, Trash2 } from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import ColorSwatch from './QRCodeRow/ColorSwatch';
import ShapeIndicator from './QRCodeRow/ShapeIndicator';
import LogoThumbnail from './QRCodeRow/LogoThumbnail';
import StylingSection from './QRCodeRow/StylingSection';

// SelectDropdown component for styling options
interface SelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

function SelectDropdown({ value, onChange, options, className = '' }: SelectDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-black border border-white/20 rounded text-white text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent ${className}`}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// ColorPicker component
interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-white/20 cursor-pointer bg-transparent"
        title={label}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-black border border-white/20 rounded text-white text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
        placeholder="#000000"
      />
    </div>
  );
}

interface QRCodeRowProps {
  qr: {
    id: number;
    qrcodeid?: string;
    name: string;
    url: string;
    scans: number;
    created: string;
    status: string;
    content: string;
    type: string;
    styling: string | null;
  };
  formatDate: (dateString: string) => string;
  onDelete?: (qrId: string | number) => void;
}

// EditableField component for inline editing
interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
  onEditToggle: () => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'tel';
  validation?: (value: string) => string | null;
}

function EditableField({
  value,
  onChange,
  onSave,
  onCancel,
  isEditing,
  onEditToggle,
  placeholder = '',
  type = 'text',
  validation
}: EditableFieldProps) {
  const [tempValue, setTempValue] = useState(value);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset temp value when the actual value changes externally
  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleEdit = () => {
    onEditToggle();
    setTempValue(value);
    setValidationError(null);
  };

  const handleSave = () => {
    if (validation) {
      const error = validation(tempValue);
      if (error) {
        setValidationError(error);
        return;
      }
    }
    onChange(tempValue);
    onSave();
  };

  const handleCancel = () => {
    setTempValue(value);
    setValidationError(null);
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Escape is now handled globally
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 flex-1 editable-field-container">
        <input
          type={type}
          value={tempValue}
          onChange={(e) => {
            setTempValue(e.target.value);
            if (validationError) {
              setValidationError(null);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex-1 px-3 py-1.5 bg-black border ${
            validationError ? 'border-red-500' : 'border-white/20'
          } rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent`}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium text-white transition-colors"
          title="Save"
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs font-medium text-white transition-colors"
          title="Cancel"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleEdit}
      className="cursor-text rounded px-2 py-1 flex-1 text-white font-medium"
      title="Click to edit"
      data-editable-field
    >
      {value || <span className="text-gray-500">{placeholder}</span>}
    </div>
  );
}

export default function QRCodeRow({ qr, formatDate, onDelete }: QRCodeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  // const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const qrRefDesktop = useRef<HTMLDivElement>(null);
  const qrRefTablet = useRef<HTMLDivElement>(null);
  const qrRefMobile = useRef<HTMLDivElement>(null);
  const qrCodeRefDesktop = useRef<any>(null);
  const qrCodeRefTablet = useRef<any>(null);
  const qrCodeRefMobile = useRef<any>(null);

  // Parse QR styling properties from the database or use defaults
  const qrStylingProps = (() => {
    const defaults = {
      dotsType: 'rounded' as const,
      dotsColor: '#8b5cf6',
      dotsGradient: true,
      dotsGradientColor1: '#6366f1',
      dotsGradientColor2: '#3b82f6',
      bgColor: '#ffffff',
      cornerSquareType: 'extra-rounded' as const,
      cornerSquareColor: '#8b5cf6',
      cornersGradient: false,
      cornersGradientType: 'linear' as const,
      cornersGradientColor1: '#8b5cf6',
      cornersGradientColor2: '#3b82f6',
      cornerDotType: 'dot' as const,
      cornerDotColor: '#8b5cf6',
      logoUrl: '',
    };

    console.log('QR Code styling raw data:', qr.styling, typeof qr.styling);

    if (!qr.styling) return defaults;

    try {
      const parsed = JSON.parse(qr.styling);
      console.log('QR Code styling parsed:', parsed);
      return { ...defaults, ...parsed };
    } catch (e) {
      console.error('Error parsing styling:', e, 'Raw styling:', qr.styling);
      return defaults;
    }
  })();

  // Smart section expansion logic based on styling complexity and usage
  // Memoized for performance - only recalculates when styling props change
  /*
  const sectionExpansion = useMemo(() => {
    const colorsAndGradientsExpanded = !!(
      qrStylingProps.dotsGradient ||
      qrStylingProps.cornersGradient ||
      qrStylingProps.backgroundGradient ||
      qrStylingProps.dotsColor !== '#000000' ||
      qrStylingProps.cornersColor !== '#000000' ||
      qrStylingProps.backgroundColor !== '#FFFFFF'
    );

    const shapesAndStylesExpanded = !!(
      qrStylingProps.dotsType !== 'rounded' ||
      qrStylingProps.cornerSquareType !== 'square' ||
      qrStylingProps.cornerDotType !== 'dot' ||
      qrStylingProps.dotRotation ||
      qrStylingProps.cornersDotType ||
      qrStylingProps.cornersSquareGradient
    );

    const logoAndImagesExpanded = !!(
      qrStylingProps.image ||
      qrStylingProps.imageBackground ||
      qrStylingProps.imageBackgroundColor ||
      qrStylingProps.imageMargin !== 0 ||
      qrStylingProps.imageSize !== 0.4
    );

    const advancedSettingsExpanded = !!(
      qrStylingProps.errorCorrectionLevel !== 'H' ||
      qrStylingProps.frame ||
      qrStylingProps.margin !== 0 ||
      qrStylingProps.borderRadius ||
      qrStylingProps.drawSquares ||
      qrStylingProps.drawCircles
    );

    // Count total customizations to determine if this is a heavily customized QR code
    const customizationsCount = [
      colorsAndGradientsExpanded,
      shapesAndStylesExpanded,
      logoAndImagesExpanded,
      advancedSettingsExpanded
    ].filter(Boolean).length;

    // Auto-expand more sections for highly customized QR codes
    const shouldExpandMore = customizationsCount >= 2;

    return {
      colorsAndGradients: colorsAndGradientsExpanded || shouldExpandMore,
      shapesAndStyles: shapesAndStylesExpanded || shouldExpandMore,
      logoAndImages: logoAndImagesExpanded,
      advancedSettings: advancedSettingsExpanded || shouldExpandMore,
    };
  }, [
    qrStylingProps.dotsGradient,
    qrStylingProps.cornersGradient,
    qrStylingProps.backgroundGradient,
    qrStylingProps.dotsColor,
    qrStylingProps.cornersColor,
    qrStylingProps.backgroundColor,
    qrStylingProps.dotsType,
    qrStylingProps.cornerSquareType,
    qrStylingProps.cornerDotType,
    qrStylingProps.dotRotation,
    qrStylingProps.cornersDotType,
    qrStylingProps.cornersSquareGradient,
    qrStylingProps.image,
    qrStylingProps.imageBackground,
    qrStylingProps.imageBackgroundColor,
    qrStylingProps.imageMargin,
    qrStylingProps.imageSize,
    qrStylingProps.errorCorrectionLevel,
    qrStylingProps.frame,
    qrStylingProps.margin,
    qrStylingProps.borderRadius,
    qrStylingProps.drawSquares,
    qrStylingProps.drawCircles
  ]);
  */

  const handleToggle = () => {
    if (isToggling) return;
    setIsToggling(true);
    setIsExpanded(!isExpanded);
    setTimeout(() => {
      setIsToggling(false);
    }, 300);
  };

  // Generate QR code data based on type and content
  const generateQRData = (): string => {
    // All QR codes should redirect through our redirect endpoint
    return `https://quickqr-frontend.vercel.app/code/${qr.qrcodeid}`;
  };

  // Parse QR content for editing
  const parsedContent = useMemo(() => {
    try {
      return JSON.parse(qr.content);
    } catch (e) {
      return {};
    }
  }, [qr.content]);

  // Field editing handlers
  const startEditingField = (fieldKey: string) => {
    setEditingField(fieldKey);
  };

  const stopEditingField = () => {
    setEditingField(null);
  };

  const updateFieldValue = (fieldKey: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Removed backend save functionality - fields are now local only

  const saveField = (fieldKey: string, value: string) => {
    updateFieldValue(fieldKey, value);
  };

  // Helper function to get current field value from QR data
  const getCurrentFieldValue = (fieldKey: string): string => {
    if (fieldKey === 'name') {
      return qr.name || '';
    } else if (fieldKey.startsWith('content.')) {
      const contentField = fieldKey.replace('content.', '');
      return parsedContent[contentField] || '';
    } else if (fieldKey.startsWith('styling.')) {
      const stylingField = fieldKey.replace('styling.', '');
      const value = qrStylingProps[stylingField as keyof typeof qrStylingProps];
      return value?.toString() || '';
    }
    return '';
  };

  // Local styling state for immediate updates
  const [localStylingProps, setLocalStylingProps] = useState(qrStylingProps);
  const [qrRegenerationKey, setQrRegenerationKey] = useState(0); // Force regeneration key
  const [hasLocalModifications, setHasLocalModifications] = useState(false); // Track if user made changes

  // Update local styling when qr changes (but only if user hasn't made local changes)
  useEffect(() => {
    if (!hasLocalModifications) {
      console.log('🔄 Resetting localStylingProps from qrStylingProps (no local modifications)');
      setLocalStylingProps(qrStylingProps);
    }
  }, [qrStylingProps, hasLocalModifications]);

  // Handle styling field updates (local only)
  const updateStylingField = useCallback((fieldKey: string, value: any) => {
    const stylingKey = fieldKey.replace('styling.', '');

    console.log('🎨 Updating styling field:', stylingKey, 'to:', value);

    // Mark that we have local modifications to prevent auto-reset
    setHasLocalModifications(true);

    // Normalize color values (ensure they start with #)
    let normalizedValue = value;
    if (stylingKey.includes('Color') && typeof value === 'string') {
      if (!value.startsWith('#')) {
        normalizedValue = '#' + value;
        console.log('🎨 Normalized color from', value, 'to', normalizedValue);
      }
    }

    // Use functional update to get the latest state and avoid dependency cycles
    setLocalStylingProps((prev: typeof qrStylingProps) => {
      const newStyling = {
        ...prev,
        [stylingKey]: normalizedValue
        };

      // Auto-disable gradient when changing solid colors
      if (stylingKey === 'dotsColor' && prev.dotsGradient) {
        newStyling.dotsGradient = false;
        console.log('🎨 Auto-disabled dots gradient to apply solid color');
      }
      if (stylingKey === 'cornerSquareColor' && prev.cornersGradient) {
        newStyling.cornersGradient = false;
        console.log('🎨 Auto-disabled corners gradient to apply solid color');
      }

      console.log('🎨 New localStylingProps:', newStyling);
      return newStyling;
    });

    // Also update fieldValues for input state
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: normalizedValue
    }));

    // Force QR code regeneration by incrementing the key
    setQrRegenerationKey(prev => {
      const newKey = prev + 1;
      console.log('🔄 Triggered QR code regeneration, key:', newKey);
      return newKey;
    });
  }, []); // No dependencies to prevent infinite loops

  // Removed backend save functionality - styling is now local only

  // Handle clicks outside to save and close editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingField) {
        const target = event.target as Element;
        // If clicked on something that's not part of the current editing interface
        if (!target.closest('.editable-field-container') &&
            !target.closest('input') &&
            !target.closest('button')) {
          // Save the current value and close editing
          const currentValue = fieldValues[editingField] || getCurrentFieldValue(editingField);
          if (currentValue) {
            saveField(editingField, currentValue);
          }
          stopEditingField();
        }
      }
    };

    // Handle Escape key to cancel editing
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && editingField) {
        stopEditingField();
      }
    };

    if (editingField) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [editingField, fieldValues]);

  // Create compact details content
  const renderCompactDetails = (isCompact = false) => (
    <>
      {/* Compact Details Section */}
      <div className={`${isCompact ? 'space-y-3' : 'space-y-4'}`}>
        <h4 className={`${isCompact ? 'text-base' : 'text-lg'} font-semibold text-white mb-3`}>Details</h4>

        {/* Compact Basic Details */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs min-w-[60px]">Name</span>
            <EditableField
              value={fieldValues['name'] || qr.name}
              onChange={(value) => saveField('name', value)}
              onSave={stopEditingField}
              onCancel={stopEditingField}
              isEditing={editingField === 'name'}
              onEditToggle={() => startEditingField('name')}
              placeholder="Enter QR code name"
              validation={(value) => {
                if (!value.trim()) return 'Name is required';
                if (value.length > 100) return 'Name too long';
                return null;
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs min-w-[60px]">Scans</span>
            <span className="text-white font-medium">{qr.scans.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs min-w-[60px]">Created</span>
            <span className="text-white font-medium">{formatDate(qr.created)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs min-w-[60px]">Status</span>
            <span className="text-green-400 font-medium capitalize">{qr.status}</span>
          </div>
        </div>
      </div>

      {/* Compact Content Section */}
      <div className={`${isCompact ? 'space-y-2' : 'space-y-3'}`}>
        <h5 className="text-sm font-semibold text-white mb-2">Content</h5>
        {(() => {
          try {
            const contentDecoded = JSON.parse(qr.content);
            switch (qr.type) {
              case 'url':
                return (
                  <div className="bg-black/30 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-[30px]">URL</span>
                      <EditableField
                        value={fieldValues['content.url'] || contentDecoded.url || ''}
                        onChange={(value) => saveField('content.url', value)}
                        onSave={stopEditingField}
                        onCancel={stopEditingField}
                        isEditing={editingField === 'content.url'}
                        onEditToggle={() => startEditingField('content.url')}
                        placeholder="Enter URL"
                        type="url"
                        validation={(value) => {
                          if (!value.trim()) return 'URL is required';
                          try {
                            new URL(value);
                            return null;
                          } catch {
                            return 'Invalid URL format';
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              case 'email':
                return (
                  <div className="bg-black/30 rounded-lg p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-[30px]">Email</span>
                      <EditableField
                        value={fieldValues['content.email'] || contentDecoded.email || ''}
                        onChange={(value) => saveField('content.email', value)}
                        onSave={stopEditingField}
                        onCancel={stopEditingField}
                        isEditing={editingField === 'content.email'}
                        onEditToggle={() => startEditingField('content.email')}
                        placeholder="Enter email address"
                        type="email"
                        validation={(value) => {
                          if (!value.trim()) return 'Email is required';
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
                          return null;
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-[30px]">Subj</span>
                      <EditableField
                        value={fieldValues['content.subject'] || contentDecoded.subject || ''}
                        onChange={(value) => saveField('content.subject', value)}
                        onSave={stopEditingField}
                        onCancel={stopEditingField}
                        isEditing={editingField === 'content.subject'}
                        onEditToggle={() => startEditingField('content.subject')}
                        placeholder="Enter subject (optional)"
                        validation={(value) => {
                          if (value.length > 200) return 'Subject too long';
                          return null;
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-[30px]">Body</span>
                      <EditableField
                        value={fieldValues['content.body'] || contentDecoded.body || ''}
                        onChange={(value) => saveField('content.body', value)}
                        onSave={stopEditingField}
                        onCancel={stopEditingField}
                        isEditing={editingField === 'content.body'}
                        onEditToggle={() => startEditingField('content.body')}
                        placeholder="Enter email body (optional)"
                        validation={(value) => {
                          if (value.length > 1000) return 'Body too long';
                          return null;
                        }}
                      />
                    </div>
                  </div>
                );
              case 'phone':
                return (
                  <div className="bg-black/30 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-[30px]">Phone</span>
                      <EditableField
                        value={fieldValues['content.phone'] || contentDecoded.phone || ''}
                        onChange={(value) => saveField('content.phone', value)}
                        onSave={stopEditingField}
                        onCancel={stopEditingField}
                        isEditing={editingField === 'content.phone'}
                        onEditToggle={() => startEditingField('content.phone')}
                        placeholder="Enter phone number"
                        type="tel"
                        validation={(value) => {
                          if (!value.trim()) return 'Phone number is required';
                          if (!/^[\d\s\-\+\(\)]+$/.test(value)) return 'Invalid phone format';
                          return null;
                        }}
                      />
                    </div>
                  </div>
                );
              case 'sms':
                return (
                  <div className="bg-black/30 rounded-lg p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-[30px]">Number</span>
                      <EditableField
                        value={fieldValues['content.number'] || contentDecoded.number || ''}
                        onChange={(value) => saveField('content.number', value)}
                        onSave={stopEditingField}
                        onCancel={stopEditingField}
                        isEditing={editingField === 'content.number'}
                        onEditToggle={() => startEditingField('content.number')}
                        placeholder="Enter phone number"
                        type="tel"
                        validation={(value) => {
                          if (!value.trim()) return 'Phone number is required';
                          if (!/^[\d\s\-\+\(\)]+$/.test(value)) return 'Invalid phone format';
                          return null;
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-[30px]">Msg</span>
                      <EditableField
                        value={fieldValues['content.message'] || contentDecoded.message || ''}
                        onChange={(value) => saveField('content.message', value)}
                        onSave={stopEditingField}
                        onCancel={stopEditingField}
                        isEditing={editingField === 'content.message'}
                        onEditToggle={() => startEditingField('content.message')}
                        placeholder="Enter SMS message (optional)"
                        validation={(value) => {
                          if (value.length > 160) return 'Message too long (160 chars max)';
                          return null;
                        }}
                      />
                    </div>
                  </div>
                );
              case 'text':
                return (
                  <div className="bg-black/30 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-[30px]">Text</span>
                      <EditableField
                        value={fieldValues['content.text'] || contentDecoded.text || ''}
                        onChange={(value) => saveField('content.text', value)}
                        onSave={stopEditingField}
                        onCancel={stopEditingField}
                        isEditing={editingField === 'content.text'}
                        onEditToggle={() => startEditingField('content.text')}
                        placeholder="Enter text content"
                        validation={(value) => {
                          if (!value.trim()) return 'Text is required';
                          if (value.length > 500) return 'Text too long';
                          return null;
                        }}
                      />
                    </div>
                  </div>
                );
              case 'vcard':
              case 'mecard':
                return (
                  <div className="bg-black/30 rounded-lg p-3 text-sm space-y-2">
                    {contentDecoded.name && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">Name</span>
                        <span className="text-white flex-1">{contentDecoded.name}</span>
                      </div>
                    )}
                    {contentDecoded.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">Phone</span>
                        <span className="text-white flex-1">{contentDecoded.phone}</span>
                      </div>
                    )}
                    {contentDecoded.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">Email</span>
                        <span className="text-white flex-1">{contentDecoded.email}</span>
                      </div>
                    )}
                    {contentDecoded.org && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">Org</span>
                        <span className="text-white flex-1">{contentDecoded.org}</span>
                      </div>
                    )}
                    {contentDecoded.url && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">Web</span>
                        <span className="text-white break-all flex-1">{contentDecoded.url}</span>
                      </div>
                    )}
                  </div>
                );
              case 'location':
                return (
                  <div className="bg-black/30 rounded-lg p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-[30px]">Lat</span>
                      <span className="text-white flex-1">{contentDecoded.latitude}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs min-w-[30px]">Lng</span>
                      <span className="text-white flex-1">{contentDecoded.longitude}</span>
                    </div>
                  </div>
                );
              case 'wifi':
                return (
                  <div className="bg-black/30 rounded-lg p-3 text-sm space-y-2">
                    {contentDecoded.ssid && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">SSID</span>
                        <span className="text-white flex-1">{contentDecoded.ssid}</span>
                      </div>
                    )}
                    {contentDecoded.encryption && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">Sec</span>
                        <span className="text-white flex-1">{contentDecoded.encryption}</span>
                      </div>
                    )}
                    {contentDecoded.password && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">Pass</span>
                        <span className="text-white flex-1">{contentDecoded.password}</span>
                      </div>
                    )}
                  </div>
                );
              case 'event':
                return (
                  <div className="bg-black/30 rounded-lg p-3 text-sm space-y-2">
                    {contentDecoded.title && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">Title</span>
                        <span className="text-white flex-1">{contentDecoded.title}</span>
                      </div>
                    )}
                    {contentDecoded.location && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">Where</span>
                        <span className="text-white flex-1">{contentDecoded.location}</span>
                      </div>
                    )}
                    {contentDecoded.start && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">Start</span>
                        <span className="text-white flex-1">{contentDecoded.start}</span>
                      </div>
                    )}
                    {contentDecoded.end && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs min-w-[30px]">End</span>
                        <span className="text-white flex-1">{contentDecoded.end}</span>
                      </div>
                    )}
                  </div>
                );
              default:
                return (
                  <div className="bg-black/30 rounded-lg p-3 text-sm">
                    <span className="text-gray-400">Type: {qr.type}</span>
                  </div>
                );
            }
          } catch (e) {
            return (
              <div className="bg-black/30 rounded-lg p-3 text-sm">
                <span className="text-gray-400">Unable to parse content</span>
              </div>
            );
          }
        })()}
      </div>

      {/* Compact Styling Grid */}
      <div className={`${isCompact ? 'space-y-3' : 'space-y-4'}`}>
        <h5 className="text-sm font-semibold text-white mb-2">QR Code Styling</h5>

        {/* Compact Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">

          {/* Colors Card */}
          <div className="bg-black/30 rounded-lg border border-white/10 p-3 space-y-2">
            <h6 className="text-xs font-medium text-white mb-2">Colors</h6>

            {/* Dots Color */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-[50px]">Dots:</span>
              <div className="flex items-center gap-1 flex-1">
                <ColorPicker
                  value={fieldValues['styling.dotsColor'] || localStylingProps.dotsColor || '#8b5cf6'}
                  onChange={(value) => updateStylingField('styling.dotsColor', value)}
                  label="Dots Color"
                />
                <button
                  onClick={() => updateStylingField('styling.dotsGradient', false)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    !localStylingProps.dotsGradient
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                  title="Use solid color"
                >
                  Solid
                </button>
                <button
                  onClick={() => updateStylingField('styling.dotsGradient', true)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    localStylingProps.dotsGradient
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                  title="Use gradient"
                >
                  Grad
                </button>
              </div>
            </div>

            {/* Corners Color */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-[50px]">Corners:</span>
              <div className="flex items-center gap-1 flex-1">
                <ColorPicker
                  value={fieldValues['styling.cornerSquareColor'] || localStylingProps.cornerSquareColor || '#8b5cf6'}
                  onChange={(value) => updateStylingField('styling.cornerSquareColor', value)}
                  label="Corners Color"
                />
                <button
                  onClick={() => updateStylingField('styling.cornersGradient', false)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    !localStylingProps.cornersGradient
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                  title="Use solid color"
                >
                  Solid
                </button>
                <button
                  onClick={() => updateStylingField('styling.cornersGradient', true)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    localStylingProps.cornersGradient
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                  title="Use gradient"
                >
                  Grad
                </button>
              </div>
            </div>

            {/* Background Color */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-[50px]">BG:</span>
              <ColorPicker
                value={fieldValues['styling.bgColor'] || localStylingProps.bgColor || '#FFFFFF'}
                onChange={(value) => updateStylingField('styling.bgColor', value)}
                label="Background Color"
              />
            </div>
          </div>

          {/* Shapes Card */}
          <div className="bg-black/30 rounded-lg border border-white/10 p-3 space-y-2">
            <h6 className="text-xs font-medium text-white mb-2">Shapes</h6>

            {/* Dots Shape */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-[50px]">Dots:</span>
              <SelectDropdown
                value={fieldValues['styling.dotsType'] || localStylingProps.dotsType || 'rounded'}
                onChange={(value) => updateStylingField('styling.dotsType', value)}
                options={[
                  { value: 'square', label: 'Square' },
                  { value: 'dots', label: 'Dots' },
                  { value: 'rounded', label: 'Rounded' },
                  { value: 'extra-rounded', label: 'Extra Rounded' },
                  { value: 'classy', label: 'Classy' },
                  { value: 'classy-rounded', label: 'Classy Rounded' }
                ]}
                className="flex-1"
              />
            </div>

            {/* Corners Shape */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-[50px]">Corners:</span>
              <SelectDropdown
                value={fieldValues['styling.cornerSquareType'] || localStylingProps.cornerSquareType || 'square'}
                onChange={(value) => updateStylingField('styling.cornerSquareType', value)}
                options={[
                  { value: 'square', label: 'Square' },
                  { value: 'dot', label: 'Dot' },
                  { value: 'rounded', label: 'Rounded' },
                  { value: 'extra-rounded', label: 'Extra Rounded' },
                  { value: 'classy', label: 'Classy' },
                  { value: 'classy-rounded', label: 'Classy Rounded' }
                ]}
                className="flex-1"
              />
            </div>

            {/* Corner Dots */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-[50px]">C-Dots:</span>
              <SelectDropdown
                value={fieldValues['styling.cornerDotType'] || localStylingProps.cornerDotType || 'dot'}
                onChange={(value) => updateStylingField('styling.cornerDotType', value)}
                options={[
                  { value: 'square', label: 'Square' },
                  { value: 'dot', label: 'Dot' },
                  { value: 'rounded', label: 'Rounded' }
                ]}
                className="flex-1"
              />
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-black/30 rounded-lg border border-white/10 p-3 space-y-2">
            <h6 className="text-xs font-medium text-white mb-2">Settings</h6>

            {/* Error Correction */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-[50px]">Error:</span>
              <SelectDropdown
                value={fieldValues['styling.errorCorrectionLevel'] ?? localStylingProps.errorCorrectionLevel ?? 'H'}
                onChange={(value) => updateStylingField('styling.errorCorrectionLevel', value)}
                options={[
                  { value: 'L', label: 'Low (7%)' },
                  { value: 'M', label: 'Medium (15%)' },
                  { value: 'Q', label: 'Quartile (25%)' },
                  { value: 'H', label: 'High (30%)' }
                ]}
                className="flex-1 text-xs"
              />
            </div>

            {/* Margin */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-[50px]">Margin:</span>
              <input
                type="number"
                min="0"
                max="20"
                value={fieldValues['styling.margin'] ?? localStylingProps.margin ?? 0}
                onChange={(e) => updateStylingField('styling.margin', parseInt(e.target.value) || 0)}
                className="flex-1 bg-black border border-white/20 rounded text-white text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>

            {/* Border Radius */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs min-w-[50px]">Radius:</span>
              <input
                type="number"
                min="0"
                max="50"
                value={fieldValues['styling.borderRadius'] ?? localStylingProps.borderRadius ?? 0}
                onChange={(e) => updateStylingField('styling.borderRadius', parseInt(e.target.value) || 0)}
                className="flex-1 bg-black border border-white/20 rounded text-white text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Logo Card */}
          {(qrStylingProps.image || qrStylingProps.imageBackground) && (
            <div className="bg-black/30 rounded-lg border border-white/10 p-3 space-y-2">
              <h6 className="text-xs font-medium text-white mb-2">Logo</h6>

              {/* Logo Image */}
              {qrStylingProps.image && (
                <LogoThumbnail
                  url={qrStylingProps.image}
                  size={qrStylingProps.imageSize || 0.4}
                  margin={qrStylingProps.imageMargin || 0}
                  label="Logo"
                />
              )}

              {/* Image Background */}
              {qrStylingProps.imageBackground && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs min-w-[50px]">BG:</span>
                  <ColorSwatch
                    color={qrStylingProps.imageBackgroundColor || '#FFFFFF'}
                    size="tiny"
                    showHex={false}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detailed Styling Sections (Collapsible) */}
        <div className="space-y-2">
          <StylingSection
            title="Advanced Styling Options"
            defaultExpanded={false}
            compact={true}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">

              {/* Extended Colors Info */}
              <div className="space-y-2">
                <h6 className="text-xs font-medium text-gray-300">Color Details</h6>

                {/* Dots Color Details */}
                {qrStylingProps.dotsGradient ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">Dots:</span>
                    <div className="flex gap-1">
                      <ColorSwatch
                        color={qrStylingProps.dotsGradientColor1 || '#000000'}
                        size="tiny"
                        showHex={true}
                      />
                      <ColorSwatch
                        color={qrStylingProps.dotsGradientColor2 || '#000000'}
                        size="tiny"
                        showHex={true}
                      />
                    </div>
                  </div>
                ) : (
                  <ColorSwatch
                    color={qrStylingProps.dotsColor || '#000000'}
                    label="Dots"
                    showHex={true}
                    size="small"
                  />
                )}

                {/* Corners Color Details */}
                {qrStylingProps.cornersGradient ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">Corners:</span>
                    <div className="flex gap-1">
                      <ColorSwatch
                        color={qrStylingProps.cornersGradientColor1 || '#000000'}
                        size="tiny"
                        showHex={true}
                      />
                      <ColorSwatch
                        color={qrStylingProps.cornersGradientColor2 || '#000000'}
                        size="tiny"
                        showHex={true}
                      />
                    </div>
                  </div>
                ) : (
                  <ColorSwatch
                    color={qrStylingProps.cornersColor || '#000000'}
                    label="Corners"
                    showHex={true}
                    size="small"
                  />
                )}
              </div>

              {/* Extended Shapes Info */}
              <div className="space-y-2">
                <h6 className="text-xs font-medium text-gray-300">Shape Details</h6>

                <ShapeIndicator
                  type="dots"
                  shape={qrStylingProps.dotsType || 'rounded'}
                  label="Dots Shape"
                  size="small"
                />

                <ShapeIndicator
                  type="corners"
                  shape={qrStylingProps.cornerSquareType || 'square'}
                  label="Corners Shape"
                  size="small"
                />

                <ShapeIndicator
                  type="dots"
                  shape={qrStylingProps.cornerDotType || 'dot'}
                  label="Corner Dots"
                  size="small"
                />
              </div>
            </div>
          </StylingSection>
        </div>
      </div>

      {/* Compact Action Buttons */}
      <div className="flex gap-2 pt-4">
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-xs font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Download QR Code
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white transition-all flex items-center gap-1.5"
        >
          <Settings className="w-3.5 h-3.5" />
          Edit Styling
        </button>
      </div>
    </>
  );

  // Handle QR code download
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    if (qrCodeRefDesktop.current) {
      qrCodeRefDesktop.current.download({
        name: `${qr.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr`,
        extension: 'png'
      });
    }
  };

  // Handle QR code deletion
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    if (window.confirm(`Are you sure you want to delete "${qr.name}"? This action cannot be undone.`)) {
      if (onDelete) {
        onDelete(qr.qrcodeid || qr.id);
      }
    }
  };

  // Handle row click for expansion
  const handleRowClick = () => {
    handleToggle();
  };

  // Create QR code options for different screen sizes
  const createQROptions = (size: number) => {
    const qrData = generateQRData();

    
    const options: any = {
      width: size,
      height: size,
      type: "svg",
      data: qrData,
      margin: localStylingProps.margin !== undefined ? localStylingProps.margin : 10,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: localStylingProps.errorCorrectionLevel || 'H'
      },
      dotsOptions: {
        type: localStylingProps.dotsType || 'rounded',
        color: localStylingProps.dotsGradient
          ? undefined
          : localStylingProps.dotsColor || '#8b5cf6',
        gradient: localStylingProps.dotsGradient
          ? {
              type: localStylingProps.dotsGradientType || 'linear',
              rotation: localStylingProps.dotsGradientRotation || 0,
              colorStops: [
                { offset: 0, color: localStylingProps.dotsGradientColor1 || '#6366f1' },
                { offset: 1, color: localStylingProps.dotsGradientColor2 || '#3b82f6' }
              ]
            }
          : undefined
      },
      backgroundOptions: {
        color: localStylingProps.bgColor || '#ffffff',
      },
      cornersSquareOptions: {
        type: localStylingProps.cornerSquareType || 'extra-rounded',
        color: localStylingProps.cornersGradient
          ? undefined
          : localStylingProps.cornerSquareColor || '#8b5cf6',
        gradient: localStylingProps.cornersGradient
          ? {
              type: localStylingProps.cornersGradientType || 'linear',
              rotation: 0,
              colorStops: [
                { offset: 0, color: localStylingProps.cornersGradientColor1 || '#8b5cf6' },
                { offset: 1, color: localStylingProps.cornersGradientColor2 || '#3b82f6' }
              ]
            }
          : undefined
      },
      cornersDotOptions: {
        type: localStylingProps.cornerDotType || 'dot',
        color: localStylingProps.cornerDotColor || '#8b5cf6'
      }
    };

    if (localStylingProps.borderRadius) {
      options.backgroundOptions = {
        ...options.backgroundOptions,
        borderRadius: localStylingProps.borderRadius
      };
    }

    if (localStylingProps.image || localStylingProps.logoUrl) {
      options.imageOptions = {
        hideBackgroundDots: true,
        imageSize: localStylingProps.imageSize || 0.4,
        margin: localStylingProps.imageMargin || 0,
        crossOrigin: 'anonymous',
      };
      options.image = localStylingProps.image || localStylingProps.logoUrl;
    }

    
    return options;
  };

  // Memoize QR code options for consistent size across all screen sizes
  const qrCodeOptions = useMemo(() => createQROptions(240), [
    localStylingProps.dotsType,
    localStylingProps.dotsColor,
    localStylingProps.dotsGradient,
    localStylingProps.dotsGradientType,
    localStylingProps.dotsGradientRotation,
    localStylingProps.dotsGradientColor1,
    localStylingProps.dotsGradientColor2,
    localStylingProps.bgColor,
    localStylingProps.cornerSquareType,
    localStylingProps.cornerSquareColor,
    localStylingProps.cornersGradient,
    localStylingProps.cornersGradientType,
    localStylingProps.cornersGradientColor1,
    localStylingProps.cornersGradientColor2,
    localStylingProps.cornerDotType,
    localStylingProps.cornerDotColor,
    localStylingProps.image,
    localStylingProps.logoUrl,
    localStylingProps.imageSize,
    localStylingProps.imageMargin,
    localStylingProps.errorCorrectionLevel,
    localStylingProps.margin,
    localStylingProps.borderRadius
  ]);

  // Initialize QR Code when expanded with lazy loading
  useEffect(() => {
    if (!isExpanded) return;

    const timeoutId = setTimeout(() => {
      if (isExpanded) {
        // Clear existing QR codes
        [qrRefDesktop, qrRefTablet, qrRefMobile].forEach(ref => {
          if (ref.current) {
            ref.current.innerHTML = '';
          }
        });

        console.log('🆕 Creating new QR codes with options:', qrCodeOptions);

        // Create QR codes using consistent size
        try {
          if (qrRefDesktop.current) {
            qrCodeRefDesktop.current = new QRCodeStyling(qrCodeOptions);
            qrCodeRefDesktop.current.append(qrRefDesktop.current);
          }

          if (qrRefTablet.current) {
            qrCodeRefTablet.current = new QRCodeStyling(qrCodeOptions);
            qrCodeRefTablet.current.append(qrRefTablet.current);
          }

          if (qrRefMobile.current) {
            qrCodeRefMobile.current = new QRCodeStyling(qrCodeOptions);
            qrCodeRefMobile.current.append(qrRefMobile.current);
          }
        } catch (error) {
          console.error('❌ Error creating QR codes:', error);
        }
      }
    }, 100); // Small delay for lazy loading

    // Cleanup when collapsed or when dependencies change
    return () => {
      clearTimeout(timeoutId);
      if (!isExpanded) {
        qrCodeRefDesktop.current = null;
        qrCodeRefTablet.current = null;
        qrCodeRefMobile.current = null;
      }
    };
  }, [isExpanded]); // Only create/destroy when expansion state changes

  // Update QR codes when styling changes (only when expanded)
  useEffect(() => {
    if (!isExpanded) return;

    console.log('🔄 QR Code regeneration effect triggered, regenerationKey:', qrRegenerationKey);
    console.log('🔄 Complete localStylingProps:', JSON.stringify(localStylingProps, null, 2));
    console.log('🔄 localStylingProps.dotsColor:', localStylingProps.dotsColor);
    console.log('🔄 localStylingProps.cornerSquareColor:', localStylingProps.cornerSquareColor);
    console.log('🔄 localStylingProps.dotsGradient:', localStylingProps.dotsGradient);
    console.log('🔄 localStylingProps.cornersGradient:', localStylingProps.cornersGradient);

    const timeoutId = setTimeout(() => {
      try {
        console.log('🔄 About to regenerate QR codes...');

        // Force recreation by clearing and recreating
        [qrRefDesktop, qrRefTablet, qrRefMobile].forEach(ref => {
          if (ref.current) {
            ref.current.innerHTML = '';
          }
        });

        if (qrRefDesktop.current) {
          console.log('🔄 Creating new desktop QR code...');
          qrCodeRefDesktop.current = new QRCodeStyling(qrCodeOptions);
          qrCodeRefDesktop.current.append(qrRefDesktop.current);
        }
        if (qrRefTablet.current) {
          console.log('🔄 Creating new tablet QR code...');
          qrCodeRefTablet.current = new QRCodeStyling(qrCodeOptions);
          qrCodeRefTablet.current.append(qrRefTablet.current);
        }
        if (qrRefMobile.current) {
          console.log('🔄 Creating new mobile QR code...');
          qrCodeRefMobile.current = new QRCodeStyling(qrCodeOptions);
          qrCodeRefMobile.current.append(qrRefMobile.current);
        }
        console.log('✅ QR codes regenerated successfully!');
      } catch (error) {
        console.error('❌ Error regenerating QR codes:', error);
      }
    }, 100); // Slightly longer delay for regeneration

    return () => clearTimeout(timeoutId);
  }, [qrRegenerationKey, isExpanded]); // Only depend on regeneration key and expansion

  
  return (
    <>
      <tr
  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
  onClick={handleRowClick}
>
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <QrCode className="w-6 h-6 text-black" />
            </div>
            <span className="text-white font-medium">{qr.name}</span>
          </div>
        </td>
        <td className="py-4 px-4">
          <span className="text-gray-400 text-sm truncate max-w-xs block">
            {qr.type === 'url' ? 'URL' : qr.type.charAt(0).toUpperCase() + qr.type.slice(1)}
          </span>
        </td>
        <td className="py-4 px-4">
          <span className="text-white font-semibold">{qr.scans.toLocaleString()}</span>
        </td>
        <td className="py-4 px-4">
          <span className="text-gray-400 text-sm">{formatDate(qr.created)}</span>
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Download"
              disabled={!isExpanded}
            >
              <Download className={`w-4 h-4 ${isExpanded ? 'text-gray-400 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`} />
            </button>
                        <button
              onClick={(e) => e.stopPropagation()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
              title="Delete QR Code"
            >
              <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={isExpanded ? 'Collapse QR code' : 'Expand QR code'}
              disabled={isToggling}
            >
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                style={{ pointerEvents: 'none' }}
              />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-white/5 bg-white/5">
          <td colSpan={5} className="py-4 lg:py-6 px-3 lg:px-4 w-full">
            <div className="w-full max-w-full overflow-x-hidden">
            {/* Desktop Layout - Prominent QR code with enhanced styling */}
            <div className="hidden lg:flex gap-8 xl:gap-12 items-start w-full">
              {/* QR Code Preview - Prominent and centered */}
              <div className="flex-shrink-0 lg:w-[360px] xl:w-[400px]">
                <div className="relative flex justify-center items-center p-6 lg:p-8">
                    {/* QR Code wrapper with glow */}
                    <div className="relative">
                      {/* Glow effect positioned around the QR code */}
                      <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur-lg opacity-40"></div>
                      <div ref={qrRefDesktop} className="w-[240px] h-[240px] relative z-10"></div>
                    </div>
                  </div>
              </div>

              {/* Compact Details Section - Responsive width */}
              <div className="flex-1 min-w-0 space-y-6">
                {renderCompactDetails(false)}
              </div>
            </div>

            {/* Tablet Layout - Enhanced prominence */}
            <div className="hidden md:flex lg:hidden gap-8 items-center justify-center w-full">
              {/* QR Code Preview - Enhanced for tablet */}
              <div className="flex-shrink-0">
                <div className="relative flex justify-center items-center p-6">
                    {/* QR Code wrapper with glow */}
                    <div className="relative">
                      {/* Glow effect positioned around the QR code */}
                      <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg blur-lg opacity-40"></div>
                      <div ref={qrRefTablet} className="w-[240px] h-[240px] relative z-10"></div>
                    </div>
                  </div>
              </div>

              {/* Details Section for tablet */}
              <div className="flex-1 space-y-5">
                {renderCompactDetails(true)}
              </div>
            </div>

            {/* Mobile Layout - Centered prominence */}
            <div className="flex md:hidden flex-col gap-6 items-center w-full">
              {/* QR Code Preview - Prominent on mobile */}
              <div className="relative flex justify-center items-center p-6">
                  {/* QR Code wrapper with glow */}
                  <div className="relative">
                    {/* Glow effect positioned around the QR code */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg blur-lg opacity-40"></div>
                    <div ref={qrRefMobile} className="w-[240px] h-[240px] relative z-10"></div>
                  </div>
                </div>

              {/* Mobile Details Section */}
              <div className="w-full space-y-4">
                {renderCompactDetails(true)}
              </div>
            </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
