import { GROUPS, MAX_DIRECT_BYTES, TYPES, TYPE_BY_ID, resolve, visibleFields } from './index';
import type { TypeId } from './types';

const IDS: TypeId[] = [
  'link',
  'text',
  'phone',
  'sms',
  'email',
  'whatsapp',
  'location',
  'directions',
  'event',
  'wifi',
  'contact',
  'social',
  'review',
  'payment',
  'crypto',
  'sepa',
  'upi',
];

describe('the registry', () => {
  test('holds the 17 types once each, in menu order', () => {
    expect(TYPES.map((t) => t.id)).toEqual(IDS);
  });

  test('finds every type by its id', () => {
    for (const id of IDS) expect(TYPE_BY_ID[id].id).toBe(id);
  });

  test('groups them the way the menu shows them, with each type in one group', () => {
    expect(GROUPS.map((g) => [g.id, g.label, g.types.map((t) => t.id)])).toEqual([
      ['everyday', 'Everyday', ['link', 'text', 'phone', 'sms', 'email', 'whatsapp']],
      ['places', 'Places & time', ['location', 'directions', 'event']],
      ['connect', 'Connect', ['wifi', 'contact', 'social', 'review']],
      ['pay', 'Pay', ['payment', 'crypto', 'sepa', 'upi']],
    ]);
  });

  test('gives every type something to type into the bar, and unique field keys', () => {
    for (const type of TYPES) {
      expect(type.label !== '' && type.bar.label !== '' && type.bar.placeholder !== '').toBe(true);
      const keys = type.fields.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const field of type.fields) {
        if (field.control === 'select') expect(field.options.length > 0).toBe(true);
      }
    }
  });

  test('shows each type the fields that belong to it, and none before a choice makes them belong', () => {
    expect(visibleFields(TYPE_BY_ID.wifi, {}).map((f) => f.key)).toEqual(['security', 'password', 'hidden']);
    expect(visibleFields(TYPE_BY_ID.wifi, { security: 'nopass' }).map((f) => f.key)).toEqual(['security', 'hidden']);
    expect(visibleFields(TYPE_BY_ID.link, {})).toEqual([]);
  });
});

describe('resolving what is in the bar, on its own', () => {
  test('is empty for nothing, and for only white space', () => {
    for (const raw of ['', '   ', '\n\t']) expect(resolve(raw)).toEqual({ status: 'empty' });
  });

  test('trims the text and says which type it saw, and whether it only guessed', () => {
    const resolved = resolve('  example.com  ');
    expect(resolved.status).toBe('ready');
    if (resolved.status !== 'ready') return;
    expect(resolved.type.id).toBe('link');
    expect(resolved.payload).toBe('https://example.com');
    expect(resolved.guessed).toBe(true);
  });

  test('knows a pasted payload by its scheme, and does not call that a guess', () => {
    const resolved = resolve('WIFI:S:Cafe;T:WPA;P:secret;;');
    expect(resolved.status === 'ready' && [resolved.type.id, resolved.payload, resolved.guessed]).toEqual(['wifi', 'WIFI:S:Cafe;T:WPA;P:secret;;', false]);
  });

  test('takes anything else as text', () => {
    const resolved = resolve('Table 4, patio');
    expect(resolved.status === 'ready' && [resolved.type.id, resolved.payload, resolved.guessed]).toEqual(['text', 'Table 4, patio', false]);
  });
});

describe('resolving with a type chosen', () => {
  test('keeps digits as typed when the type is text', () => {
    const resolved = resolve('5551234567', { type: 'text' });
    expect(resolved.status === 'ready' && [resolved.type.id, resolved.payload, resolved.guessed]).toEqual(['text', '5551234567', false]);
  });

  test('keeps a link as typed, without adding https, when the type is text', () => {
    const resolved = resolve('example.com/menu', { type: 'text' });
    expect(resolved.status === 'ready' && resolved.payload).toBe('example.com/menu');
  });

  test('stays empty when there is nothing in the bar, even if the fields are filled in', () => {
    expect(resolve('  ', { type: 'text' })).toEqual({ status: 'empty' });
    expect(resolve('', { type: 'sms', values: { message: 'Hello' } })).toEqual({ status: 'empty' });
  });

  test('builds with the fields that were filled in', () => {
    const resolved = resolve('+1 555 123 4567', { type: 'sms', values: { message: 'Hello there' } });
    expect(resolved.status === 'ready' && [resolved.type.id, resolved.payload, resolved.guessed]).toEqual(['sms', 'sms:+15551234567?body=Hello%20there', false]);
  });

  test('overrides what auto-detect would have said, in both directions', () => {
    const asPhone = resolve('example.com', { type: 'phone' });
    expect(asPhone.status === 'invalid' && asPhone.type.id).toBe('phone');
    const asLink = resolve('hello world', { type: 'link' });
    expect(asLink.status === 'invalid' && asLink.type.id).toBe('link');
    const asEmail = resolve('5551234567', { type: 'email' });
    expect(asEmail.status).toBe('invalid');
  });

  test('says why the bar does not fit the type, and builds nothing', () => {
    expect(resolve('call me', { type: 'phone' })).toEqual({
      status: 'invalid',
      type: TYPE_BY_ID.phone,
      problem: 'Enter a phone number with 3 to 15 digits.',
    });
  });

  test('cleans the fields before building, so a stale or odd value cannot reach the builder', () => {
    const resolved = resolve('Cafe Guest', { type: 'wifi', values: { security: 'WPA3-ENTERPRISE', password: '  secret123  ', hidden: 'on' } });
    expect(resolved.status === 'ready' && resolved.payload).toBe('WIFI:T:WPA;S:Cafe Guest;P:secret123;;');
  });

  test('ignores fields that do not belong to the type', () => {
    const resolved = resolve('example.com', { type: 'link', values: { message: 'x', security: 'nopass' } });
    expect(resolved.status === 'ready' && resolved.payload).toBe('https://example.com');
  });

  test('is never a guess', () => {
    const resolved = resolve('hello@example.com', { type: 'email' });
    expect(resolved.status === 'ready' && resolved.guessed).toBe(false);
  });
});

