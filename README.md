# QuickQR Frontend

<p align="center">
  <img src="https://img.shields.io/badge/Astro-5.2-black?style=flat-square&logo=astro&color=BC52EE" alt="Astro">
  <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react&color=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript&color=3178C6" alt="TypeScript">
  <img src="https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase&color=3ECF8E" alt="Supabase">
</p>

<p align="center">
  <strong>Pay-as-you-go QR Code Generator</strong>
</p>

<p align="center">
  Create, customize, and manage QR codes with advanced styling options and PDF export capabilities.
</p>

---

## Features

### QR Code Creation
- **Multiple QR Types** — URL, Text, Email, Phone, SMS, Location, vCard, MeCard, WiFi, Event
- **Custom Styling** — Customize colors, patterns, and designs with `qr-code-styling`
- **Batch Generation** — Create multiple QR codes at once
- **QR Studio** — Advanced QR code designer with logo overlays and SVG export
- **Templates** — Save and reuse QR code designs

### Analytics & Tracking
- **Scan Analytics** — Track scan counts, locations, and device info
- **Browser Breakdown** — See which browsers your visitors use (Chrome, Safari, Firefox, Edge, etc.)
- **Geolocation Tracking** — View scan locations by country and city
- **A/B Testing** — Test different QR destinations with conversion tracking
- **UTM Campaign Tracking** — Build UTM-tagged URLs for marketing campaigns
- **Webhook Notifications** — Get notified instantly when QR codes are scanned

### QR Management
- **Cloud Storage** — Save and manage your QR codes in the cloud
- **Folders & Tags** — Organize QR codes with folders and tags
- **Scan Count Limits** — Set maximum scan limits for QR codes
- **Password Protection** — Add password protection to sensitive QR codes
- **Expiration Options** — Set expiry times for temporary QR codes

### Advanced Features
- **Menu OCR** — Extract menu items from photos and create QR codes
- **Widget Generator** — Create embeddable QR widgets for websites
- **Dark Mode** — Full dark mode support across all components
- **PDF Export** — Generate and download QR codes as PDF documents
- **Abuse Detection** — Built-in protection against misuse

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [Astro](https://astro.build) 5.2+ — Static site generation |
| **UI Library** | [React](https://react.dev) 18+ — Interactive components |
| **Language** | [TypeScript](https://typescriptlang.org) 5.9+ — Type safety |
| **Database** | [Supabase](https://supabase.com) — PostgreSQL + Auth |
| **QR Generation** | `qr-code-styling` + `qrcode.react` |
| **PDF Export** | `jspdf` + `jspdf-autotable` |
| **Animations** | `framer-motion` |
| **Icons** | `lucide-react` |
| **Charts** | `chart.js` — Analytics visualization |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database)

### Installation

```bash
# Clone the repository
git clone https://github.com/mintychochip/quickqr-frontend.git
cd quickqr-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

### Development

```bash
# Start development server (accessible on LAN for mobile testing)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server is configured with `host: true`, making it accessible on your local network at `http://<your-ip>:4321`. Useful for testing QR scans from mobile devices.

---

## Project Structure

```
quickqr-frontend/
├── src/
│   ├── components/        # React & Astro components
│   │   ├── abtesting/     # A/B testing components
│   │   ├── analytics/     # Analytics dashboard components
│   │   ├── auth/          # Authentication components
│   │   ├── common/        # Shared UI components
│   │   ├── menubuilder/   # Menu OCR components
│   │   ├── qr/            # QR code display components
│   │   ├── scheduler/     # QR scheduling components
│   │   ├── settings/      # Settings components
│   │   └── widgets/       # Widget generator components
│   ├── config/            # Configuration files
│   ├── constants/         # Application constants
│   ├── services/          # API & business logic
│   │   ├── qrCodeService.ts
│   │   ├── authService.ts
│   │   ├── statsService.ts
│   │   ├── abTestService.ts
│   │   ├── geolocationService.ts
│   │   ├── menuOCRService.ts
│   │   ├── scanLimitsService.ts
│   │   ├── utmService.ts
│   │   ├── webhookService.ts
│   │   └── abuseDetectionService.ts
│   ├── utils/             # Utility functions
│   └── pages/             # Route pages
├── functions/             # Cloudflare Pages functions
├── supabase/              # Database schema & migrations
├── public/                # Static assets
└── package.json
```

---

## QR Code Types Supported

| Type | Description |
|------|-------------|
| **URL** | Link to websites |
| **Text** | Plain text messages |
| **Email** | Pre-filled email composition |
| **Phone** | Direct phone number dial |
| **SMS** | Pre-filled text messages |
| **Location** | GPS coordinates |
| **vCard** | Digital contact cards |
| **MeCard** | Mobile contact format |
| **WiFi** | Network connection details |
| **Event** | Calendar event details |

---

## Services

### QR Code Management
- `fetchUserQRCodes()` — Retrieve all user QR codes
- `deleteQRCode(id)` — Remove a QR code
- `getQRCodeDisplayUrl(qr)` — Get human-readable content preview
- `createQRCode(data)` — Create a new QR code
- `updateQRCode(id, data)` — Update existing QR code

### Folders & Organization
- `fetchUserFolders()` — Get user's folder structure
- `createFolder(name, parentId)` — Create a new folder
- `moveQRToFolder(qrId, folderId)` — Move QR code to folder
- `addTagToQR(qrId, tag)` — Add tag to QR code
- `filterQRCodesByTag(tag)` — Filter QR codes by tag

### Authentication
- Email/password sign-up and login
- Session management via Supabase Auth

### Analytics & Statistics
- `fetchScanStats(qrId)` — Get scan statistics for a QR code
- `fetchBrowserStats(qrId)` — Get browser breakdown analytics
- `fetchGeolocationStats(qrId)` — Get scan locations by country/city
- `fetchTimelineData(qrId)` — Get scan timeline data

### A/B Testing
- `fetchABTests(qrId)` — Get all A/B tests for a QR code
- `fetchABTestResults(testId)` — Get variants with conversion rates
- `recordConversion(variantId)` — Track conversion events
- `calculateStatisticalSignificance(control, variant)` — Chi-square test

### Webhooks
- `fetchWebhooks(qrId)` — Get configured webhooks
- `createWebhook(qrId, url, events)` — Create a new webhook
- `toggleWebhook(webhookId, active)` — Enable/disable webhook
- `fetchDeliveryLogs(webhookId)` — View webhook delivery history

### UTM Tracking
- `buildUTMUrl(baseUrl, params)` — Build UTM-tagged URLs
- `validateUTMParams(params)` — Validate UTM parameters

### Scan Limits
- `fetchScanLimit(qrId)` — Get scan limit settings
- `updateScanLimit(qrId, config)` — Update scan limit configuration

### Menu OCR
- `extractMenuFromImage(imageFile)` — Extract menu items from photos
- `createMenuQRFromItems(items)` — Generate QR code from menu items

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is available under the MIT License.

---

<p align="center">
  Built with love by mintychochip
</p>
