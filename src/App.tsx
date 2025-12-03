import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Zap, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import QRCodeRedirect from './pages/QRCodeRedirect';
import CreateQRCode from './pages/CreateQRCode';
import About from './pages/About';

function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup';
  const isRedirectPage = location.pathname.startsWith('/code/');

  if (isAuthPage || isRedirectPage) return null;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-16">
            {/* Left Section: Logo + Nav Links */}
            <div className="flex items-center gap-8 xl:gap-12">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500 rounded-xl shadow-md">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  QuickQR
                </span>
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden lg:flex items-center gap-8 xl:gap-10">
                <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm lg:text-base">
                  Features
                </a>
                <Link to="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm lg:text-base">
                  Pricing
                </Link>
                <Link to="/about" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm lg:text-base">
                  About
                </Link>
              </div>
            </div>

            {/* Right Section: CTA */}
            {user ? (
              <div className="hidden md:flex items-center gap-4 lg:gap-6">
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm lg:text-base">
                  Dashboard
                </Link>
                <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700 text-sm font-mono">{user.email?.split('@')[0]}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-900 transition-all hover:scale-[1.02] active:scale-[0.98] font-medium text-sm lg:text-base shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-4 lg:gap-6">
                <Link to="/signin" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm lg:text-base">
                  Sign In
                </Link>
                <Link to="/signup" className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-sm lg:text-base">
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleMobileMenu}
                className="p-2.5 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Mobile Menu Panel */}
          <div className="fixed right-0 top-0 h-full w-72 bg-white/95 backdrop-blur-sm border-l border-gray-200 shadow-xl">
            <div className="p-6 pt-20">
              {/* Mobile Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500 rounded-lg shadow-md">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-900">QuickQR</span>
                </div>
              </div>

              {/* Mobile Nav Links */}
              <div className="space-y-5 mb-8">
                <a
                  href="#features"
                  className="block text-gray-600 hover:text-gray-900 transition-colors font-medium text-lg py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Features
                </a>
                <Link
                  to="/pricing"
                  className="block text-gray-600 hover:text-gray-900 transition-colors font-medium text-lg py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  to="/about"
                  className="block text-gray-600 hover:text-gray-900 transition-colors font-medium text-lg py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  About
                </Link>
                {user && (
                  <Link
                    to="/dashboard"
                    className="block text-gray-600 hover:text-gray-900 transition-colors font-medium text-lg py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
              </div>

              {/* Mobile User Info / CTA */}
              <div className="space-y-4">
                {user ? (
                  <>
                    <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.email?.split('@')[0]}
                          </div>
                          <div className="text-xs text-gray-600">{user.email}</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-900 transition-all font-medium shadow-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/signin"
                      className="block w-full text-center text-gray-600 hover:text-gray-900 transition-colors px-4 py-3 font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="block w-full px-4 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Footer() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup';
  const isRedirectPage = location.pathname.startsWith('/code/');
  const isDashboardPage = location.pathname === '/dashboard' || location.pathname === '/create';

  if (isAuthPage || isRedirectPage || isDashboardPage) return null;

  return (
    <footer className="bg-white/95 backdrop-blur-sm border-t border-gray-200 py-12">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-teal-500 rounded-xl shadow-md">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">QuickQR</span>
            </div>
            <p className="text-gray-600 text-sm">
              Lightning-fast QR code generation for everyone.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/about" className="hover:text-gray-900 transition-colors">About</Link></li>
              <li><span className="text-gray-600">Blog</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><span className="text-gray-600">Privacy</span></li>
              <li><span className="text-gray-600">Terms</span></li>
              <li><span className="text-gray-600">Security</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>&copy; 2025 QuickQR. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/create" element={
            <ProtectedRoute>
              <CreateQRCode />
            </ProtectedRoute>
          } />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/code/:slug" element={<QRCodeRedirect />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
