import { forgetGiftToken, openGiftToken } from './gift';

const TOKEN = 'q3Vn0b8sT2xYw5LrC1dKpHjMfZa';
const LATER = 'Zk9mP2xQ7vB4nL1cR8sT0wYdHfA';

const session = new Map<string, string>();
const address = { pathname: '/gift', search: '', hash: '' };
const replaced: string[] = [];

Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (key: string): string | null => session.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      session.set(key, value);
    },
    removeItem: (key: string): void => {
      session.delete(key);
    },
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, 'window', {
  value: {
    location: address,
    history: {
      // A browser's address bar follows the URL it is given, fragment included.
      replaceState: (_state: unknown, _title: string, url: string): void => {
        replaced.push(url);
        const at = url.indexOf('#');
        address.hash = at >= 0 ? url.slice(at) : '';
      },
    },
  },
  writable: true,
  configurable: true,
});

beforeEach(() => {
  session.clear();
  replaced.length = 0;
  address.pathname = '/gift';
  address.search = '';
  address.hash = '';
});

describe('the gift token in the address bar', () => {
  test('is kept for this tab and taken out of the address, query and all untouched', () => {
    address.search = '?utm=mail';
    address.hash = `#${TOKEN}`;

    expect(openGiftToken()).toBe(TOKEN);

    expect(replaced).toEqual(['/gift?utm=mail']);
    expect(address.hash).toBe('');
  });

  test('is still there after the round trip to a sign-in provider, which loses the fragment', () => {
    address.hash = `#${TOKEN}`;
    openGiftToken();

    address.search = '?auth_token=session';
    address.hash = '';

    expect(openGiftToken()).toBe(TOKEN);
    expect(replaced).toHaveLength(1);
  });

  test('a newer link in the same tab replaces an older one', () => {
    address.hash = `#${TOKEN}`;
    openGiftToken();
    address.hash = `#${LATER}`;

    expect(openGiftToken()).toBe(LATER);
  });

  test('is gone once forgotten, so a claimed or refused link is not tried again', () => {
    address.hash = `#${TOKEN}`;
    openGiftToken();

    forgetGiftToken();

    expect(openGiftToken()).toBeNull();
  });

  test('no fragment and nothing kept is no token, and the address is left alone', () => {
    expect(openGiftToken()).toBeNull();
    expect(replaced).toHaveLength(0);
  });

  test('a bare # is not a token', () => {
    address.hash = '#';

    expect(openGiftToken()).toBeNull();
    expect(replaced).toHaveLength(0);
  });
});
