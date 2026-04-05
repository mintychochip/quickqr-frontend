# Astro + CSS Rewrite Design

**Date:** 2026-04-04
**Status:** Approved

## Overview

Rewrite the QuickQR frontend from Vite + React + Tailwind v4 to Astro + plain CSS. Keep existing design and functionality intact.

## Architecture

- **Framework:** Astro with file-based routing
- **Styling:** Plain CSS files (no Tailwind, no CSS frameworks)
- **Auth:** Supabase client-side for API calls, cookies for SSR
- **Deployment:** Vercel (existing)

## Pages

```
src/pages/
  index.astro           → Home page
  pricing.astro         → Pricing page
  dashboard.astro       → Protected: User QR codes & stats
  create.astro          → Protected: QR code creation
  admin.astro           → Protected: Admin panel
  code/[slug].astro     → QR code redirect handler
  auth/
    callback.astro      → OAuth callback handler
    signin.astro        → Sign in page
    signup.astro        → Sign up page
```

## Layout

- `src/layouts/MainLayout.astro` — Shared HTML shell with nav/footer
- CSS co-located per page: `src/styles/home.css`, `src/styles/pricing.css`, etc.
- Reusable components: `src/components/Navigation.astro`, `Footer.astro`, `LoginPanel.astro`

## Migration Order

1. **Static pages** — Home, Pricing
2. **Auth pages** — Sign in, Sign up, Auth callback
3. **Protected pages** — Dashboard, Create, Admin
4. **QR redirect** — `/code/[slug]`

## Auth Flow

- `getUser()` server-side validates session cookie
- Protected pages redirect to `/auth/signin` if no valid session
- Client-side Supabase client handles sign-in/sign-up API calls
- OAuth callback processes auth code and redirects to dashboard

## Component Migration

| Current (React) | New (Astro) |
|-----------------|-------------|
| `src/pages/Home.tsx` | `src/pages/index.astro` |
| `src/pages/Pricing.tsx` | `src/pages/pricing.astro` |
| `src/pages/Dashboard.tsx` | `src/pages/dashboard.astro` |
| `src/pages/CreateQRCode.tsx` | `src/pages/create.astro` |
| `src/pages/Admin.tsx` | `src/pages/admin.astro` |
| `src/pages/QRCodeRedirect.tsx` | `src/pages/code/[slug].astro` |
| `src/pages/SignIn.tsx` | `src/pages/auth/signin.astro` |
| `src/pages/SignUp.tsx` | `src/pages/auth/signup.astro` |
| `src/pages/AuthCallback.tsx` | `src/pages/auth/callback.astro` |

## Interactive Elements

- QR code generator: Convert React logic to vanilla JS in `<script>` tags
- Stats charts: Use Chart.js directly in `<script>` tags
- LoginPanel: Convert to Astro component with vanilla JS for toggle/submit

## Build & Deploy

- `astro build` for production
- Output to `dist/`
- Vercel config: change from Vite to Astro adapter

## Dependencies to Remove

- React, React DOM
- Tailwind CSS, PostCSS, Autoprefixer
- React Router

## Dependencies to Keep

- `@supabase/supabase-js`
- `qr-code-styling`
- `chart.js`
- `jspdf`, `jspdf-autotable`

## New Dependencies

- `astro`
- `@astrojs/node` (for SSR if needed) or `@astrojs/vercel`
