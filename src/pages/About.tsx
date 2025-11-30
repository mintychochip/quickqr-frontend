import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Quote } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-black pt-16">
      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/10 border border-purple-600/20 rounded-full mb-6">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Our Story</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
              Why We Built
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-purple-500">
                QuickQR
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              We were tired of paying monthly subscriptions for software we only used occasionally. So we built a better way.
            </p>
          </div>

          {/* Founder Quote */}
          <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-16">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex-shrink-0">
                <Quote className="w-6 h-6 text-white" />
              </div>
              <div>
                <blockquote className="text-2xl text-gray-100 italic mb-4">
                  "I was tired about seeing the monthly subscriptions, I wanted a product that was pay as you go."
                </blockquote>
                <p className="text-gray-400">— Founder, QuickQR</p>
              </div>
            </div>
          </div>

          {/* The Problem */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 mb-16">
            <h2 className="text-2xl font-bold text-white mb-4">The Problem with Subscriptions</h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              Businesses waste billions annually on unused software. You pay the same amount whether you use a service 10 times or 1,000 times.
              Month after month, you're billed for capacity you don't need.
            </p>
            <div className="text-center">
              <div className="text-4xl font-bold text-red-400 mb-2">$300B+</div>
              <p className="text-gray-400">Wasted yearly on unused subscriptions</p>
            </div>
          </div>

          {/* The Solution */}
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 rounded-xl p-8 mb-16">
            <h2 className="text-2xl font-bold text-white mb-4">The QuickQR Solution</h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              Pay only for what you actually use. Start with 1,000 free scans every month, then pay as you go.
              No contracts, no commitments, no surprise bills.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">1,000</div>
                <p className="text-gray-400 text-sm">Free scans every month</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-2">$0.005</div>
                <p className="text-gray-400 text-sm">Per additional scan</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-400 mb-2">$0.003</div>
                <p className="text-gray-400 text-sm">As you scale up</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="inline-block bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/10 rounded-2xl p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to stop wasting money?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl">
                Start with 1,000 free scans per month. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="w-5 h-5" />
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 border border-white/20 rounded-lg font-medium text-white hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}