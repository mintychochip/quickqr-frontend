import { Zap, Download, Sparkles } from 'lucide-react';
import InteractiveQRGenerator from './InteractiveQRGenerator';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-black via-zinc-900 to-black pt-20">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">Lightning-fast QR generation</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
            Create Stunning
            <span className="block text-white">
              QR Codes
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Generate beautiful, customizable QR codes in seconds. Professional quality,
            blazing fast, and completely free.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="group relative px-8 py-4 bg-white rounded-lg font-semibold text-black hover:bg-gray-100 transition-all duration-200">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Get Started Free
              </div>
            </button>

            <button className="px-8 py-4 bg-white/5 backdrop-blur-sm rounded-lg font-semibold text-white border border-white/20 hover:bg-white/10 hover:border-white/30 transition-all duration-200">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download Sample
              </div>
            </button>
          </div>
        </div>

        {/* Interactive QR Generator */}
        <InteractiveQRGenerator />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mt-16 pt-8 border-t border-white/10 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">10M+</div>
            <div className="text-sm text-gray-400">QR Codes Created</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">99.9%</div>
            <div className="text-sm text-gray-400">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">50+</div>
            <div className="text-sm text-gray-400">Countries</div>
          </div>
        </div>
      </div>
    </section>
  );
}
