import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Sparkles, FileText, Palette, Save } from 'lucide-react';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { useAuth } from '../contexts/AuthContext';
import { createQRCode, type QRCodeData } from '../services/qrCodeCreateService';

type Step = 1 | 2 | 3 | 4;

export default function CreateQRCode() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [qrName, setQrName] = useState('');
  const [saving, setSaving] = useState(false);

  const generateContentString = (qrData: QRCodeData): string => {
    const { type, content } = qrData;

    switch (type) {
      case 'url':
        return content.url || '';
      case 'text':
        return content.text || '';
      case 'email':
        let emailStr = `mailto:${content.email || ''}`;
        const params = [];
        if (content.subject) params.push(`subject=${encodeURIComponent(content.subject)}`);
        if (content.body) params.push(`body=${encodeURIComponent(content.body)}`);
        if (params.length > 0) emailStr += '?' + params.join('&');
        return emailStr;
      case 'phone':
        return `tel:${content.phone || ''}`;
      case 'sms':
        let smsStr = `sms:${content.number || ''}`;
        if (content.message) smsStr += `?body=${encodeURIComponent(content.message)}`;
        return smsStr;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${content.name || ''}\nORG:${content.org || ''}\nTEL:${content.phone || ''}\nEMAIL:${content.email || ''}\nURL:${content.url || ''}\nEND:VCARD`;
      case 'mecard':
        return `MECARD:N:${content.name || ''};TEL:${content.phone || ''};EMAIL:${content.email || ''};;`;
      case 'location':
        return `geo:${content.latitude || ''},${content.longitude || ''}`;
      case 'facebook':
      case 'twitter':
      case 'youtube':
        return content.url || '';
      case 'wifi':
        return `WIFI:T:${content.encryption || ''};S:${content.ssid || ''};P:${content.password || ''};;`;
      case 'event':
        return `BEGIN:VEVENT\nSUMMARY:${content.title || ''}\nLOCATION:${content.location || ''}\nDTSTART:${content.start || ''}\nDTEND:${content.end || ''}\nEND:VEVENT`;
      default:
        return '';
    }
  };

  const handleSave = async (qrData: QRCodeData) => {
    if (!qrName.trim()) {
      alert('Please enter a name for your QR code');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving QR code:', {
        name: qrName,
        content: qrData.content,
        type: qrData.type,
        styling: qrData.styling
      });

      // Call the API with the content object directly
      const result = await createQRCode(
        qrName,
        qrData.content,
        qrData.type,
        qrData.styling
      );

      if (result.success) {
        console.log('QR Code created successfully:', result);
        // Navigate to dashboard after successful save
        navigate('/dashboard');
      } else {
        console.error('Failed to create QR code:', result.error);

        // Handle authentication errors specifically
        if (result.error?.includes('Session expired') || result.error?.includes('logged in')) {
          alert('Your session has expired. Please log in again.');
          navigate('/login');
        } else {
          alert(result.error || 'Failed to save QR code. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving QR code:', error);
      alert('An unexpected error occurred while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, label: 'QR Type', icon: Zap },
    { number: 2, label: 'Content Type', icon: FileText },
    { number: 3, label: 'Content & Style', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Fixed Step Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar with Back Button */}
          <div className="flex items-center justify-between py-4 border-b border-white/10">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>

          {/* Step Navigation */}
          <div className="py-4">
            <div className="flex items-center justify-center gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                const isClickable = true; // Allow jumping to any step

                return (
                  <div key={step.number} className="flex items-center">
                    {/* Step Item */}
                    <button
                      onClick={() => isClickable && setCurrentStep(step.number as Step)}
                      disabled={!isClickable}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                          : isCompleted
                          ? 'bg-white/10 text-white hover:bg-white/20'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      } ${!isClickable && 'cursor-not-allowed opacity-50'}`}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          isActive
                            ? 'bg-white/20'
                            : isCompleted
                            ? 'bg-white/10'
                            : 'bg-white/5'
                        }`}
                      >
                        {isCompleted ? (
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-medium opacity-70">Step {step.number}</div>
                        <div className="text-sm font-semibold">{step.label}</div>
                      </div>
                    </button>

                    {/* Connector Line */}
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 w-12 mx-2 ${
                          currentStep > step.number ? 'bg-purple-600' : 'bg-white/10'
                        }`}
                      ></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - with padding for fixed nav */}
      <div className="pt-48 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <QRCodeGenerator
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            onSave={handleSave}
            saving={saving}
            qrName={qrName}
            onNameChange={setQrName}
          />
        </div>
      </div>
    </div>
  );
}
