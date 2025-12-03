import { Target, Zap } from 'lucide-react';

export default function FounderStory() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 mb-4">
            <Target className="w-5 h-5 text-teal-600" />
            <span className="text-sm text-gray-700 font-medium">Our Mission</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Built for Simplicity
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            QuickQR was created to make QR code generation fast, simple, and accessible to everyone.
          </p>
        </div>

        {/* Mission Content */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 md:p-12">
          <div className="flex items-start gap-6 mb-8">
            <div className="p-3 bg-teal-500 rounded-xl flex-shrink-0">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Why QuickQR Exists
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Most QR code platforms are overcomplicated, requiring accounts, subscriptions, and complex setup processes. We believe generating a QR code should be as simple as entering a URL and clicking a button.
              </p>
              <p className="text-gray-600 leading-relaxed">
                QuickQR focuses on speed and ease of use. Whether you need one QR code or hundreds, our platform provides professional-quality codes without the hassle of traditional solutions.
              </p>
            </div>
          </div>

          {/* Core Principles */}
          <div className="grid md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-200">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Fast</h4>
              <p className="text-gray-600 text-sm">
                Generate codes in seconds, not minutes
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Simple</h4>
              <p className="text-gray-600 text-sm">
                No complex setup or configuration required
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Professional</h4>
              <p className="text-gray-600 text-sm">
                High-quality codes with customization options
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
