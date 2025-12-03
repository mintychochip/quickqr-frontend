import { Zap, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Features() {
  return (
    <section className="relative py-24 bg-gray-50">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-full mb-6">
            <Zap className="w-4 h-4 text-teal-600" />
            <span className="text-sm text-teal-700">Why QuickQR?</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Generate & Use Only
            <span className="block text-teal-600">
              What You Need
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stop paying for QR code subscriptions you don't use. We built QuickQR with a simple philosophy:
            powerful features, pay-as-you-go pricing, and no unnecessary complexity.
          </p>
        </div>

        {/* Founder Quote */}
        <div className="mb-20">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal-500 rounded-xl flex-shrink-0">
                <Quote className="w-6 h-6 text-white" />
              </div>
              <div>
                <blockquote className="text-2xl text-gray-900 italic mb-4">
                  "I was tired about seeing the monthly subscriptions, I wanted a product that was pay as you go."
                </blockquote>
                <p className="text-gray-600">— Founder, QuickQR</p>
              </div>
            </div>
          </div>
        </div>

        {/* Problem & Solution */}
        <div className="grid md:grid-cols-2 gap-8 mb-20 max-w-6xl mx-auto">
          {/* The Problem */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              The Problem with Subscriptions
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Traditional QR platforms charge monthly fees regardless of usage. You pay the same amount whether
              you generate 10 codes or 1,000 codes. Month after month, you're billed for capacity you don't need.
            </p>
          </div>

          {/* The Solution */}
          <div className="bg-white border border-teal-200 rounded-xl p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              The QuickQR Solution
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Pay only for what you actually use. Start with 1,000 free scans every month, then pay as you go.
              No contracts, no commitments, no surprise bills.
            </p>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="text-center mb-20">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Simple, Transparent Pricing</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 bg-gray-50 rounded-xl">
                <div className="text-3xl font-bold text-green-500 mb-2">1,000</div>
                <p className="text-gray-600 text-sm">Free scans every month</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-500 mb-2">$0.005</div>
                <p className="text-gray-600 text-sm">Per additional scan</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl">
                <div className="text-3xl font-bold text-teal-500 mb-2">$0.003</div>
                <p className="text-gray-600 text-sm">As you scale up</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced CTA Section */}
        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-6 p-12 bg-white rounded-3xl border border-gray-200 shadow-lg max-w-md mx-auto">
            <h3 className="text-3xl font-bold text-gray-900">
              Try QuickQR for Free
            </h3>
            <p className="text-gray-600">
              Start generating professional QR codes with pay-as-you-go pricing
            </p>
            <Link
              to="/signup"
              className="px-8 py-4 bg-teal-500 hover:bg-teal-600 rounded-lg font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Create Your First Code
              </div>
            </Link>
            <p className="text-sm text-gray-500">
              No credit card required • 1,000 free scans monthly
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
