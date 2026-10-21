import { byteLength, escapeText, query } from './format';

describe('query', () => {
  test('joins the filled pairs and percent-encodes their values', () => {
    expect(query([['subject', 'Hi there'], ['body', '']])).toBe('?subject=Hi%20there');
    expect(query([['a', '1'], ['b', '2&3=4']])).toBe('?a=1&b=2%263%3D4');
  });

  test('is empty when nothing is filled', () => {
    expect(query([])).toBe('');
    expect(query([['a', ''], ['b', '']])).toBe('');
  });

  test('encodes what would end a value early, and non-ASCII as UTF-8', () => {
    expect(query([['q', '#?/ +']])).toBe('?q=%23%3F%2F%20%2B');
    expect(query([['q', 'café']])).toBe('?q=caf%C3%A9');
  });

  test('does not throw on text that is not well formed, such as half an emoji from a cut-off paste', () => {
    expect(query([['q', 'a\uD83Db']])).toBe('?q=a%EF%BF%BDb');
    expect(query([['q', '\uDE00']])).toBe('?q=%EF%BF%BD');
    expect(query([['q', '😀']])).toBe('?q=%F0%9F%98%80');
  });
});

describe('escapeText', () => {
  test('escapes backslash, semicolon and comma, which vCard and iCalendar use as separators', () => {
    expect(escapeText('a;b,c\\d')).toBe('a\\;b\\,c\\\\d');
  });

  test('turns every kind of line break into the two characters \\n', () => {
    expect(escapeText('one\ntwo\r\nthree\rfour')).toBe('one\\ntwo\\nthree\\nfour');
  });

  test('leaves ordinary text alone', () => {
    expect(escapeText('Spring menu: 2 for 1 :)')).toBe('Spring menu: 2 for 1 :)');
  });
});

describe('byteLength', () => {
  test('counts the bytes a QR code stores, not the characters', () => {
    expect(byteLength('abc')).toBe(3);
    expect(byteLength('日')).toBe(3);
    expect(byteLength('café')).toBe(5);
    expect(byteLength('')).toBe(0);
  });
});
