import { describe, expect, spyOn, test } from 'bun:test';
import { effectivePlan } from './store/entitlements';
import { bearer, go, ORIGIN, rig, signUp, withJson, type Rig } from './test/rig';

const DAY = 86_400_000;
const ADMIN = 'admin@example.com';
const NOT_VALID = { error: 'This gift link is not valid.' };

interface Made {
  id: string;
  token: string;
  link: string;
  plan: string;
  days: number;
  max_uses: number;
  uses: number;
  redeem_by: string;
  note: string;
  created_by: string;
  revoked_at: string | null;
  status: string;
}

function setup() {
  const r = rig({ ADMIN_EMAILS: ` ${ADMIN.toUpperCase()} , someone-else@example.com` });
  return { r, admin: signUp(r, ADMIN) };
}

async function make(r: Rig, token: string, body: unknown = { plan: 'plus', days: 30 }) {
  const res = await go(r, '/api/admin/gifts', withJson('POST', token, body));
  return { res, text: await res.clone().text(), made: (await res.json()) as Made };
}

const redeem = (r: Rig, token: string, giftToken: unknown) => go(r, '/api/gifts/redeem', withJson('POST', token, { token: giftToken }));

describe('POST /api/admin/gifts', () => {
  test('an administrator makes a gift and is shown the link once, never cached', async () => {
    const { r, admin } = setup();
    const { res, made } = await make(r, (await admin).token, { plan: 'pro', days: 14, uses: 3, link_days: 7, note: ' for Sam ' });

    expect(res.status).toBe(201);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(made.token).toMatch(/^[A-Za-z0-9_-]{27}$/);
    expect(made.link).toBe(`${ORIGIN}/gift#${made.token}`);
    expect(made).toMatchObject({
      plan: 'pro',
      days: 14,
      max_uses: 3,
      uses: 0,
      note: 'for Sam',
      created_by: ADMIN,
      revoked_at: null,
      status: 'active',
      redeem_by: new Date(r.now().getTime() + 7 * DAY).toISOString(),
    });
    expect(made.id).toMatch(/^gft-/);
  });

  test('the link points at the public address, falling back to where the request came from', async () => {
    const r = rig({ ADMIN_EMAILS: ADMIN, APP_PUBLIC_URL: undefined });
    const { token } = await signUp(r, ADMIN);
    const { made } = await make(r, token);
    expect(made.link).toBe(`${ORIGIN}/gift#${made.token}`);
  });

  test('a wrong request is refused with the reason, and nothing is made', async () => {
    const { r, admin } = setup();
    const { token } = await admin;
    for (const [body, error] of [
      [{ plan: 'free', days: 30 }, 'plan must be plus or pro'],
      [{ plan: 'plus', days: 0 }, 'days must be a whole number from 1 to 366'],
      [{ plan: 'plus', days: 30, uses: 1001 }, 'uses must be a whole number from 1 to 1000'],
      [[], 'Invalid request body'],
    ] as const) {
      const res = await go(r, '/api/admin/gifts', withJson('POST', token, body));
      expect([res.status, await res.json()], JSON.stringify(body)).toEqual([400, { error }]);
    }
    const malformed = await go(r, '/api/admin/gifts', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{' });
    expect([malformed.status, await malformed.json()]).toEqual([400, { error: 'Invalid request body' }]);
    expect(r.db.sqlite.query('SELECT COUNT(*) AS n FROM gift_grants').get()).toEqual({ n: 0 });
  });

  test('nobody gets a 401, and a signed-in person who is not an administrator gets the 404 of a path that is not there', async () => {
    const { r } = setup();
    const bob = await signUp(r, 'bob@example.com');

    const anonymous = await go(r, '/api/admin/gifts', { method: 'POST', body: '{}' });
    expect([anonymous.status, await anonymous.json()]).toEqual([401, { error: 'Sign in to continue.' }]);

    const refused = await go(r, '/api/admin/gifts', withJson('POST', bob.token, { plan: 'plus', days: 30 }));
    const missing = await go(r, '/api/admin/nothing-here', withJson('POST', bob.token, { plan: 'plus', days: 30 }));
    expect([refused.status, await refused.text()]).toEqual([missing.status, await missing.text()]);
    expect(r.db.sqlite.query('SELECT COUNT(*) AS n FROM gift_grants').get()).toEqual({ n: 0 });
  });
});

describe('GET /api/admin/gifts', () => {
  test('lists gifts newest first with their status, and never a token, a hash, or a link', async () => {
    const { r, admin } = setup();
    const { token } = await admin;
    const first = await make(r, token, { plan: 'plus', days: 30, note: 'first' });
    r.advance(1000);
    const second = await make(r, token, { plan: 'pro', days: 7, uses: 2, note: 'second' });

    const res = await go(r, '/api/admin/gifts', bearer(token));
    const text = await res.text();
    const body = JSON.parse(text) as { gifts: Made[] };

    expect(res.status).toBe(200);
    expect(body.gifts.map((g) => [g.note, g.status, g.uses, g.max_uses])).toEqual([
      ['second', 'active', 0, 2],
      ['first', 'active', 0, 1],
    ]);
    for (const secret of [first.made.token, second.made.token, 'token_hash', 'link']) expect(text, secret).not.toContain(secret);
    const stored = r.db.sqlite.query('SELECT token_hash FROM gift_grants').all() as { token_hash: string }[];
    for (const row of stored) expect(text).not.toContain(row.token_hash);
  });

  test('is closed to everyone but an administrator', async () => {
    const { r } = setup();
    const bob = await signUp(r, 'bob@example.com');
    expect((await go(r, '/api/admin/gifts')).status).toBe(401);
    expect((await go(r, '/api/admin/gifts', bearer(bob.token))).status).toBe(404);
  });
});

describe('POST /api/admin/gifts/{id}/revoke', () => {
  test('stops further claims and takes nothing back from anyone who already claimed', async () => {
    const { r, admin } = setup();
    const { token } = await admin;
    const early = await signUp(r, 'early@example.com');
    const late = await signUp(r, 'late@example.com');
    const { made } = await make(r, token, { plan: 'plus', days: 30, uses: 2 });

    expect((await redeem(r, early.token, made.token)).status).toBe(200);
    const revoked = await go(r, `/api/admin/gifts/${made.id}/revoke`, withJson('POST', token, {}));
    const view = (await revoked.json()) as Made;
    expect([revoked.status, view.status, view.uses]).toEqual([200, 'revoked', 1]);

    expect(await (await redeem(r, late.token, made.token)).json()).toEqual(NOT_VALID);
    expect((await effectivePlan(r.db, early.id, r.now())).plan).toBe('plus');
  });

  test('an unknown id is a 404 for an administrator, and the route is closed to everyone else', async () => {
    const { r, admin } = setup();
    const bob = await signUp(r, 'bob@example.com');
    const unknown = await go(r, '/api/admin/gifts/gft-nothere/revoke', withJson('POST', (await admin).token, {}));
    expect([unknown.status, await unknown.json()]).toEqual([404, { error: 'Gift not found' }]);

    expect((await go(r, '/api/admin/gifts/gft-nothere/revoke', { method: 'POST', body: '{}' })).status).toBe(401);
    expect((await go(r, '/api/admin/gifts/gft-nothere/revoke', withJson('POST', bob.token, {}))).status).toBe(404);
  });
});

describe('POST /api/gifts/redeem', () => {
  test('needs a signed-in person', async () => {
    const { r, admin } = setup();
    const { made } = await make(r, (await admin).token);
    for (const init of [{ method: 'POST', body: JSON.stringify({ token: made.token }) }, withJson('POST', 'stale-token', { token: made.token })]) {
      const res = await go(r, '/api/gifts/redeem', init);
      expect([res.status, await res.json()]).toEqual([401, { error: 'Sign in to continue.' }]);
    }
  });

  test('gives the plan for its days from the moment of the claim, and a second click says the same thing', async () => {
    const { r, admin } = setup();
    const sam = await signUp(r, 'sam@example.com');
    const { made } = await make(r, (await admin).token, { plan: 'plus', days: 30 });
    r.advance(2 * DAY);

    const first = await redeem(r, sam.token, made.token);
    const until = new Date(r.now().getTime() + 30 * DAY).toISOString();
    expect([first.status, await first.json()]).toEqual([200, { plan: 'plus', until, granted: true }]);

    const again = await redeem(r, sam.token, made.token);
    expect([again.status, await again.json()]).toEqual([200, { plan: 'plus', until, granted: false }]);
    expect(await effectivePlan(r.db, sam.id, r.now())).toEqual({ plan: 'plus', until });
  });

  test('a link that does not work gives one answer, whatever is wrong with it', async () => {
    const { r, admin } = setup();
    const { token } = await admin;
    const sam = await signUp(r, 'sam@example.com');
    const bob = await signUp(r, 'bob@example.com');
    const dan = await signUp(r, 'dan@example.com');
    const unknown = (await make(r, token)).made.token.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
    const usedUp = (await make(r, token)).made;
    const revoked = (await make(r, token)).made;
    const expired = (await make(r, token, { plan: 'plus', days: 30, link_days: 1 })).made;
    await redeem(r, sam.token, usedUp.token);
    await go(r, `/api/admin/gifts/${revoked.id}/revoke`, withJson('POST', token, {}));
    r.advance(2 * DAY);

    const answers: [number, string][] = [];
    for (const giftToken of [unknown, usedUp.token, revoked.token, expired.token, 'short', '', 7, null, undefined]) {
      const res = await redeem(r, bob.token, giftToken);
      answers.push([res.status, await res.text()]);
    }
    const [first] = answers;
    if (!first) throw new Error('no answers were collected');
    expect(first[0]).toBe(404);
    expect(JSON.parse(first[1])).toEqual(NOT_VALID);
    for (const answer of answers) expect(answer).toEqual(first);
    expect((await effectivePlan(r.db, bob.id, r.now())).plan).toBe('free');
    expect((await effectivePlan(r.db, dan.id, r.now())).plan).toBe('free');
  });

  test('a body that is not an object is a 400, and one that is too large is a 413', async () => {
    const { r } = setup();
    const sam = await signUp(r, 'sam@example.com');
    const text = await go(r, '/api/gifts/redeem', { method: 'POST', headers: { Authorization: `Bearer ${sam.token}` }, body: '[]' });
    expect([text.status, await text.json()]).toEqual([400, { error: 'Invalid request body' }]);
    const huge = await go(r, '/api/gifts/redeem', { method: 'POST', headers: { Authorization: `Bearer ${sam.token}` }, body: JSON.stringify({ token: 'x'.repeat(70_000) }) });
    expect(huge.status).toBe(413);
  });

  test('the token shows up in no answer except the one that made the gift', async () => {
    const { r, admin } = setup();
    const { token } = await admin;
    const sam = await signUp(r, 'sam@example.com');
    const { made } = await make(r, token);

    const answers = [
      await redeem(r, sam.token, made.token),
      await redeem(r, sam.token, made.token),
      await go(r, '/api/admin/gifts', bearer(token)),
      await go(r, `/api/admin/gifts/${made.id}/revoke`, withJson('POST', token, {})),
    ];
    for (const res of answers) expect(await res.text()).not.toContain(made.token);
  });
});

describe('GET /api/auth/me', () => {
  interface MeUser {
    plan: string;
    plan_until: string | null;
    is_admin: boolean;
  }
  const me = async (r: Rig, token: string): Promise<MeUser> => ((await (await go(r, '/api/auth/me', bearer(token))).json()) as { user: MeUser }).user;

  test('says Free with no end date until a gift is claimed, then the plan and when it ends', async () => {
    const { r, admin } = setup();
    const sam = await signUp(r, 'sam@example.com');
    expect(await me(r, sam.token)).toMatchObject({ plan: 'free', plan_until: null });

    const { made } = await make(r, (await admin).token, { plan: 'pro', days: 10 });
    await redeem(r, sam.token, made.token);
    expect(await me(r, sam.token)).toMatchObject({ plan: 'pro', plan_until: new Date(r.now().getTime() + 10 * DAY).toISOString() });
  });

  test('goes back to Free the moment the gift ends', async () => {
    const { r, admin } = setup();
    const sam = await signUp(r, 'sam@example.com');
    const { made } = await make(r, (await admin).token, { plan: 'plus', days: 3 });
    await redeem(r, sam.token, made.token);

    r.advance(3 * DAY - 1);
    expect((await me(r, sam.token)).plan).toBe('plus');
    r.advance(1);
    expect(await me(r, sam.token)).toMatchObject({ plan: 'free', plan_until: null });
  });

  test('says who is an administrator, so the app knows whether to show the admin page', async () => {
    const { r, admin } = setup();
    const bob = await signUp(r, 'bob@example.com');
    expect((await me(r, (await admin).token)).is_admin).toBe(true);
    expect((await me(r, bob.token)).is_admin).toBe(false);
  });

  test('still answers, as Free, when the plan lookup fails, so code deployed ahead of the migration does not sign everyone out', async () => {
    const { r } = setup();
    const sam = await signUp(r, 'sam@example.com');
    r.db.sqlite.exec('DROP TABLE entitlements'); // a database the 0002 migration has not reached yet

    const logged = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await go(r, '/api/auth/me', bearer(sam.token));
      expect(res.status).toBe(200);
      expect(((await res.json()) as { user: MeUser }).user).toMatchObject({ plan: 'free', plan_until: null });
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });
});
