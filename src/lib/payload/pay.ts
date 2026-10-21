import { byteLength, query } from './format';
import type { Built, QrType, Values } from './types';

const BAD_AMOUNT = 'Enter an amount like 12 or 12.50.';

/** A plain decimal above zero: at most `whole` digits before the point and `places` after it, nothing else. */
function isAmount(text: string, whole: number, places: number): boolean {
  return new RegExp(`^\\d{1,${whole}}(?:\\.\\d{1,${places}})?$`).test(text) && Number(text) > 0;
}

const HANDLE = /^[A-Za-z0-9._-]{1,50}$/;

function buildPayment(bar: string, values: Values): Built {
  const handle = bar.replace(/^[@$]/, '');
  if (!HANDLE.test(handle)) return { problem: 'Usernames use letters, numbers, dots, dashes and underscores.' };
  const { amount } = values;
  if (amount && !isAmount(amount, 7, 2)) return { problem: BAD_AMOUNT };
  switch (values.service) {
    case 'paypal':
      return { payload: `https://paypal.me/${handle}${amount ? `/${amount}${values.currency}` : ''}` };
    case 'cashapp':
      return { payload: `https://cash.app/$${handle}${amount ? `/${amount}` : ''}` };
    default:
      return { payload: `https://venmo.com/u/${handle}` };
  }
}

/**
 * Address shapes only, not checksums: they catch a wrong coin, a cut-off paste and a stray character, which are
 * the mistakes people make. Addresses are case-sensitive, so they are written exactly as typed.
 */
