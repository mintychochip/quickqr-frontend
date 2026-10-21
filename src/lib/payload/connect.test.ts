import { connectTypes } from './connect';
import { cleanValues, visibleFields } from './fields';
import type { Built } from './types';

/** What the studio does: clean what was typed, then ask the type to build. */
function build(id: string, bar: string, values: Record<string, string> = {}): Built {
  const type = connectTypes.find((t) => t.id === id);
  if (!type) throw new Error(`no type ${id}`);
  return type.build(bar, cleanValues(type, values));
}

const payload = (built: Built) => ('payload' in built ? built.payload : `PROBLEM: ${built.problem}`);

/**
 * A Wi-Fi code reader written for the test (the ZXing format): fields end at an unescaped `;`, a backslash escapes the
 * next character, and `\`, `;`, `,`, `:` and `"` must not appear in a value without one. Throws on anything else.
 */
function readWifi(text: string): Record<string, string> {
  if (!text.startsWith('WIFI:') || !text.endsWith(';;')) throw new Error(`not a Wi-Fi code: ${JSON.stringify(text)}`);
  const fields: Record<string, string> = {};
  let key = '';
  let value = '';
  let inValue = false;
  let escaped = false;
  for (const character of text.slice('WIFI:'.length, -1)) {
    if (escaped) {
      if (inValue) value += character;
      else key += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === ';') {
      fields[key] = value;
      key = '';
      value = '';
      inValue = false;
    } else if (character === ':' && !inValue) {
      inValue = true;
    } else {
      if (inValue && (character === ':' || character === ',' || character === '"')) {
        throw new Error(`unescaped ${character} in ${JSON.stringify(text)}`);
      }
      if (inValue) value += character;
      else key += character;
    }
  }
  if (escaped || inValue || key !== '' || value !== '') throw new Error(`unterminated: ${JSON.stringify(text)}`);
  return fields;
}

/** A vCard reader written for the test. TEXT values must escape `\`, `;` and `,`, and keep a line break out of a line. */
const VALID_TEXT = /^(?:[^\\;,\r\n]|\\[nN;,\\])*$/;

function unescapeText(value: string): string {
  if (!VALID_TEXT.test(value)) throw new Error(`not valid vCard text: ${JSON.stringify(value)}`);
  return value.replace(/\\([nN;,\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

/** The components of a structured value (`N`, `ADR`), split at semicolons that are not escaped, then unescaped. */
function components(value: string): string[] {
  const parts: string[] = [];
  let part = '';
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '\\') {
      part += value.slice(i, i + 2);
      i += 1;
    } else if (value[i] === ';') {
      parts.push(part);
      part = '';
    } else {
      part += value[i];
    }
  }
  parts.push(part);
  return parts.map(unescapeText);
}

/** Property name with its parameters, to the value as written. */
function readCard(text: string): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const line of text.split('\r\n')) {
    const colon = line.indexOf(':');
    properties[line.slice(0, colon)] = line.slice(colon + 1);
  }
  return properties;
}

describe('the connect types', () => {
  test('are Wi-Fi, contact, social profile and Google review, in the connect group', () => {
    expect(connectTypes.map((t) => [t.id, t.label, t.group])).toEqual([
      ['wifi', 'Wi-Fi', 'connect'],
      ['contact', 'Contact', 'connect'],
      ['social', 'Social profile', 'connect'],
      ['review', 'Google review', 'connect'],
    ]);
  });
});

