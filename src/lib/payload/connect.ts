import { byteLength, escapeText, query } from './format';
import { dialled, isEmail, phoneNumber, webAddress } from './syntax';
import type { Built, QrType, Values } from './types';

const WIFI_SPECIAL = /[\\;,:"]/g;
const HEX_KEY = /^[0-9a-fA-F]{64}$/;

/**
 * A Wi-Fi name or password with the characters that would end or split a field escaped. Values that look like hex
 * are left bare, as Android's own generator leaves them: the ZXing wiki suggests quotes for old scanners that read
 * bare hex as bytes, but nothing shows iPhones dropping the quotes again, and digit-only passwords are common.
 */
function wifiText(text: string): string {
  return text.replace(WIFI_SPECIAL, '\\$&');
}

function wifiPassword(security: string, password: string): string | null {
  if (security === 'nopass') return null;
  if (!password) return 'Add the Wi-Fi password, or choose No password.';
  if (security === 'WPA') {
    // A WPA passphrase is 8 to 63 characters; 64 hex digits are the key itself.
    const bytes = byteLength(password);
    if ((bytes < 8 || bytes > 63) && !HEX_KEY.test(password)) return 'WPA passwords are 8 to 63 characters.';
  }
  return null;
}

function buildWifi(ssid: string, values: Values): Built {
  // 802.11 caps a network name at 32 bytes.
  if (byteLength(ssid) > 32) return { problem: 'Network names are at most 32 characters.' };
  const security = values.security!;
  const problem = wifiPassword(security, values.password!);
  if (problem) return { problem };
  const fields = [`T:${security}`, `S:${wifiText(ssid)}`];
  if (security !== 'nopass') fields.push(`P:${wifiText(values.password!)}`);
  if (values.hidden === 'true') fields.push('H:true');
  return { payload: `WIFI:${fields.join(';')};;` };
}

/** The last word is the family name, the rest are given names. Good enough to file the card; FN carries the full name. */
function splitName(name: string): { family: string; given: string; full: string } {
  const words = name.split(/\s+/);
  const family = words.length > 1 ? words[words.length - 1]! : '';
  const given = words.length > 1 ? words.slice(0, -1).join(' ') : words[0]!;
  return { family, given, full: words.join(' ') };
}

function buildContact(name: string, values: Values): Built {
  const phone = values.phone ? phoneNumber(values.phone, 3) : null;
  if (values.phone && !phone) return { problem: 'Enter the phone number with digits, spaces, + ( ) - and .' };
  if (values.email && !isEmail(values.email)) return { problem: 'That email address does not look right.' };
  const website = values.website ? webAddress(values.website) : null;
  if (values.website && !website) return { problem: 'Enter the website like example.com.' };

  const { family, given, full } = splitName(name);
  // TEL, EMAIL and URL are not TEXT, so they are written as they are: escaping a comma in a URL would corrupt it.
  // Lines are not folded at 75 octets, which importers accept and which keeps the code small.
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeText(family)};${escapeText(given)};;;`,
    `FN:${escapeText(full)}`,
    ...(values.company ? [`ORG:${escapeText(values.company)}`] : []),
    ...(values.title ? [`TITLE:${escapeText(values.title)}`] : []),
    ...(phone ? [`TEL;TYPE=CELL:${dialled(phone)}`] : []),
    ...(values.email ? [`EMAIL:${values.email}`] : []),
    ...(website ? [`URL:${website}`] : []),
    ...(values.address ? [`ADR;TYPE=WORK:;;${escapeText(values.address)};;;;`] : []),
    ...(values.note ? [`NOTE:${escapeText(values.note)}`] : []),
    'END:VCARD',
  ];
  return { payload: lines.join('\r\n') };
}

/** Where a username lives on each network. Usernames are limited to unreserved characters, so they need no encoding. */
const PROFILE_ROOT: Record<string, string> = {
  instagram: 'https://instagram.com/',
  x: 'https://x.com/',
  tiktok: 'https://www.tiktok.com/@',
  facebook: 'https://facebook.com/',
  linkedin: 'https://www.linkedin.com/in/',
  youtube: 'https://www.youtube.com/@',
  telegram: 'https://t.me/',
  github: 'https://github.com/',
  snapchat: 'https://www.snapchat.com/add/',
  pinterest: 'https://www.pinterest.com/',
};

const USERNAME = /^[A-Za-z0-9._-]{1,100}$/;
const WWW = /^www\./i;

function buildSocial(bar: string, values: Values): Built {
  // A dot alone does not make a link: jane.doe is a username. A slash (which every https:// has) or a www. does.
  if (WWW.test(bar) || bar.includes('/')) {
    const address = webAddress(bar);
    return address ? { payload: address } : { problem: 'Enter a profile link like instagram.com/yourname, or just the username.' };
  }
  const username = bar.replace(/^@/, '');
  if (!USERNAME.test(username)) return { problem: 'Usernames use letters, numbers, dots, dashes and underscores.' };
  return { payload: `${PROFILE_ROOT[values.service!]}${username}` };
}

const PLACE_ID = /^[A-Za-z0-9_-]{20,}$/;

function buildReview(bar: string): Built {
  const id = /placeid=([^&#\s]+)/i.exec(bar)?.[1] ?? bar;
  if (!PLACE_ID.test(id)) return { problem: 'Paste the Place ID from Google. It is a long code, often starting with ChIJ.' };
  return { payload: `https://search.google.com/local/writereview${query([['placeid', id]])}` };
}

