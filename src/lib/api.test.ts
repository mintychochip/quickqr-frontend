import {
  deleteLink,
  fetchGlobalAnalytics,
  fetchLinkAnalytics,
  fetchLinks,
  fetchQrSettings,
  patchQrSettings,
  updateLink,
} from './api';
import { getAuthToken, setAuthToken } from './auth';

const TOKEN = 'test-token-123';

type CapturedRequest = { url: string; init: RequestInit | undefined };

let captured: CapturedRequest[] = [];
let responder: (url: string, init: RequestInit | undefined) => Response = () =>
  new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });

const dispatched: Event[] = [];

function installStubs(): void {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        store.set(key, value);
      },
      removeItem: (key: string): void => {
        store.delete(key);
      },
    },
    writable: true,
  });
  Object.defineProperty(globalThis, 'fetch', {
    value: async (url: string, init?: RequestInit): Promise<Response> => {
      captured.push({ url, init });
      return responder(url, init);
    },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: {
      dispatchEvent: (event: Event): boolean => {
        dispatched.push(event);
        return true;
      },
    },
    writable: true,
    configurable: true,
  });
}

installStubs();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}


beforeEach(() => {
  captured = [];
  dispatched.length = 0;
  setAuthToken(null);
  responder = () =>
    new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
});

describe('authenticated request helper', () => {
  test('sends the stored token on every call', async () => {
    setAuthToken(TOKEN);
    await fetchLinks();
    await updateLink('menu-cafe', { title: 'New title' });
    await deleteLink('menu-cafe');
    await fetchQrSettings('menu-cafe');
    await patchQrSettings('menu-cafe', { title: 'New title' });
    await fetchLinkAnalytics('menu-cafe');
    await fetchGlobalAnalytics();

    expect(captured).toHaveLength(7);
    for (const { url, init } of captured) {
      if (new Headers(init?.headers).get('Authorization') !== `Bearer ${TOKEN}`) {
        throw new Error(`missing token on ${url}`);
      }
    }
  });

  test('sends no Authorization header without a token', async () => {
    await fetchLinks();
    await patchQrSettings('menu-cafe', { title: 'New title' });
    expect(captured).toHaveLength(2);
    for (const { init } of captured) {
      expect(new Headers(init?.headers).get('Authorization')).toBeNull();
    }
  });

  test('a 401 while signed in clears the token, notifies the app, and throws the session message', async () => {
    setAuthToken(TOKEN);
    responder = () => json(401, { error: 'Sign in to continue.' });

    const thrown = await fetchLinks().then(
      () => null,
      (err: unknown) => err,
    );
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('Your session expired. Sign in again.');
    expect(getAuthToken()).toBeNull();
    expect(dispatched.map((event) => event.type)).toEqual(['quickqr:unauthorized']);
  });

  test('a 401 without a token does not notify the app', async () => {
    responder = () => json(401, { error: 'Sign in to continue.' });

    const thrown = await fetchLinks().then(
      () => null,
      (err: unknown) => err,
    );
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('Sign in to continue.');
    expect(dispatched).toHaveLength(0);
    expect(getAuthToken()).toBeNull();
  });

  test('other errors keep the server message', async () => {
    setAuthToken(TOKEN);
    responder = () => json(404, { error: 'Link not found' });

    const thrown = await fetchLinkAnalytics('menu-cafe').then(
      () => null,
      (err: unknown) => err,
    );
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('Link not found');
    expect(getAuthToken()).toBe(TOKEN);
    expect(dispatched).toHaveLength(0);
  });

  test('a 502 still reports the API as unavailable', async () => {
    setAuthToken(TOKEN);
    responder = () => new Response('', { status: 502 });

    const thrown = await fetchGlobalAnalytics().then(
      () => null,
      (err: unknown) => err,
    );
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(
      'API unavailable. Start the backend: cd backend && go run ./cmd/server (port 8080).',
    );
    expect(getAuthToken()).toBe(TOKEN);
    expect(dispatched).toHaveLength(0);
  });
});
