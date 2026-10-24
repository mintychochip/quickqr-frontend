/** The public address of a hosted site: its own host in production, `/s/<code>/` on local and preview servers. */
export function siteUrl(code: string): string {
  const host = window.location.hostname;
  const origin =
    host === 'quickqr.app'
      ? 'https://sites.quickqr.app'
      : host === 'staging.quickqr.app' || host.endsWith('.quickqr.pages.dev')
        ? 'https://staging.sites.quickqr.app'
        : '';
  return origin ? `${origin}/${code}/` : `${window.location.origin}/s/${code}/`;
}
