import { describe, expect, test } from 'bun:test';
import { escapeHtml, inlineJson } from './pages/html';
import { renderInterstitial } from './pages/interstitial';
import { renderLinkPage } from './pages/linkPage';
import { renderMenu } from './pages/menu';
import { renderNotFound } from './pages/notFound';
import type { Link, Sponsor } from './types';

const SPONSOR: Sponsor = {
  id: 'spn-test',
  brand_name: 'Fieldnote & Co',
  badge: 'Sponsored',
  headline: 'Paper <for> people',
  tagline: 'Write "it" down',
  cta: "Shop o'clock",
  target_url: 'https://sponsor.example/?a=1&b=2',
  logo_url: 'F&G',
  active: true,
};

const link = (over: Partial<Link> = {}): Link => ({
  id: 'lnk-1',
  code: 'abc123',
  title: 'My menu',
  destination_url: 'https://example.com/a',
  created_at: '2026-10-22T00:00:00.000Z',
  updated_at: '2026-10-22T00:00:00.000Z',
  total_scans: 0,
  ad_style: 'interstitial_3s',
  is_active: true,
  ...over,
});

/** The value of `const dest = ...;` in the page's script, read back the way a browser would. */
const scriptDestination = (page: string): unknown => {
  const m = /const dest = (.*);\n/.exec(page);
  if (!m?.[1]) throw new Error('no dest in script');
  return JSON.parse(m[1]);
};

describe('escaping', () => {
  test('escapeHtml covers the five characters, as Go does', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe('&lt;a href=&#34;x&#34; onclick=&#39;y&#39;&gt;&amp;');
    expect(escapeHtml('plain text')).toBe('plain text');
  });

  test('inlineJson reads back as the same value but can never close a script tag', () => {
    for (const value of ['</script><script>alert(1)</script>', '<!-- x -->', 'a&b', 'line\u2028sep\u2029', '"quoted"', 'back\\slash', 'ünïcödé']) {
      const text = inlineJson(value);
      expect(JSON.parse(text)).toBe(value);
      expect(text).not.toMatch(/[<>&\u2028\u2029]/);
    }
    expect(inlineJson('<')).toBe('"\\u003c"');
  });
});

