import { escapeHtml } from './html';

/** The share page's own styling, used when the site's page is not available to build on. */
const STYLE = `<style>
:root { color-scheme: light dark; --bg: #f3f3f5; --surface: #ffffff; --ink: #111113; --muted: #6c6c73; --border: #e6e6ea; --punch: #d7ff3c; }
@media (prefers-color-scheme: dark) { :root { --bg: #0b0b0d; --surface: #141417; --ink: #f4f4f2; --muted: #a3a3ab; --border: #2b2b31; } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 20px; background: var(--bg); color: var(--ink); font-family: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
main { width: 100%; max-width: 420px; }
.brand { display: inline-flex; align-items: center; gap: 9px; margin-bottom: 18px; color: inherit; text-decoration: none; font-weight: 600; letter-spacing: -0.04em; }
.mark { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: var(--punch); color: #111113; font-size: 15px; font-weight: 700; }
.card { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 22px; border: 1px solid var(--border); border-radius: 20px; background: var(--surface); box-shadow: 0 24px 60px -40px rgba(17,17,19,.45); text-align: center; }
h1 { margin: 0; font-size: clamp(25px, 5vw, 34px); line-height: 1.04; letter-spacing: -0.04em; }
img { display: block; width: min(100%, 320px); height: auto; border-radius: 12px; }
.target { margin: 0; max-width: 100%; overflow-wrap: anywhere; color: var(--muted); font-family: ui-monospace, monospace; font-size: 11px; line-height: 1.5; }
.footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 16px; color: var(--muted); font-size: 11px; }
.footer a { color: inherit; }
</style>`;

export const TITLE_SUFFIX = ' | quickqr.app';

/** A small page of its own for /qr, for when the site's index page cannot be read. */
export function renderPreviewFallback(pageTitle: string, description: string, meta: string, target: string, imageUrl: string): string {
  const content =
    target && imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="QR code" width="320" height="320"><p class="target">${escapeHtml(target)}</p>`
      : '<p class="target">Open this page with <code>?url=https://example.com</code> to generate a QR code.</p>';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
${meta}
${STYLE}
</head>
<body>
<main>
<a class="brand" href="/"><span class="mark">q</span>quickqr.app</a>
<section class="card">
<h1>${escapeHtml(pageTitle.endsWith(TITLE_SUFFIX) ? pageTitle.slice(0, -TITLE_SUFFIX.length) : pageTitle)}</h1>
${content}
</section>
<footer class="footer"><span>Free QR codes forever.</span><a href="/">Create a dynamic code</a></footer>
</main>
</body>
</html>`;
}
