import { CheckCircle, Zap, TrendingUp, Shield, DollarSign, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SolutionSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-green-50 border border-green-200 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700 font-medium">The Solution</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How QuickQR Works
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Create professional QR codes with customization options and tracking capabilities.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Instant Generation */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Zap className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Instant Generation</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Generate customizable QR codes in seconds. Choose from multiple design options, add logos, and adjust colors to match your brand.
            </p>
          </div>

          {/* Dynamic QR Codes */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Dynamic QR Codes</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Update destination URLs without reprinting codes. Track scans with detailed analytics including location, device type, and scan time.
            </p>
          </div>

          {/* No Lock-in */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Export Anywhere</h3>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Download codes in multiple formats (SVG, PNG, PDF). Your codes work independently—no vendor lock-in or platform dependencies.
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Everything You Need
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="text-gray-700">Customizable colors and logos</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="text-gray-700">Multiple export formats (SVG, PNG, PDF)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="text-gray-700">Scan analytics and tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="text-gray-700">URL shortening included</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="text-gray-700">Bulk QR code generation</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="text-gray-700">Dynamic QR codes (update URLs anytime)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="text-gray-700">API access for developers</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="text-gray-700">No watermarks on downloads</span>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Common Use Cases</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-purple-600" />
                <h4 className="text-lg font-semibold text-gray-900">Restaurant Menus</h4>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Digital menus that can be updated in real-time without reprinting QR codes on tables.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5 text-blue-600" />
                <h4 className="text-lg font-semibold text-gray-900">Marketing Campaigns</h4>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Track campaign performance with scan analytics and update landing pages on the fly.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h4 className="text-lg font-semibold text-gray-900">Product Packaging</h4>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Link to product information, manuals, or support resources directly from packaging.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <h4 className="text-lg font-semibold text-gray-900">Event Tickets</h4>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Generate unique codes for ticket validation and access control at events.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-teal-50 border border-teal-200 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Create Your First QR Code?
          </h3>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Get started with QuickQR today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/create"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg font-semibold text-white shadow-md hover:shadow-lg transition-all"
            >
              <Zap className="w-5 h-5" />
              Create QR Code
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 shadow-sm transition-all"
            >
              <DollarSign className="w-5 h-5" />
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
