import {
  createGift,
  deleteLink,
  fetchGifts,
  fetchGlobalAnalytics,
  fetchLinkAnalytics,
  fetchLinks,
  fetchQrSettings,
  fetchTrends,
  patchQrSettings,
  redeemGift,
  revokeGift,
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
    await fetchTrends();

    expect(captured).toHaveLength(8);
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

describe('fetchTrends', () => {
  test("reads every link's hourly counts from one request", async () => {
    setAuthToken(TOKEN);
    const answer = { hours: ['2026-10-22T10:00:00Z'], links: [{ code: 'menu-cafe', counts: [1] }] };
    responder = () => json(200, answer);

    expect(await fetchTrends()).toEqual(answer);
    expect(captured.map((request) => request.url)).toEqual(['/api/analytics/trends']);
  });

  test('throws the server message when it answers with an error', async () => {
    setAuthToken(TOKEN);
    responder = () => json(500, { error: 'boom' });

    const thrown = await fetchTrends().then(
      () => null,
      (err: unknown) => err,
    );
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown instanceof Error ? thrown.message : thrown).toBe('boom');
  });
});

describe('gift calls', () => {
  const TOKEN_IN_LINK = 'q3Vn0b8sT2xYw5LrC1dKpHjMfZa';

  test('claiming sends the token in the body of a POST, never in the address', async () => {
    setAuthToken(TOKEN);
    const answer = { plan: 'plus', until: '2026-11-22T00:00:00.000Z', granted: true };
    responder = () => json(200, answer);

    expect(await redeemGift(TOKEN_IN_LINK)).toEqual(answer);

    expect(captured).toHaveLength(1);
    expect(captured[0]?.url).toBe('/api/gifts/redeem');
    expect(captured[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(captured[0]?.init?.body))).toEqual({ token: TOKEN_IN_LINK });
    expect(new Headers(captured[0]?.init?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`);
  });

  test('a link the server refuses is null, not an error: it is an answer, and there is nothing to retry', async () => {
    setAuthToken(TOKEN);
    responder = () => json(404, { error: 'This gift link is not valid.' });

    expect(await redeemGift(TOKEN_IN_LINK)).toBeNull();
  });

  test('a server fault is an error, so the page can offer another try', async () => {
    setAuthToken(TOKEN);
    responder = () => json(500, { error: 'boom' });

    const thrown = await redeemGift(TOKEN_IN_LINK).then(
      () => null,
      (err: unknown) => err,
    );
    expect(thrown instanceof Error ? thrown.message : thrown).toBe('boom');
  });

  test('making a gift sends the fields as given and returns the link that exists only in that answer', async () => {
    setAuthToken(TOKEN);
    const made = { id: 'gft-abc12345', link: `https://quickqr.app/gift#${TOKEN_IN_LINK}`, token: TOKEN_IN_LINK };
    responder = () => json(201, made);

    expect(await createGift({ plan: 'pro', days: 14, uses: 3, link_days: 7, note: 'for Sam' })).toEqual(made);

    expect(captured[0]?.url).toBe('/api/admin/gifts');
    expect(captured[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(captured[0]?.init?.body))).toEqual({ plan: 'pro', days: 14, uses: 3, link_days: 7, note: 'for Sam' });
  });

  test('the list is the gifts the server sent, and none when it sent none', async () => {
    setAuthToken(TOKEN);
    responder = () => json(200, { gifts: [{ id: 'gft-abc12345' }] });
    expect(await fetchGifts()).toEqual([{ id: 'gft-abc12345' }]);

    responder = () => json(200, {});
    expect(await fetchGifts()).toEqual([]);
  });

  test('revoking posts to the gift by its id', async () => {
    setAuthToken(TOKEN);
    responder = () => json(200, { id: 'gft-abc12345', status: 'revoked' });

    expect((await revokeGift('gft-abc12345')).status).toBe('revoked');

    expect(captured[0]?.url).toBe('/api/admin/gifts/gft-abc12345/revoke');
    expect(captured[0]?.init?.method).toBe('POST');
  });
});
