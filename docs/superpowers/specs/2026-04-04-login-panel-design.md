# Login Panel — Slide-in from Right

## Status
Approved for implementation

## Overview

Replace the `/signin` and `/signup` dedicated pages with a right-side slide-in panel that overlays the landing page. Users tap "Sign In" / "Get Started" in the nav → panel slides in from the right with a backdrop dimming the page. Unified form handles both sign in and sign up via a toggle link at the bottom.

---

## Design

### Panel Specs
- **Position**: Fixed, right edge of viewport, full height
- **Width**: 400px (mobile: full-width, bottom-sheet style)
- **Animation**: `transform: translateX(100%)` → `translateX(0)`, 300ms ease-out
- **Backdrop**: `rgba(0,0,0,0.4)` with `backdrop-filter: blur(4px)`, click to close
- **Close button**: Top-right of panel (✕ icon)

### Visual Style
- **Background**: White (#ffffff)
- **Border**: 1px solid #eee (subtle)
- **Shadow**: `-4px 0 20px rgba(0,0,0,0.1)`
- **Padding**: 20px header, 20px body
- **Radius**: top-left and bottom-left corners only, 0 for top-right/bottom-right (flush to edge)

### Panel Header
- Logo (icon + "QuickQR" text) on left
- Close (✕) button on right
- Border-bottom separates header from body

### Form (Sign In mode)
- Title: "Sign in"
- Subtitle: "to continue to QuickQR"
- Email input (placeholder: "Email address")
- Password input (placeholder: "Password")
- Submit button: "Continue"
- Divider: "or" centered line
- Bottom link: "New here? Create an account" → switches panel to Sign Up mode

### Form (Sign Up mode)
- Title: "Create account"
- Subtitle: "join QuickQR"
- Email input
- Password input
- Confirm Password input
- Submit button: "Create account"
- Bottom link: "Already have an account? Sign in" → switches back to Sign In mode

### Mobile (< 640px)
- Panel becomes full-width bottom sheet
- Slides up from bottom
- `border-radius: 16px 16px 0 0` top corners
- Drag handle indicator (40px × 4px pill, centered, #ddd)

---

## Implementation

### Component: `LoginPanel.tsx`
- Props: `isOpen: boolean`, `onClose: () => void`, `initialMode: 'signin' | 'signup'`
- Controlled component — state lives in `AuthContext` or a Zustand store
- Renders as fixed overlay portal
- Manages its own `mode` state (signin/signup) internally
- Focus trap when open

### AuthContext updates
- Add `loginPanelOpen: boolean`, `loginPanelMode: 'signin' | 'signup'`, `openLoginPanel(mode?)`, `closeLoginPanel` to context
- `openLoginPanel` accepts optional mode, defaults to 'signin'
- Panel close → navigation does NOT change (stays on current page)

### App.tsx / Navigation changes
- Nav "Sign In" link → calls `openLoginPanel('signin')` instead of navigating to `/signin`
- Nav "Get Started" CTA → calls `openLoginPanel('signup')` instead of navigating to `/signup`
- Remove routes for `/signin` and `/signup` (or keep them as redirects for direct URL access)

### Route handling
- Direct access to `/signin` → redirect to `/` (panel will open on homepage load if needed)
- Direct access to `/signup` → same

### Keyboard / Accessibility
- Escape key closes panel
- Focus moves to first input when panel opens
- Background content gets `aria-hidden`

### Page scroll lock
- When panel is open, lock body scroll (`overflow: hidden` on html/body)

---

## Files to modify
- `src/components/LoginPanel.tsx` (new)
- `src/contexts/AuthContext.tsx` (add panel state + open/close methods)
- `src/App.tsx` (remove signin/signup routes, add LoginPanel to tree)
- `src/pages/SignIn.tsx` (can be deleted or kept as redirect wrapper)
- `src/pages/SignUp.tsx` (can be deleted or kept as redirect wrapper)

## Out of scope
- Remember me checkbox (can be added later)
- Forgot password link (out of scope for MVP)
- Social login (Google, GitHub) — separate ticket
- Password visibility toggle — nice to have, can add as follow-up
