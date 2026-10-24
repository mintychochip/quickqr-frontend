import { DEFAULT_MENU_DESIGN, type MenuDesign } from '../menuDesign';
import type { Link } from '../types';
import { escapeHtml } from './html';

const FONT_STACKS: Record<MenuDesign['font'], string> = {
  serif: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
  sans: '"Geist", ui-sans-serif, system-ui, sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
};

/** The original page for every menu without a design; kept byte for byte. */
function renderPlainMenu(title: string, items: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title} | quickqr menu</title>
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
		.price { font-family: ui-monospace, monospace; font-size: 15px; }
		footer { margin-top: 18px; color: #6c6c73; font-size: 12px; }
	</style>
</head>
<body>
	<main class="wrap" data-testid="public-menu">
		<p class="kicker">quickqr menu</p>
		<h1 data-testid="public-menu-title">${title}</h1>
		<p class="note">Scan the same code after the kitchen changes a price. This page updates. The QR does not.</p>
		<ul>${items}</ul>
		<footer>Hosted on quickqr. No account needed to read this menu.</footer>
	</main>
</body>
</html>`;
}

/** A hosted menu, served at the code's own /r/ address, with the owner's optional brand. */
export function renderMenu(link: Link): string {
  const title = escapeHtml(link.title);
  const items = (link.items ?? [])
    .map(
      (item) =>
        `<li class="item" data-testid="public-menu-item"><span class="name" data-testid="public-menu-item-name">${escapeHtml(item.name)}</span><span class="price" data-testid="public-menu-item-price">${escapeHtml(item.price)}</span></li>`,
    )
    .join('');
  if (!link.design) return renderPlainMenu(title, items);

  const brand = link.design ?? DEFAULT_MENU_DESIGN;
  const logo = brand.logoUrl
    ? `<img class="logo" src="${escapeHtml(brand.logoUrl)}" alt="${title}" referrerpolicy="no-referrer" loading="lazy" decoding="async">`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title}</title>
	<style>
		:root { color-scheme: light; --menu-bg: ${brand.background}; --menu-ink: ${brand.ink}; --menu-accent: ${brand.accent}; }
		* { box-sizing: border-box; }
		body {
			margin: 0;
			min-height: 100vh;
			background: var(--menu-bg);
			color: var(--menu-ink);
			font-family: ${FONT_STACKS[brand.font]};
		}
		.wrap { max-width: 640px; margin: 0 auto; padding: 32px 20px 64px; }
		.logo { display: block; max-width: 200px; max-height: 56px; margin: 0 0 20px; object-fit: contain; }
		h1 {
			margin: 0 0 8px;
			padding-bottom: 14px;
			border-bottom: 2px solid var(--menu-accent);
			font-size: clamp(36px, 6vw, 52px);
			line-height: 0.98;
			letter-spacing: -0.05em;
			font-weight: 600;
		}
		.note { margin: 0 0 24px; color: color-mix(in srgb, var(--menu-ink) 62%, var(--menu-bg)); font-size: 14px; }
		ul {
			list-style: none;
			margin: 0;
			padding: 0;
			background: color-mix(in srgb, var(--menu-bg) 90%, var(--menu-ink) 10%);
			border: 1px solid color-mix(in srgb, var(--menu-ink) 16%, var(--menu-bg));
			border-radius: 16px;
		}
		.item {
			display: flex;
			justify-content: space-between;
			gap: 16px;
			padding: 16px 18px;
			border-top: 1px solid color-mix(in srgb, var(--menu-ink) 16%, var(--menu-bg));
		}
		.item:first-child { border-top: 0; }
		.name { font-size: 16px; }
		.price { font-family: ui-monospace, monospace; font-size: 15px; color: var(--menu-ink); }
	</style>
</head>
<body>
	<main class="wrap" data-testid="public-menu">
		${logo}
		<h1 data-testid="public-menu-title">${title}</h1>
		<p class="note">Scan the same code after the kitchen changes a price. This page updates. The QR does not.</p>
		<ul>${items}</ul>
	</main>
</body>
</html>`;
}
