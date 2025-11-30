import { Quote, TrendingDown, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

export default function FounderStory() {
  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 mb-4">
            <AlertCircle className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-300">Founder's Story</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            The Frustration That Started It All
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            How the subscription nightmare led to a better way
          </p>
        </div>

        {/* Quote Card */}
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-2xl blur opacity-25"></div>
          <div className="relative bg-black border border-white/10 rounded-2xl p-8 md:p-12">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="lg:w-1/3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 lg:mb-0">
                  <Quote className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="lg:w-2/3">
                <blockquote className="text-xl md:text-2xl text-gray-100 italic leading-relaxed">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 font-normal not-italic">
                    "I was tired about seeing the monthly subscriptions, I wanted a product that was pay as you go."
                  </span>
                </blockquote>
                <p className="text-gray-400 mt-4 text-lg">
                  <span className="font-semibold text-white">— Founder, QuickQR</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Story Content */}
        <div className="mt-12 space-y-12">
          {/* The Problem */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <TrendingDown className="w-6 h-6 text-red-400" />
              The Problem
            </h3>
            <div className="space-y-6 text-gray-300 leading-relaxed">
              <p>
                As a small business owner, I was constantly signing up for tools with promising features, only to realize I was paying for capacity I never used. Every month, the bills would pile up:
              </p>
              <ul className="space-y-3 ml-4">
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">•</span>
                  <div>
                    <span className="font-semibold text-white">Design software:</span> $50/month for features I touched twice
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">•</span>
                  <div>
                    <span className="font-semibold text-white">Analytics tool:</span> $199/month for months with low traffic
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">•</span>
                  <div>
                    <span className="font-semibold text-white">Email marketing:</span> $79/month for 500 subscribers, I had 200
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">•</span>
                  <div>
                    <span className="font-semibold text-white">Project management:</span> $25/month per team member, for a team of 3 that barely used it
                  </div>
                </li>
              </ul>
              <p className="mt-6">
                <span className="text-green-400 font-semibold">$353 per month</span>
                <span className="text-gray-400"> in unused software subscriptions. That's over $4,200 per year!</span>
              </p>
            </div>
          </div>

          {/* The Realization */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-yellow-400" />
              The Breaking Point
            </h3>
            <p className="text-gray-300 leading-relaxed mb-6">
              One month, while reviewing our expenses, I noticed something troubling. Our QR code usage was seasonal - busy during campaigns, quiet during planning phases. Yet we were paying the same monthly fee regardless.
            </p>
            <div className="bg-black/50 rounded-lg p-6 border border-white/10">
              <div className="grid grid md:grid-cols-2 gap-6 text-center">
                <div>
                  <p className="text-4xl font-bold text-purple-400">20</p>
                  <p className="text-gray-400">QR codes created in peak month</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-blue-400">3</p>
                  <p className="text-gray-400">QR codes created in slow month</p>
                </div>
              </div>
              <p className="text-gray-300 mt-4">
                Same monthly subscription cost, but 85% less usage.
              </p>
            </div>
          </div>

          {/* The Question */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              The Question
            </h3>
            <p className="text-gray-300 leading-relaxed">
              I started asking myself: <span className="text-white font-semibold">"Why can't I pay for what I actually use?"</span>
              <span className="italic text-gray-400">If I create 100 QR codes one month and 1,000 the next, why should I pay the same price both months?</span>
            </p>
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                <span className="text-gray-300">Software should scale with your needs</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                <span className="text-gray-300">Pricing should be predictable and fair</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                <span className="text-gray-300">No long-term commitments for tools you might not need later</span>
              </div>
            </div>
          </div>

          {/* The Solution */}
          <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-xl border border-purple-500/30 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-green-400">✓</span>
              The Solution: QuickQR
            </h3>
            <p className="text-gray-100 leading-relaxed">
              That's when the idea for QuickQR was born. A QR code generator that follows a simple principle:
            </p>
            <div className="mt-6 bg-black/50 rounded-lg p-6 border border-white/10">
              <p className="text-xl font-bold text-center text-purple-300 mb-2">
                Pay as you go, not as you go.
              </p>
              <p className="text-gray-300 text-center leading-relaxed">
                Start with 1,000 free scans every month. Only pay for additional scans when you actually use them. No contracts, no commitments, no surprise bills.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">$0</div>
                <p className="text-gray-400">Free scans every month</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">$0.005</div>
                <p className="text-gray-400">Per additional scan</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">↓$0.003</div>
                <p className="text-gray-400">As you scale up</p>
              </div>
            </div>
          </div>

          {/* The Impact */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">The Impact</h3>
            <p className="text-gray-300 leading-relaxed mb-6">
              By switching to our pay-as-you-go model, businesses and individuals can:
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-green-400 text-xl">→</span>
                <div>
                  <span className="text-white font-semibold">Save 60-80%</span> on software costs during slow periods
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 text-xl">→</span>
                <div>
                  <span className="text-white font-semibold">Scale naturally</span> without being penalized for growth
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 text-xl">→</span>
                <div>
                  <span className="text-white font-semibold">Invest saved money</span> back into growing their business
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 text-xl">→</span>
                <div>
                  <span className="text-white font-semibold">Eliminate waste</span> and pay only for actual value received
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-black/50 rounded-lg border border-white/10">
              <p className="text-center text-gray-300 italic">
                "QuickQR isn't just another QR code generator. It's a movement toward fair, transparent software pricing that benefits everyone."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}