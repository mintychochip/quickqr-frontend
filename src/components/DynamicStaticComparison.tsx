import { ArrowRight, Zap, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DynamicStaticComparison() {
  return (
    <section className="relative py-20 bg-gray-50 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your QR Code Type
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Static for simplicity. Dynamic for flexibility.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Static Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl opacity-20 group-hover:opacity-30 transition blur"></div>
            <div className="relative bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Static</h3>
                <p className="text-gray-600 text-sm">Fixed & forever free</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">100% free forever</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">Works offline</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">Perfect for print</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">Cannot edit after creation</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm">No tracking or analytics</span>
                </li>
              </ul>

              <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                Best for: Business cards, posters, permanent links
              </div>
            </div>
          </div>

          {/* Dynamic Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl opacity-30 group-hover:opacity-50 transition blur"></div>
            <div className="relative bg-white border border-teal-500/30 rounded-2xl p-8 shadow-md">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Dynamic</h3>
                <p className="text-gray-600 text-sm">Smart & trackable</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">Edit destination anytime</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">Full analytics & tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">Location & device data</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">A/B testing ready</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 flex-shrink-0 mt-0.5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                  </div>
                  <span className="text-gray-700 text-sm">Paid feature</span>
                </li>
              </ul>

              <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                Best for: Campaigns, events, flexible marketing
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-teal-500 hover:bg-teal-600 rounded-lg font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-5 h-5" />
            Create Your QR Code
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}