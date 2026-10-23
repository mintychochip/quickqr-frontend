import type { Link, Sponsor } from '../types';
import { escapeHtml, inlineJson } from './html';

/** Shown when there is no active sponsor: what the pause is for. */
const FALLBACK_PANEL = `
<aside class="sponsor" aria-label="About quickqr">
	<p class="sponsor-meta"><span class="badge">How it stays free</span></p>
	<h2 class="sponsor-headline">A short pause. No subscription.</h2>
	<p class="sponsor-tagline">Sponsor messages keep dynamic redirects free. Your printed code never expires.</p>
</aside>`;

function sponsorPanel(sponsor: Sponsor | null): string {
  if (!sponsor) return FALLBACK_PANEL;
  const badge = escapeHtml(sponsor.badge);
  const brand = escapeHtml(sponsor.brand_name);
  const logo = escapeHtml(sponsor.logo_url);
  const headline = escapeHtml(sponsor.headline);
  const tagline = escapeHtml(sponsor.tagline);
  const target = escapeHtml(sponsor.target_url);
  const cta = escapeHtml(sponsor.cta);
  return `
<aside class="sponsor" aria-label="Sponsored message">
	<p class="sponsor-meta">
		<span class="badge">${badge}</span>
		<span class="sponsor-brand"><span class="sponsor-logo" aria-hidden="true">${logo}</span>${brand}</span>
	</p>
	<h2 class="sponsor-headline">${headline}</h2>
	<p class="sponsor-tagline">${tagline}</p>
	<a href="${target}" target="_blank" rel="noopener sponsored" class="sponsor-cta">${cta} <span aria-hidden="true">&#8599;</span></a>
</aside>`;
}

/**
 * The three-second pause a scan of an ordinary link shows before it moves on to the destination.
 *
 * Built for a phone and deliberately quiet: no card or box, no header bar, no animation, no brand color. Where you are
 * going and the countdown sit directly on the page, a hairline separates the sponsor, and a plain outlined Skip button
 * sits right under them. It is a pause people glance at, not a page.
 */
export function renderInterstitial(link: Pick<Link, 'title' | 'destination_url'>, sponsor: Sponsor | null): string {
  const dest = escapeHtml(link.destination_url);
  const destJson = inlineJson(link.destination_url);
  const title = escapeHtml(link.title) || 'Destination';
  const panel = sponsorPanel(sponsor);
  return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Redirecting to ${title} | quickqr.app</title>
	<meta http-equiv="refresh" content="3;url=${dest}">
	<style>
		:root {
			color-scheme: light dark;
			--bg: #ffffff;
			--ink: #141417;
			--muted: #6e6e76;
			--border: #e9e9ed;
			--line: #d2d2d8;
			--soft: #f2f2f5;
		}
		@media (prefers-color-scheme: dark) {
			:root {
				--bg: #0c0c0e;
				--ink: #f3f3f1;
				--muted: #9b9ba4;
				--border: #26262b;
				--line: #3a3a42;
				--soft: #1c1c20;
			}
		}
		* { box-sizing: border-box; }
		body {
			margin: 0;
			min-height: 100dvh;
			background: var(--bg);
			color: var(--ink);
			font-family: "Geist", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			-webkit-font-smoothing: antialiased;
		}
		a { color: inherit; -webkit-tap-highlight-color: transparent; }
		.shell {
			width: 100%;
			max-width: 440px;
			min-height: 100dvh;
			margin: 0 auto;
			padding: 32px 24px 24px;
			padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
			display: flex;
			flex-direction: column;
			gap: 20px;
		}
		main { flex: 1; display: flex; flex-direction: column; justify-content: center; }
		h1 {
			margin: 0 0 10px;
			font-size: clamp(28px, 8vw, 34px);
			line-height: 1.1;
			letter-spacing: -0.035em;
			font-weight: 600;
			overflow-wrap: anywhere;
		}
		.dest {
			display: block;
			font-family: "Geist Mono", ui-monospace, monospace;
			font-size: 13px;
			line-height: 1.5;
			color: var(--muted);
			text-decoration: none;
			overflow-wrap: anywhere;
		}
		.status { margin: 16px 0 0; font-size: 15px; color: var(--muted); }
		.status strong { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
		.sponsor { margin-top: 32px; padding-top: 28px; border-top: 1px solid var(--border); }
		.sponsor-meta { margin: 0 0 12px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
		.badge { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
		.sponsor-brand { font-weight: 500; }
		.sponsor-brand::before { content: "\\00b7"; margin-right: 8px; }
		.sponsor-logo {
			display: inline-grid;
			place-items: center;
			width: 20px;
			height: 20px;
			margin-right: 6px;
			border-radius: 6px;
			background: var(--soft);
			color: var(--ink);
			font-size: 11px;
			font-weight: 600;
		}
		.sponsor-headline { margin: 0 0 4px; font-size: 19px; line-height: 1.25; letter-spacing: -0.02em; font-weight: 600; }
		.sponsor-tagline { margin: 0; font-size: 15px; line-height: 1.55; color: var(--muted); }
		.sponsor-cta {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			min-height: 44px;
			margin-top: 6px;
			font-size: 15px;
			font-weight: 600;
			text-decoration: underline;
			text-underline-offset: 3px;
		}
		.skip {
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 52px;
			border: 1px solid var(--line);
			border-radius: 14px;
			background: transparent;
			color: var(--ink);
			text-decoration: none;
			font-size: 15px;
			font-weight: 500;
		}
		.skip:hover, .skip:active { background: var(--soft); }
		.foot { margin-top: 4px; text-align: center; font-size: 11px; line-height: 1.6; color: var(--muted); }
		.foot p { margin: 0; text-wrap: balance; }
		.foot-brand { font-weight: 500; text-decoration: none; }
		a:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; border-radius: 6px; }
	</style>
</head>
<body>
	<div class="shell">
		<main>
			<h1>${title}</h1>
			<a href="${dest}" class="dest">${dest}</a>
			<p class="status"><span id="statusText" aria-live="polite">Redirecting in <strong id="seconds">3</strong>s</span></p>
			${panel}
		</main>

		<a href="${dest}" class="skip" id="skipBtn">Skip redirect now</a>

		<footer class="foot">
			<a href="/" class="foot-brand">quickqr.app</a>
			<p>QR Code is a registered trademark of DENSO WAVE INCORPORATED.</p>
		</footer>
	</div>

	<script>
		const dest = ${destJson};
		let remaining = 3;
		const seconds = document.getElementById("seconds");
		const timer = setInterval(() => {
			remaining -= 1;
			if (seconds) seconds.textContent = remaining;
			if (remaining <= 0) {
				clearInterval(timer);
				window.location.replace(dest);
			}
		}, 1000);
		document.getElementById("skipBtn").addEventListener("click", () => clearInterval(timer));
	</script>
</body>
</html>`;
}
