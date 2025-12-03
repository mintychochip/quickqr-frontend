import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, FileText, Palette, Clock } from 'lucide-react';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { useAuth } from '../contexts/AuthContext';
import { createQRCode } from '../services/qrCodeCreateService';
import { QRCodeStylingProps, QRContentObject } from '../types/qrcode.types';

type Step = 1 | 2 | 3;

export default function CreateQRCode() {
  const navigate = useNavigate();
  useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [qrMode, setQrMode] = useState<'static' | 'dynamic'>('dynamic');
  const [qrName, setQrName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleStepChange = (step: number) => {
    setCurrentStep(step as Step);
  };

  const handleSave = async (qrData: { content: QRContentObject | string; type: string; styling: QRCodeStylingProps; mode: 'static' | 'dynamic' }) => {
    if (!qrName.trim()) {
      alert('Please enter a name for your QR code');
      return;
    }

    setSaving(true);
    try {
      // Call the API with the content object directly
      const result = await createQRCode(
        qrName,
        qrData.content,
        qrData.type,
        qrData.styling
      );

      if (result.success) {
        // Navigate to dashboard after successful save
        navigate('/dashboard');
      } else {
        // Handle authentication errors specifically
        if (result.error?.includes('Session expired') || result.error?.includes('logged in')) {
          alert('Your session has expired. Please log in again.');
          navigate('/login');
        } else {
          alert(result.error || 'Failed to save QR code. Please try again.');
        }
      }
    } catch (error) {
      alert('An unexpected error occurred while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, label: 'Mode', icon: Zap },
    { number: 2, label: 'Design', icon: Palette },
    { number: 3, label: qrMode === 'dynamic' ? 'Finalize' : 'Download', icon: qrMode === 'dynamic' ? Clock : FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Step Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar with Back Button */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
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
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all shadow-sm ${
                        isActive
                          ? 'bg-teal-500 text-white'
                          : isCompleted
                          ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                      } ${!isClickable && 'cursor-not-allowed opacity-50'}`}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          isActive
                            ? 'bg-white/20'
                            : isCompleted
                            ? 'bg-teal-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        {isCompleted ? (
                          <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
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
                          currentStep > step.number ? 'bg-teal-500' : 'bg-gray-200'
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
            onStepChange={handleStepChange}
            onSave={handleSave}
            saving={saving}
            qrName={qrName}
            onNameChange={setQrName}
            qrMode={qrMode}
            onModeChange={setQrMode}
          />
        </div>
      </div>
    </div>
  );
}
