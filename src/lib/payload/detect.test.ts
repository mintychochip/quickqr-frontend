import { detect } from './detect';

/** `guessed` is true when the type was inferred from the shape, not named by a scheme such as https: or tel:. */
type Case = [input: string, id: string, payload: string, guessed?: boolean];

function expectDetected([input, id, payload, guessed = false]: Case) {
  expect(detect(input)).toEqual({ id, payload, guessed });
}

describe('web links', () => {
  const cases: Case[] = [
    ['https://example.com/menu', 'link', 'https://example.com/menu'],
    ['HTTP://EXAMPLE.COM/A', 'link', 'HTTP://EXAMPLE.COM/A'],
    ['example.com', 'link', 'https://example.com', true],
    ['example.com/menu?table=4', 'link', 'https://example.com/menu?table=4', true],
    ['www.example.com', 'link', 'https://www.example.com', true],
    ['shop.example.co.uk/a', 'link', 'https://shop.example.co.uk/a', true],
    ['example.com:8080/a', 'link', 'https://example.com:8080/a', true],
    ['192.168.1.10:8080/a', 'link', 'https://192.168.1.10:8080/a', true],
  ];
  for (const c of cases) test(`${JSON.stringify(c[0])} is a link`, () => expectDetected(c));

  test('a very long link is still a link', () => {
    const long = `https://example.com/${'a'.repeat(3000)}`;
    expect(detect(long)).toEqual({ id: 'link', payload: long, guessed: false });
  });
});

describe('phone numbers', () => {
  const cases: Case[] = [
    ['(555) 123-4567', 'phone', 'tel:5551234567', true],
    ['555-123-4567', 'phone', 'tel:5551234567', true],
    ['555.123.4567', 'phone', 'tel:5551234567', true],
    ['5551234567', 'phone', 'tel:5551234567', true],
    ['+1 555 123 4567', 'phone', 'tel:+15551234567', true],
    ['+44 20 7946 0958', 'phone', 'tel:+442079460958', true],
    ['1234567', 'phone', 'tel:1234567', true],
    ['123456789012345', 'phone', 'tel:123456789012345', true],
    // Only a date written with one separator throughout is ruled out. Mixed separators are not a date format.
    ['1234-56.7890', 'phone', 'tel:1234567890', true],
  ];
  for (const c of cases) test(`${JSON.stringify(c[0])} is a phone number`, () => expectDetected(c));

  const notPhones: Case[] = [
    ['123456', 'text', '123456'],
    ['1234567890123456', 'text', '1234567890123456'],
    ['2024-01-15', 'text', '2024-01-15'],
    ['15.01.2024', 'text', '15.01.2024'],
    ['42', 'text', '42'],
  ];
  for (const c of notPhones) test(`${JSON.stringify(c[0])} is not a phone number`, () => expectDetected(c));

  test('an IPv4 address is a link, not a phone number', () => {
    expectDetected(['192.168.1.10', 'link', 'https://192.168.1.10', true]);
  });

  test('a dotted phone number is not mistaken for an IPv4 address', () => {
    expectDetected(['612.34.56.78', 'phone', 'tel:612345678', true]);
  });
});

describe('email addresses', () => {
  const cases: Case[] = [
    ['hello@example.com', 'email', 'mailto:hello@example.com', true],
    ['a.b+tag@sub.example.co', 'email', 'mailto:a.b+tag@sub.example.co', true],
    ['Hello@Example.com', 'email', 'mailto:Hello@Example.com', true],
    ['hello@', 'text', 'hello@'],
    ['@example.com', 'text', '@example.com'],
    ['two words@example.com', 'text', 'two words@example.com'],
  ];
  for (const c of cases) test(`${JSON.stringify(c[0])} is ${c[1]}`, () => expectDetected(c));
});

describe('coordinates', () => {
  const cases: Case[] = [
    ['37.7749, -122.4194', 'location', 'geo:37.7749,-122.4194', true],
    ['37.7749,-122.4194', 'location', 'geo:37.7749,-122.4194', true],
    ['37.7749 -122.4194', 'location', 'geo:37.7749,-122.4194', true],
    ['+37.7749, +122.4194', 'location', 'geo:37.7749,122.4194', true],
    ['-33.8688, 151.2093', 'location', 'geo:-33.8688,151.2093', true],
    ['37.7700, -122.4100', 'location', 'geo:37.7700,-122.4100', true],
    ['90.0, 180.0', 'location', 'geo:90.0,180.0', true],
  ];
  for (const c of cases) test(`${JSON.stringify(c[0])} is a location`, () => expectDetected(c));

  // A pair is only a guess when both numbers have decimals and sit on the globe: 40, -74 could be anything.
  const notLocations: Case[] = [
    ['40, -74', 'text', '40, -74'],
    ['40.5, -74', 'text', '40.5, -74'],
    ['40, -74.5', 'text', '40, -74.5'],
    ['90.5, 10.5', 'text', '90.5, 10.5'],
    ['45.5, 180.5', 'text', '45.5, 180.5'],
    ['1.5, 2.5, 3.5', 'text', '1.5, 2.5, 3.5'],
    ['37.7749,', 'text', '37.7749,'],
    ['37.7749, abc', 'text', '37.7749, abc'],
  ];
  for (const c of notLocations) test(`${JSON.stringify(c[0])} is not a location`, () => expectDetected(c));

  test('a phone number written with dots is still a phone number', () => {
    expectDetected(['555.123.4567', 'phone', 'tel:5551234567', true]);
  });
});

