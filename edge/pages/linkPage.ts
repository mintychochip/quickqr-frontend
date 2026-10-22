import type { Link } from '../types';
import { escapeHtml } from './html';

/** A hosted list of links, served at the code's own /r/ address. */
export function renderLinkPage(link: Link): string {
  const title = escapeHtml(link.title);
  const entries = (link.links ?? [])
    .map(
      (entry) =>
        `<li class="item" data-testid="public-page-link"><span class="name" data-testid="public-page-link-name">${escapeHtml(entry.name)}</span><a class="go" data-testid="public-page-link-url" href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(entry.url)}</a></li>`,
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title} | quickqr page</title>
	<style>
		:root { color-scheme: light; }
		* { box-sizing: border-box; }
		body {
			margin: 0;
			min-height: 100vh;
			background: #f3f3f5;
			color: #111113;
			font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
		}
		.wrap { max-width: 640px; margin: 0 auto; padding: 32px 20px 64px; }
		.kicker {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			margin: 0 0 16px;
			padding: 4px 10px;
			border-radius: 999px;
			background: #111113;
			color: #d7ff3c;
			font-size: 12px;
			font-weight: 600;
			letter-spacing: -0.01em;
		}
		h1 {
			margin: 0 0 8px;
			font-size: clamp(36px, 6vw, 52px);
			line-height: 0.98;
			letter-spacing: -0.05em;
			font-weight: 600;
		}
		.note { margin: 0 0 24px; color: #6c6c73; font-size: 14px; }
		ul { list-style: none; margin: 0; padding: 0; background: #fff; border: 1px solid #e6e6ea; border-radius: 16px; }
		.item {
			display: flex;
			justify-content: space-between;
			gap: 16px;
			padding: 16px 18px;
			border-top: 1px solid #e6e6ea;
		}
		.item:first-child { border-top: 0; }
		.name { font-size: 16px; }
		.go { color: #2563eb; font-size: 14px; text-decoration: none; overflow-wrap: anywhere; }
		.go:hover { text-decoration: underline; }
		footer { margin-top: 18px; color: #6c6c73; font-size: 12px; }
	</style>
</head>
<body>
	<main class="wrap" data-testid="public-link-page">
		<p class="kicker">quickqr page</p>
		<h1 data-testid="public-page-title">${title}</h1>
		<p class="note">Tap a link. Same code after you change the list.</p>
		<ul>${entries}</ul>
		<footer>Hosted on quickqr. Edit the list any time; the printed code never changes.</footer>
	</main>
</body>
</html>`;
}
