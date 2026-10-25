export type SiteTemplateFile = {
  path: string;
  body: string;
  type: string;
};

export type SiteTemplate = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  files: SiteTemplateFile[];
};

const starter = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your name</title>
<style>
  :root { color-scheme: light; --ink: #161618; --muted: #66666e; --paper: #f4f1e9; --line: #d8d2c4; --accent: #d7ff3c; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; }
  .wrap { width: min(720px, calc(100% - 40px)); margin: 0 auto; padding: 64px 0 48px; }
  .kicker { margin: 0 0 16px; font: 12px/1.4 ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  h1 { max-width: 620px; margin: 0; font-size: clamp(44px, 9vw, 96px); line-height: .98; letter-spacing: -.055em; }
  .lede { max-width: 480px; margin: 28px 0 0; font-size: 18px; color: var(--muted); }
  .rule { height: 1px; margin: 52px 0; background: var(--line); }
  .row { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 16px; }
  h2 { margin: 0; font-size: 18px; letter-spacing: -.02em; }
  a { color: inherit; text-decoration-thickness: 1px; text-underline-offset: 4px; }
  .mark { display: inline-block; padding: 4px 8px; border-radius: 999px; background: var(--accent); color: var(--ink); font: 12px/1 ui-monospace, monospace; }
  footer { margin-top: 64px; color: var(--muted); font-size: 13px; }
</style>
</head>
<body>
  <main class="wrap">
    <p class="kicker">A small corner of the internet</p>
    <h1>Your name,<br>in a few words.</h1>
    <p class="lede">Say what you do, what you are making, or what you want to hear from people. This page is yours to edit.</p>
    <div class="rule"></div>
    <div class="row">
      <h2>Work with me</h2>
      <span class="mark">open</span>
    </div>
    <p class="lede">Replace this line with a short note about the work, then add a way to get in touch.</p>
    <p><a href="mailto:hello@example.com">hello@example.com</a></p>
    <footer>Made on quickqr.app</footer>
  </main>
</body>
</html>`;

const portfolio = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Selected work</title>
<style>
  :root { color-scheme: dark; --ink: #f3f1ea; --muted: #a4a09a; --paper: #111214; --card: #1b1d20; --line: #303338; --accent: #d7ff3c; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; }
  .wrap { width: min(980px, calc(100% - 40px)); margin: 0 auto; padding: 56px 0 40px; }
  header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 20px; padding-bottom: 44px; border-bottom: 1px solid var(--line); }
  h1 { margin: 0; font-size: clamp(48px, 9vw, 112px); line-height: .9; letter-spacing: -.06em; }
  .meta { max-width: 260px; color: var(--muted); font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 44px; }
  .work { min-height: 280px; padding: 18px; border: 1px solid var(--line); border-radius: 22px; background: var(--card); display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
  .work h2 { margin: 0; font-size: 20px; letter-spacing: -.03em; }
  .work p { margin: 8px 0 0; color: var(--muted); font-size: 13px; }
  .art { height: 150px; margin-bottom: 18px; border-radius: 14px; background: linear-gradient(135deg, #d7ff3c 0%, #79b3ff 100%); }
  .work:nth-child(2) .art { background: radial-gradient(circle at 70% 30%, #ffb37a 0 18%, transparent 19%), linear-gradient(135deg, #5f7cff, #d6c8ff); }
  .work:nth-child(3) .art { background: repeating-linear-gradient(45deg, #f3f1ea 0 12px, #26292e 12px 24px); }
  footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; }
  a { color: inherit; text-underline-offset: 4px; }
  @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <main class="wrap">
    <header>
      <h1>Selected<br>work.</h1>
      <p class="meta">A compact portfolio. Replace the projects, the colours, and the words with your own.</p>
    </header>
    <section class="grid" aria-label="Projects">
      <article class="work"><div class="art" aria-hidden="true"></div><div><h2>Project one</h2><p>A short line about the problem and the result.</p></div></article>
      <article class="work"><div class="art" aria-hidden="true"></div><div><h2>Project two</h2><p>A short line about the problem and the result.</p></div></article>
      <article class="work"><div class="art" aria-hidden="true"></div><div><h2>Project three</h2><p>A short line about the problem and the result.</p></div></article>
    </section>
    <footer><span>Your studio, 2026</span><a href="mailto:hello@example.com">hello@example.com</a></footer>
  </main>
</body>
</html>`;

const cafe = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The morning menu</title>
<style>
  :root { color-scheme: light; --ink: #231b17; --muted: #76635a; --paper: #f7f1e6; --line: #dccdbf; --accent: #b34e2b; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; }
  .wrap { width: min(760px, calc(100% - 40px)); margin: 0 auto; padding: 48px 0 40px; }
  header { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 20px; padding-bottom: 26px; border-bottom: 2px solid var(--ink); }
  .kicker { margin: 0 0 8px; color: var(--accent); font: 12px/1.4 ui-monospace, monospace; letter-spacing: .16em; text-transform: uppercase; }
  h1 { margin: 0; font-size: clamp(48px, 11vw, 96px); line-height: .88; letter-spacing: -.06em; }
  .hours { max-width: 220px; color: var(--muted); font-size: 14px; }
  .menu { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 38px; }
  h2 { margin: 0 0 14px; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; }
  ul { display: grid; gap: 16px; margin: 0; padding: 0; list-style: none; }
  li { display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: baseline; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
  strong { font-weight: 600; }
  .note { display: block; margin-top: 2px; color: var(--muted); font-size: 13px; }
  .price { font-family: ui-monospace, monospace; font-size: 13px; }
  footer { margin-top: 48px; padding-top: 18px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
  a { color: inherit; text-underline-offset: 4px; }
  @media (max-width: 620px) { .menu { grid-template-columns: 1fr; gap: 28px; } }
</style>
</head>
<body>
  <main class="wrap">
    <header>
      <div><p class="kicker">Café &amp; bakery</p><h1>Morning<br>menu.</h1></div>
      <p class="hours">Open daily 7–3<br>14 Market Street<br>hello@example.com</p>
    </header>
    <section class="menu">
      <div>
        <h2>Coffee</h2>
        <ul>
          <li><span><strong>Espresso</strong><span class="note">Single origin, changes weekly</span></span><span class="price">3.5</span></li>
          <li><span><strong>Flat white</strong><span class="note">Whole or oat milk</span></span><span class="price">4.5</span></li>
          <li><span><strong>Filter</strong><span class="note">Ask what is brewing</span></span><span class="price">4</span></li>
        </ul>
      </div>
      <div>
        <h2>From the oven</h2>
        <ul>
          <li><span><strong>Sourdough</strong><span class="note">Butter, jam, or nothing at all</span></span><span class="price">5</span></li>
          <li><span><strong>Morning bun</strong><span class="note">Cinnamon and citrus</span></span><span class="price">4.5</span></li>
          <li><span><strong>Mushroom toast</strong><span class="note">Herbs, lemon, olive oil</span></span><span class="price">9</span></li>
        </ul>
      </div>
    </section>
    <footer><span>Replace this menu with yours.</span><span>Made on quickqr.app</span></footer>
  </main>
</body>
</html>`;

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    tagline: 'Your files',
    description: 'Upload a folder or a set of files you already made. A root index.html is required.',
    files: [],
  },
  {
    id: 'starter',
    name: 'Starter page',
    tagline: 'One page',
    description: 'A quiet one-page introduction with room for a short note and a contact link.',
    files: [{ path: 'index.html', body: starter, type: 'text/html' }],
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    tagline: 'Selected work',
    description: 'Three project cards on a dark page. Replace the CSS art and the project lines with your own.',
    files: [{ path: 'index.html', body: portfolio, type: 'text/html' }],
  },
  {
    id: 'cafe',
    name: 'Café menu',
    tagline: 'Food and drink',
    description: 'A warm two-column menu for coffee, food, and opening hours, ready to print or scan.',
    files: [{ path: 'index.html', body: cafe, type: 'text/html' }],
  },
];

export function templateById(id: string): SiteTemplate | undefined {
  return SITE_TEMPLATES.find((template) => template.id === id);
}
