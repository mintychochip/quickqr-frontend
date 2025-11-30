import { Check, Zap, ArrowRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Pricing() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'What counts as a scan?',
      answer: 'Each time someone scans your QR code with their device, it counts as one scan. Duplicate scans from the same device within 24 hours are counted separately.',
    },
    {
      question: 'Can I switch between tiers?',
      answer: 'Absolutely! Tiers are automatic based on your monthly usage. If you have 5,000 scans one month and 50,000 the next, you\'ll automatically be billed at the appropriate rate for each month.',
    },
    {
      question: 'Is there a minimum commitment?',
      answer: 'No! There are no contracts or commitments. You can start with the free tier and only pay when you exceed 1,000 scans per month. Cancel anytime.',
    },
    {
      question: 'What happens if I exceed my current tier?',
      answer: 'Your service continues uninterrupted. You\'ll automatically move to the next tier and be billed at the lower per-scan rate. You\'ll receive a notification when approaching tier limits.',
    },
    {
      question: 'How does Enterprise pricing work?',
      answer: 'Enterprise plans are customized based on your specific needs, including volume discounts, custom features, and dedicated support. Contact our sales team for a personalized quote.',
    },
  ];

  const tiers = [
    {
      name: 'Free',
      description: 'Perfect for trying out QuickQR',
      scanRange: '0 - 1,000',
      pricePerScan: '$0',
      monthlyEstimate: 'Free',
      features: [
        '1,000 scans per month',
        'Basic QR code generation',
        'Standard analytics',
        'Community support',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Starter',
      description: 'Great for small businesses',
      scanRange: '1,001 - 10,000',
      pricePerScan: '$0.005',
      monthlyEstimate: '$5 - $50',
      features: [
        'Up to 10,000 scans/month',
        'Custom QR designs',
        'Advanced analytics',
        'Email support',
        'API access',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Growth',
      description: 'Most popular for growing teams',
      scanRange: '10,001 - 100,000',
      pricePerScan: '$0.003',
      monthlyEstimate: '$30 - $300',
      features: [
        'Up to 100,000 scans/month',
        'All Starter features',
        'Bulk QR generation',
        'Priority support',
        'Team collaboration',
        'Custom domains',
      ],
      cta: 'Get Started',
      popular: true,
    },
    {
      name: 'Scale',
      description: 'For high-volume operations',
      scanRange: '100,001 - 1M',
      pricePerScan: '$0.001',
      monthlyEstimate: '$100 - $1,000',
      features: [
        'Up to 1M scans/month',
        'All Growth features',
        'Dedicated account manager',
        '99.9% uptime SLA',
        'Advanced security',
        'White-label options',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Enterprise',
      description: 'Custom solutions at scale',
      scanRange: '1M+',
      pricePerScan: 'Custom',
      monthlyEstimate: 'Contact us',
      features: [
        'Unlimited scans',
        'All Scale features',
        'Custom integrations',
        'On-premise deployment',
        'Dedicated infrastructure',
        'Custom SLA',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-black pt-16">
      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/10 border border-purple-600/20 rounded-full mb-6">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Pay-as-you-go pricing</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Simple, Transparent Pricing
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Only pay for what you use. No hidden fees, no commitments.
              Scale effortlessly as your needs grow.
            </p>
          </div>

          {/* Pricing Table */}
          <div className="mb-20">
            <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-8 gap-3 p-4 border-b border-white/10 bg-white/5">
                <div className="col-span-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tier</h3>
                </div>
                <div className="col-span-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scan Range</h3>
                </div>
                <div className="col-span-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Price/Scan</h3>
                </div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-white/10">
                {tiers.map((tier) => (
                  <div
                    key={tier.name}
                    className={`relative grid md:grid-cols-8 gap-3 p-4 transition-all hover:bg-white/5 ${
                      tier.popular ? 'bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-l-4 border-purple-600' : ''
                    }`}
                  >
                    {tier.popular && (
                      <div className="absolute top-1 right-1">
                        <div className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-medium text-white">
                          Most Popular
                        </div>
                      </div>
                    )}

                    {/* Tier Name */}
                    <div className="col-span-12 md:col-span-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg md:text-base font-bold text-white">{tier.name}</h3>
                        {tier.popular && (
                          <div className="hidden md:block px-2 py-0.5 bg-purple-600/20 border border-purple-600/40 rounded-full">
                            <span className="text-xs text-purple-300 font-medium">Popular</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 hidden md:block mt-0.5">{tier.description}</p>
                    </div>

                    {/* Scan Range */}
                    <div className="col-span-6 md:col-span-3 flex items-center">
                      <div className="md:hidden text-xs text-gray-500 mr-2">Range:</div>
                      <div className="text-sm text-white font-medium">{tier.scanRange}</div>
                    </div>

                    {/* Price per Scan */}
                    <div className="col-span-6 md:col-span-2 flex items-center">
                      <div className="md:hidden text-xs text-gray-500 mr-2">Price:</div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg md:text-base font-bold text-white">
                          {tier.pricePerScan}
                        </span>
                        {tier.pricePerScan !== 'Custom' && tier.pricePerScan !== '$0' && (
                          <span className="text-xs text-gray-400">/scan</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA below table */}
            <div className="mt-8 text-center">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="mt-4 text-sm text-gray-400">
                Start with 1,000 free scans per month. No credit card required.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 rounded-2xl p-8 md:p-12">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">
                How Pay-as-you-go Works
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Create QR Codes
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Generate unlimited QR codes for free. No charges for creation.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Track Scans
                  </h3>
                  <p className="text-gray-400 text-sm">
                    We count each scan of your QR codes in real-time.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Pay Only for Usage
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Automatically billed at the end of each month based on total scans.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10 text-center">
                <p className="text-gray-400 text-sm">
                  The more you use, the less you pay per scan. Your price automatically decreases as you move to higher tiers.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-10 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-white pr-4">
                      {faq.question}
                    </h3>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                        openFaqIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openFaqIndex === index ? 'max-h-48' : 'max-h-0'
                    }`}
                  >
                    <p className="px-6 pb-6 text-gray-400">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="inline-block bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/10 rounded-2xl p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to get started?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl">
                Join thousands of businesses using QuickQR. Start with 1,000 free scans per month.
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