describe('wifi', () => {
  const type = connectTypes.find((t) => t.id === 'wifi')!;

  test('shows the password unless the network is open', () => {
    const keys = (values: Record<string, string>) => visibleFields(type, values).map((f) => f.key);
    expect(keys({})).toEqual(['security', 'password', 'hidden']);
    expect(keys({ security: 'WEP' })).toEqual(['security', 'password', 'hidden']);
    expect(keys({ security: 'nopass' })).toEqual(['security', 'hidden']);
  });

  test('writes the exact Wi-Fi code, WPA unless another security was chosen', () => {
    expect(payload(build('wifi', 'Cafe Guest', { password: 'secret123' }))).toBe('WIFI:T:WPA;S:Cafe Guest;P:secret123;;');
    expect(payload(build('wifi', 'Cafe Guest', { security: 'WPA', password: 'secret123', hidden: 'true' }))).toBe(
      'WIFI:T:WPA;S:Cafe Guest;P:secret123;H:true;;',
    );
    expect(payload(build('wifi', 'Old Router', { security: 'WEP', password: 'abcde' }))).toBe('WIFI:T:WEP;S:Old Router;P:abcde;;');
  });

  test('writes an open network without a password, even if one was typed before switching', () => {
    expect(payload(build('wifi', 'Cafe Guest', { security: 'nopass' }))).toBe('WIFI:T:nopass;S:Cafe Guest;;');
    expect(payload(build('wifi', 'Cafe Guest', { security: 'nopass', password: 'left over', hidden: 'true' }))).toBe(
      'WIFI:T:nopass;S:Cafe Guest;H:true;;',
    );
  });

  test('escapes every character that would end or split a field, so a reader gets the name and password back', () => {
    const awkward = ['a\\b;c,d:e"f', ';;', '\\', 'quote "x" and \\"y\\"', 'semi;colon:and,comma', 'café 日本語 ✓'];
    for (const ssid of awkward) {
      for (const password of awkward.map((p) => `${p}12345678`)) {
        const fields = readWifi(payload(build('wifi', ssid, { password })));
        expect(fields.S).toBe(ssid);
        expect(fields.P).toBe(password);
        expect(fields.T).toBe('WPA');
      }
    }
  });

  test('leaves hex-looking names and passwords bare, as Android does: a scanner that kept quotes would join the wrong network', () => {
    expect(payload(build('wifi', '5060', { password: '12345678' }))).toBe('WIFI:T:WPA;S:5060;P:12345678;;');
    expect(payload(build('wifi', 'Cafe', { password: 'deadbeef' }))).toBe('WIFI:T:WPA;S:Cafe;P:deadbeef;;');
  });

  test('allows a network name of 32 bytes and no more, counting bytes', () => {
    expect(payload(build('wifi', 'a'.repeat(32), { password: 'secret123' }))).toBe(`WIFI:T:WPA;S:${'a'.repeat(32)};P:secret123;;`);
    expect(payload(build('wifi', 'a'.repeat(33), { password: 'secret123' }))).toBe('PROBLEM: Network names are at most 32 characters.');
    expect(payload(build('wifi', '日'.repeat(10), { password: 'secret123' }))).toBe(`WIFI:T:WPA;S:${'日'.repeat(10)};P:secret123;;`);
    expect(payload(build('wifi', '日'.repeat(11), { password: 'secret123' }))).toBe('PROBLEM: Network names are at most 32 characters.');
  });

  test('wants a password unless the network is open', () => {
    expect(payload(build('wifi', 'Cafe Guest'))).toBe('PROBLEM: Add the Wi-Fi password, or choose No password.');
    expect(payload(build('wifi', 'Cafe Guest', { security: 'WEP' }))).toBe('PROBLEM: Add the Wi-Fi password, or choose No password.');
  });

  test('holds a WPA password to 8 to 63 characters, or exactly 64 hex digits, which is a key', () => {
    const tooShort = 'PROBLEM: WPA passwords are 8 to 63 characters.';
    expect(payload(build('wifi', 'Net', { password: '1234567' }))).toBe(tooShort);
    expect(payload(build('wifi', 'Net', { password: '12345678' }))).toBe('WIFI:T:WPA;S:Net;P:12345678;;');
    expect(payload(build('wifi', 'Net', { password: 'a'.repeat(63) }))).toBe(`WIFI:T:WPA;S:Net;P:${'a'.repeat(63)};;`);
    expect(payload(build('wifi', 'Net', { password: 'g'.repeat(64) }))).toBe(tooShort);
    expect(payload(build('wifi', 'Net', { password: '0123456789abcdefABCDEF'.repeat(3).slice(0, 64) }))).toBe(
      `WIFI:T:WPA;S:Net;P:${'0123456789abcdefABCDEF'.repeat(3).slice(0, 64)};;`,
    );
    expect(payload(build('wifi', 'Net', { password: 'a'.repeat(65) }))).toBe(tooShort);
    expect(payload(build('wifi', 'Net', { password: '日'.repeat(22) }))).toBe(tooShort);
  });

  test('does not hold a WEP password to the WPA lengths', () => {
    expect(payload(build('wifi', 'Old', { security: 'WEP', password: 'abcde' }))).toBe('WIFI:T:WEP;S:Old;P:abcde;;');
  });
});

