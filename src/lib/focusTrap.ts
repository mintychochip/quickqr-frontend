/**
 * Keeps keyboard focus inside a modal. On open it moves focus onto `node` (which needs `tabindex="-1"`); Tab and
 * Shift+Tab wrap at the ends instead of reaching the page behind; on close it hands focus back to whatever had it.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(node: HTMLElement): { destroy: () => void } {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  node.focus({ preventScroll: true });

  function wrapTab(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    // Asked on every press: controls such as sign-in providers can appear after the modal opens.
    const reachable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
    const first = reachable[0];
    const last = reachable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === node)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  node.addEventListener('keydown', wrapTab);
  return {
    destroy() {
      node.removeEventListener('keydown', wrapTab);
      if (opener?.isConnected) opener.focus();
    },
  };
}
