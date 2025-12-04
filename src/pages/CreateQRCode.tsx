import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { useAuth } from '../contexts/AuthContext';
import { createQRCode } from '../services/qrCodeCreateService';
import { QRCodeStylingProps, QRContentObject } from '../types/qrcode.types';

export default function CreateQRCode() {
  const navigate = useNavigate();
  useAuth();
  const [qrMode, setQrMode] = useState<'static' | 'dynamic'>('dynamic');
  const [qrName, setQrName] = useState('');
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        {/* QR Generator */}
        <QRCodeGenerator
          currentStep={1}
          onStepChange={() => {}}
          onSave={handleSave}
          saving={saving}
          qrName={qrName}
          onNameChange={setQrName}
          qrMode={qrMode}
          onModeChange={setQrMode}
        />
      </div>
    </div>
  );
}
