export default function QRHistory() {
  return (
    <section className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Text content */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              The History of the QR Code
            </h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                The QR code was invented in 1994 by Masahiro Hara, an engineer at Denso Wave,
                a subsidiary of Toyota. Originally designed to track automotive parts during
                manufacturing, the QR code revolutionized how we store and share information.
              </p>
              <p>
                The name "QR" stands for "Quick Response," reflecting the code's ability to
                be decoded at high speed. Unlike traditional barcodes that hold limited data,
                QR codes can store up to 4,296 alphanumeric characters.
              </p>
              <p>
                Today, QR codes have become ubiquitous in our daily lives—from restaurant menus
                and payment systems to marketing campaigns and authentication. Their versatility
                and ease of use have made them an essential tool in our digital world.
              </p>
              <div className="pt-4">
                <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span>Invented in 1994 by Denso Wave</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Video */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
              <div className="relative aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/TRsZX-qq8nY"
                  title="QR Code History"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full rounded-lg"
                ></iframe>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-600/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
