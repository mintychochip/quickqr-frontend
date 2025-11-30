import { ArrowRight, Zap, BarChart3, RefreshCw, QrCode } from 'lucide-react';

export default function DynamicStaticComparison() {
  return (
    <section className="relative py-20 bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 mb-6">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-300">Smart QR Solutions</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Dynamic vs Static QR Codes
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Choose the right QR code type for your needs. Both options offer different advantages for modern businesses.
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Static QR Codes */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-sm"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-500/20 rounded-lg flex-shrink-0">
                  <QrCode className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Static QR Codes</h3>
                  <p className="text-sm text-gray-400">Perfect for one-time use</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Fixed Destination</h4>
                    <p className="text-gray-400 text-sm">Links to one permanent URL that cannot be changed</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">One-Time Creation</h4>
                    <p className="text-gray-400 text-sm">Generate once and use indefinitely without changes</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">No Tracking</h4>
                    <p className="text-gray-400 text-sm">Cannot monitor scan performance or user engagement</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Print-Friendly</h4>
                    <p className="text-gray-400 text-sm">Ideal for physical media and offline marketing</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <p className="text-blue-300 text-sm">
                  <span className="font-semibold">Best for:</span> Print materials, business cards, event posters, permanent signage
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic QR Codes */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-sm"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-500/20 rounded-lg flex-shrink-0">
                  <RefreshCw className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Dynamic QR Codes</h3>
                  <p className="text-sm text-gray-400">Smart, adaptable, trackable</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Change Destination</h4>
                    <p className="text-gray-400 text-sm">Update target URL anytime without creating a new code</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Real-Time Analytics</h4>
                    <p className="text-gray-400 text-sm">Track scans, locations, devices, and user behavior</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">A/B Testing</h4>
                    <p className="text-gray-400 text-sm">Test different destinations and optimize performance</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Advanced Features</h4>
                    <p className="text-gray-400 text-sm">Password protection, expiration dates, custom domains</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                <p className="text-purple-300 text-sm">
                  <span className="font-semibold">Best for:</span> Digital campaigns, tracking marketing, flexible business needs
                </p>
              </div>
            </div>
          </div>
        </div>

        
        {/* CTA */}
        <div className="text-center">
          <div className="inline-block bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-12">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Start with the Right QR Code Type
            </h3>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
              Create both static and dynamic QR codes with QuickQR. Start with our free plan and upgrade as your needs grow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/create"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="w-5 h-5" />
                Create QR Code
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 border border-white/20 rounded-lg font-semibold text-white hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <BarChart3 className="w-5 h-5" />
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}