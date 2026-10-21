import { cleanValues, visibleFields } from './fields';
import { byteLength } from './format';
import { payTypes } from './pay';
import type { Built } from './types';

/** What the studio does: clean what was typed, then ask the type to build. */
function build(id: string, bar: string, values: Record<string, string> = {}): Built {
  const type = payTypes.find((t) => t.id === id);
  if (!type) throw new Error(`no type ${id}`);
  return type.build(bar, cleanValues(type, values));
}

const payload = (built: Built) => ('payload' in built ? built.payload : `PROBLEM: ${built.problem}`);
const keys = (id: string, values: Record<string, string>) => visibleFields(payTypes.find((t) => t.id === id)!, values).map((f) => f.key);

/** ISO 7064 mod 97-10 written for the test: move four characters to the end, letters become 10 to 35, the rest mod 97 is 1. */
function passesMod97(iban: string): boolean {
  const digits = [...iban.slice(4) + iban.slice(0, 4)].map((c) => (/[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c)).join('');
  return BigInt(digits) % 97n === 1n;
}

/**
 * A string of exactly `length` characters that starts with `head` and passes the checksum, found by searching a
 * four-digit tail. It lets a test build something with a right checksum but a wrong shape.
 */
function checksummed(head: string, length: number): string {
  const fill = 'A'.repeat(length - head.length - 4);
  for (let tail = 0; tail < 10000; tail += 1) {
    const candidate = `${head}${fill}${String(tail).padStart(4, '0')}`;
    if (passesMod97(candidate)) return candidate;
  }
  throw new Error(`no checksum found for ${head} at ${length}`);
}

describe('the pay types', () => {
  test('are payment link, crypto, bank transfer and UPI, in the pay group', () => {
    expect(payTypes.map((t) => [t.id, t.label, t.group])).toEqual([
      ['payment', 'Payment link', 'pay'],
      ['crypto', 'Crypto', 'pay'],
      ['sepa', 'Bank transfer', 'pay'],
      ['upi', 'UPI', 'pay'],
    ]);
  });

  test('every one carries a warning, because a wrong value sends money to the wrong place', () => {
    for (const type of payTypes) expect((type.note ?? '') !== '').toBe(true);
  });
});

describe('payment', () => {
  const AMOUNT = 'PROBLEM: Enter an amount like 12 or 12.50.';
  const USERNAME = 'PROBLEM: Usernames use letters, numbers, dots, dashes and underscores.';

  test('shows an amount for PayPal and Cash App, and a currency for PayPal only', () => {
    expect(keys('payment', {})).toEqual(['service', 'amount', 'currency']);
    expect(keys('payment', { service: 'cashapp' })).toEqual(['service', 'amount']);
    expect(keys('payment', { service: 'venmo' })).toEqual(['service']);
  });

  test('writes each service its own link, PayPal by default', () => {
    expect(payload(build('payment', 'jane'))).toBe('https://paypal.me/jane');
    expect(payload(build('payment', 'jane', { service: 'cashapp' }))).toBe('https://cash.app/$jane');
    expect(payload(build('payment', 'jane', { service: 'venmo' }))).toBe('https://venmo.com/u/jane');
  });

  test('adds the amount, with the currency for PayPal', () => {
    expect(payload(build('payment', 'jane', { amount: '12.50' }))).toBe('https://paypal.me/jane/12.50USD');
    expect(payload(build('payment', 'jane', { amount: '12', currency: 'EUR' }))).toBe('https://paypal.me/jane/12EUR');
    expect(payload(build('payment', 'jane', { service: 'cashapp', amount: '5' }))).toBe('https://cash.app/$jane/5');
  });

  test('leaves out what the service does not use, even if it was filled in before switching', () => {
    expect(payload(build('payment', 'jane', { service: 'venmo', amount: '12', currency: 'EUR' }))).toBe('https://venmo.com/u/jane');
    expect(payload(build('payment', 'jane', { service: 'cashapp', amount: '5', currency: 'EUR' }))).toBe('https://cash.app/$jane/5');
    expect(payload(build('payment', 'jane', { service: 'venmo', amount: 'abc' }))).toBe('https://venmo.com/u/jane');
    expect(payload(build('payment', 'jane', { currency: 'EUR' }))).toBe('https://paypal.me/jane');
  });

  test('offers six currencies and USD first', () => {
    const currency = payTypes.find((t) => t.id === 'payment')!.fields.find((f) => f.key === 'currency')!;
    expect(currency.control === 'select' ? currency.options.map((o) => `${o.value}=${o.label}`) : []).toEqual([
      'USD=USD',
      'EUR=EUR',
      'GBP=GBP',
      'CAD=CAD',
      'AUD=AUD',
      'CHF=CHF',
    ]);
  });

  test('drops one leading @ or $ from the username, and no more', () => {
    expect(payload(build('payment', '@jane'))).toBe('https://paypal.me/jane');
    expect(payload(build('payment', '$jane', { service: 'cashapp' }))).toBe('https://cash.app/$jane');
    expect(payload(build('payment', '@$jane'))).toBe(USERNAME);
    expect(payload(build('payment', '$$jane'))).toBe(USERNAME);
    expect(payload(build('payment', '@@jane'))).toBe(USERNAME);
  });

  test('refuses a username that cannot be one', () => {
    for (const bad of ['jane doe', 'jane/doe', '@', 'jane!', 'jané', 'a'.repeat(51)]) expect(payload(build('payment', bad))).toBe(USERNAME);
    expect(payload(build('payment', 'a'.repeat(50)))).toBe(`https://paypal.me/${'a'.repeat(50)}`);
    expect(payload(build('payment', 'a.b_c-d'))).toBe('https://paypal.me/a.b_c-d');
  });

  test('accepts an amount of up to seven digits and two decimals, above zero', () => {
    for (const ok of ['12', '12.5', '12.50', '0.01', '0.5', '1234567', '1234567.89', '007']) {
      expect(payload(build('payment', 'jane', { amount: ok }))).toBe(`https://paypal.me/jane/${ok}USD`);
    }
    expect(payload(build('payment', 'jane', { amount: ' 12 ' }))).toBe('https://paypal.me/jane/12USD');
  });

  test('refuses an amount that is not a plain positive decimal', () => {
    for (const bad of ['0', '0.00', '00', '12.505', '1e5', '-1', '+1', '12,5', '.5', '5.', 'abc', '12345678', '1 2']) {
      expect(payload(build('payment', 'jane', { amount: bad }))).toBe(AMOUNT);
      expect(payload(build('payment', 'jane', { service: 'cashapp', amount: bad }))).toBe(AMOUNT);
    }
  });
});

describe('crypto', () => {
  const BITCOIN = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
  const ETHEREUM = '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe';
  const CASH = 'qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a';

  const VALID: Record<string, string[]> = {
    bitcoin: [BITCOIN, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0'],
    litecoin: ['LaMT348PWRnrqeeWArpwQPbuanpXDZGEUz', 'MVwTNUi2d1hJhqmGLwxjdbbfBQj6GYvFq3', 'ltc1qg82u8my8kvzz3sqjm5ylgt3wys5uvvq5rj6r6u', '3CDJNfdWX8m2NwuGUV3nhXHXEeLygMXoAj'],
    dogecoin: ['DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L', 'D8vFz4p1L37jdg47HXKtchRgGNSBTzkdbb'],
    bitcoincash: [CASH, `bitcoincash:${CASH}`, 'ppm2qsznhks23z7629mms6s4cwef74vcwvcn0ysu8q'],
    ethereum: [ETHEREUM, '0x52908400098527886E0F7030069857D2E4169EE7'],
  };
  const NAME: Record<string, string> = { bitcoin: 'Bitcoin', litecoin: 'Litecoin', dogecoin: 'Dogecoin', bitcoincash: 'Bitcoin Cash', ethereum: 'Ethereum' };

  test('shows amount, label and message for every coin but Ethereum', () => {
    expect(keys('crypto', {})).toEqual(['coin', 'amount', 'label', 'message']);
    expect(keys('crypto', { coin: 'ethereum' })).toEqual(['coin']);
  });

  test('offers five coins, Bitcoin first', () => {
    const coin = payTypes.find((t) => t.id === 'crypto')!.fields[0]!;
    expect(coin.control === 'select' ? coin.options.map((o) => o.value) : []).toEqual(['bitcoin', 'ethereum', 'litecoin', 'dogecoin', 'bitcoincash']);
  });

  test('writes a bitcoin: link with the address exactly as typed', () => {
    expect(payload(build('crypto', BITCOIN))).toBe(`bitcoin:${BITCOIN}`);
    expect(payload(build('crypto', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'))).toBe('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(payload(build('crypto', BITCOIN, { amount: '0.01', label: 'Coffee', message: 'Thanks' }))).toBe(
      `bitcoin:${BITCOIN}?amount=0.01&label=Coffee&message=Thanks`,
    );
  });

  test('uses each coin its own scheme', () => {
    expect(payload(build('crypto', VALID.litecoin![0]!, { coin: 'litecoin' }))).toBe(`litecoin:${VALID.litecoin![0]}`);
    expect(payload(build('crypto', VALID.dogecoin![0]!, { coin: 'dogecoin' }))).toBe(`dogecoin:${VALID.dogecoin![0]}`);
    expect(payload(build('crypto', ETHEREUM, { coin: 'ethereum' }))).toBe(`ethereum:${ETHEREUM}`);
  });

  test('writes Bitcoin Cash with its prefix once, whether or not it was typed', () => {
    expect(payload(build('crypto', CASH, { coin: 'bitcoincash' }))).toBe(`bitcoincash:${CASH}`);
    expect(payload(build('crypto', `bitcoincash:${CASH}`, { coin: 'bitcoincash', amount: '1.5' }))).toBe(`bitcoincash:${CASH}?amount=1.5`);
  });

  test('leaves amount, label and message off an Ethereum link, which has no place for them', () => {
    expect(payload(build('crypto', ETHEREUM, { coin: 'ethereum', amount: '1', label: 'x', message: 'y' }))).toBe(`ethereum:${ETHEREUM}`);
  });

  test('encodes the label and message so that they read back as typed', () => {
    const url = new URL(payload(build('crypto', BITCOIN, { amount: '0.5', label: 'Café & Cake #1', message: 'a=b?c%d é 日本' })));
    expect(url.protocol).toBe('bitcoin:');
    expect(url.pathname).toBe(BITCOIN);
    expect(url.searchParams.get('amount')).toBe('0.5');
    expect(url.searchParams.get('label')).toBe('Café & Cake #1');
    expect(url.searchParams.get('message')).toBe('a=b?c%d é 日本');
  });

  test('accepts real addresses for their coin', () => {
    for (const [coin, list] of Object.entries(VALID)) {
      for (const address of list) expect('payload' in build('crypto', address, { coin })).toBe(true);
    }
  });

  test('refuses an address that belongs to another coin, naming the coin it was meant for', () => {
    for (const [coin, name] of Object.entries(NAME)) {
      for (const [other, list] of Object.entries(VALID)) {
        if (other === coin) continue;
        // 3... is the script-hash prefix of both Bitcoin and Litecoin, so such an address fits either.
        for (const address of list.filter((a) => !a.startsWith('3'))) {
          expect(payload(build('crypto', address, { coin }))).toBe(`PROBLEM: That ${name} address does not look right.`);
        }
      }
    }
  });

  test('refuses an address that is cut short, padded, or has characters the coin never uses', () => {
    const bitcoin = 'PROBLEM: That Bitcoin address does not look right.';
    // The last character of a bech32 address cannot be o, and nothing here is long enough or short enough.
    for (const bad of [`${BITCOIN.slice(0, -1)}o`, BITCOIN.slice(0, 10), `${BITCOIN} extra`, 'hello', `0x${'0'.repeat(40)}`, `bc1${'q'.repeat(100)}`]) {
      expect(payload(build('crypto', bad))).toBe(bitcoin);
    }
    const ethereum = 'PROBLEM: That Ethereum address does not look right.';
    for (const bad of [ETHEREUM.slice(0, -1), `${ETHEREUM}0`, ETHEREUM.replace('0x', '0X'), ETHEREUM.replace('d', 'g'), ETHEREUM.slice(2)]) {
      expect(payload(build('crypto', bad, { coin: 'ethereum' }))).toBe(ethereum);
    }
  });

  test('holds each address to the exact shape of its coin: length, and the characters the alphabet leaves out', () => {
    const fits = (coin: string, address: string) => 'payload' in build('crypto', address, { coin });
    const A = (n: number) => 'A'.repeat(n);
    // Base58 leaves out 0, O, I and l; bech32 leaves out 1, b, i and o.
    const base58Outside = ['0', 'O', 'I', 'l'];
    const bech32Outside = ['1', 'b', 'i', 'o'];

    // Bitcoin: a 1 or 3 and 25 to 34 base58 characters, or bc1 and 11 to 71 bech32 ones.
    expect([fits('bitcoin', `1${A(25)}`), fits('bitcoin', `3${A(25)}`), fits('bitcoin', `1${A(34)}`)]).toEqual([true, true, true]);
    expect([fits('bitcoin', `1${A(24)}`), fits('bitcoin', `1${A(35)}`), fits('bitcoin', `2${A(25)}`)]).toEqual([false, false, false]);
    for (const outside of base58Outside) expect(fits('bitcoin', `1${A(24)}${outside}`)).toBe(false);
    expect([fits('bitcoin', `bc1${'q'.repeat(11)}`), fits('bitcoin', `bc1${'q'.repeat(71)}`)]).toEqual([true, true]);
    expect([fits('bitcoin', `bc1${'q'.repeat(10)}`), fits('bitcoin', `bc1${'q'.repeat(72)}`)]).toEqual([false, false]);
    for (const outside of bech32Outside) expect(fits('bitcoin', `bc1${'q'.repeat(20)}${outside}`)).toBe(false);

    // Litecoin: an L, M or 3 and 26 to 33 base58 characters, or ltc1 and 11 to 71 bech32 ones.
    expect([fits('litecoin', `L${A(26)}`), fits('litecoin', `M${A(26)}`), fits('litecoin', `3${A(33)}`)]).toEqual([true, true, true]);
    expect([fits('litecoin', `L${A(25)}`), fits('litecoin', `L${A(34)}`), fits('litecoin', `1${A(26)}`)]).toEqual([false, false, false]);
    for (const outside of base58Outside) expect(fits('litecoin', `L${A(25)}${outside}`)).toBe(false);
    expect([fits('litecoin', `ltc1${'q'.repeat(11)}`), fits('litecoin', `ltc1${'q'.repeat(71)}`)]).toEqual([true, true]);
    expect([fits('litecoin', `ltc1${'q'.repeat(10)}`), fits('litecoin', `ltc1${'q'.repeat(72)}`)]).toEqual([false, false]);
    for (const outside of bech32Outside) expect(fits('litecoin', `ltc1${'q'.repeat(20)}${outside}`)).toBe(false);

    // Dogecoin: 34 characters, a D, then 5 to 9 or A to U without I and O, then base58.
    for (const second of ['5', '9', 'A', 'H', 'J', 'N', 'P', 'U']) expect(fits('dogecoin', `D${second}${A(32)}`)).toBe(true);
    for (const second of ['4', 'I', 'O', 'V', 'a', 'z']) expect(fits('dogecoin', `D${second}${A(32)}`)).toBe(false);
    expect([fits('dogecoin', `D5${A(31)}`), fits('dogecoin', `D5${A(33)}`), fits('dogecoin', `E5${A(32)}`)]).toEqual([false, false, false]);
    for (const outside of base58Outside) expect(fits('dogecoin', `D5${A(31)}${outside}`)).toBe(false);

    // Bitcoin Cash: q or p and 41 lower-case letters or digits, with or without the prefix.
    expect([fits('bitcoincash', `q${'a'.repeat(41)}`), fits('bitcoincash', `p${'a'.repeat(41)}`), fits('bitcoincash', `q${'0'.repeat(41)}`)]).toEqual([true, true, true]);
    expect([fits('bitcoincash', `q${'a'.repeat(40)}`), fits('bitcoincash', `q${'a'.repeat(42)}`), fits('bitcoincash', `z${'a'.repeat(41)}`)]).toEqual([false, false, false]);
    expect([fits('bitcoincash', `Q${A(41)}`), fits('bitcoincash', `q${'a'.repeat(40)}A`), fits('bitcoincash', `q${'a'.repeat(40)}-`)]).toEqual([false, false, false]);
    expect(fits('bitcoincash', `bitcoincash:q${'a'.repeat(41)}`)).toBe(true);
    expect(fits('bitcoincash', `bitcoincash:q${'a'.repeat(40)}`)).toBe(false);
    expect(fits('bitcoincash', `bch:q${'a'.repeat(41)}`)).toBe(false);
  });

  test('never changes the case of an address', () => {
    expect(payload(build('crypto', ETHEREUM, { coin: 'ethereum' }))).toBe(`ethereum:${ETHEREUM}`);
    expect(payload(build('crypto', '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'))).toBe('bitcoin:1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
  });

  test('accepts an amount of up to eight digits and eight decimals, above zero', () => {
    for (const ok of ['1', '0.01', '0.00000001', '12345678', '12345678.12345678', '0.5']) {
      expect(payload(build('crypto', BITCOIN, { amount: ok }))).toBe(`bitcoin:${BITCOIN}?amount=${ok}`);
    }
  });

  test('refuses an amount that is not a plain positive decimal', () => {
    for (const bad of ['0', '0.0', '0.000000001', '123456789', '1e-5', '-1', '1,5', '.5', '5.', 'abc']) {
      expect(payload(build('crypto', BITCOIN, { amount: bad }))).toBe('PROBLEM: Enter an amount like 0.01.');
    }
  });
});

describe('sepa', () => {
  const IBAN = 'DE89370400440532013000';
  const VALID_IBANS = [IBAN, 'GB82WEST12345698765432', 'FR1420041010050500013M02606', 'NL91ABNA0417164300', 'ES9121000418450200051332', 'IT60X0542811101000000123456', 'BE68539007547034', 'CH9300762011623852957'];
  const BAD_IBAN = 'PROBLEM: That IBAN does not pass its check. Look at the digits again.';
  const lines = (...rest: string[]) => ['BCD', '002', '1', 'SCT', ...rest].join('\n');

  test('has the fields of a transfer, in order', () => {
    expect(keys('sepa', {})).toEqual(['iban', 'amount', 'reference', 'bic']);
  });

  test('writes the exact EPC payload for a full transfer', () => {
    const text = payload(build('sepa', 'Jane Doe', { iban: 'DE89 3704 0044 0532 0130 00', amount: '12.5', reference: 'Invoice 42', bic: 'deutdeff' }));
    expect(text).toBe(lines('DEUTDEFF', 'Jane Doe', IBAN, 'EUR12.50', '', '', 'Invoice 42'));
  });

  test('drops the empty lines at the end, and keeps the ones in the middle', () => {
    expect(payload(build('sepa', 'Jane Doe', { iban: IBAN }))).toBe(lines('', 'Jane Doe', IBAN));
    expect(payload(build('sepa', 'Jane Doe', { iban: IBAN, amount: '12' }))).toBe(lines('', 'Jane Doe', IBAN, 'EUR12.00'));
    expect(payload(build('sepa', 'Jane Doe', { iban: IBAN, reference: 'Rent' }))).toBe(lines('', 'Jane Doe', IBAN, '', '', '', 'Rent'));
    expect(payload(build('sepa', 'Jane Doe', { iban: IBAN, bic: 'DEUTDEFF500' }))).toBe(lines('DEUTDEFF500', 'Jane Doe', IBAN));
  });

  test('writes the amount with two decimals, whatever was typed', () => {
    const amount = (typed: string) => payload(build('sepa', 'Jane', { iban: IBAN, amount: typed })).split('\n')[7];
    expect(amount('12')).toBe('EUR12.00');
    expect(amount('12.5')).toBe('EUR12.50');
    expect(amount('12.50')).toBe('EUR12.50');
    expect(amount('0.01')).toBe('EUR0.01');
    expect(amount('0.5')).toBe('EUR0.50');
    expect(amount('007.1')).toBe('EUR7.10');
    expect(amount('999999999.99')).toBe('EUR999999999.99');
  });

  test('takes an IBAN with spaces or in lower case, and writes it without spaces in capitals', () => {
    for (const typed of [IBAN.toLowerCase(), 'DE89 3704 0044 0532 0130 00', ' de89  3704 0044 0532 0130 00 ']) {
      expect(payload(build('sepa', 'Jane', { iban: typed })).split('\n')[6]).toBe(IBAN);
    }
  });

  test('accepts every IBAN whose check digits are right, and the test oracle agrees they are', () => {
    for (const iban of VALID_IBANS) {
      expect(passesMod97(iban)).toBe(true);
      expect(payload(build('sepa', 'Jane', { iban })).split('\n')[6]).toBe(iban);
    }
  });

  test('refuses an IBAN with any one digit changed', () => {
    for (const iban of VALID_IBANS) {
      for (let at = 2; at < iban.length; at += 1) {
        const original = iban[at]!;
        if (!/\d/.test(original)) continue;
        const changed = `${iban.slice(0, at)}${original === '0' ? '1' : String(Number(original) - 1)}${iban.slice(at + 1)}`;
        expect(passesMod97(changed)).toBe(false);
        expect(payload(build('sepa', 'Jane', { iban: changed }))).toBe(BAD_IBAN);
      }
    }
  });

  test('refuses an IBAN that is not shaped like one', () => {
    for (const bad of ['DE89', 'DE89-3704-0044-0532-0130-00', 'XX00000000000', 'DEXX370400440532013000', `${IBAN}1234567890123`, '1234567890123456']) {
      expect(payload(build('sepa', 'Jane', { iban: bad }))).toBe(BAD_IBAN);
    }
  });

  test('holds an IBAN to 15 to 34 characters and two check digits, even when the checksum comes out right', () => {
    for (const length of [15, 34]) {
      const iban = checksummed('DE89', length);
      expect(passesMod97(iban)).toBe(true);
      expect(payload(build('sepa', 'Jane', { iban })).split('\n')[6]).toBe(iban);
    }
    const misshapen = [checksummed('DE89', 14), checksummed('DE89', 35), checksummed('DEAB', 20), checksummed('D189', 20)];
    for (const iban of misshapen) {
      expect(passesMod97(iban)).toBe(true);
      expect(payload(build('sepa', 'Jane', { iban }))).toBe(BAD_IBAN);
    }
  });

  test('asks for the IBAN when it is empty', () => {
    expect(payload(build('sepa', 'Jane'))).toBe('PROBLEM: Add the IBAN of the account that gets the money.');
  });

  test('allows a name of 70 characters and no more', () => {
    expect(payload(build('sepa', 'a'.repeat(70), { iban: IBAN })).split('\n')[5]).toBe('a'.repeat(70));
    expect(payload(build('sepa', 'a'.repeat(71), { iban: IBAN }))).toBe('PROBLEM: Use at most 70 characters for the name.');
    expect(payload(build('sepa', '日'.repeat(70), { iban: IBAN })).split('\n')[5]).toBe('日'.repeat(70));
    expect(payload(build('sepa', '😀'.repeat(70), { iban: IBAN })).split('\n')[5]).toBe('😀'.repeat(70));
    expect(payload(build('sepa', '😀'.repeat(71), { iban: IBAN }))).toBe('PROBLEM: Use at most 70 characters for the name.');
  });

  test('allows a reference of 140 characters and no more', () => {
    expect(payload(build('sepa', 'Jane', { iban: IBAN, reference: 'r'.repeat(140) })).split('\n')[10]).toBe('r'.repeat(140));
    expect(payload(build('sepa', 'Jane', { iban: IBAN, reference: 'r'.repeat(141) }))).toBe('PROBLEM: Use at most 140 characters for the reference.');
    // 71 emoji are 142 UTF-16 units but 71 characters and 330 bytes, which fits.
    const emoji = '😀'.repeat(71);
    expect(payload(build('sepa', 'Jane', { iban: IBAN, reference: emoji }))).toBe(lines('', 'Jane', IBAN, '', '', '', emoji));
  });

  test('takes a BIC of 8 or 11 characters, in capitals however it was typed, and refuses the rest', () => {
    const bic = (typed: string) => payload(build('sepa', 'Jane', { iban: IBAN, bic: typed }));
    expect(bic('deutdeff').split('\n')[4]).toBe('DEUTDEFF');
    expect(bic('DEUTDEFF500').split('\n')[4]).toBe('DEUTDEFF500');
    for (const bad of ['DEUTDE', 'DEUTDEFF5', 'DEUTDEFF5001', 'DEUT1EFF', 'DEUT DEFF', '12345678']) expect(bic(bad)).toBe('PROBLEM: Enter the BIC like DEUTDEFF.');
  });

  test('accepts an amount from 0.01 to 999999999.99 and refuses the rest', () => {
    for (const ok of ['0.01', '1', '999999999.99', '12.5']) expect('payload' in build('sepa', 'Jane', { iban: IBAN, amount: ok })).toBe(true);
    for (const bad of ['0', '0.00', '0.001', '1000000000', '999999999.999', '-1', '1e3', '12,5', '.5', 'abc']) {
      expect(payload(build('sepa', 'Jane', { iban: IBAN, amount: bad }))).toBe('PROBLEM: Enter an amount like 12 or 12.50.');
    }
  });

  test('stays within the 331 bytes the EPC standard allows, counting bytes', () => {
    const name = '日'.repeat(70);
    const expected = (reference: string) => lines('', name, IBAN, '', '', '', reference);
    const room = 331 - byteLength(expected(''));
    expect(room > 0 && room < 140).toBe(true);
    const fits = payload(build('sepa', name, { iban: IBAN, reference: 'a'.repeat(room) }));
    expect(fits).toBe(expected('a'.repeat(room)));
    expect(byteLength(fits)).toBe(331);
    expect(payload(build('sepa', name, { iban: IBAN, reference: 'a'.repeat(room + 1) }))).toBe(
      'PROBLEM: Too long for a bank-transfer code. Shorten the name or reference.',
    );
  });
});

describe('upi', () => {
  const ID = 'jane@okbank';

  test('has the fields of a request, in order', () => {
    expect(keys('upi', {})).toEqual(['name', 'amount', 'note']);
  });

  test('writes the exact UPI link, leaving the @ of the ID bare', () => {
    expect(payload(build('upi', ID, { name: 'Jane Doe', amount: '12.50', note: 'Rent' }))).toBe(
      'upi://pay?pa=jane@okbank&pn=Jane%20Doe&am=12.50&cu=INR&tn=Rent',
    );
  });

  test('leaves out the amount and currency together, and an empty note', () => {
    expect(payload(build('upi', ID, { name: 'Jane Doe' }))).toBe('upi://pay?pa=jane@okbank&pn=Jane%20Doe');
    expect(payload(build('upi', ID, { name: 'Jane Doe', note: 'Rent' }))).toBe('upi://pay?pa=jane@okbank&pn=Jane%20Doe&tn=Rent');
    expect(payload(build('upi', ID, { name: 'Jane Doe', amount: '5' }))).toBe('upi://pay?pa=jane@okbank&pn=Jane%20Doe&am=5&cu=INR');
  });

  test('encodes the name and note so that they read back as typed', () => {
    const url = new URL(payload(build('upi', ID, { name: 'Café & Sons #1', note: 'a=b?c%d é 日本' })));
    expect(url.protocol).toBe('upi:');
    expect(url.hostname).toBe('pay');
    expect(url.searchParams.get('pa')).toBe(ID);
    expect(url.searchParams.get('pn')).toBe('Café & Sons #1');
    expect(url.searchParams.get('tn')).toBe('a=b?c%d é 日本');
  });

  test('accepts a UPI ID of the form name@bank and refuses the rest', () => {
    for (const ok of ['jane@okbank', 'first.last-1@upi', '9876543210@paytm', 'a_b@ybl', 'ab@ok']) {
      expect(payload(build('upi', ok, { name: 'Jane' }))).toBe(`upi://pay?pa=${ok}&pn=Jane`);
    }
    for (const bad of ['jane', 'jane@', '@okbank', 'ja ne@okbank', 'a@okbank', 'jane@o', 'jane@1bank', 'jane@ok.bank', 'jane@@okbank', 'jane@okbank!']) {
      expect(payload(build('upi', bad, { name: 'Jane' }))).toBe('PROBLEM: Enter the UPI ID like name@bank.');
    }
  });

  test('wants the name of whoever is being paid', () => {
    expect(payload(build('upi', ID))).toBe('PROBLEM: Add the name of the person or shop being paid.');
  });

  test('accepts an amount of up to nine digits and two decimals, above zero', () => {
    for (const ok of ['1', '12.5', '0.01', '999999999.99']) expect('payload' in build('upi', ID, { name: 'Jane', amount: ok })).toBe(true);
    for (const bad of ['0', '0.00', '12.505', '1000000000', '-1', '1e3', '12,5', '.5', 'abc']) {
      expect(payload(build('upi', ID, { name: 'Jane', amount: bad }))).toBe('PROBLEM: Enter an amount like 12 or 12.50.');
    }
  });
});