export const connectTypes: readonly QrType[] = [
  {
    id: 'wifi',
    label: 'Wi-Fi',
    group: 'connect',
    bar: { label: 'Network name', placeholder: 'Cafe Guest' },
    fields: [
      {
        key: 'security',
        label: 'Security',
        control: 'select',
        options: [
          { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
          { value: 'WEP', label: 'WEP' },
          { value: 'nopass', label: 'No password' },
        ],
      },
      { key: 'password', label: 'Password', control: 'text', when: (v) => v.security !== 'nopass' },
      { key: 'hidden', label: 'Hidden network', control: 'checkbox' },
    ],
    note: 'Anyone who can scan the printed code can join the network.',
    build: buildWifi,
  },
  {
    id: 'contact',
    label: 'Contact',
    group: 'connect',
    bar: { label: 'Full name', placeholder: 'Jane Doe' },
    fields: [
      { key: 'company', label: 'Company', control: 'text' },
      { key: 'title', label: 'Job title', control: 'text' },
      { key: 'phone', label: 'Phone', control: 'text', inputMode: 'tel' },
      { key: 'email', label: 'Email', control: 'text', inputMode: 'email' },
      { key: 'website', label: 'Website', control: 'text', inputMode: 'url' },
      { key: 'address', label: 'Address', control: 'text' },
      { key: 'note', label: 'Note', control: 'text' },
    ],
    build: buildContact,
  },
  {
    id: 'social',
    label: 'Social profile',
    group: 'connect',
    bar: { label: 'Username or profile link', placeholder: '@yourname' },
    fields: [
      {
        key: 'service',
        label: 'Network',
        control: 'select',
        options: [
          { value: 'instagram', label: 'Instagram' },
          { value: 'x', label: 'X' },
          { value: 'tiktok', label: 'TikTok' },
          { value: 'facebook', label: 'Facebook' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'telegram', label: 'Telegram' },
          { value: 'github', label: 'GitHub' },
          { value: 'snapchat', label: 'Snapchat' },
          { value: 'pinterest', label: 'Pinterest' },
        ],
      },
    ],
    build: buildSocial,
  },
  {
    id: 'review',
    label: 'Google review',
    group: 'connect',
    bar: { label: 'Google Place ID', placeholder: 'ChIJ...' },
    fields: [],
    build: buildReview,
  },
];