describe('contact', () => {
  const type = connectTypes.find((t) => t.id === 'contact')!;

  test('has the fields of a business card, in order, all plain text', () => {
    expect(type.fields.map((f) => [f.key, f.control])).toEqual([
      ['company', 'text'],
      ['title', 'text'],
      ['phone', 'text'],
      ['email', 'text'],
      ['website', 'text'],
      ['address', 'text'],
      ['note', 'text'],
    ]);
  });

  test('writes the exact vCard 3.0 for a full card', () => {
    const text = payload(
      build('contact', 'Jane Doe', {
        company: 'Acme, Inc.',
        title: 'Chef',
        phone: '+1 (555) 123-4567',
        email: 'jane@example.com',
        website: 'example.com',
        address: '1 Main St, Springfield',
        note: 'Met at the fair',
      }),
    );
    expect(text).toBe(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Doe;Jane;;;',
        'FN:Jane Doe',
        'ORG:Acme\\, Inc.',
        'TITLE:Chef',
        'TEL;TYPE=CELL:+15551234567',
        'EMAIL:jane@example.com',
        'URL:https://example.com',
        'ADR;TYPE=WORK:;;1 Main St\\, Springfield;;;;',
        'NOTE:Met at the fair',
        'END:VCARD',
      ].join('\r\n'),
    );
  });

  test('writes only the name when nothing else is given', () => {
    expect(payload(build('contact', 'Jane'))).toBe(['BEGIN:VCARD', 'VERSION:3.0', 'N:;Jane;;;', 'FN:Jane', 'END:VCARD'].join('\r\n'));
  });

  test('splits the name at the last word, with the rest as given names, and keeps the full name as FN', () => {
    const name = (bar: string) => {
      const card = readCard(payload(build('contact', bar)));
      const [family, given] = components(card.N!);
      return { family, given, full: unescapeText(card.FN!) };
    };
    expect(name('Jane Doe')).toEqual({ family: 'Doe', given: 'Jane', full: 'Jane Doe' });
    expect(name('Jane')).toEqual({ family: '', given: 'Jane', full: 'Jane' });
    expect(name('Mary Jane Q. Public')).toEqual({ family: 'Public', given: 'Mary Jane Q.', full: 'Mary Jane Q. Public' });
    expect(name('Jane    Doe')).toEqual({ family: 'Doe', given: 'Jane', full: 'Jane Doe' });
    expect(name('Zoë 田中')).toEqual({ family: '田中', given: 'Zoë', full: 'Zoë 田中' });
  });

  test('escapes text so that a reader gets back what was typed', () => {
    const awkward = 'A, B; C \\ D\nE';
    const card = readCard(
      payload(build('contact', 'Jane Doe', { company: awkward, title: awkward, address: awkward, note: awkward })),
    );
    expect(unescapeText(card.ORG!)).toBe(awkward);
    expect(unescapeText(card.TITLE!)).toBe(awkward);
    expect(unescapeText(card.NOTE!)).toBe(awkward);
    expect(components(card['ADR;TYPE=WORK']!)).toEqual(['', '', awkward, '', '', '', '']);
    const family = readCard(payload(build('contact', 'Anna Smith;Jones, Esq.')));
    expect(components(family.N!)).toEqual(['Esq.', 'Anna Smith;Jones,', '', '', '']);
    expect(unescapeText(family.FN!)).toBe('Anna Smith;Jones, Esq.');
    const suffixed = readCard(payload(build('contact', 'Jane Doe,Jr.')));
    expect(components(suffixed.N!)).toEqual(['Doe,Jr.', 'Jane', '', '', '']);
    expect(unescapeText(suffixed.FN!)).toBe('Jane Doe,Jr.');
  });

  test('writes the phone as digits, the email as typed, and the website with https', () => {
    const card = readCard(payload(build('contact', 'Jane Doe', { phone: '555.123.4567', email: 'Jane+x@Example.com', website: 'www.example.com/a,b;c' })));
    expect(card['TEL;TYPE=CELL']).toBe('5551234567');
    expect(card.EMAIL).toBe('Jane+x@Example.com');
    expect(card.URL).toBe('https://www.example.com/a,b;c');
  });

  test('keeps a website that already has a scheme as typed', () => {
    expect(readCard(payload(build('contact', 'Jane Doe', { website: 'http://example.com/me' }))).URL).toBe('http://example.com/me');
  });

  test('accepts a short phone number, the way the Phone type does', () => {
    expect(readCard(payload(build('contact', 'Jane Doe', { phone: '12345' })))['TEL;TYPE=CELL']).toBe('12345');
  });

  test('refuses an email, phone or website that cannot be one', () => {
    expect(payload(build('contact', 'Jane Doe', { email: 'jane' }))).toBe('PROBLEM: That email address does not look right.');
    expect(payload(build('contact', 'Jane Doe', { phone: 'call me' }))).toBe('PROBLEM: Enter the phone number with digits, spaces, + ( ) - and .');
    expect(payload(build('contact', 'Jane Doe', { phone: '12' }))).toBe('PROBLEM: Enter the phone number with digits, spaces, + ( ) - and .');
    expect(payload(build('contact', 'Jane Doe', { website: 'not a site' }))).toBe('PROBLEM: Enter the website like example.com.');
  });

  test('never uses a bare line feed', () => {
    const text = payload(build('contact', 'Jane Doe', { note: 'one\ntwo', company: 'Acme' }));
    expect(/(?<!\r)\n/.test(text)).toBe(false);
  });
});