describe('pasted payloads', () => {
  const EPC = 'BCD\n002\n1\nSCT\n\nJane Doe\nDE89370400440532013000\nEUR12.00';
  const cases: Case[] = [
    ['tel:+15551234567', 'phone', 'tel:+15551234567'],
    ['TEL:+15551234567', 'phone', 'TEL:+15551234567'],
    ['mailto:a@b.co?subject=Hi', 'email', 'mailto:a@b.co?subject=Hi'],
    ['sms:+15551234567?body=Hi', 'sms', 'sms:+15551234567?body=Hi'],
    ['SMSTO:+15551234567:Hi', 'sms', 'SMSTO:+15551234567:Hi'],
    ['geo:40.7128,-74.0060', 'location', 'geo:40.7128,-74.0060'],
    ['WIFI:S:Cafe;T:WPA;P:secret;;', 'wifi', 'WIFI:S:Cafe;T:WPA;P:secret;;'],
    ['MECARD:N:Doe,Jan;TEL:5551234567;;', 'contact', 'MECARD:N:Doe,Jan;TEL:5551234567;;'],
    ['BEGIN:VCARD\nVERSION:3.0\nFN:Jan Doe\nEND:VCARD', 'contact', 'BEGIN:VCARD\nVERSION:3.0\nFN:Jan Doe\nEND:VCARD'],
    ['BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR', 'event', 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR'],
    ['BEGIN:VEVENT\nSUMMARY:Fair\nEND:VEVENT', 'event', 'BEGIN:VEVENT\nSUMMARY:Fair\nEND:VEVENT'],
    ['begin:vevent\nsummary:Fair', 'event', 'begin:vevent\nsummary:Fair'],
    ['bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.01', 'crypto', 'bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.01'],
    ['BITCOIN:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'crypto', 'BITCOIN:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
    ['ethereum:0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe', 'crypto', 'ethereum:0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'],
    ['litecoin:LaMT348PWRnrqeeWArpwQPbuanpXDZGEUz', 'crypto', 'litecoin:LaMT348PWRnrqeeWArpwQPbuanpXDZGEUz'],
    ['dogecoin:DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L', 'crypto', 'dogecoin:DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'],
    ['bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a', 'crypto', 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'],
    ['upi://pay?pa=jane@okbank&pn=Jane', 'upi', 'upi://pay?pa=jane@okbank&pn=Jane'],
    ['UPI://PAY?pa=jane@okbank&pn=Jane', 'upi', 'UPI://PAY?pa=jane@okbank&pn=Jane'],
    [EPC, 'sepa', EPC],
    [EPC.replaceAll('\n', '\r\n'), 'sepa', EPC.replaceAll('\n', '\r\n')],
    ['BCD\n001\n1\nSCT\nDEUTDEFF\nJane\nDE89370400440532013000', 'sepa', 'BCD\n001\n1\nSCT\nDEUTDEFF\nJane\nDE89370400440532013000'],
  ];
  for (const c of cases) test(`${JSON.stringify(c[0])} goes in as typed`, () => expectDetected(c));

  // BCD is a service tag only when a version line follows it, so a word that begins with it is not a payment.
  const notPayments: Case[] = [
    ['BCD', 'text', 'BCD'],
    ['BCD 002', 'text', 'BCD 002'],
    ['BCD\n003\n1\nSCT', 'text', 'BCD\n003\n1\nSCT'],
    ['BCDE\n002\n1', 'text', 'BCDE\n002\n1'],
    ['bcd\n002\n1\nSCT', 'text', 'bcd\n002\n1\nSCT'],
    ['Pay me\nBCD\n002\n1\nSCT', 'text', 'Pay me\nBCD\n002\n1\nSCT'],
    ['bitcoin', 'text', 'bitcoin'],
    ['upi', 'text', 'upi'],
    ['upi: me', 'text', 'upi: me'],
  ];
  for (const c of notPayments) test(`${JSON.stringify(c[0])} is only text`, () => expectDetected(c));
});

describe('plain text', () => {
  const cases: Case[] = [
    ['Table 4, patio', 'text', 'Table 4, patio'],
    ['hello world.com', 'text', 'hello world.com'],
    ['Visit example.com today', 'text', 'Visit example.com today'],
    ['https://', 'text', 'https://'],
  ];
  for (const c of cases) test(`${JSON.stringify(c[0])} is text`, () => expectDetected(c));

  const neverLinks: string[] = ['javascript:alert(1)', 'ftp://files.example.com/a.zip', 'data:text/html,<b>x</b>', 'file:///etc/passwd'];
  for (const input of neverLinks) {
    test(`${JSON.stringify(input)} is never treated as a link`, () => {
      expect(detect(input)).toEqual({ id: 'text', payload: input, guessed: false });
    });
  }
});