describe('the interstitial', () => {
  test('names the destination, refreshes to it after 3 seconds, and offers a skip', () => {
    const page = renderInterstitial(link(), SPONSOR);
    expect(page).toContain('<title>Redirecting to My menu | quickqr.app</title>');
    expect(page).toContain('<meta http-equiv="refresh" content="3;url=https://example.com/a">');
    expect(page).toMatch(/<a [^>]*href="https:\/\/example\.com\/a"[^>]*>https:\/\/example\.com\/a<\/a>/); // the destination is named, as a link
    expect(page).toMatch(/<a [^>]*href="https:\/\/example\.com\/a"[^>]*>\s*Skip/); // and Skip goes straight there
    expect(scriptDestination(page)).toBe('https://example.com/a');
    expect(page).toContain('QR Code is a registered trademark of DENSO WAVE INCORPORATED.');
  });

  test('falls back to "Destination" for a blank title', () => {
    expect(renderInterstitial(link({ title: '' }), SPONSOR)).toContain('<title>Redirecting to Destination | quickqr.app</title>');
  });

  test('shows the sponsor with every field escaped, and a plain panel when there is none', () => {
    const page = renderInterstitial(link(), SPONSOR);
    expect(page).toContain('aria-label="Sponsored message"');
    expect(page).toContain('Fieldnote &amp; Co');
    expect(page).toContain('Paper &lt;for&gt; people');
    expect(page).toContain('Write &#34;it&#34; down');
    expect(page).toContain('href="https://sponsor.example/?a=1&amp;b=2"');
    expect(page).toContain('Shop o&#39;clock');
    expect(page).toContain('F&amp;G'); // the logo is escaped like every other sponsor field
    expect(page).not.toContain('How it stays free');

    const bare = renderInterstitial(link(), null);
    expect(bare).toContain('How it stays free');
    expect(bare).not.toContain('Sponsored message');
  });

  test('a hostile sponsor cannot inject markup through any field, the logo included', () => {
    const hostile = renderInterstitial(link(), { ...SPONSOR, logo_url: '<img src=x onerror=alert(1)>', badge: '<b>', brand_name: '<i>', headline: '<u>', tagline: '<s>', cta: '<em>', target_url: '"><script>' });
    expect(hostile).not.toMatch(/<img src=x|<b>|<i>|<u>|<s>|<em>|"><script>/);
  });

  test('a hostile title or destination cannot break out of the page or the script', () => {
    const evil = 'https://example.com/"><script>alert(1)</script>\u2028';
    const page = renderInterstitial(link({ title: '<script>alert(2)</script>', destination_url: evil }), null);
    expect(page).not.toContain('<script>alert');
    expect(page.match(/<script>/g)).toHaveLength(1); // only the page's own
    expect(page.match(/<\/script>/g)).toHaveLength(1);
    expect(page).toContain('<title>Redirecting to &lt;script&gt;alert(2)&lt;/script&gt; | quickqr.app</title>');
    expect(scriptDestination(page)).toBe(evil);
  });
});

describe('hosted pages', () => {
  test('a menu lists its items in order, escaped, with the hooks the end-to-end tests use', () => {
    const page = renderMenu(link({ kind: 'menu', title: 'Lunch <b>', items: [{ name: 'Soup & bread', price: '6.00' }, { name: 'Tea', price: '<2>' }] }));
    expect(page).toContain('<title>Lunch &lt;b&gt; | quickqr menu</title>');
    expect(page).toContain('<h1 data-testid="public-menu-title">Lunch &lt;b&gt;</h1>');
    expect(page.indexOf('Soup &amp; bread')).toBeLessThan(page.indexOf('>Tea<'));
    expect(page).toContain('<span class="price" data-testid="public-menu-item-price">&lt;2&gt;</span>');
    expect(page.match(/data-testid="public-menu-item"/g)).toHaveLength(2);
    expect(page).toContain('data-testid="public-menu"');
  });

  test('a menu with no items is an empty list, not a crash', () => {
    expect(renderMenu(link({ kind: 'menu' }))).toContain('<ul></ul>');
  });

  test('a menu design renders the brand and drops the quickqr chrome', () => {
    const page = renderMenu(
      link({
        kind: 'menu',
        title: 'Lunch',
        items: [{ name: 'Soup', price: '6.00' }],
        design: {
          logoUrl: 'https://sites.quickqr.app/x/logo.png',
          background: '#0e1a14',
          ink: '#eee7d7',
          accent: '#c8a56b',
          font: 'serif',
        },
      }),
    );
    expect(page).toContain('--menu-bg: #0e1a14');
    expect(page).toContain('--menu-ink: #eee7d7');
    expect(page).toContain('--menu-accent: #c8a56b');
    expect(page).toContain('Iowan Old Style');
    expect(page).toContain('<img class="logo" src="https://sites.quickqr.app/x/logo.png"');
    expect(page).toContain('referrerpolicy="no-referrer"');
    expect(page).not.toContain('quickqr menu');
    expect(page).not.toContain('Hosted on quickqr');
  });

  test('an unbranded menu keeps the quickqr page', () => {
    const page = renderMenu(link({ kind: 'menu', title: 'Lunch', items: [{ name: 'Soup', price: '6' }] }));
    expect(page).toContain('quickqr menu');
    expect(page).toContain('Hosted on quickqr');
  });

  test('a hostile logo, title, or item cannot inject markup', () => {
    const page = renderMenu(
      link({
        kind: 'menu',
        title: '<b>',
        items: [{ name: '<i>', price: '"&' }],
        design: {
          logoUrl: 'https://e.example/"><script>alert(1)</script>',
          background: '#ffffff',
          ink: '#111111',
          accent: '#000000',
          font: 'sans',
        },
      }),
    );
    expect(page).not.toContain('<script>alert');
    expect(page).toContain('&lt;b&gt;');
    expect(page).toContain('&lt;i&gt;');
    expect(page).toContain('&#34;&amp;');
  });

  test('a link page lists its links, escaped, opening in a new tab without the opener', () => {
    const page = renderLinkPage(link({ kind: 'linkpage', title: 'Find <me>', links: [{ name: 'Site "one"', url: 'https://a.example/?x=1&y=2' }] }));
    expect(page).toContain('<title>Find &lt;me&gt; | quickqr page</title>');
    expect(page).toContain('<span class="name" data-testid="public-page-link-name">Site &#34;one&#34;</span>');
    expect(page).toContain('href="https://a.example/?x=1&amp;y=2" target="_blank" rel="noopener noreferrer">https://a.example/?x=1&amp;y=2</a>');
    expect(page).toContain('data-testid="public-link-page"');
  });
});

describe('not found', () => {
  test('names the code, escaped', () => {
    const page = renderNotFound('<x>"y"');
    expect(page).toContain('<title>QR Code Not Found | quickqr</title>');
    expect(page).toContain('<code>/r/&lt;x&gt;&#34;y&#34;</code>');
  });
});