describe('social', () => {
  const type = connectTypes.find((t) => t.id === 'social')!;
  const urlFor = (service: string, bar: string) => payload(build('social', bar, { service }));

  test('offers ten networks, Instagram first', () => {
    const service = type.fields[0]!;
    expect(service.control).toBe('select');
    expect(service.control === 'select' ? service.options.map((o) => o.value) : []).toEqual([
      'instagram',
      'x',
      'tiktok',
      'facebook',
      'linkedin',
      'youtube',
      'telegram',
      'github',
      'snapchat',
      'pinterest',
    ]);
  });

  test('turns a username into the profile address of each network', () => {
    expect(urlFor('instagram', 'jane.doe')).toBe('https://instagram.com/jane.doe');
    expect(urlFor('x', 'jane_doe')).toBe('https://x.com/jane_doe');
    expect(urlFor('tiktok', 'jane')).toBe('https://www.tiktok.com/@jane');
    expect(urlFor('facebook', 'jane.doe')).toBe('https://facebook.com/jane.doe');
    expect(urlFor('linkedin', 'jane-doe-123')).toBe('https://www.linkedin.com/in/jane-doe-123');
    expect(urlFor('youtube', 'janedoe')).toBe('https://www.youtube.com/@janedoe');
    expect(urlFor('telegram', 'janedoe')).toBe('https://t.me/janedoe');
    expect(urlFor('github', 'janedoe')).toBe('https://github.com/janedoe');
    expect(urlFor('snapchat', 'janedoe')).toBe('https://www.snapchat.com/add/janedoe');
    expect(urlFor('pinterest', 'janedoe')).toBe('https://www.pinterest.com/janedoe');
  });

  test('defaults to Instagram and drops one leading @', () => {
    expect(payload(build('social', '@jane'))).toBe('https://instagram.com/jane');
    expect(urlFor('x', '@jane')).toBe('https://x.com/jane');
  });

  test('does not read a username with a dot as a domain', () => {
    expect(urlFor('github', 'jane.doe')).toBe('https://github.com/jane.doe');
    expect(urlFor('github', 'example.com')).toBe('https://github.com/example.com');
  });

  test('uses a pasted profile link as it is, adding https to a bare one, whatever the network', () => {
    expect(urlFor('instagram', 'https://x.com/jane')).toBe('https://x.com/jane');
    expect(urlFor('instagram', 'HTTP://Example.com/Jane')).toBe('HTTP://Example.com/Jane');
    expect(urlFor('github', 'www.tiktok.com/@jane')).toBe('https://www.tiktok.com/@jane');
    expect(urlFor('github', 'instagram.com/jane')).toBe('https://instagram.com/jane');
    expect(urlFor('github', 'www.example.com')).toBe('https://www.example.com');
  });

  test('refuses what is neither a username nor a profile link', () => {
    const notUsername = 'PROBLEM: Usernames use letters, numbers, dots, dashes and underscores.';
    for (const bad of ['jane doe', '@@jane', 'jane!', 'jané', 'a'.repeat(101)]) expect(urlFor('instagram', bad)).toBe(notUsername);
    const notLink = 'PROBLEM: Enter a profile link like instagram.com/yourname, or just the username.';
    for (const bad of ['jane/doe', 'https://', 'ftp://x.com/a', 'a b/c']) expect(urlFor('instagram', bad)).toBe(notLink);
  });

  test('accepts the longest username', () => {
    expect(urlFor('instagram', 'a'.repeat(100))).toBe(`https://instagram.com/${'a'.repeat(100)}`);
  });
});

