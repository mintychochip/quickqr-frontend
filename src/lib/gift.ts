/**
 * A gift link is `/gift#<token>`. The token is in the fragment so that no request line, log, or Referer carries it.
 * The page moves it into this tab's session storage and clears it from the address bar: the fragment does not survive
 * the round trip to a sign-in provider (the way back is the page's address without query or fragment), and the token
 * should not stay on screen or in the history. Session storage dies with the tab, so an unclaimed token does not linger.
 */
const KEY = 'quickqr2_pending_gift';

/**
 * The token waiting for this tab: the one in the address bar (kept, and removed from the address), else the one kept by
 * an earlier visit in this tab. Null when there is none.
 */
export function openGiftToken(): string | null {
  const fromAddress = window.location.hash.slice(1);
  if (fromAddress) {
    sessionStorage.setItem(KEY, fromAddress);
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
  }
  return sessionStorage.getItem(KEY);
}

/** Drops the kept token: it was claimed, or the server refused it, and trying it again cannot help. */
export function forgetGiftToken(): void {
  sessionStorage.removeItem(KEY);
}
