import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Quote } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-full mb-6">
              <Zap className="w-4 h-4 text-teal-600" />
              <span className="text-sm text-teal-700">Our Story</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
              Why We Built
              <span className="block text-teal-600">
                QuickQR
              </span>
            </h1>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We were tired of paying monthly subscriptions for software we only used occasionally. So we built a better way.
            </p>
          </div>

          {/* Founder Quote */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-16 shadow-sm">
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

          {/* The Problem */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 mb-16 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">The Problem with Subscriptions</h2>
            <p className="text-gray-600 leading-relaxed">
              Traditional QR code platforms charge monthly fees regardless of usage. You pay the same amount whether you use a service 10 times or 1,000 times.
              Month after month, you're billed for capacity you don't need. QuickQR changes that with simple pay-as-you-go pricing.
            </p>
          </div>

          {/* The Solution */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 mb-16 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">The QuickQR Solution</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Pay only for what you actually use. Start with 1,000 free scans every month, then pay as you go.
              No contracts, no commitments, no surprise bills.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">1,000</div>
                <p className="text-gray-600 text-sm">Free scans every month</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-2">$0.005</div>
                <p className="text-gray-600 text-sm">Per additional scan</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-teal-600 mb-2">$0.003</div>
                <p className="text-gray-600 text-sm">As you scale up</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="inline-block bg-white border border-gray-200 rounded-2xl p-12 shadow-sm">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                See How It Works
              </h2>
              <p className="text-gray-600 mb-8 max-w-xl">
                Start with 1,000 free scans per month. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="w-5 h-5" />
                  Try QuickQR Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  View Pricing Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}