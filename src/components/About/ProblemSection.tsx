import { TrendingDown, AlertTriangle, DollarSign, Lock, Calendar, BarChart3 } from 'lucide-react';

export default function ProblemSection() {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-300">The Subscription Crisis</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            The Hidden Cost of Monthly Subscriptions
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Businesses and individuals are wasting billions on software they don't use. Here's how the subscription model is broken.
          </p>
        </div>

        {/* Main Stat */}
        <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 mb-12">
          <div className="text-center">
            <div className="text-5xl md:text-6xl font-bold text-red-400 mb-4">
              $300B
            </div>
            <p className="text-xl text-gray-300 mb-2">
              Wasted annually on unused software subscriptions
            </p>
            <p className="text-gray-400">
              That's larger than the GDP of many countries - all going to waste
            </p>
          </div>
        </div>

        {/* Problem Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Paying for Idle Capacity */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Paying for Nothing</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              68% of businesses pay for software features they never use. You're subsidizing features you didn't ask for and won't touch.
            </p>
            <div className="mt-4 text-2xl font-bold text-red-400">
              68%
            </div>
            <p className="text-sm text-gray-400">of unused features per subscription</p>
          </div>

          {/* Vendor Lock-in */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Lock className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Vendor Lock-in</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Once your data is in their system, leaving becomes expensive and complicated. They count on you staying forever.
            </p>
            <div className="mt-4 text-2xl font-bold text-orange-400">
              74%
            </div>
            <p className="text-sm text-gray-400">stay due to switching costs</p>
          </div>

          {/* Complex Pricing */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Complex Pricing</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Hidden fees, surprise charges, and confusing tiers make it impossible to predict your actual monthly costs.
            </p>
            <div className="mt-4 text-2xl font-bold text-yellow-400">
              47%
            </div>
            <p className="text-sm text-gray-400">have unexpected overages</p>
          </div>
        </div>

        {/* The Reality Check */}
        <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-purple-400" />
            The Monthly Reality Check
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">What You Think You're Paying For:</h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Constant value and utility</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Access when you need it</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Predictable monthly costs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Freedom to cancel anytime</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">What You're Actually Paying For:</h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Idle capacity and unused features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Software you use seasonally</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Hidden fees and overage charges</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>High switching costs and data lock-in</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* The Business Impact */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            The Business Impact
          </h3>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-red-400 mb-2">42%</div>
              <p className="text-gray-400 text-sm">of software budget wasted on unused tools</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-400 mb-2">3.5x</div>
              <p className="text-gray-400 text-sm">more expensive than pay-as-you-go</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400 mb-2">67%</div>
              <p className="text-gray-400 text-sm">of businesses oversubscribe to software</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400 mb-2">89%</div>
              <p className="text-gray-400 text-sm">want more flexible pricing options</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <p className="text-lg text-gray-300 mb-6">
            The subscription model isn't just expensive—it's fundamentally broken.
            <span className="text-white font-semibold"> There's a better way.</span>
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-xl border border-purple-500/30 rounded-lg">
            <span className="text-purple-400 font-semibold">Solution:</span>
            <span className="text-white">Pay only for what you actually use</span>
          </div>
        </div>
      </div>
    </section>
  );
}