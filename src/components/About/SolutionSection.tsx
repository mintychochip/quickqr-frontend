import { CheckCircle, Zap, TrendingUp, Shield, DollarSign, Users, ArrowRight } from 'lucide-react';

export default function SolutionSection() {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-300">The Better Way</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            QuickQR: Pay-As-You-Go Done Right
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Finally, a QR code solution that scales with your business instead of against it.
          </p>
        </div>

        {/* Main Solution Statement */}
        <div className="bg-gradient-to-br from-green-600/20 to-blue-600/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-8 mb-12">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-green-400 mb-4">
              1,000 Free Scans
            </div>
            <p className="text-xl text-gray-300 mb-6">
              Then only pay for what you actually use
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-1">$0.005</div>
                <p className="text-gray-400 text-sm">per additional scan</p>
              </div>
              <div className="text-gray-500 text-2xl">→</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-1">$0.003</div>
                <p className="text-gray-400 text-sm">as you scale up</p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Cost Control */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Total Cost Control</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Your bill scales with your usage. Slow month? You pay less. Busy month? You get more value. Never pay for idle capacity again.
            </p>
            <div className="mt-4 flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Predictable, fair pricing</span>
            </div>
          </div>

          {/* No Commitments */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white">No Commitments</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Use QuickQR when you need it, pause when you don't. No long-term contracts, no cancellation fees, no pressure to stay.
            </p>
            <div className="mt-4 flex items-center gap-2 text-blue-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Complete flexibility</span>
            </div>
          </div>

          {/* Natural Scaling */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Natural Scaling</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Start small, grow big. Our pricing gets better as you scale, rewarding your growth instead of penalizing it.
            </p>
            <div className="mt-4 flex items-center gap-2 text-purple-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Grows with your business</span>
            </div>
          </div>
        </div>

        {/* Comparison Visual */}
        <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            Traditional vs QuickQR: A Clear Choice
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Column */}
            <div className="text-center">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-bold text-red-400 mb-2">Traditional Subscription</h4>
              </div>
              <div className="space-y-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-400 text-sm">Monthly Cost</p>
                  <p className="text-xl font-bold text-red-400">$49/month</p>
                  <p className="text-xs text-gray-500">Fixed regardless of usage</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-400 text-sm">Unused Capacity</p>
                  <p className="text-xl font-bold text-red-400">85%</p>
                  <p className="text-xs text-gray-500">Paying for nothing</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-400 text-sm">Annual Waste</p>
                  <p className="text-xl font-bold text-red-400">$420</p>
                  <p className="text-xs text-gray-500">Money thrown away</p>
                </div>
              </div>
            </div>

            {/* QuickQR Column */}
            <div className="text-center">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-bold text-green-400 mb-2">QuickQR Pay-As-You-Go</h4>
              </div>
              <div className="space-y-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-400 text-sm">Monthly Cost</p>
                  <p className="text-xl font-bold text-green-400">$0-$30</p>
                  <p className="text-xs text-gray-500">Only pay for what you use</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-400 text-sm">Unused Capacity</p>
                  <p className="text-xl font-bold text-green-400">0%</p>
                  <p className="text-xs text-gray-500">Perfect efficiency</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-gray-400 text-sm">Annual Savings</p>
                  <p className="text-xl font-bold text-green-400">$360</p>
                  <p className="text-xs text-gray-500">Back in your pocket</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Perfect for Every Business</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-purple-400" />
                <h4 className="text-lg font-semibold text-white">Seasonal Businesses</h4>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Restaurants, retail stores, and event venues that have fluctuating customer traffic throughout the year.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5 text-blue-400" />
                <h4 className="text-lg font-semibold text-white">Marketing Campaigns</h4>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Launch campaigns, promotions, and product launches that need QR codes for limited periods.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h4 className="text-lg font-semibold text-white">Growing Startups</h4>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Startups that need flexibility to scale up or down based on their growth and funding cycles.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-5 h-5 text-purple-400" />
                <h4 className="text-lg font-semibold text-white">Budget-Conscious Teams</h4>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Small businesses and teams that need to maximize every dollar of their software budget.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-4">
            Stop Paying for What You Don't Use
          </h3>
          <p className="text-lg text-gray-400 mb-6 max-w-2xl mx-auto">
            Join thousands of businesses that have switched to fair, transparent pricing. Your first 1,000 scans are on us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              <Zap className="w-5 h-5" />
              Start Free
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-lg font-semibold text-white hover:bg-white/20 transition-all"
            >
              <DollarSign className="w-5 h-5" />
              View Pricing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}