import { Zap } from 'lucide-react';

export default function Features() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="inline-flex flex-col items-center gap-6 p-12 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-3xl border border-purple-500/30">
            <h3 className="text-3xl font-bold text-white">
              Ready to create amazing QR codes?
            </h3>
            <p className="text-gray-400 max-w-md">
              Join millions of users creating beautiful, customizable QR codes
            </p>
            <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Start Creating Now
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
