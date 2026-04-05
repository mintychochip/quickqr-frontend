# Login Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/signin` and `/signup` pages with a right-side slide-in panel (400px) that overlays the landing page, unifying sign-in and sign-up in one component.

**Architecture:**
- New `LoginPanel.tsx` component rendered as a fixed portal overlay
- AuthContext gains `loginPanel*` state to control the panel
- Nav buttons call `openLoginPanel()` instead of navigating to routes
- Routes for `/signin` and `/signup` become redirects to `/`

**Tech Stack:** React (existing), Tailwind (existing), react-router-dom (existing), Supabase auth via AuthContext

---

## File Map

```
src/
  components/
    LoginPanel.tsx          # NEW — right-side slide panel
  contexts/
    AuthContext.tsx         # MODIFY — add loginPanel* state + open/close
  App.tsx                   # MODIFY — remove signin/signup routes, mount LoginPanel
  pages/
    SignIn.tsx              # MODIFY — redirect to / (or delete if no direct URLs exist)
    SignUp.tsx               # MODIFY — redirect to / (or delete if no direct URLs exist)
```

---

## Chunk 1: LoginPanel Component

**Files:**
- Create: `src/components/LoginPanel.tsx`

- [ ] **Step 1: Write the LoginPanel component**

```tsx
import { Zap, X } from 'lucide-react';
import { useState, FormEvent, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { login as loginService, register } from '../services/authService';
import { supabase } from '../config/supabase';

type Mode = 'signin' | 'signup';

interface LoginPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: Mode;
}

export default function LoginPanel({ isOpen, onClose, initialMode = 'signin' }: LoginPanelProps) {
  const { login: authLogin, refreshUser } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => emailRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Sync mode when initialMode changes
  useEffect(() => { setMode(initialMode); }, [initialMode]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const switchMode = (newMode: Mode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const result = await loginService({ email, password });
        if (result.success) {
          // Refresh auth state so AuthContext picks up the session cookie
          await refreshUser();
          onClose();
        } else {
          setError(result.error || 'Login failed');
        }
      } else {
        const result = await register({ email, password });
        if (result.success) {
          // Auto-login after registration
          const { data: { user } } = await supabase.auth.signInWithPassword({ email, password });
          if (user) await refreshUser();
          onClose();
        } else {
          setError(result.error || 'Registration failed');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" aria-hidden={!isOpen}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-[400px] h-full bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.1)] flex flex-col animate-slide-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500 rounded-xl shadow-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">QuickQR</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {mode === 'signin' ? 'to continue to QuickQR' : 'join QuickQR'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              autoComplete="email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
            {mode === 'signup' && (
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                autoComplete="new-password"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : (mode === 'signin' ? 'Continue' : 'Create account')}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400">
              <span className="px-2 bg-white">or</span>
            </div>
          </div>

          <p className="text-sm text-center text-gray-600">
            {mode === 'signin' ? (
              <>
                New here?{' '}
                <button onClick={() => switchMode('signup')} className="text-teal-600 hover:text-teal-700 font-medium">
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => switchMode('signin')} className="text-teal-600 hover:text-teal-700 font-medium">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS animation for slide-in**

Add to `src/index.css` (or the tailwind CSS file):
```css
@keyframes slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.animate-slide-in {
  animation: slide-in 300ms ease-out;
}
```

---

## Chunk 2: AuthContext Panel State

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Add panel state to AuthContextType interface**

Add to the `AuthContextType` interface (after `lastActivity: number`):
```ts
loginPanelOpen: boolean;
loginPanelMode: 'signin' | 'signup';
openLoginPanel: (mode?: 'signin' | 'signup') => void;
closeLoginPanel: () => void;
```

- [ ] **Step 2: Add state and handlers to AuthProvider**

In the `AuthProvider` component, add:
```ts
const [loginPanelOpen, setLoginPanelOpen] = useState(false);
const [loginPanelMode, setLoginPanelMode] = useState<'signin' | 'signup'>('signin');

const openLoginPanel = useCallback((mode: 'signin' | 'signup' = 'signin') => {
  setLoginPanelMode(mode);
  setLoginPanelOpen(true);
}, []);

const closeLoginPanel = useCallback(() => {
  setLoginPanelOpen(false);
}, []);
```

- [ ] **Step 3: Include new values in context value object**

Add to the `value` object returned by `AuthProvider`:
```ts
loginPanelOpen,
loginPanelMode,
openLoginPanel,
closeLoginPanel,
```

---

## Chunk 3: App.tsx Integration

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import LoginPanel and useAuth**

Add imports:
```tsx
import LoginPanel from './components/LoginPanel';
import { useAuth } from './contexts/AuthContext';
```

- [ ] **Step 2: Add LoginPanel to AppContent**

In `AppContent`, call `useAuth()` and render `<LoginPanel />`:
```tsx
function AppContent() {
  const { loginPanelOpen, loginPanelMode, closeLoginPanel } = useAuth();

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <Routes>...</Routes>
      <LoginPanel
        isOpen={loginPanelOpen}
        onClose={closeLoginPanel}
        initialMode={loginPanelMode}
      />
    </div>
  );
}
```

- [ ] **Step 3: Remove signin/signup routes from Routes**

Remove:
```tsx
<Route path="/signin" element={<SignIn />} />
<Route path="/signup" element={<SignUp />} />
```

Keep `SignIn` and `SignUp` imports for now (they'll become redirects in next chunk).

---

## Chunk 4: Navigation — Route → Panel

**Files:**
- Modify: `src/App.tsx` (Navigation component inside)

- [ ] **Step 1: Change nav Sign In link to open panel**

In `Navigation`, replace the Sign In `<Link to="/signin">` with:
```tsx
<button
  onClick={() => openLoginPanel('signin')}
  className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm lg:text-base"
