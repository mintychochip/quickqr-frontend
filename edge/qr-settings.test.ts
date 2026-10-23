import { describe, expect, test } from 'bun:test';
import type { Link, QRStyle } from './types';
import { bearer, go, grantPlan, rig, signUp, withJson, type Rig } from './test/rig';

interface Settings {
  resource: string;
  code: string;
  kind: string;
  settings: { title: string; destination_url: string; ad_style: string; style: QRStyle | null };
  fields: { name: string; type: string; editable: boolean; values?: string[]; about: string }[];
}

async function setup(): Promise<{ r: Rig; ada: { id: string; token: string }; bob: { id: string; token: string }; code: string }> {
  const r = rig();
  const ada = await signUp(r, 'ada@example.com');
  const bob = await signUp(r, 'bob@example.com');
  const made = (await (await go(r, '/api/links', withJson('POST', ada.token, { code: 'qr1', title: 'Cafe', destination_url: 'cafe.example' }))).json()) as Link;
  return { r, ada, bob, code: made.code };
}

const patch = (r: Rig, token: string, code: string, body: unknown): Promise<Response> => go(r, `/api/qr/${code}/settings`, withJson('PATCH', token, body));
const settingsOf = async (res: Response): Promise<Settings> => (await res.json()) as Settings;
const fail = async (res: Response): Promise<[number, string]> => [res.status, ((await res.json()) as { error: string }).error];

describe('the QR index', () => {
  test('is public and lists the routes', async () => {
    const res = await go(rig(), '/api/qr');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resource: string; routes: { method: string; path: string; about: string }[] };
    expect(body.resource).toBe('qr');
    expect(body.routes.map((x) => `${x.method} ${x.path}`)).toEqual([
      'GET /api/qr',
      'POST /api/qr/style',
      'POST /api/qr/context',
      'GET /api/qr/{code}/settings',
      'PATCH /api/qr/{code}/settings',
    ]);
    expect(body.routes.every((x) => x.about.length > 10)).toBe(true);
  });
});

describe('reading settings', () => {
  test('are the owner\'s, with what may be edited', async () => {
    const { r, ada, code } = await setup();
    const res = await go(r, `/api/qr/${code}/settings`, bearer(ada.token));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      resource: 'qr.settings',
      code: 'qr1',
      kind: '',
      settings: { title: 'Cafe', destination_url: 'https://cafe.example', ad_style: 'interstitial_3s', style: null },
      fields: [
        { name: 'title', type: 'string', editable: true, about: 'Name shown in the dashboard.' },
        { name: 'destination_url', type: 'url', editable: true, about: 'Where this code sends people.' },
        { name: 'ad_style', type: 'enum', editable: true, values: ['interstitial_3s', 'sponsor_banner', 'direct'], about: 'What a scan shows before the destination.' },
        { name: 'style', type: 'object', editable: true, about: 'Colors and shape used when this code is drawn.' },
      ],
    });
  });

  test('of a menu say its address and ad style are fixed', async () => {
    const { r, ada } = await setup();
    grantPlan(r, ada.id, 'pro');
    const menu = (await (await go(r, '/api/menus', withJson('POST', ada.token, { title: 'Lunch', items: [{ name: 'Soup', price: '6' }] }))).json()) as Link;
    const body = await settingsOf(await go(r, `/api/qr/${menu.code}/settings`, bearer(ada.token)));
    expect(body).toMatchObject({ kind: 'menu', settings: { ad_style: 'menu', destination_url: `/r/${menu.code}` } });
    expect(body.fields.map((f) => [f.name, f.editable])).toEqual([
      ['title', true],
      ['destination_url', false],
      ['ad_style', false],
      ['style', true],
    ]);
    expect(body.fields[1]?.about).toBe('A menu keeps its public address.');
    expect(body.fields[2]?.about).toBe('A menu is served as a page, not an ad redirect.');
  });

  test('need a session, and someone else\'s code reads like a missing one', async () => {
    const { r, bob, code } = await setup();
    expect((await go(r, `/api/qr/${code}/settings`)).status).toBe(401);
    expect((await go(r, `/api/qr/${code}/settings`, bearer('stale'))).status).toBe(401);
    expect(await fail(await go(r, `/api/qr/${code}/settings`, bearer(bob.token)))).toEqual([404, 'QR code not found']);
    expect(await fail(await go(r, '/api/qr/nothing/settings', bearer(bob.token)))).toEqual([404, 'QR code not found']);
  });
});

