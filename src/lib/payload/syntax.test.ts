import { coordinates, dialled, isEmail, phoneNumber, webAddress } from './syntax';

describe('webAddress', () => {
  const cases: Array<[input: string, address: string | null]> = [
    ['https://example.com/menu', 'https://example.com/menu'],
    ['HTTP://EXAMPLE.COM/A', 'HTTP://EXAMPLE.COM/A'],
    ['example.com', 'https://example.com'],
    ['example.com/menu?table=4', 'https://example.com/menu?table=4'],
    ['www.example.com', 'https://www.example.com'],
    ['example.com:8080/a', 'https://example.com:8080/a'],
    ['192.168.1.10:8080/a', 'https://192.168.1.10:8080/a'],
    ['https://', null],
    ['hello world.com', null],
    ['999.1.1.1', null],
    ['javascript:alert(1)', null],
    ['ftp://files.example.com/a.zip', null],
    ['', null],
  ];
  for (const [input, address] of cases) {
    test(`${JSON.stringify(input)} -> ${JSON.stringify(address)}`, () => expect(webAddress(input)).toBe(address));
  }
});

describe('isEmail', () => {
  test('accepts an address with a dotted domain', () => {
    for (const ok of ['hello@example.com', 'a.b+tag@sub.example.co', 'Hello@Example.com']) expect(isEmail(ok)).toBe(true);
  });

  test('refuses what cannot be one', () => {
    for (const bad of ['hello@', '@example.com', 'two words@example.com', 'a@b', 'a@@b.co', 'a,b@example.com']) expect(isEmail(bad)).toBe(false);
  });
});

describe('phoneNumber', () => {
  test('reads the digits out of the usual ways of writing a number', () => {
    expect(phoneNumber('(555) 123-4567', 7)).toEqual({ plus: false, digits: '5551234567' });
    expect(phoneNumber('555.123.4567', 7)).toEqual({ plus: false, digits: '5551234567' });
    expect(phoneNumber('+1 555 123 4567', 7)).toEqual({ plus: true, digits: '15551234567' });
  });

  test('wants at least the minimum number of digits, and never more than 15', () => {
    expect(phoneNumber('555', 3)).toEqual({ plus: false, digits: '555' });
    expect(phoneNumber('555', 7)).toBe(null);
    expect(phoneNumber('123456789012345', 7)).toEqual({ plus: false, digits: '123456789012345' });
    expect(phoneNumber('1234567890123456', 7)).toBe(null);
  });

  test('refuses letters and other characters', () => {
    for (const bad of ['555-abc', '555 123 4567 ext 9', '', '+']) expect(phoneNumber(bad, 3)).toBe(null);
  });
});

describe('dialled', () => {
  test('is the digits, with a + only when one was typed', () => {
    expect(dialled({ plus: false, digits: '5551234567' })).toBe('5551234567');
    expect(dialled({ plus: true, digits: '15551234567' })).toBe('+15551234567');
  });
});

describe('coordinates', () => {
  test('reads a latitude and longitude however they are separated', () => {
    expect(coordinates('37.7749, -122.4194')).toEqual({ lat: '37.7749', lng: '-122.4194' });
    expect(coordinates('37.7749 -122.4194')).toEqual({ lat: '37.7749', lng: '-122.4194' });
    expect(coordinates('37.7749,-122.4194')).toEqual({ lat: '37.7749', lng: '-122.4194' });
    expect(coordinates('40, -74')).toEqual({ lat: '40', lng: '-74' });
    expect(coordinates('+37.7, +122.4')).toEqual({ lat: '37.7', lng: '122.4' });
  });

  test('keeps the digits exactly as typed, trailing zeros and all', () => {
    expect(coordinates('37.7700, -122.4100')).toEqual({ lat: '37.7700', lng: '-122.4100' });
    expect(coordinates('0.1000000001, 0.123456789012345678')).toEqual({ lat: '0.1000000001', lng: '0.123456789012345678' });
  });

  test('refuses values outside the globe', () => {
    expect(coordinates('90.0001, 10')).toBe(null);
    expect(coordinates('-90.5, 10')).toBe(null);
    expect(coordinates('10, 180.1')).toBe(null);
    expect(coordinates('90, 180')).toEqual({ lat: '90', lng: '180' });
  });

  test('refuses anything that is not exactly two numbers', () => {
    for (const bad of ['1,2,3', 'north pole', '37.7749,', '37.7749', '1.2.3, 4', '12 Main St, 90210', '']) expect(coordinates(bad)).toBe(null);
  });
});
