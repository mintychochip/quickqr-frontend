import { everydayTypes } from './everyday';
import { cleanValues } from './fields';
import type { Built } from './types';

/** What the studio does: clean what was typed, then ask the type to build. */
function build(id: string, bar: string, values: Record<string, string> = {}): Built {
  const type = everydayTypes.find((t) => t.id === id);
  if (!type) throw new Error(`no type ${id}`);
  return type.build(bar, cleanValues(type, values));
}

const payload = (built: Built) => ('payload' in built ? built.payload : `PROBLEM: ${built.problem}`);

describe('the everyday types', () => {
  test('are these six, in menu order, all in the everyday group', () => {
    expect(everydayTypes.map((t) => t.id)).toEqual(['link', 'text', 'phone', 'sms', 'email', 'whatsapp']);
    expect(everydayTypes.every((t) => t.group === 'everyday')).toBe(true);
  });

  test('are labelled the way the menu shows them', () => {
    expect(everydayTypes.map((t) => t.label)).toEqual(['Link', 'Text', 'Phone number', 'Text message', 'Email', 'WhatsApp']);
  });
});

describe('link', () => {
  test('keeps a web address as typed and adds https to a bare domain', () => {
    expect(payload(build('link', 'https://example.com/menu?table=4'))).toBe('https://example.com/menu?table=4');
    expect(payload(build('link', 'HTTP://EXAMPLE.COM/A'))).toBe('HTTP://EXAMPLE.COM/A');
    expect(payload(build('link', 'example.com/menu'))).toBe('https://example.com/menu');
    expect(payload(build('link', '192.168.1.10:8080/a'))).toBe('https://192.168.1.10:8080/a');
  });

  test('refuses what is not a web address, including schemes that are not web', () => {
    for (const bad of ['hello', 'two words.com', 'javascript:alert(1)', 'ftp://files.example.com/a.zip', 'https://', '999.1.1.1']) {
      expect(payload(build('link', bad))).toBe('PROBLEM: Enter a web address, like example.com/menu.');
    }
  });
});

describe('text', () => {
  test('carries what was typed, exactly', () => {
    for (const text of ['Table 4, patio', '5551234567', 'example.com/menu', 'javascript:alert(1)', 'café 日本語 :)']) {
      expect(payload(build('text', text))).toBe(text);
    }
  });
});

describe('phone', () => {
  test('writes a tel: link from the digits, keeping a leading + and never adding a country code', () => {
    expect(payload(build('phone', '(555) 123-4567'))).toBe('tel:5551234567');
    expect(payload(build('phone', '+1 555 123 4567'))).toBe('tel:+15551234567');
    expect(payload(build('phone', '+44 20 7946 0958'))).toBe('tel:+442079460958');
  });

  test('accepts short numbers, because a person who chose Phone number means one', () => {
    expect(payload(build('phone', '911'))).toBe('tel:911');
    expect(payload(build('phone', '12345'))).toBe('tel:12345');
  });

  test('refuses too few or too many digits, and anything with letters', () => {
    for (const bad of ['12', '1234567890123456', 'call me', '555-CALL', '+']) {
      expect(payload(build('phone', bad))).toBe('PROBLEM: Enter a phone number with 3 to 15 digits.');
    }
  });
});

describe('sms', () => {
  test('writes an sms: link, with the message as the body when there is one', () => {
    expect(payload(build('sms', '+1 555 123 4567'))).toBe('sms:+15551234567');
    expect(payload(build('sms', '+1 555 123 4567', { message: 'Hello there' }))).toBe('sms:+15551234567?body=Hello%20there');
  });

  test('encodes a message so that nothing in it can end the link early', () => {
    const built = payload(build('sms', '555 123 4567', { message: 'a&b=c?d#e é' }));
    const url = new URL(built);
    expect(url.protocol).toBe('sms:');
    expect(url.pathname).toBe('5551234567');
    expect(url.searchParams.get('body')).toBe('a&b=c?d#e é');
  });

  test('accepts short codes, which carriers use for texting services', () => {
    expect(payload(build('sms', '12345', { message: 'JOIN' }))).toBe('sms:12345?body=JOIN');
  });

  test('refuses a number that is not one, or has too few or too many digits', () => {
    for (const bad of ['text me', '12', '1234567890123456']) {
      expect(payload(build('sms', bad))).toBe('PROBLEM: Enter the phone number to text, with 3 to 15 digits.');
    }
  });
});

describe('email', () => {
  test('writes a mailto: link, with subject and body when there are some', () => {
    expect(payload(build('email', 'hello@example.com'))).toBe('mailto:hello@example.com');
    expect(payload(build('email', 'hello@example.com', { subject: 'Hi there', body: 'Line one' }))).toBe(
      'mailto:hello@example.com?subject=Hi%20there&body=Line%20one',
    );
    expect(payload(build('email', 'hello@example.com', { body: 'Only a body' }))).toBe('mailto:hello@example.com?body=Only%20a%20body');
  });

  test('encodes subject and body so that they read back as typed', () => {
    const url = new URL(payload(build('email', 'a.b+tag@sub.example.co', { subject: 'Q&A: 50% off?', body: 'x=1#2 é' })));
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('a.b+tag@sub.example.co');
    expect(url.searchParams.get('subject')).toBe('Q&A: 50% off?');
    expect(url.searchParams.get('body')).toBe('x=1#2 é');
  });

  test('keeps the address as typed, including capitals', () => {
    expect(payload(build('email', 'Hello@Example.com'))).toBe('mailto:Hello@Example.com');
  });

  test('refuses what is not an email address', () => {
    for (const bad of ['hello', 'hello@', '@example.com', 'two words@example.com', 'a@b']) {
      expect(payload(build('email', bad))).toBe('PROBLEM: Enter an email address, like name@example.com.');
    }
  });
});

describe('whatsapp', () => {
  test('writes a wa.me link from the digits of the international number', () => {
    expect(payload(build('whatsapp', '+1 555 123 4567'))).toBe('https://wa.me/15551234567');
    expect(payload(build('whatsapp', '+44 (20) 7946-0958'))).toBe('https://wa.me/442079460958');
  });

  test('adds the message as text when there is one, encoded', () => {
    const url = new URL(payload(build('whatsapp', '+15551234567', { message: 'Hi! Table for 2 & a cot?' })));
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/15551234567');
    expect(url.searchParams.get('text')).toBe('Hi! Table for 2 & a cot?');
  });

  test('wants the + and a country code, because wa.me cannot guess one and a wrong link is silent', () => {
    for (const bad of ['555 123 4567', '15551234567', '+123456', '+1 555 123 456 789 012 34', 'call me']) {
      expect(payload(build('whatsapp', bad))).toBe('PROBLEM: Start with + and the country code, like +1 555 123 4567.');
    }
  });
});