describe('changing settings', () => {
  test('changes only what is sent, tidying it the way the link routes do', async () => {
    const { r, ada, code } = await setup();
    const res = await patch(r, ada.token, code, { title: '  Cafe Nord ', destination_url: ' nord.example/menu ', ad_style: 'sponsor_banner' });
    expect(res.status).toBe(200);
    expect((await settingsOf(res)).settings).toEqual({ title: 'Cafe Nord', destination_url: 'https://nord.example/menu', ad_style: 'sponsor_banner', style: null });
    const next = await settingsOf(await patch(r, ada.token, code, { title: 'Only the title' }));
    expect(next.settings).toMatchObject({ title: 'Only the title', destination_url: 'https://nord.example/menu', ad_style: 'sponsor_banner' });
  });

  test('an empty or null body changes nothing and succeeds, and an empty title is allowed', async () => {
    const { r, ada, code } = await setup();
    for (const body of [{}, null]) {
      const res = await patch(r, ada.token, code, body);
      expect([res.status, (await settingsOf(res)).settings.title]).toEqual([200, 'Cafe']);
    }
    expect((await settingsOf(await patch(r, ada.token, code, { title: '   ' }))).settings.title).toBe('');
  });

  test('the address is kept when http(s), and may not be blank', async () => {
    const { r, ada, code } = await setup();
    expect((await settingsOf(await patch(r, ada.token, code, { destination_url: 'http://plain.example' }))).settings.destination_url).toBe('http://plain.example');
    for (const blank of ['', '   ']) expect(await fail(await patch(r, ada.token, code, { destination_url: blank }))).toEqual([400, 'destination_url is required']);
  });

  test('ad_style must be one of the three a link can use', async () => {
    const { r, ada, code } = await setup();
    for (const ok of ['interstitial_3s', 'sponsor_banner', 'direct']) expect((await settingsOf(await patch(r, ada.token, code, { ad_style: ok }))).settings.ad_style).toBe(ok);
    for (const bad of ['menu', 'Direct', '', 'linkpage']) {
      expect(await fail(await patch(r, ada.token, code, { ad_style: bad }))).toEqual([400, 'ad_style must be interstitial_3s, sponsor_banner, or direct']);
    }
  });

  test('refuses an unknown setting, a wrong type, and a broken body, and saves nothing from a refused request', async () => {
    const { r, ada, code } = await setup();
    expect(await fail(await patch(r, ada.token, code, { title: 'x', colour: 'red' }))).toEqual([400, 'Unknown setting: colour']);
    expect(await fail(await patch(r, ada.token, code, { title: 5 }))).toEqual([400, 'title must be a string']);
    expect(await fail(await patch(r, ada.token, code, { destination_url: ['a.co'] }))).toEqual([400, 'destination_url must be a string']);
    expect(await fail(await patch(r, ada.token, code, { ad_style: true }))).toEqual([400, 'ad_style must be a string']);
    expect(await fail(await patch(r, ada.token, code, { title: 'x', ad_style: 'nope' }))).toEqual([400, 'ad_style must be interstitial_3s, sponsor_banner, or direct']);
    for (const body of ['{', '[]', '"x"', '7']) {
      const res = await go(r, `/api/qr/${code}/settings`, { method: 'PATCH', headers: { Authorization: `Bearer ${ada.token}` }, body });
      expect(await fail(res)).toEqual([400, 'Invalid request body']);
    }
    expect((await settingsOf(await go(r, `/api/qr/${code}/settings`, bearer(ada.token)))).settings.title).toBe('Cafe');
  });

  test('a body over 64 KiB is a 413', async () => {
    const { r, ada, code } = await setup();
    const res = await go(r, `/api/qr/${code}/settings`, { method: 'PATCH', headers: { Authorization: `Bearer ${ada.token}` }, body: JSON.stringify({ title: 'x'.repeat(70 * 1024) }) });
    expect(await fail(res)).toEqual([413, 'Request body too large']);
  });

  test('a menu keeps its address and takes no ad style, but can be renamed and styled', async () => {
    const { r, ada } = await setup();
    grantPlan(r, ada.id, 'pro');
    const menu = (await (await go(r, '/api/menus', withJson('POST', ada.token, { title: 'Lunch', items: [{ name: 'Soup', price: '6' }] }))).json()) as Link;
    expect(await fail(await patch(r, ada.token, menu.code, { destination_url: 'x.example' }))).toEqual([400, 'A menu keeps its public address']);
    expect(await fail(await patch(r, ada.token, menu.code, { ad_style: 'direct' }))).toEqual([400, 'A menu does not use an ad style']);
    const ok = await settingsOf(await patch(r, ada.token, menu.code, { title: 'Dinner', style: { fgColor: '#112233' } }));
    expect(ok.settings).toMatchObject({ title: 'Dinner', destination_url: `/r/${menu.code}`, ad_style: 'menu', style: { fgColor: '#112233' } });
  });

  test('only the owner may, and someone else is told "QR code not found" before the body is read', async () => {
    const { r, ada, bob, code } = await setup();
    expect(await fail(await patch(r, bob.token, code, { title: 'hijack' }))).toEqual([404, 'QR code not found']);
    const broken = await go(r, `/api/qr/${code}/settings`, { method: 'PATCH', headers: { Authorization: `Bearer ${bob.token}` }, body: '{' });
    expect(await fail(broken)).toEqual([404, 'QR code not found']);
    expect((await go(r, `/api/qr/${code}/settings`, { method: 'PATCH', body: '{}' })).status).toBe(401);
    expect((await settingsOf(await go(r, `/api/qr/${code}/settings`, bearer(ada.token)))).settings.title).toBe('Cafe');
  });

  test('keeps the link\'s other fields and its updated time moves', async () => {
    const { r, ada, code } = await setup();
    const before = (await (await go(r, `/api/links/${code}`, bearer(ada.token))).json()) as Link;
    r.advance(5000);
    await patch(r, ada.token, code, { title: 'Renamed' });
    const after = (await (await go(r, `/api/links/${code}`, bearer(ada.token))).json()) as Link;
    expect(after).toMatchObject({ id: before.id, created_at: before.created_at, total_scans: before.total_scans, title: 'Renamed' });
    expect(after.updated_at > before.updated_at).toBe(true);
  });
});

