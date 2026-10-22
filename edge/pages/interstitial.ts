import type { Link, Sponsor } from '../types';
import { escapeHtml, inlineJson } from './html';

/** Shown when there is no active sponsor: what the pause is for. */
const FALLBACK_PANEL = `
<aside class="panel sponsor-panel" aria-label="About quickqr">
	<div class="sponsor-top">
		<span class="badge">How it stays free</span>
	</div>
	<h2 class="sponsor-headline">A short pause.<br/>No subscription.</h2>
	<p class="sponsor-tagline">Sponsor messages keep dynamic redirects free. Your printed code never expires.</p>
	<div class="sponsor-rule"></div>
	<p class="sponsor-tagline">You can change the destination any time from the dashboard.</p>
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
<aside class="panel sponsor-panel" aria-label="Sponsored message">
	<div class="sponsor-top">
		<span class="badge">${badge}</span>
		<span class="sponsor-brand">${brand}</span>
	</div>
	<div class="sponsor-logo" aria-hidden="true">${logo}</div>
	<h2 class="sponsor-headline">${headline}</h2>
	<p class="sponsor-tagline">${tagline}</p>
	<a href="${target}" target="_blank" rel="noopener sponsored" class="sponsor-cta">${cta} <span aria-hidden="true">&#8599;</span></a>
</aside>`;
}

/** The three-second pause a scan of an ordinary link shows before it moves on to the destination. */
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
			--bg: #f3f3f5;
			--surface: #ffffff;
			--ink: #111113;
			--muted: #6c6c73;
			--border: #e6e6ea;
			--soft: #ececef;
			--punch: #d7ff3c;
			--punch-ink: #111113;
			--shadow: 0 28px 70px -40px rgba(17, 17, 19, 0.45);
		}
		@media (prefers-color-scheme: dark) {
			:root {
				--bg: #0b0b0d;
				--surface: #141417;
				--ink: #f4f4f2;
				--muted: #a3a3ab;
				--border: #2b2b31;
				--soft: #202024;
				--punch: #d7ff3c;
				--punch-ink: #111113;
				--shadow: 0 28px 70px -40px rgba(0, 0, 0, 0.9);
			}
		}
		* { box-sizing: border-box; }
		html, body { min-height: 100%; }
		body {
			margin: 0;
			min-height: 100dvh;
			background: var(--bg);
			color: var(--ink);
			font-family: "Geist", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			-webkit-font-smoothing: antialiased;
		}
		a { color: inherit; }
		.shell {
			width: 100%;
			max-width: 1120px;
			min-height: 100dvh;
			margin: 0 auto;
			padding: clamp(20px, 4vw, 48px);
			display: flex;
			flex-direction: column;
			justify-content: center;
			gap: 24px;
		}
		.topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
		.brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
		.brand-mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--punch); flex: none; }
		.brand-mark svg { width: 22px; height: 22px; display: block; }
		.brand-copy { display: flex; flex-direction: column; line-height: 1.1; }
		.brand-copy strong { font-size: 17px; letter-spacing: -0.04em; }
		.brand-copy span { margin-top: 3px; font-size: 11px; color: var(--muted); }
		.status-pill {
			flex: none;
			border: 1px solid var(--border);
			border-radius: 999px;
			padding: 6px 10px;
			font-family: "Geist Mono", ui-monospace, monospace;
			font-size: 10px;
			letter-spacing: 0.04em;
			text-transform: uppercase;
			color: var(--muted);
			background: var(--surface);
		}
		.layout {
			display: grid;
			grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
			gap: 20px;
			align-items: stretch;
		}
		.panel {
			background: var(--surface);
			border: 1px solid var(--border);
			border-radius: 24px;
			padding: clamp(22px, 3.5vw, 38px);
			box-shadow: var(--shadow);
		}
		.intro { display: flex; flex-direction: column; gap: 28px; }
		h1 {
			margin: 0 0 10px;
			font-size: clamp(32px, 4.7vw, 58px);
			line-height: 0.98;
			letter-spacing: -0.04em;
			font-weight: 600;
			overflow-wrap: anywhere;
		}
		.dest {
			display: inline-block;
			max-width: 100%;
			font-family: "Geist Mono", ui-monospace, monospace;
			font-size: 12px;
			line-height: 1.5;
			color: var(--muted);
			text-decoration: none;
			overflow-wrap: anywhere;
		}
		.dest:hover { color: var(--ink); }
		.note { margin: 18px 0 0; max-width: 46ch; color: var(--muted); font-size: 14px; line-height: 1.65; }
		.intro-actions { margin-top: auto; display: flex; flex-direction: column; gap: 12px; }
		.progress-track { height: 6px; border-radius: 999px; background: var(--soft); overflow: hidden; }
		.progress-bar { height: 100%; width: 0; background: var(--punch); animation: countdown 3s linear forwards; }
		@keyframes countdown { to { width: 100%; } }
		.countdown-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 12px; color: var(--muted); }
		.countdown-row strong { color: var(--ink); font-weight: 600; }
		.countdown-hint { font-size: 11px; }
		.skip {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			min-height: 48px;
			border-radius: 12px;
			background: var(--punch);
			color: var(--punch-ink);
			text-decoration: none;
			font-size: 14px;
			font-weight: 600;
			transition: filter 150ms ease, transform 150ms ease;
		}
		.skip:hover { filter: brightness(0.96); }
		.skip:active { transform: translateY(1px); }
		.skip-note { margin: 0; text-align: center; font-size: 11px; color: var(--muted); }
		.bottom-action { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 420px; margin: 0 auto; }
		.sponsor-panel { display: flex; flex-direction: column; gap: 16px; }
		.sponsor-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
		.badge {
			display: inline-flex;
			border: 1px solid var(--border);
			background: var(--soft);
			border-radius: 6px;
			padding: 3px 7px;
			font-size: 9px;
			font-weight: 600;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--muted);
		}
		.sponsor-brand { font-size: 12px; font-weight: 600; color: var(--muted); }
		.sponsor-logo {
			display: grid;
			place-items: center;
			width: 48px;
			height: 48px;
			border: 1px solid var(--border);
			border-radius: 12px;
			background: var(--soft);
			font-size: 22px;
		}
		.sponsor-headline { margin: 0; font-size: clamp(20px, 2.6vw, 28px); line-height: 1.1; letter-spacing: -0.035em; font-weight: 600; }
		.sponsor-tagline { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
		.sponsor-rule { height: 1px; background: var(--border); }
		.sponsor-cta {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			min-height: 44px;
			margin-top: auto;
			border-radius: 12px;
			background: var(--ink);
			color: var(--surface);
			text-decoration: none;
			font-size: 13px;
			font-weight: 600;
		}
		.sponsor-cta:hover { opacity: 0.88; }
		.page-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; color: var(--muted); font-size: 11px; line-height: 1.5; }
		.page-footer p { margin: 0; }
		a:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; border-radius: 6px; }
		@media (max-width: 780px) {
			.shell { justify-content: flex-start; padding: 16px; gap: 16px; }
			.layout { grid-template-columns: 1fr; }
			.panel { border-radius: 20px; padding: 22px; }
			.intro { gap: 24px; }
			.status-pill { font-size: 9px; }
			.page-footer { flex-direction: column; align-items: flex-start; }
		}
		@media (prefers-reduced-motion: reduce) {
			.progress-bar { animation: none; width: 100%; }
			.skip { transition: none; }
		}
	</style>
