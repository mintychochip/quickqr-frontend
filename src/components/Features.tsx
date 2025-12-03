import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Features() {
  return (
    <section className="py-24 bg-gray-50" style={{transform: 'translateZ(0)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Stop Paying For Subscriptions
            <span className="block text-teal-600">
              You Don't Use
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            1,000 free scans monthly. No Contracts. No Commitments.
          </p>
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