describe('the size limit', () => {
  test('text up to the limit fits', () => {
    const resolved = resolve('a'.repeat(MAX_DIRECT_BYTES));
    expect(resolved.status === 'ready' && resolved.payload).toBe('a'.repeat(MAX_DIRECT_BYTES));
  });

  test('one byte over is refused', () => {
    expect(resolve('a'.repeat(MAX_DIRECT_BYTES + 1))).toEqual({ status: 'too-long', limit: MAX_DIRECT_BYTES });
  });

  test('counts bytes, not characters', () => {
    const wide = '日'.repeat(400);
    expect(wide).toHaveLength(400);
    expect(resolve(wide)).toEqual({ status: 'too-long', limit: MAX_DIRECT_BYTES });
  });

  test('applies to pasted payloads too', () => {
    expect(resolve(`WIFI:${'a'.repeat(MAX_DIRECT_BYTES)}`)).toEqual({ status: 'too-long', limit: MAX_DIRECT_BYTES });
  });

  test('applies to a chosen type: its payload, not what was typed, is what is measured', () => {
    expect(resolve('+15551234567', { type: 'sms', values: { message: 'a'.repeat(MAX_DIRECT_BYTES) } })).toEqual({
      status: 'too-long',
      limit: MAX_DIRECT_BYTES,
    });
    expect(resolve('Jane Doe', { type: 'contact', values: { note: 'n'.repeat(MAX_DIRECT_BYTES) } })).toEqual({
      status: 'too-long',
      limit: MAX_DIRECT_BYTES,
    });
    expect(resolve('a'.repeat(MAX_DIRECT_BYTES + 1), { type: 'text' })).toEqual({ status: 'too-long', limit: MAX_DIRECT_BYTES });
  });

  test('leaves a link alone, which is shortened or compressed instead of being held to it', () => {
    const long = `https://example.com/${'a'.repeat(3000)}`;
    const auto = resolve(long);
    expect(auto.status === 'ready' && auto.payload).toBe(long);
    const chosen = resolve(long, { type: 'link' });
    expect(chosen.status === 'ready' && chosen.payload).toBe(long);
  });
});

describe('whatever is typed', () => {
  const NASTY = [
    'x',
    ' ',
    '\u0000',
    '\n',
    '\r\n\r\n',
    '\\',
    '%',
    '%zz',
    '?&=#',
    '<script>alert(1)</script>',
    "'; DROP TABLE links; --",
    '__proto__',
    'constructor',
    'toString',
    '😀'.repeat(2000),
    'a'.repeat(100_000),
    '日本語のテキスト',
    '\uD800',
    '0'.repeat(5000),
    'BCD\n002\n1\nSCT',
    'WIFI:',
    'begin:vcard',
  ];
  const FIELD_NASTY = ['', ' ', '\u0000', '__proto__', 'constructor', '2026-13-45', '2026-02-30T25:61', '😀'.repeat(500), 'a'.repeat(5000)];

  test('never throws, for any type, and always gives a status', () => {
    for (const type of TYPES) {
      for (const bar of NASTY) {
        for (const field of FIELD_NASTY) {
          const values = Object.fromEntries(type.fields.map((f) => [f.key, field]));
          const resolved = resolve(bar, { type: type.id, values });
          expect(['empty', 'invalid', 'ready', 'too-long'].includes(resolved.status)).toBe(true);
        }
      }
    }
    for (const bar of NASTY) expect(['empty', 'ready', 'too-long'].includes(resolve(bar).status)).toBe(true);
  });

  test('only ever gives out a payload that is text, and never a bare "undefined" or "[object Object]"', () => {
    for (const type of TYPES) {
      for (const bar of NASTY) {
        const resolved = resolve(bar, { type: type.id });
        if (resolved.status !== 'ready') continue;
        expect(typeof resolved.payload).toBe('string');
        expect(resolved.payload.includes('undefined') && !bar.includes('undefined')).toBe(false);
        expect(resolved.payload.includes('[object')).toBe(false);
      }
    }
  });
});