const COINS: Record<string, { name: string; address: RegExp }> = {
  bitcoin: { name: 'Bitcoin', address: /^(?:bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/ },
  ethereum: { name: 'Ethereum', address: /^0x[0-9a-fA-F]{40}$/ },
  litecoin: { name: 'Litecoin', address: /^(?:ltc1[ac-hj-np-z02-9]{11,71}|[LM3][a-km-zA-HJ-NP-Z1-9]{26,33})$/ },
  dogecoin: { name: 'Dogecoin', address: /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/ },
  bitcoincash: { name: 'Bitcoin Cash', address: /^(?:bitcoincash:)?[qp][a-z0-9]{41}$/ },
};

function buildCrypto(bar: string, values: Values): Built {
  const coin = values.coin!;
  const { name, address } = COINS[coin]!;
  if (!address.test(bar)) return { problem: `That ${name} address does not look right.` };
  if (values.amount && !isAmount(values.amount, 8, 8)) return { problem: 'Enter an amount like 0.01.' };
  // BIP 21. Ethereum has no place for these, and its fields are hidden, so they arrive empty and `query` drops them.
  const pairs = [['amount', values.amount!], ['label', values.label!], ['message', values.message!]] as const;
  return { payload: `${coin}:${bar.replace(/^bitcoincash:/, '')}${query(pairs)}` };
}

const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
const BIC = /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/;
/** The EPC standard's cap for the whole code. */
const EPC_MAX_BYTES = 331;

/** ISO 7064 mod 97-10, one digit at a time so that the number never outgrows a double. */
function ibanChecks(iban: string): boolean {
  const moved = iban.slice(4) + iban.slice(0, 4);
  const digits = [...moved].map((c) => (c >= 'A' ? String(c.charCodeAt(0) - 55) : c)).join('');
  let remainder = 0;
  for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

function buildSepa(name: string, values: Values): Built {
  if ([...name].length > 70) return { problem: 'Use at most 70 characters for the name.' };
  const iban = values.iban!.replace(/\s+/g, '').toUpperCase();
  if (!iban) return { problem: 'Add the IBAN of the account that gets the money.' };
  if (!IBAN.test(iban) || !ibanChecks(iban)) return { problem: 'That IBAN does not pass its check. Look at the digits again.' };
  if (values.amount && !isAmount(values.amount, 9, 2)) return { problem: BAD_AMOUNT };
  if ([...values.reference!].length > 140) return { problem: 'Use at most 140 characters for the reference.' };
  const bic = values.bic!.toUpperCase();
  if (bic && !BIC.test(bic)) return { problem: 'Enter the BIC like DEUTDEFF.' };

  // Banking apps read the amount as EUR and two decimals, the way every generator writes it.
  const [whole = '', fraction = ''] = values.amount!.split('.');
  const amount = values.amount ? `EUR${Number(whole)}.${fraction.padEnd(2, '0')}` : '';
  // Version 002, UTF-8, SEPA credit transfer. The purpose and structured reference lines stay empty.
  const lines = ['BCD', '002', '1', 'SCT', bic, name, iban, amount, '', '', values.reference!];
  while (lines[lines.length - 1] === '') lines.pop();
  const payload = lines.join('\n');
  if (byteLength(payload) > EPC_MAX_BYTES) return { problem: 'Too long for a bank-transfer code. Shorten the name or reference.' };
  return { payload };
}

const UPI_ID = /^[A-Za-z0-9._-]{2,}@[A-Za-z][A-Za-z0-9]+$/;

function buildUpi(id: string, values: Values): Built {
  if (!UPI_ID.test(id)) return { problem: 'Enter the UPI ID like name@bank.' };
  if (!values.name) return { problem: 'Add the name of the person or shop being paid.' };
  if (values.amount && !isAmount(values.amount, 9, 2)) return { problem: BAD_AMOUNT };
  // The @ stays bare in `pa`, which is how UPI apps expect it. The rest is encoded, behind & instead of ?.
  const rest = query([['pn', values.name], ['am', values.amount!], ['cu', values.amount ? 'INR' : ''], ['tn', values.note!]]);
  return { payload: `upi://pay?pa=${id}${rest.replace('?', '&')}` };
}

export const payTypes: readonly QrType[] = [
  {
    id: 'payment',
    label: 'Payment link',
    group: 'pay',
    bar: { label: 'Username', placeholder: '@yourname' },
    fields: [
      {
        key: 'service',
        label: 'Service',
        control: 'select',
        options: [
          { value: 'paypal', label: 'PayPal' },
          { value: 'cashapp', label: 'Cash App' },
          { value: 'venmo', label: 'Venmo' },
        ],
      },
      { key: 'amount', label: 'Amount (optional)', control: 'text', inputMode: 'decimal', when: (v) => v.service !== 'venmo' },
      {
        key: 'currency',
        label: 'Currency',
        control: 'select',
        options: [
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR' },
          { value: 'GBP', label: 'GBP' },
          { value: 'CAD', label: 'CAD' },
          { value: 'AUD', label: 'AUD' },
          { value: 'CHF', label: 'CHF' },
        ],
        when: (v) => v.service === 'paypal',
      },
    ],
    note: 'Scan the code yourself before sharing it. A wrong username sends money to someone else.',
    build: buildPayment,
  },
  {
    id: 'crypto',
    label: 'Crypto',
    group: 'pay',
    bar: { label: 'Wallet address', placeholder: 'bc1q...' },
    fields: [
      {
        key: 'coin',
        label: 'Coin',
        control: 'select',
        options: [
          { value: 'bitcoin', label: 'Bitcoin' },
          { value: 'ethereum', label: 'Ethereum' },
          { value: 'litecoin', label: 'Litecoin' },
          { value: 'dogecoin', label: 'Dogecoin' },
          { value: 'bitcoincash', label: 'Bitcoin Cash' },
        ],
      },
      { key: 'amount', label: 'Amount (optional)', control: 'text', inputMode: 'decimal', when: (v) => v.coin !== 'ethereum' },
      { key: 'label', label: 'Label (optional)', control: 'text', when: (v) => v.coin !== 'ethereum' },
      { key: 'message', label: 'Message (optional)', control: 'text', when: (v) => v.coin !== 'ethereum' },
    ],
    note: 'Check the address twice. A code with a wrong address sends money nowhere, and it cannot be undone.',
    build: buildCrypto,
  },
  {
    id: 'sepa',
    label: 'Bank transfer',
    group: 'pay',
    bar: { label: 'Beneficiary name', placeholder: 'Jane Doe' },
    fields: [
      { key: 'iban', label: 'IBAN', control: 'text', placeholder: 'DE89 3704 0044 0532 0130 00' },
      { key: 'amount', label: 'Amount in EUR (optional)', control: 'text', inputMode: 'decimal' },
      { key: 'reference', label: 'Payment reference (optional)', control: 'text' },
      { key: 'bic', label: 'BIC (only needed outside the EU/EEA)', control: 'text' },
    ],
    note: 'Scan the code with your banking app before sharing it. A wrong IBAN sends money to someone else.',
    build: buildSepa,
  },
  {
    id: 'upi',
    label: 'UPI',
    group: 'pay',
    bar: { label: 'UPI ID', placeholder: 'name@bank' },
    fields: [
      { key: 'name', label: 'Payee name', control: 'text' },
      { key: 'amount', label: 'Amount in INR (optional)', control: 'text', inputMode: 'decimal' },
      { key: 'note', label: 'Note (optional)', control: 'text' },
    ],
    note: 'Scan the code yourself before sharing it. A wrong UPI ID sends money to someone else.',
    build: buildUpi,
  },
];
