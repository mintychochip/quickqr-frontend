# Cloudflare Pages Migration Guide

## Why Migrate?
- **Dynamic Routes**: Cloudflare Pages supports dynamic routing (GitHub Pages is static only)
- **Edge Functions**: Run QR redirect logic at the edge for better performance
- **Better QR Code Handling**: No more 404.html hacks needed
- **Real-time**: Better support for Supabase Realtime

## Setup Steps

### 1. Create Cloudflare Account
- Sign up at https://dash.cloudflare.com
- Add your domain `quickqr.app` (or use the free pages.dev subdomain)

### 2. Create Pages Project
1. Go to **Workers & Pages** → **Create application**
2. Choose **Pages** → **Connect to Git**
3. Select your GitHub repo `quickqr-frontend`
4. Configure build:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Add environment variables:
   - `PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon key
6. Click **Save and Deploy**

### 3. Add Secrets to GitHub (Optional)
For automated GitHub Actions deployment, add these secrets to your repo:
- `CLOUDFLARE_API_TOKEN`: Create at https://dash.cloudflare.com/profile/api-tokens
  - Use template "Cloudflare Pages" 
- `CLOUDFLARE_ACCOUNT_ID`: Found in Cloudflare dashboard sidebar

### 4. Configure Custom Domain (Optional)
1. In Cloudflare Pages project → **Custom domains**
2. Add `quickqr.app`
3. Follow DNS setup instructions

### 5. Update Supabase
Add Cloudflare Pages URL to Supabase Auth redirects:
1. Supabase Dashboard → Authentication → URL Configuration
2. Add Site URL: `https://quickqr.pages.dev` (or your custom domain)
3. Add Redirect URLs:
   - `https://quickqr.pages.dev/auth/callback`
   - `https://quickqr.pages.dev`
   - `https://quickqr.app` (if using custom domain)

## Differences from GitHub Pages

### What's Better
- ✅ Dynamic routes work properly (`/r/[id]`)
- ✅ Edge functions handle redirects
- ✅ Faster global CDN
- ✅ Better Supabase Realtime support
- ✅ No 404.html hacks needed

### What Changes
- QR redirect now handled by Edge Function (faster, more reliable)
- Build/deploy via Cloudflare instead of GitHub Actions
- Environment variables in Cloudflare dashboard

### What's the Same
- All your code stays the same
- Supabase integration unchanged
- Dashboard, create page, analytics all work identically

## Testing After Migration

1. **Create a dynamic QR code**
2. **Scan it** - should redirect immediately
3. **Check dashboard** - scan count should increment in real-time
4. **Test analytics** - should show scan data

## Rollback Plan

If something breaks:
1. Cloudflare Pages keeps previous deployments
2. Go to project → Deployments → Rollback to previous version
3. Or re-enable GitHub Pages in repo settings as backup

## Support

- Cloudflare Pages docs: https://developers.cloudflare.com/pages/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions