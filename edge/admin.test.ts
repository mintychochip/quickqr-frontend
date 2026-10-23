import { describe, expect, test } from 'bun:test';
import { isAdmin } from './admin';

describe('isAdmin', () => {
  test('is true only for an address on the list', () => {
    const env = { ADMIN_EMAILS: 'ada@example.com,sam@example.com' };
    expect(isAdmin(env, 'ada@example.com')).toBe(true);
    expect(isAdmin(env, 'sam@example.com')).toBe(true);
    expect(isAdmin(env, 'bob@example.com')).toBe(false);
  });

  test('ignores case and spaces on both sides', () => {
    expect(isAdmin({ ADMIN_EMAILS: '  Ada@Example.com ,  sam@example.com' }, 'ADA@example.COM ')).toBe(true);
  });

  test('matches the whole address, never a piece of it', () => {
    const env = { ADMIN_EMAILS: 'ada@example.com' };
    for (const email of ['xada@example.com', 'ada@example.com.evil.test', 'ada@example.co', 'a@example.com', 'ada']) {
      expect(isAdmin(env, email), email).toBe(false);
    }
  });

  test('nobody is an administrator when the list is unset, empty, or only commas', () => {
    for (const ADMIN_EMAILS of [undefined, '', ' ', ',', ' , ,']) {
      expect(isAdmin({ ADMIN_EMAILS }, 'ada@example.com'), String(ADMIN_EMAILS)).toBe(false);
      expect(isAdmin({ ADMIN_EMAILS }, ''), `empty address, ${String(ADMIN_EMAILS)}`).toBe(false);
    }
  });
});