describe('review', () => {
  const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';
  const problem = 'PROBLEM: Paste the Place ID from Google. It is a long code, often starting with ChIJ.';

  test('writes the Google review link for a Place ID', () => {
    expect(payload(build('review', PLACE_ID))).toBe(`https://search.google.com/local/writereview?placeid=${PLACE_ID}`);
  });

  test('takes the Place ID out of a pasted link', () => {
    const pasted = `https://search.google.com/local/writereview?placeid=${PLACE_ID}&hl=en`;
    expect(payload(build('review', pasted))).toBe(`https://search.google.com/local/writereview?placeid=${PLACE_ID}`);
    expect(payload(build('review', `maps.google.com/?placeid=${PLACE_ID}#x`))).toBe(
      `https://search.google.com/local/writereview?placeid=${PLACE_ID}`,
    );
  });

  test('wants at least 20 characters of letters, digits, dash and underscore', () => {
    expect(payload(build('review', 'a'.repeat(20)))).toBe(`https://search.google.com/local/writereview?placeid=${'a'.repeat(20)}`);
    for (const id of ['ChIJ-abc_DEF-0123456789xyz', '-'.repeat(20), '_'.repeat(20)]) {
      expect(payload(build('review', id))).toBe(`https://search.google.com/local/writereview?placeid=${id}`);
    }
    for (const bad of ['a'.repeat(19), 'Cafe Roma', `${PLACE_ID} x`, `${PLACE_ID}!`, 'https://search.google.com/local/writereview?placeid=short']) {
      expect(payload(build('review', bad))).toBe(problem);
    }
  });

  test('reads the Place ID back out of the link it writes', () => {
    const url = new URL(payload(build('review', PLACE_ID)));
    expect(url.origin + url.pathname).toBe('https://search.google.com/local/writereview');
    expect(url.searchParams.get('placeid')).toBe(PLACE_ID);
  });
});
