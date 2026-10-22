const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&#34;', "'": '&#39;' })[c] ?? c);

/** The page the local sign-in stand-in shows: one email field, no password. */
export function renderDevConsent(state: string, provider: 'github' | 'google'): string {
  const title = provider === 'github' ? 'Continue with GitHub' : 'Continue with Google';
  const name = provider === 'github' ? 'GitHub' : 'Google';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · quickqr</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f3f3f5; color: #111113; font-family: ui-sans-serif, system-ui, sans-serif; }
    main { width: min(440px, calc(100% - 2rem)); background: #fff; border-radius: 28px; padding: 28px; box-shadow: 0 24px 60px -28px rgba(17,17,19,.55); }
    .mark { width: 36px; height: 36px; border-radius: 12px; background: #d7ff3c; display: grid; place-items: center; font-weight: 700; }
    h1 { margin: 16px 0 8px; font-size: 28px; letter-spacing: -0.045em; }
    p { margin: 0; color: #6c6c73; line-height: 1.45; }
    label { display: block; margin-top: 22px; font-size: 14px; font-weight: 600; }
    input { width: 100%; box-sizing: border-box; margin-top: 8px; height: 44px; border-radius: 12px; border: 1px solid #e4e4e8; padding: 0 12px; font: inherit; background: #f3f3f5; }
    button { margin-top: 18px; width: 100%; height: 44px; border: 0; border-radius: 12px; background: #d7ff3c; color: #111113; font: inherit; font-weight: 600; cursor: pointer; }
    .note { margin-top: 14px; font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <div class="mark" aria-hidden="true">q</div>
    <h1>${title}</h1>
    <p>This computer does not have ${name} client secrets yet. quickqr will sign you in locally as the email below. The same address logs into the same account next time.</p>
    <form method="post" action="/api/auth/oauth/dev/consent">
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="email" required placeholder="you@company.com" />
      <button type="submit">Continue</button>
    </form>
    <p class="note">Add GOOGLE_CLIENT_ID and GITHUB_CLIENT_ID in backend/.env to use the real providers.</p>
  </main>
</body>
</html>`;
}
