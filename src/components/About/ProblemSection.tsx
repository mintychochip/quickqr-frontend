import { TrendingDown, DollarSign, Lock, AlertTriangle } from 'lucide-react';

export default function ProblemSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-red-50 border border-red-200 mb-4">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-700 font-medium">The Problem</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Traditional QR Code Solutions Fall Short
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Most QR code platforms force you into expensive subscriptions with features you don't need.
          </p>
        </div>

        {/* Problem Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Expensive Subscriptions */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Expensive Subscriptions</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Traditional QR code platforms charge $25-199/month for features most users never touch. You end up paying for enterprise analytics when you just need a simple QR code.
            </p>
          </div>

          {/* Vendor Lock-in */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Lock className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Data Lock-in</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Once you generate codes on their platform, your analytics and tracking data are locked in their system. Migrating to another service means starting from scratch.
            </p>
          </div>

          {/* Complex Setup */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Complex Setup</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Many platforms require account creation, payment information, and complicated configuration just to generate a single QR code. What should take seconds becomes a multi-step process.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <p className="text-lg text-gray-600 mb-6">
            QuickQR was built to solve these problems.
            <span className="text-gray-900 font-semibold"> Simple, fast, and affordable.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
