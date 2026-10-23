import { describe, expect, test } from 'bun:test';
import { testDb } from '../edge/test/sqlite';
import { grantInsert } from '../edge/store/gifts';
import { bindSql } from './gift';

describe('bindSql', () => {
  test('writes strings, numbers, and null as SQL literals, doubling a quote', () => {
    expect(bindSql('SELECT ?, ?, ?, ?', ["it's", 5, null, 'plain'])).toBe("SELECT 'it''s', 5, NULL, 'plain'");
  });

  test('a hostile note stays one string and runs as data, not as SQL', () => {
    const db = testDb();
    const note = "x'); DROP TABLE users; --";
    const { sql, values } = grantInsert(
      { tokenHash: 'a'.repeat(64), plan: 'plus', days: 30, maxUses: 1, redeemBy: '2026-12-01T00:00:00.000Z', note, createdBy: 'cli' },
      new Date('2026-11-01T00:00:00.000Z'),
    );

    db.sqlite.exec(bindSql(sql, values));

    expect(db.sqlite.query('SELECT note FROM gift_grants').all()).toEqual([{ note }]);
    expect(db.sqlite.query("SELECT name FROM sqlite_master WHERE name = 'users'").all()).toEqual([{ name: 'users' }]);
  });

  test('the statement it makes is the one the routes run, so the stored row is identical', () => {
    const db = testDb();
    const { sql, values, view } = grantInsert(
      { tokenHash: 'b'.repeat(64), plan: 'pro', days: 14, maxUses: 3, redeemBy: '2026-12-01T00:00:00.000Z', note: 'for Sam', createdBy: 'cli' },
      new Date('2026-11-01T00:00:00.000Z'),
    );
    db.sqlite.exec(bindSql(sql, values));
    expect(db.sqlite.query('SELECT id, plan, days, max_uses, redeem_by, note, created_by, created_at, revoked_at FROM gift_grants').all()).toEqual([
      { id: view.id, plan: 'pro', days: 14, max_uses: 3, redeem_by: '2026-12-01T00:00:00.000Z', note: 'for Sam', created_by: 'cli', created_at: '2026-11-01T00:00:00.000Z', revoked_at: null },
    ]);
  });

  test('refuses a different number of values than placeholders', () => {
    expect(() => bindSql('SELECT ?, ?', [1])).toThrow('2 placeholders but 1 values');
    expect(() => bindSql('SELECT ?', [1, 2])).toThrow('1 placeholders but 2 values');
  });

  test('refuses a number that is not a whole, finite one, and any other kind of value', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, undefined, {}, true]) {
      expect(() => bindSql('SELECT ?', [bad]), String(bad)).toThrow();
    }
  });
});
