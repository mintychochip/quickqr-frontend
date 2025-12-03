import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { QrCode, Download, Settings, ChevronDown, Trash2 } from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import ColorSwatch from './QRCodeRow/ColorSwatch';
import ShapeIndicator from './QRCodeRow/ShapeIndicator';
import LogoThumbnail from './QRCodeRow/LogoThumbnail';
import StylingSection from './QRCodeRow/StylingSection';
import { getApiUrl, APP_URL } from '../config/api';
import { UpdateQRCodeData } from '../types/qrcode.types';
import { QR_SIZES, TIMING } from '../constants/qr.constants';

// SelectDropdown component for styling options
interface SelectDropdownProps {
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

function SelectDropdown({ value, onChange, options, className = '' }: SelectDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-white border border-gray-300 rounded text-gray-900 text-sm px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none cursor-pointer w-full shadow-sm ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
        backgroundPosition: 'right 8px center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '16px'
      }}
    >
      {options.map(option => (
        <option
          key={option.value}
          value={option.value}
          className="bg-white text-gray-900"
        >
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
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-gray-300 cursor-pointer bg-white flex-shrink-0"
        title={label}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-white border border-gray-300 rounded text-gray-900 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent min-w-0 shadow-sm"
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
  onUpdate?: (qrId: string, updatedData: Partial<QRCodeRowProps['qr']>) => void;
}

// EditableField component for inline editing
interface EditableFieldProps {
  value: string | number;
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
  const [tempValue, setTempValue] = useState(String(value));
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset temp value when the actual value changes externally
  useEffect(() => {
    setTempValue(String(value));
  }, [value]);

  const handleEdit = () => {
    onEditToggle();
    setTempValue(String(value));
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
    setTempValue(String(value));
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
          className={`flex-1 px-3 py-1.5 bg-white border ${
            validationError ? 'border-red-500' : 'border-gray-300'
          } rounded text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm`}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="px-2 py-1 bg-teal-500 hover:bg-teal-600 rounded text-xs font-medium text-white transition-colors shadow-sm"
          title="Save"
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-medium text-gray-900 transition-colors shadow-sm"
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
      className="cursor-text rounded px-2 py-1 flex-1 text-gray-900 font-medium"
      title="Click to edit"
      data-editable-field
    >
      {value || <span className="text-gray-500">{placeholder}</span>}
    </div>
  );
}

export default function QRCodeRow({ qr, formatDate, onDelete, onUpdate }: QRCodeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string | number>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const qrRefDesktop = useRef<HTMLDivElement>(null);
  const qrRefTablet = useRef<HTMLDivElement>(null);
  const qrRefMobile = useRef<HTMLDivElement>(null);
  const qrCodeRefDesktop = useRef<any>(null);
  const qrCodeRefTablet = useRef<any>(null);
  const qrCodeRefMobile = useRef<any>(null);

  // Parse QR styling properties from the database or use defaults
  const qrStylingProps = useMemo(() => {
    const defaults = {
      dotsType: 'rounded' as const,
      dotsColor: '#212529',
      bgColor: '#ffffff',
      cornerSquareType: 'extra-rounded' as const,
      cornerSquareColor: '#20c997',
      cornerDotType: 'dot' as const,
      cornerDotColor: '#20c997',
      logoUrl: '',
    };


    if (!qr.styling) return defaults;

    try {
      const parsed = JSON.parse(qr.styling);
            return { ...defaults, ...parsed };
    } catch (e) {
      console.error('Error parsing styling:', e, 'Raw styling:', qr.styling);
      return defaults;
    }
  }, [qr.styling]);
  const handleToggle = () => {
    if (isToggling) return;
    setIsToggling(true);
    setIsExpanded(!isExpanded);
    setTimeout(() => {
      setIsToggling(false);
    }, TIMING.TOGGLE_DEBOUNCE);
  };

  // Generate QR code data based on type and content
  const generateQRData = (): string => {
    // All QR codes should redirect through our redirect endpoint
    return `${APP_URL}/code/${qr.qrcodeid}`;
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

  const updateFieldValue = (fieldKey: string, value: string | number) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Save field to backend
  const saveField = async (fieldKey: string, value: string | number) => {
    updateFieldValue(fieldKey, String(value));

    // Prepare update data
    const updateData: UpdateQRCodeData = {
      qrcodeid: qr.qrcodeid || ''
    };

    // Handle different field types
    if (fieldKey === 'name') {
      updateData.name = String(value);
    } else if (fieldKey.startsWith('content.')) {
      // Update content field
      const contentField = fieldKey.replace('content.', '');
      const updatedContent = {
        ...parsedContent,
        [contentField]: value
      };
      updateData.content = JSON.stringify(updatedContent);
    }

    // Send update to backend
    try {
      const response = await fetch(getApiUrl('update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          ...updateData
        })
      });

      const result = await response.json();

      if (result.success) {
        // Notify parent component of the update
        if (onUpdate && qr.qrcodeid) {
          if (fieldKey === 'name') {
            onUpdate(qr.qrcodeid, { name: String(value) });
          } else if (fieldKey.startsWith('content.')) {
            const contentField = fieldKey.replace('content.', '');
            const updatedContent = {
              ...parsedContent,
              [contentField]: value
            };
            onUpdate(qr.qrcodeid, { content: JSON.stringify(updatedContent) });
          }
        }
      } else {
        alert('Failed to update: ' + result.error);
      }
    } catch (error) {
      alert('Error updating QR code');
    }
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
            setLocalStylingProps(qrStylingProps);
    }
  }, [qrStylingProps, hasLocalModifications]);

  // Save styling to backend with debouncing
  const saveStylingToBackend = useCallback((stylingData: typeof qrStylingProps) => {
    // Use debounce to avoid too many requests
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(getApiUrl('update'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            action: 'update',
            qrcodeid: qr.qrcodeid,
            styling: JSON.stringify(stylingData)
          })
        });

        const result = await response.json();

        if (!result.success) {
          // Silently fail - styling update error
        }
      } catch (error) {
        // Silently fail - styling update error
      }
    }, TIMING.EXPANSION_DELAY);

    return () => clearTimeout(timeoutId);
  }, [qr.qrcodeid]);

  // Handle styling field updates and save to backend
  const updateStylingField = useCallback((fieldKey: string, value: string | number) => {
    const stylingKey = fieldKey.replace('styling.', '');

    // Mark that we have local modifications to prevent auto-reset
    setHasLocalModifications(true);

    // Normalize color values (ensure they start with #)
    let normalizedValue = value;
    if (stylingKey.includes('Color') && typeof value === 'string') {
      if (!value.startsWith('#')) {
        normalizedValue = '#' + value;
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
              }
      if (stylingKey === 'cornerSquareColor' && prev.cornersGradient) {
        newStyling.cornersGradient = false;
              }

      // Save to backend after state update
      saveStylingToBackend(newStyling);

            return newStyling;
    });

    // Also update fieldValues for input state
    setFieldValues(prev => ({
      ...prev,
      [fieldKey]: normalizedValue
    }));

    // Force QR code regeneration by incrementing the key
    setQrRegenerationKey(prev => prev + 1);
  }, [saveStylingToBackend]);

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
        <h4 className={`${isCompact ? 'text-base' : 'text-lg'} font-semibold text-gray-900 mb-3`}>Details</h4>

        {/* Compact Basic Details */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-xs min-w-[60px]">Name</span>
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
            <span className="text-gray-600 text-xs min-w-[60px]">Scans</span>
            <span className="text-gray-900 font-medium">{qr.scans.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-xs min-w-[60px]">Created</span>
            <span className="text-gray-900 font-medium">{formatDate(qr.created)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-xs min-w-[60px]">Status</span>
            <span className="text-green-400 font-medium capitalize">{qr.status}</span>
          </div>
        </div>
      </div>

      {/* Compact Content Section */}
      <div className={`${isCompact ? 'space-y-2' : 'space-y-3'}`}>
        <h5 className="text-sm font-semibold text-gray-900 mb-2">Content</h5>
        {(() => {
          try {
            const contentDecoded = JSON.parse(qr.content);
            switch (qr.type) {
              case 'url':
                return (
                  <div className="bg-white rounded-lg p-3 text-sm border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs min-w-[30px]">URL</span>
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
                  <div className="bg-white rounded-lg p-3 text-sm space-y-2 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs min-w-[30px]">Email</span>
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
                      <span className="text-gray-600 text-xs min-w-[30px]">Subj</span>
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
                      <span className="text-gray-600 text-xs min-w-[30px]">Body</span>
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
                  <div className="bg-white rounded-lg p-3 text-sm border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs min-w-[30px]">Phone</span>
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
                  <div className="bg-white rounded-lg p-3 text-sm space-y-2 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs min-w-[30px]">Number</span>
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
                      <span className="text-gray-600 text-xs min-w-[30px]">Msg</span>
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
                  <div className="bg-white rounded-lg p-3 text-sm border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs min-w-[30px]">Text</span>
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
                  <div className="bg-white rounded-lg p-3 text-sm space-y-2 border border-gray-200 shadow-sm">
                    {contentDecoded.name && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">Name</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.name}</span>
                      </div>
                    )}
                    {contentDecoded.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">Phone</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.phone}</span>
                      </div>
                    )}
                    {contentDecoded.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">Email</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.email}</span>
                      </div>
                    )}
                    {contentDecoded.org && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">Org</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.org}</span>
                      </div>
                    )}
                    {contentDecoded.url && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">Web</span>
                        <span className="text-gray-900 break-all flex-1">{contentDecoded.url}</span>
                      </div>
                    )}
                  </div>
                );
              case 'location':
                return (
                  <div className="bg-white rounded-lg p-3 text-sm space-y-2 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs min-w-[30px]">Lat</span>
                      <span className="text-white flex-1">{contentDecoded.latitude}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs min-w-[30px]">Lng</span>
                      <span className="text-white flex-1">{contentDecoded.longitude}</span>
                    </div>
                  </div>
                );
              case 'wifi':
                return (
                  <div className="bg-white rounded-lg p-3 text-sm space-y-2 border border-gray-200 shadow-sm">
                    {contentDecoded.ssid && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">SSID</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.ssid}</span>
                      </div>
                    )}
                    {contentDecoded.encryption && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">Sec</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.encryption}</span>
                      </div>
                    )}
                    {contentDecoded.password && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">Pass</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.password}</span>
                      </div>
                    )}
                  </div>
                );
              case 'event':
                return (
                  <div className="bg-white rounded-lg p-3 text-sm space-y-2 border border-gray-200 shadow-sm">
                    {contentDecoded.title && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">Title</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.title}</span>
                      </div>
                    )}
                    {contentDecoded.location && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">Where</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.location}</span>
                      </div>
                    )}
                    {contentDecoded.start && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">Start</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.start}</span>
                      </div>
                    )}
                    {contentDecoded.end && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs min-w-[30px]">End</span>
                        <span className="text-gray-900 flex-1">{contentDecoded.end}</span>
                      </div>
                    )}
                  </div>
                );
              default:
                return (
                  <div className="bg-white rounded-lg p-3 text-sm border border-gray-200 shadow-sm">
                    <span className="text-gray-600">Type: {qr.type}</span>
                  </div>
                );
            }
          } catch (e) {
            return (
              <div className="bg-white rounded-lg p-3 text-sm border border-gray-200 shadow-sm">
                <span className="text-gray-600">Unable to parse content</span>
              </div>
            );
          }
        })()}
      </div>

      {/* Compact Styling Grid */}
      <div className={`${isCompact ? 'space-y-3' : 'space-y-4'}`}>
        <h5 className="text-sm font-semibold text-gray-900 mb-2">QR Code Styling</h5>

        {/* Compact Grid Layout - Fixed overflow */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Colors & Shapes Combined Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 shadow-sm">
            <h6 className="text-sm font-semibold text-gray-900 mb-3">Colors & Shapes</h6>

            {/* Dots */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Dots</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <ColorPicker
                    value={fieldValues['styling.dotsColor'] || localStylingProps.dotsColor || '#8b5cf6'}
                    onChange={(value) => updateStylingField('styling.dotsColor', value)}
                    label="Dots Color"
                  />
                </div>
                <div className="flex-1">
                  <SelectDropdown
                    value={fieldValues['styling.dotsType'] || localStylingProps.dotsType || 'rounded'}
                    onChange={(value) => updateStylingField('styling.dotsType', value)}
                    options={[
                      { value: 'square', label: 'Square' },
                      { value: 'dots', label: 'Dots' },
                      { value: 'rounded', label: 'Rounded' },
                      { value: 'extra-rounded', label: 'Extra' },
                      { value: 'classy', label: 'Classy' }
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Corners */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Corners</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <ColorPicker
                    value={fieldValues['styling.cornerSquareColor'] || localStylingProps.cornerSquareColor || '#8b5cf6'}
                    onChange={(value) => updateStylingField('styling.cornerSquareColor', value)}
                    label="Corners Color"
                  />
                </div>
                <div className="flex-1">
                  <SelectDropdown
                    value={fieldValues['styling.cornerSquareType'] || localStylingProps.cornerSquareType || 'square'}
                    onChange={(value) => updateStylingField('styling.cornerSquareType', value)}
                    options={[
                      { value: 'square', label: 'Square' },
                      { value: 'dot', label: 'Dot' },
                      { value: 'rounded', label: 'Rounded' },
                      { value: 'extra-rounded', label: 'Extra' }
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Background */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Background</label>
              <ColorPicker
                value={fieldValues['styling.bgColor'] || localStylingProps.bgColor || '#FFFFFF'}
                onChange={(value) => updateStylingField('styling.bgColor', value)}
                label="Background Color"
              />
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 shadow-sm">
            <h6 className="text-sm font-semibold text-gray-900 mb-3">Settings</h6>

            {/* Error Correction */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Error Correction</label>
              <SelectDropdown
                value={fieldValues['styling.errorCorrectionLevel'] ?? localStylingProps.errorCorrectionLevel ?? 'H'}
                onChange={(value) => updateStylingField('styling.errorCorrectionLevel', value)}
                options={[
                  { value: 'L', label: 'Low (7%)' },
                  { value: 'M', label: 'Medium (15%)' },
                  { value: 'Q', label: 'Quartile (25%)' },
                  { value: 'H', label: 'High (30%)' }
                ]}
                className="w-full"
              />
            </div>

            {/* Margin */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Margin</label>
              <input
                type="number"
                min="0"
                max="20"
                value={fieldValues['styling.margin'] ?? localStylingProps.margin ?? 0}
                onChange={(e) => updateStylingField('styling.margin', parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-gray-300 rounded text-gray-900 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
              />
            </div>

            {/* Corner Dots Style */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Corner Dots</label>
              <SelectDropdown
                value={fieldValues['styling.cornerDotType'] || localStylingProps.cornerDotType || 'dot'}
                onChange={(value) => updateStylingField('styling.cornerDotType', value)}
                options={[
                  { value: 'square', label: 'Square' },
                  { value: 'dot', label: 'Dot' },
                  { value: 'rounded', label: 'Rounded' }
                ]}
                className="w-full"
              />
            </div>
          </div>

        </div>

        {/* Logo Settings Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 shadow-sm">
          <h6 className="text-sm font-semibold text-gray-900 mb-3">Logo Settings</h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo URL */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Logo URL</label>
              <input
                type="url"
                value={fieldValues['styling.logoUrl'] || localStylingProps.logoUrl || ''}
                onChange={(e) => updateStylingField('styling.logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full bg-white border border-gray-300 rounded text-gray-900 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-500 shadow-sm"
              />
            </div>

            {/* Logo Size */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Logo Size (0.1 - 0.5)</label>
              <input
                type="number"
                min="0.1"
                max="0.5"
                step="0.05"
                value={fieldValues['styling.imageSize'] ?? localStylingProps.imageSize ?? 0.3}
                onChange={(e) => updateStylingField('styling.imageSize', parseFloat(e.target.value) || 0.3)}
                className="w-full bg-white border border-gray-300 rounded text-gray-900 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
              />
            </div>

            {/* Logo Margin */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Logo Margin</label>
              <input
                type="number"
                min="0"
                max="20"
                value={fieldValues['styling.imageMargin'] ?? localStylingProps.imageMargin ?? 5}
                onChange={(e) => updateStylingField('styling.imageMargin', parseInt(e.target.value) || 5)}
                className="w-full bg-white border border-gray-300 rounded text-gray-900 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
              />
            </div>

            {/* Border Radius */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Border Radius</label>
              <input
                type="number"
                min="0"
                max="50"
                value={fieldValues['styling.borderRadius'] ?? localStylingProps.borderRadius ?? 0}
                onChange={(e) => updateStylingField('styling.borderRadius', parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-gray-300 rounded text-gray-900 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Advanced Styling Options (Collapsible) */}
        <div className="space-y-2">
          <StylingSection
            title="Advanced Styling Options"
            defaultExpanded={false}
            compact={true}
          >
            <div className="space-y-4">
              {/* Gradient Settings */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <h6 className="text-xs font-semibold text-gray-900 mb-3">Gradient Settings</h6>

              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">

              {/* Extended Colors Info */}
              <div className="space-y-2">
                <h6 className="text-xs font-medium text-gray-700">Color Details</h6>

                {/* Dots Color Details */}
                {qrStylingProps.dotsGradient ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs">Dots:</span>
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
                    <span className="text-gray-600 text-xs">Corners:</span>
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
                <h6 className="text-xs font-medium text-gray-700">Shape Details</h6>

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
      <div className="flex gap-3 pt-5 border-t border-gray-200 mt-5">
        <button
          onClick={handleDownload}
          className="flex-1 px-4 py-2.5 bg-teal-500 rounded-lg text-sm font-semibold text-white hover:bg-teal-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2.5 bg-white hover:bg-gray-50 border border-red-300 rounded-lg text-sm font-semibold text-red-600 hover:text-red-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          Delete
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
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(qr.qrcodeid || qr.id);
    }
    setShowDeleteModal(false);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Handle row click for expansion
  const handleRowClick = () => {
    handleToggle();
  };

  // Create QR code options for different screen sizes
  const createQROptions = (size: number) => {
    const qrData = generateQRData();

    
    const options = {
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
      (options as any).backgroundOptions = {
        ...options.backgroundOptions,
        borderRadius: localStylingProps.borderRadius
      };
    }

    if (localStylingProps.image || localStylingProps.logoUrl) {
      (options as any).imageOptions = {
        hideBackgroundDots: true,
        imageSize: localStylingProps.imageSize || 0.4,
        margin: localStylingProps.imageMargin || 0,
        crossOrigin: 'anonymous',
      };
      (options as any).image = localStylingProps.image || localStylingProps.logoUrl;
    }

    
    return options;
  };

  // Memoize QR code options for consistent size across all screen sizes
  const qrCodeOptions = useMemo(() => createQROptions(QR_SIZES.LARGE), [
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

        
        // Create QR codes using consistent size
        try {
          if (qrRefDesktop.current) {
            qrCodeRefDesktop.current = new QRCodeStyling(qrCodeOptions as any);
            qrCodeRefDesktop.current.append(qrRefDesktop.current);
          }

          if (qrRefTablet.current) {
            qrCodeRefTablet.current = new QRCodeStyling(qrCodeOptions as any);
            qrCodeRefTablet.current.append(qrRefTablet.current);
          }

          if (qrRefMobile.current) {
            qrCodeRefMobile.current = new QRCodeStyling(qrCodeOptions as any);
            qrCodeRefMobile.current.append(qrRefMobile.current);
          }
        } catch (error) {
          console.error('❌ Error creating QR codes:', error);
        }
      }
    }, TIMING.REGENERATION_DELAY);

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

    
    const timeoutId = setTimeout(() => {
      try {
        
        // Force recreation by clearing and recreating
        [qrRefDesktop, qrRefTablet, qrRefMobile].forEach(ref => {
          if (ref.current) {
            ref.current.innerHTML = '';
          }
        });

        if (qrRefDesktop.current) {
                    qrCodeRefDesktop.current = new QRCodeStyling(qrCodeOptions as any);
          qrCodeRefDesktop.current.append(qrRefDesktop.current);
        }
        if (qrRefTablet.current) {
                    qrCodeRefTablet.current = new QRCodeStyling(qrCodeOptions as any);
          qrCodeRefTablet.current.append(qrRefTablet.current);
        }
        if (qrRefMobile.current) {
                    qrCodeRefMobile.current = new QRCodeStyling(qrCodeOptions as any);
          qrCodeRefMobile.current.append(qrRefMobile.current);
        }
              } catch (error) {
        console.error('❌ Error regenerating QR codes:', error);
      }
    }, TIMING.REGENERATION_DELAY);

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
            <span className="text-gray-900 font-medium">{qr.name}</span>
          </div>
        </td>
        <td className="py-4 px-4">
          <span className="text-gray-600 text-sm truncate max-w-xs block">
            {qr.type === 'url' ? 'URL' : qr.type.charAt(0).toUpperCase() + qr.type.slice(1)}
          </span>
        </td>
        <td className="py-4 px-4">
          <span className="text-gray-900 font-semibold">{qr.scans.toLocaleString()}</span>
        </td>
        <td className="py-4 px-4">
          <span className="text-gray-600 text-sm">{formatDate(qr.created)}</span>
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Download"
              disabled={!isExpanded}
            >
              <Download className={`w-4 h-4 ${isExpanded ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 cursor-not-allowed'}`} />
            </button>
                        <button
              onClick={(e) => e.stopPropagation()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-600 hover:text-gray-900" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
              title="Delete QR Code"
            >
              <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600 transition-colors" />
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
                className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                style={{ pointerEvents: 'none' }}
              />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-gray-200 bg-gray-50">
          <td colSpan={5} className="py-4 lg:py-6 px-3 lg:px-4 w-full">
            <div className="w-full max-w-full overflow-x-hidden">
            {/* Desktop Layout - Cleaner organization */}
            <div className="hidden lg:flex gap-6 items-start w-full">
              {/* QR Code Preview - Fixed width */}
              <div className="flex-shrink-0 w-[280px]">
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="relative flex justify-center items-center">
                    {/* QR Code wrapper */}
                    <div className="relative shadow-md rounded-lg">
                      <div ref={qrRefDesktop} className="w-[240px] h-[240px] relative z-10 bg-white rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section - Flexible width */}
              <div className="flex-1 min-w-0 space-y-5">
                {renderCompactDetails(false)}
              </div>
            </div>

            {/* Tablet Layout */}
            <div className="hidden md:flex lg:hidden gap-6 items-start w-full">
              {/* QR Code Preview */}
              <div className="flex-shrink-0 w-[240px]">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="relative flex justify-center items-center">
                    <div className="relative">
                      <div className="absolute -inset-1 shadow-md rounded-lg"></div>
                      <div ref={qrRefTablet} className="w-[200px] h-[200px] relative z-10 bg-white rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="flex-1 space-y-4">
                {renderCompactDetails(true)}
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="flex md:hidden flex-col gap-4 items-center w-full">
              {/* QR Code Preview */}
              <div className="w-full max-w-[280px]">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="relative flex justify-center items-center">
                    <div className="relative">
                      <div className="absolute -inset-1 shadow-md rounded-lg"></div>
                      <div ref={qrRefMobile} className="w-[200px] h-[200px] relative z-10 bg-white rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="w-full space-y-4">
                {renderCompactDetails(true)}
              </div>
            </div>
            </div>
          </td>
        </tr>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="relative max-w-md w-full mx-4">
                {/* Modal content */}
                <div className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-200">
                      <Trash2 className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete QR Code?</h3>
                    <p className="text-gray-600">
                      Are you sure you want to delete <span className="text-gray-900 font-semibold">"{qr.name}"</span>?
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      This action cannot be undone.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={cancelDelete}
                      className="flex-1 px-6 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg font-medium text-gray-900 transition-all shadow-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
