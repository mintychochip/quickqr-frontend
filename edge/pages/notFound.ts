import { escapeHtml } from './html';

/** What a scan of a code that does not exist (or was turned off) shows. */
export function renderNotFound(rawCode: string): string {
  const code = escapeHtml(rawCode);
  return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>QR Code Not Found | quickqr</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700&display=swap" rel="stylesheet">
	<style>
		body { background: #fafbfc; color: #0f172a; font-family: 'Plus Jakarta Sans', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
		.card { background: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #e2e8f0; max-width: 400px; box-shadow: 0 20px 45px -15px rgba(0, 0, 0, 0.05); }
		h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #ef4444; }
		p { color: #64748b; font-size: 13px; margin-bottom: 24px; line-height: 1.5; }
		a { display: inline-block; background: #0f172a; color: white; text-decoration: none; font-weight: 600; font-size: 13px; padding: 10px 20px; border-radius: 999px; }
	</style>
</head>
<body>
	<div class="card">
		<h1>QR Code Not Found</h1>
		<p>The dynamic QR link <code>/r/${code}</code> does not exist or has been disabled.</p>
		<a href="/">&larr; Return to quickqr</a>
	</div>
</body>
</html>`;
}