describe('the saved style', () => {
  const styleOf = async (r: Rig, token: string, code: string, style: unknown): Promise<QRStyle | null> => (await settingsOf(await patch(r, token, code, { style }))).settings.style;

  test('starts from plain black on white and fills in what is not sent', async () => {
    const { r, ada, code } = await setup();
    expect(await styleOf(r, ada.token, code, {})).toEqual({
      fgColor: '#111113',
      bgColor: '#ffffff',
      accentColor: '#111113',
      errorLevel: 'M',
      frame: 'plain',
      moduleColorMode: 'uniform',
      dotShape: 'square',
    });
  });

  test('is changed field by field, keeping the rest, lowercasing colors and uppercasing the error level', async () => {
    const { r, ada, code } = await setup();
    await styleOf(r, ada.token, code, { fgColor: '#AABBCC', errorLevel: 'h', frame: 'ring', summary: '  Bold  ' });
    const next = await styleOf(r, ada.token, code, { bgColor: '#FFEEDD', dotShape: 'circle', moduleColorMode: 'gradient', accentColor: '#0A0B0C' });
    expect(next).toEqual({
      fgColor: '#aabbcc',
      bgColor: '#ffeedd',
      accentColor: '#0a0b0c',
      errorLevel: 'H',
      frame: 'ring',
      moduleColorMode: 'gradient',
      dotShape: 'circle',
      summary: 'Bold',
    });
  });

  test('an empty summary is dropped, and null clears the style', async () => {
    const { r, ada, code } = await setup();
    await styleOf(r, ada.token, code, { summary: 'Hello' });
    expect((await styleOf(r, ada.token, code, { summary: '   ' }))?.summary).toBeUndefined();
    expect(await styleOf(r, ada.token, code, null)).toBeNull();
    const link = (await (await go(r, `/api/links/${code}`, bearer(ada.token))).json()) as Link;
    expect(link).not.toHaveProperty('style');
  });

  test('refuses anything it cannot draw, with a message that names the field', async () => {
    const { r, ada, code } = await setup();
    const cases: [object, string][] = [
      [{ fgColor: 'red' }, 'fgColor must be a #rrggbb color'],
      [{ fgColor: '#fff' }, 'fgColor must be a #rrggbb color'],
      [{ fgColor: '#gggggg' }, 'fgColor must be a #rrggbb color'],
      [{ fgColor: 5 }, 'fgColor must be a #rrggbb color'],
      [{ bgColor: '' }, 'bgColor must be a #rrggbb color'],
      [{ accentColor: 'blue' }, 'accentColor must be a #rrggbb color'],
      [{ errorLevel: 'X' }, 'errorLevel must be L, M, Q, or H'],
      [{ errorLevel: 7 }, 'errorLevel must be a string'],
      [{ frame: 'fancy' }, 'frame must be plain, soft, or ring'],
      [{ frame: ['ring'] }, 'frame must be a string'],
      [{ moduleColorMode: 'rainbow' }, 'moduleColorMode must be uniform, finder_accent, or gradient'],
      [{ dotShape: 'star' }, 'dotShape must be square, rounded, or circle'],
      [{ summary: 5 }, 'summary must be a string'],
      [{ logo: 'x.png' }, 'Unknown style setting: logo'],
    ];
    for (const [style, message] of cases) expect([JSON.stringify(style), await fail(await patch(r, ada.token, code, { style }))]).toEqual([JSON.stringify(style), [400, message]]);
    for (const style of ['plain', 5, true, ['fgColor']]) expect(await fail(await patch(r, ada.token, code, { style }))).toEqual([400, 'style must be an object']);
    expect((await settingsOf(await go(r, `/api/qr/${code}/settings`, bearer(ada.token)))).settings.style).toBeNull();
  });

  test('accepts every value the drawing code understands', async () => {
    const { r, ada, code } = await setup();
    for (const level of ['L', 'M', 'Q', 'H', 'l']) expect((await styleOf(r, ada.token, code, { errorLevel: level }))?.errorLevel).toBe(level.toUpperCase());
    for (const frame of ['plain', 'soft', 'ring']) expect((await styleOf(r, ada.token, code, { frame }))?.frame).toBe(frame);
    for (const mode of ['uniform', 'finder_accent', 'gradient']) expect((await styleOf(r, ada.token, code, { moduleColorMode: mode }))?.moduleColorMode).toBe(mode);
    for (const shape of ['square', 'rounded', 'circle']) expect((await styleOf(r, ada.token, code, { dotShape: shape }))?.dotShape).toBe(shape);
  });
});
