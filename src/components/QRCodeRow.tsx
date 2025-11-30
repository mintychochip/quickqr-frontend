import { useState, useRef, useEffect, useMemo } from 'react';
import { QrCode, Download, Settings, ChevronDown, Trash2 } from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import ColorSwatch from './QRCodeRow/ColorSwatch';
import GradientPreview from './QRCodeRow/GradientPreview';
import ShapeIndicator from './QRCodeRow/ShapeIndicator';
import LogoThumbnail from './QRCodeRow/LogoThumbnail';
import StylingSection from './QRCodeRow/StylingSection';

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

export default function QRCodeRow({ qr, formatDate, onDelete }: QRCodeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<any>(null);

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
    return `http://localhost:5173/code/${qr.qrcodeid}`;
  };

  // Handle QR code download
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    if (qrCodeRef.current) {
      qrCodeRef.current.download({
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

  // Memoize QR code options to prevent unnecessary recalculations
  const qrCodeOptions = useMemo(() => {
    const qrData = generateQRData();

    const options: any = {
      width: 200,
      height: 200,
      data: qrData,
      margin: 10,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: qrStylingProps.errorCorrectionLevel || 'H'
      },
      dotsOptions: {
        type: qrStylingProps.dotsType || 'rounded',
        color: qrStylingProps.dotsGradient
          ? undefined
          : qrStylingProps.dotsColor || '#8b5cf6',
        gradient: qrStylingProps.dotsGradient
          ? {
              type: qrStylingProps.dotsGradientType || 'linear',
              rotation: qrStylingProps.dotsGradientRotation || 0,
              colorStops: [
                { offset: 0, color: qrStylingProps.dotsGradientColor1 || '#6366f1' },
                { offset: 1, color: qrStylingProps.dotsGradientColor2 || '#3b82f6' }
              ]
            }
          : undefined
      },
      backgroundOptions: {
        color: qrStylingProps.backgroundColor || qrStylingProps.bgColor || '#ffffff',
      },
      cornersSquareOptions: {
        type: qrStylingProps.cornerSquareType || 'extra-rounded',
        color: qrStylingProps.cornersGradient
          ? undefined
          : qrStylingProps.cornerSquareColor || '#8b5cf6',
        gradient: qrStylingProps.cornersGradient
          ? {
              type: qrStylingProps.cornersGradientType || 'linear',
              rotation: 0,
              colorStops: [
                { offset: 0, color: qrStylingProps.cornersGradientColor1 || '#8b5cf6' },
                { offset: 1, color: qrStylingProps.cornersGradientColor2 || '#3b82f6' }
              ]
            }
          : undefined
      },
      cornersDotOptions: {
        type: qrStylingProps.cornerDotType || 'dot',
        color: qrStylingProps.cornerDotColor || '#8b5cf6'
      }
    };

    if (qrStylingProps.image || qrStylingProps.logoUrl) {
      options.imageOptions = {
        hideBackgroundDots: true,
        imageSize: qrStylingProps.imageSize || 0.4,
        margin: qrStylingProps.imageMargin || 0,
        crossOrigin: 'anonymous',
      };
      options.image = qrStylingProps.image || qrStylingProps.logoUrl;
    }

    return options;
  }, [
    qrStylingProps.dotsType,
    qrStylingProps.dotsColor,
    qrStylingProps.dotsGradient,
    qrStylingProps.dotsGradientType,
    qrStylingProps.dotsGradientRotation,
    qrStylingProps.dotsGradientColor1,
    qrStylingProps.dotsGradientColor2,
    qrStylingProps.bgColor,
    qrStylingProps.backgroundColor,
    qrStylingProps.cornerSquareType,
    qrStylingProps.cornerSquareColor,
    qrStylingProps.cornersGradient,
    qrStylingProps.cornersGradientType,
    qrStylingProps.cornersGradientColor1,
    qrStylingProps.cornersGradientColor2,
    qrStylingProps.cornerDotType,
    qrStylingProps.cornerDotColor,
    qrStylingProps.image,
    qrStylingProps.logoUrl,
    qrStylingProps.imageSize,
    qrStylingProps.imageMargin,
    qrStylingProps.errorCorrectionLevel
  ]);

  // Initialize QR Code when expanded with lazy loading
  useEffect(() => {
    if (!isExpanded || !qrRef.current) return;

    const timeoutId = setTimeout(() => {
      if (qrRef.current) {
        // Clear existing QR code
        qrRef.current.innerHTML = '';

        qrCodeRef.current = new QRCodeStyling(qrCodeOptions);
        qrCodeRef.current.append(qrRef.current);
      }
    }, 100); // Small delay for lazy loading

    // Cleanup when collapsed or when dependencies change
    return () => {
      clearTimeout(timeoutId);
      if (!isExpanded && qrCodeRef.current) {
        qrCodeRef.current = null;
      }
    };
  }, [isExpanded, qrCodeOptions]);

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
          <td colSpan={5} className="py-6 px-4">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* QR Code Preview */}
              <div className="flex-shrink-0">
                <div className="bg-white rounded-xl p-4 shadow-lg">
                  <div ref={qrRef} className="w-[200px] h-[200px]"></div>
                </div>
              </div>

              {/* QR Code Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="text-white ml-2 font-medium">{qr.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Scans:</span>
                      <span className="text-white ml-2 font-medium">{qr.scans.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="text-white ml-2 font-medium">{formatDate(qr.created)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="text-green-400 ml-2 font-medium capitalize">{qr.status}</span>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div>
                  <h5 className="text-sm font-semibold text-white mb-2">Content</h5>
                  {(() => {
                    try {
                      const contentDecoded = JSON.parse(qr.content);
                      switch (qr.type) {
                        case 'url':
                          return (
                            <div className="bg-black/30 rounded-lg p-3 text-sm space-y-1">
                              <div>
                                <span className="text-gray-500">URL:</span>
                                <span className="text-white ml-2 break-all">{contentDecoded.url}</span>
                              </div>
                            </div>
                          );
                        case 'email':
                          return (
                            <div className="bg-black/30 rounded-lg p-3 text-sm space-y-1">
                              <div>
                                <span className="text-gray-500">Email:</span>
                                <span className="text-white ml-2">{contentDecoded.email}</span>
                              </div>
                              {contentDecoded.subject && (
                                <div>
                                  <span className="text-gray-500">Subject:</span>
                                  <span className="text-white ml-2">{contentDecoded.subject}</span>
                                </div>
                              )}
                              {contentDecoded.body && (
                                <div>
                                  <span className="text-gray-500">Body:</span>
                                  <span className="text-white ml-2">{contentDecoded.body}</span>
                                </div>
                              )}
                            </div>
                          );
                        case 'phone':
                          return (
                            <div className="bg-black/30 rounded-lg p-3 text-sm space-y-1">
                              <div>
                                <span className="text-gray-500">Phone:</span>
                                <span className="text-white ml-2">{contentDecoded.phone}</span>
                              </div>
                            </div>
                          );
                        case 'sms':
                          return (
                            <div className="bg-black/30 rounded-lg p-3 text-sm space-y-1">
                              <div>
                                <span className="text-gray-500">Number:</span>
                                <span className="text-white ml-2">{contentDecoded.number}</span>
                              </div>
                              {contentDecoded.message && (
                                <div>
                                  <span className="text-gray-500">Message:</span>
                                  <span className="text-white ml-2">{contentDecoded.message}</span>
                                </div>
                              )}
                            </div>
                          );
                        case 'text':
                          return (
                            <div className="bg-black/30 rounded-lg p-3 text-sm space-y-1">
                              <div>
                                <span className="text-gray-500">Text:</span>
                                <span className="text-white ml-2 break-all">{contentDecoded.text}</span>
                              </div>
                            </div>
                          );
                        case 'vcard':
                        case 'mecard':
                          return (
                            <div className="bg-black/30 rounded-lg p-3 text-sm space-y-1">
                              {contentDecoded.name && (
                                <div>
                                  <span className="text-gray-500">Name:</span>
                                  <span className="text-white ml-2">{contentDecoded.name}</span>
                                </div>
                              )}
                              {contentDecoded.phone && (
                                <div>
                                  <span className="text-gray-500">Phone:</span>
                                  <span className="text-white ml-2">{contentDecoded.phone}</span>
                                </div>
                              )}
                              {contentDecoded.email && (
                                <div>
                                  <span className="text-gray-500">Email:</span>
                                  <span className="text-white ml-2">{contentDecoded.email}</span>
                                </div>
                              )}
                              {contentDecoded.org && (
                                <div>
                                  <span className="text-gray-500">Organization:</span>
                                  <span className="text-white ml-2">{contentDecoded.org}</span>
                                </div>
                              )}
                              {contentDecoded.url && (
                                <div>
                                  <span className="text-gray-500">Website:</span>
                                  <span className="text-white ml-2">{contentDecoded.url}</span>
                                </div>
                              )}
                            </div>
                          );
                        case 'location':
                          return (
                            <div className="bg-black/30 rounded-lg p-3 text-sm space-y-1">
                              <div>
                                <span className="text-gray-500">Latitude:</span>
                                <span className="text-white ml-2">{contentDecoded.latitude}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Longitude:</span>
                                <span className="text-white ml-2">{contentDecoded.longitude}</span>
                              </div>
                            </div>
                          );
                        case 'wifi':
                          return (
                            <div className="bg-black/30 rounded-lg p-3 text-sm space-y-1">
                              {contentDecoded.ssid && (
                                <div>
                                  <span className="text-gray-500">Network:</span>
                                  <span className="text-white ml-2">{contentDecoded.ssid}</span>
                                </div>
                              )}
                              {contentDecoded.encryption && (
                                <div>
                                  <span className="text-gray-500">Encryption:</span>
                                  <span className="text-white ml-2">{contentDecoded.encryption}</span>
                                </div>
                              )}
                              {contentDecoded.password && (
                                <div>
                                  <span className="text-gray-500">Password:</span>
                                  <span className="text-white ml-2">{contentDecoded.password}</span>
                                </div>
                              )}
                            </div>
                          );
                        case 'event':
                          return (
                            <div className="bg-black/30 rounded-lg p-3 text-sm space-y-1">
                              {contentDecoded.title && (
                                <div>
                                  <span className="text-gray-500">Title:</span>
                                  <span className="text-white ml-2">{contentDecoded.title}</span>
                                </div>
                              )}
                              {contentDecoded.location && (
                                <div>
                                  <span className="text-gray-500">Location:</span>
                                  <span className="text-white ml-2">{contentDecoded.location}</span>
                                </div>
                              )}
                              {contentDecoded.start && (
                                <div>
                                  <span className="text-gray-500">Start:</span>
                                  <span className="text-white ml-2">{contentDecoded.start}</span>
                                </div>
                              )}
                              {contentDecoded.end && (
                                <div>
                                  <span className="text-gray-500">End:</span>
                                  <span className="text-white ml-2">{contentDecoded.end}</span>
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

                <div className="space-y-4">
                  <h5 className="text-sm font-semibold text-white mb-2">QR Code Styling</h5>

                  {/* Primary Settings - Always Visible */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ColorSwatch
                      color={qrStylingProps.dotsColor || '#000000'}
                      label="Dots Color"
                      showHex={true}
                    />
                    {qrStylingProps.dotsGradient ? (
                      <GradientPreview
                        type={qrStylingProps.dotsGradientType || 'linear'}
                        color1={qrStylingProps.dotsGradientColor1 || '#000000'}
                        color2={qrStylingProps.dotsGradientColor2 || '#000000'}
                        label="Gradient"
                        size="small"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">Gradient:</span>
                        <span className="text-gray-500 text-xs">None</span>
                      </div>
                    )}
                  </div>

                  {/* Colors & Gradients Section */}
                  <StylingSection
                    title="Colors & Gradients"
                    defaultExpanded={sectionExpansion.colorsAndGradients}
                  >
                    <div className="space-y-3">
                      {/* Dots Colors */}
                      {(qrStylingProps.dotsGradient || qrStylingProps.dotsColor !== '#000000') && (
                        <div className="space-y-2">
                          <h6 className="text-xs font-medium text-gray-300">Dots Color</h6>
                          {qrStylingProps.dotsGradient ? (
                            <div className="flex items-center gap-3">
                              <GradientPreview
                                type={qrStylingProps.dotsGradientType || 'linear'}
                                color1={qrStylingProps.dotsGradientColor1 || '#000000'}
                                color2={qrStylingProps.dotsGradientColor2 || '#000000'}
                                size="small"
                                showColors={false}
                              />
                              <div className="flex gap-1">
                                <ColorSwatch
                                  color={qrStylingProps.dotsGradientColor1 || '#000000'}
                                  size="small"
                                  showHex={false}
                                />
                                <ColorSwatch
                                  color={qrStylingProps.dotsGradientColor2 || '#000000'}
                                  size="small"
                                  showHex={false}
                                />
                              </div>
                            </div>
                          ) : (
                            <ColorSwatch
                              color={qrStylingProps.dotsColor || '#000000'}
                              showHex={true}
                            />
                          )}
                        </div>
                      )}

                      {/* Corners Colors */}
                      {(qrStylingProps.cornersGradient || qrStylingProps.cornersColor !== '#000000') && (
                        <div className="space-y-2">
                          <h6 className="text-xs font-medium text-gray-300">Corners Color</h6>
                          {qrStylingProps.cornersGradient ? (
                            <div className="flex items-center gap-3">
                              <GradientPreview
                                type={qrStylingProps.cornersGradientType || 'linear'}
                                color1={qrStylingProps.cornersGradientColor1 || '#000000'}
                                color2={qrStylingProps.cornersGradientColor2 || '#000000'}
                                size="small"
                                showColors={false}
                              />
                              <div className="flex gap-1">
                                <ColorSwatch
                                  color={qrStylingProps.cornersGradientColor1 || '#000000'}
                                  size="small"
                                  showHex={false}
                                />
                                <ColorSwatch
                                  color={qrStylingProps.cornersGradientColor2 || '#000000'}
                                  size="small"
                                  showHex={false}
                                />
                              </div>
                            </div>
                          ) : (
                            <ColorSwatch
                              color={qrStylingProps.cornersColor || '#000000'}
                              showHex={true}
                            />
                          )}
                        </div>
                      )}

                      {/* Background Colors */}
                      {(qrStylingProps.backgroundGradient || qrStylingProps.backgroundColor !== '#FFFFFF') && (
                        <div className="space-y-2">
                          <h6 className="text-xs font-medium text-gray-300">Background</h6>
                          {qrStylingProps.backgroundGradient ? (
                            <div className="flex items-center gap-3">
                              <GradientPreview
                                type={qrStylingProps.backgroundGradientType || 'radial'}
                                color1={qrStylingProps.backgroundGradientColor1 || '#FFFFFF'}
                                color2={qrStylingProps.backgroundGradientColor2 || '#FFFFFF'}
                                size="small"
                                showColors={false}
                              />
                              <div className="flex gap-1">
                                <ColorSwatch
                                  color={qrStylingProps.backgroundGradientColor1 || '#FFFFFF'}
                                  size="small"
                                  showHex={false}
                                />
                                <ColorSwatch
                                  color={qrStylingProps.backgroundGradientColor2 || '#FFFFFF'}
                                  size="small"
                                  showHex={false}
                                />
                              </div>
                            </div>
                          ) : (
                            <ColorSwatch
                              color={qrStylingProps.backgroundColor || '#FFFFFF'}
                              showHex={true}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </StylingSection>

                  {/* Shapes & Styles Section */}
                  <StylingSection
                    title="Shapes & Styles"
                    defaultExpanded={sectionExpansion.shapesAndStyles}
                  >
                    <div className="space-y-3">
                      {/* Dots Shape */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Dots Shape:</span>
                        <ShapeIndicator
                          type="dots"
                          shape={qrStylingProps.dotsType || 'rounded'}
                        />
                      </div>

                      {/* Corners Shape */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Corners Shape:</span>
                        <ShapeIndicator
                          type="corners"
                          shape={qrStylingProps.cornerSquareType || 'square'}
                        />
                      </div>

                      {/* Corner Dots Shape */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Corner Dots:</span>
                        <ShapeIndicator
                          type="dots"
                          shape={qrStylingProps.cornerDotType || 'dot'}
                        />
                      </div>

                      {/* Additional Shape Options */}
                      {qrStylingProps.dotRotation && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">Dot Rotation:</span>
                          <span className="text-white text-sm">{qrStylingProps.dotRotation}°</span>
                        </div>
                      )}
                    </div>
                  </StylingSection>

                  {/* Logo & Images Section */}
                  <StylingSection
                    title="Logo & Images"
                    defaultExpanded={sectionExpansion.logoAndImages}
                  >
                    <div className="space-y-3">
                      {/* Logo */}
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
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs">Image Background:</span>
                          <ColorSwatch
                            color={qrStylingProps.imageBackgroundColor || '#FFFFFF'}
                            size="small"
                            showHex={true}
                          />
                        </div>
                      )}
                    </div>
                  </StylingSection>

                  {/* Advanced Settings Section */}
                  <StylingSection
                    title="Advanced Settings"
                    defaultExpanded={sectionExpansion.advancedSettings}
                  >
                    <div className="space-y-3">
                      {/* Error Correction Level */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Error Correction:</span>
                        <span className="text-white text-sm font-medium">{qrStylingProps.errorCorrectionLevel || 'H'}</span>
                      </div>

                      {/* QR Code Frame */}
                      {qrStylingProps.frame && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">Frame:</span>
                          <span className="text-white text-sm capitalize">{qrStylingProps.frame}</span>
                        </div>
                      )}

                      {/* Margins */}
                      {qrStylingProps.margin !== undefined && qrStylingProps.margin !== 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">Margin:</span>
                          <span className="text-white text-sm">{qrStylingProps.margin}px</span>
                        </div>
                      )}

                      {/* Border Radius */}
                      {qrStylingProps.borderRadius && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">Border Radius:</span>
                          <span className="text-white text-sm">{qrStylingProps.borderRadius}px</span>
                        </div>
                      )}
                    </div>
                  </StylingSection>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-sm font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download QR Code
                  </button>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Edit Styling
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
