// Staging edge for staging.quickqr.app: a plain proxy to the Pages project, which serves the static app and, through its
// Function, the API (/api/, /r/, /R/, /qr, /qr.png, /qr.svg, /healthz). It used to send those API paths to a Go server on
// odin through a Workers VPC service; the server and the service were deleted on 2026-10-22.
//
// This is a stopgap. The Function reads the visitor's address from CF-Connecting-IP and nothing else, and behind this
// Worker that header carries a Cloudflare address, so scans made through this hostname are logged under Cloudflare's
// network instead of the visitor's. Attaching the hostname to the Pages project (a dashboard step) removes the Worker
// and the problem.
const PAGES_HOST = 'quickqr-staging.pages.dev';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = PAGES_HOST;
    // Redirects (a scan with the direct style, sign-in) must reach the browser untouched, not be followed here.
    return fetch(new Request(url.toString(), request), { redirect: 'manual' });
  },
};