>
  Sign In
</button>
```

- [ ] **Step 2: Change nav Get Started CTA to open panel**

Replace `<Link to="/signup">Get Started</Link>` with:
```tsx
<button
  onClick={() => openLoginPanel('signup')}
  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-sm lg:text-base"
>
  Get Started
</button>
```

- [ ] **Step 3: Remove isAuthPage logic for signin/signup routes**

Since `/signin` and `/signup` routes no longer exist (or redirect), the `isAuthPage` check no longer hides nav on those pages. Update the condition to only hide on redirect page:
```tsx
const isRedirectPage = location.pathname.startsWith('/code/');
// isAuthPage removed — auth pages no longer exist
```

Update Footer similarly — remove `isAuthPage` check:
```tsx
const isRedirectPage = location.pathname.startsWith('/code/');
const isDashboardPage = location.pathname === '/dashboard' || location.pathname === '/create';
```

- [ ] **Step 4: Update mobile menu Sign In and Get Started**

In the mobile menu, change:
```tsx
<button onClick={() => { openLoginPanel('signin'); setIsMobileMenuOpen(false); }}>
  Sign In
</button>
<button onClick={() => { openLoginPanel('signup'); setIsMobileMenuOpen(false); }}>
  Get Started
</button>
```

---

## Chunk 5: SignIn/SignUp Pages → Redirects

**Files:**
- Modify: `src/pages/SignIn.tsx`
- Modify: `src/pages/SignUp.tsx`

- [ ] **Step 1: Simplify SignIn.tsx to redirect**

Replace the entire `SignIn.tsx` body with a redirect to home:
```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SignIn() {
  const { user } = useAuth();
  // Redirect logged-in users to dashboard
  if (user) return <Navigate to="/dashboard" replace />;
  // Otherwise redirect to home — panel will open via session check if needed
  return <Navigate to="/" replace />;
}
```

- [ ] **Step 2: Simplify SignUp.tsx to redirect**

Same approach — replace body with redirect to home:
```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SignUp() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/" replace />;
}
```

---

## Chunk 6: Mobile Bottom Sheet

**Files:**
- Modify: `src/components/LoginPanel.tsx`

- [ ] **Step 1: Add responsive bottom-sheet styles**

In the `div` wrapping the panel, make it full-width bottom sheet on mobile:
```tsx
<div
  className={`
    relative h-full bg-white flex flex-col
    animate-slide-in
    sm:w-full sm:max-w-[400px]
    h-full w-full max-w-[400px]
    sm:rounded-none sm:shadow-[-4px_0_20px_rgba(0,0,0,0.1)]
    sm:translate-y-0 sm:bottom-auto
    bottom-0 left-0 right-0 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)]
    translate-y-full sm:translate-x-0
    transition-transform duration-300 ease-out
  `}
>
  {/* Drag handle on mobile */}
  <div className="flex justify-center pt-3 pb-1 sm:hidden">
    <div className="w-10 h-1 bg-gray-300 rounded-full" />
  </div>
  ...
```

Actually, for simplicity, use Tailwind's `sm:` breakpoint to split the two modes. A cleaner approach — just apply the panel as full-width bottom sheet below `sm:`:

```tsx
<div className="relative w-full sm:max-w-[400px] h-full bg-white flex flex-col animate-slide-in
  sm:shadow-[-4px_0_20px_rgba(0,0,0,0.1)]
  sm:top-0 sm:right-0 sm:bottom-auto
  bottom-0 left-0 right-0 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)]
  sm:rounded-none
  translate-y-full sm:translate-x-0
  transition-all duration-300 ease-out
">
  {/* Drag handle — only mobile */}
  <div className="flex justify-center pt-3 pb-1 sm:hidden">
    <div className="w-10 h-1 bg-gray-300 rounded-full" />
  </div>
```

---

## Verification

- [ ] Panel opens when clicking "Sign In" in nav
- [ ] Panel opens when clicking "Get Started" in nav
- [ ] Panel slides in from right (desktop) / up from bottom (mobile)
- [ ] Can switch between sign in and sign up
- [ ] Form submits and logs in / registers successfully
- [ ] Escape key closes panel
- [ ] Clicking backdrop closes panel
- [ ] Body scroll is locked while panel is open
- [ ] Direct URL `/signin` redirects to `/`
- [ ] Direct URL `/signup` redirects to `/`
- [ ] Mobile menu "Sign In" / "Get Started" open panel correctly