</head>
<body>
	<div class="shell">
		<header class="topbar">
			<a class="brand" href="/" aria-label="quickqr.app home">
				<span class="brand-mark" aria-hidden="true">
					<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
						<rect width="32" height="32" rx="9" fill="#d7ff3c"/>
						<rect x="9.5" y="6.25" width="13" height="13" rx="3.75" fill="none" stroke="#111113" stroke-width="3.5"/>
						<rect x="14.25" y="11" width="3.5" height="3.5" rx="0.9" fill="#111113"/>
						<path d="M22.5 14.5v11" stroke="#111113" stroke-width="3.5" stroke-linecap="round"/>
					</svg>
				</span>
				<span class="brand-copy"><strong>quickqr.app</strong><span>Free dynamic QR</span></span>
			</a>
			<span class="status-pill">3-second sponsor pause</span>
		</header>

		<main class="layout">
			<section class="panel intro">
				<div>
					<h1>${title}</h1>
					<a href="${dest}" class="dest">${dest}</a>
					<p class="note">You're being redirected to the destination above. This short pause keeps dynamic QR codes free.</p>
				</div>
				<div class="intro-actions">
					<div class="progress-track" aria-hidden="true"><div class="progress-bar"></div></div>
					<div class="countdown-row">
						<span id="statusText" aria-live="polite">Redirecting in <strong id="seconds">3</strong>s</span>
						<span class="countdown-hint">No action needed</span>
					</div>
				</div>
			</section>
			${panel}
		</main>

		<div class="bottom-action">
			<a href="${dest}" class="skip" id="skipBtn">Skip redirect now <span aria-hidden="true">&#8594;</span></a>
			<p class="skip-note">The destination opens in this tab.</p>
		</div>

		<footer class="page-footer">
			<p>quickqr.app &middot; Dynamic redirects without subscriptions.</p>
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
