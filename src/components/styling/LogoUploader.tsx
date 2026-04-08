import { useState, useCallback } from 'react';
import { Upload, X, ImageIcon, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface LogoUploaderProps {
  onLogoSelected: (file: File | null) => void;
  currentLogo?: string | null;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

export default function LogoUploader({ onLogoSelected, currentLogo }: LogoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentLogo || null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only PNG, JPG, and SVG files allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be under 2MB';
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onLogoSelected(file);
      toast.success('Logo uploaded!');
    };
    reader.readAsDataURL(file);
  }, [onLogoSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const clearLogo = () => {
    setPreview(null);
    setError(null);
    onLogoSelected(null);
  };

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Upload Zone or Preview */}
      {preview ? (
        <div className="relative bg-slate-50 rounded-xl p-6 border border-slate-200">
          <button
            onClick={clearLogo}
            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col items-center gap-3">
            <img 
              src={preview} 
              alt="Logo preview" 
              className="w-20 h-20 object-contain bg-white rounded-lg p-2 shadow-sm"
            />
            <p className="text-sm text-slate-600">Logo ready to overlay</p>
            <p className="text-xs text-slate-500">Error correction auto-set to High (30%)</p>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging 
              ? 'border-teal-500 bg-teal-50' 
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.svg"
            onChange={handleInputChange}
            className="hidden"
            id="logo-input"
          />
          
          <label htmlFor="logo-input" className="cursor-pointer">
            <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className="font-medium text-slate-900 mb-1">
              Drop your logo here
            </h4>
            <p className="text-sm text-slate-600 mb-3">
              or click to browse
            </p>
            <p className="text-xs text-slate-500">
              PNG, JPG, SVG • Max 2MB
            </p>
          </label>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Tip:</strong> Logo will appear centered on the QR code. 
          High error correction (30%) is required for logos to scan reliably.
        </p>
      </div>
    </div>
  );
}
