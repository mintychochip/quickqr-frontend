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

- **Multiple QR Types** — URL, Text, Email, Phone, SMS, Location, vCard, MeCard, WiFi, Event
- **Custom Styling** — Customize colors, patterns, and designs with `qr-code-styling`
- **Analytics Dashboard** — Track scan counts and usage statistics
- **PDF Export** — Generate and download QR codes as PDF documents with `jsPDF`
- **User Authentication** — Secure account management with Supabase Auth
- **Cloud Storage** — Save and manage your QR codes in the cloud
- **Expiration Options** — Set expiry times for temporary QR codes
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
│   ├── config/            # Configuration files
│   ├── constants/         # Application constants
│   ├── services/          # API & business logic
│   │   ├── qrCodeService.ts
│   │   ├── authService.ts
│   │   ├── statsService.ts
│   │   └── abuseDetectionService.ts
│   ├── utils/             # Utility functions
│   └── pages/             # Route pages
├── functions/             # Serverless functions
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

### Authentication
- Email/password sign-up and login
- Session management via Supabase Auth

### Analytics
- Scan count tracking
- Usage statistics dashboard
- Export reports

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
