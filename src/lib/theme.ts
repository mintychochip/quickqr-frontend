export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'quickqr-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function getThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* Storage can be unavailable in private modes. */
  }
  return 'system';
}

export function resolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode): void {
  const dark = resolvedTheme(mode) === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#0b0b0d' : '#f3f3f5';
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* Keep the in-page theme even if persistence is blocked. */
  }
  applyTheme(mode);
}
