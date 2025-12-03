import { Zap } from 'lucide-react';

export default function Features() {
  return (
    <section className="relative py-24 bg-gray-50">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="inline-flex flex-col items-center gap-6 p-12 bg-white rounded-3xl border border-gray-200 shadow-lg">
            <h3 className="text-3xl font-bold text-gray-900">
              Try QuickQR for Free
            </h3>
            <p className="text-gray-600 max-w-md">
              Start generating professional QR codes with customization options
            </p>
            <button className="px-8 py-4 bg-teal-500 hover:bg-teal-600 rounded-lg font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Create Your First Code
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
