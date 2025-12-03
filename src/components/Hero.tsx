import { Zap, Download, Sparkles } from 'lucide-react';
import InteractiveQRGenerator from './InteractiveQRGenerator';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white pt-20">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 mb-6">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span className="text-sm text-gray-700">Lightning-fast QR generation</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900">
            <span className="text-teal-600">Quick</span>-ly Create
            <span className="block">
              <span className="text-teal-600">QR</span> Codes
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Generate QR codes in seconds. Fast and free.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="group relative px-8 py-4 bg-teal-500 hover:bg-teal-600 rounded-lg font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Generate QR Code Now
              </div>
            </button>

            <button className="px-8 py-4 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 shadow-sm transition-all duration-200">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                View Examples
              </div>
            </button>
          </div>
        </div>

        {/* Interactive QR Generator */}
        <InteractiveQRGenerator />
      </div>
    </section>
  );
}
