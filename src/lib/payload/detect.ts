import { coordinates, dialled, hasHost, isBareAddress, isEmail, isWebLink, phoneNumber } from './syntax';
import type { TypeId } from './types';

/**
 * `guessed` is true when the type was inferred from the shape of the text (a bare domain, digits, an @) rather
 * than named by a scheme such as `https:` or `tel:`. Only a guess is worth offering to undo.
 */
export type Detection = { id: TypeId; payload: string; guessed: boolean };

/** Payloads someone pasted already formatted. They go in exactly as typed. */
const FORMATTED: Record<string, TypeId> = {
  'tel:': 'phone',
  'mailto:': 'email',
  'sms:': 'sms',
  'smsto:': 'sms',
  'geo:': 'location',
  'wifi:': 'wifi',
  'mecard:': 'contact',
  'begin:vcard': 'contact',
  'begin:vcalendar': 'event',
  'begin:vevent': 'event',
  'bitcoin:': 'crypto',
  'ethereum:': 'crypto',
  'litecoin:': 'crypto',
  'dogecoin:': 'crypto',
  'bitcoincash:': 'crypto',
  'upi://': 'upi',
};

/** The EPC bank-transfer code opens with its service tag and a version line, on lines of their own. */
const EPC = /^BCD\r?\n00[12]\r?\n/;
/** Two numbers with decimals. A pair of whole numbers is too likely to be something else. */
const DECIMAL_PAIR = /^[+-]?\d{1,2}\.\d+\s*(?:,\s*|\s+)[+-]?\d{1,3}\.\d+$/;
/** 2024-01-15 and 15.01.2024 are made of phone-number characters but are not phone numbers. */
const DATE_LIKE = /^\d{1,4}([-.])\d{1,2}\1\d{1,4}$/;

/**
 * What `text`, trimmed and not empty, most likely is. Anything that is not clearly something else is text, and
 * `javascript:`, `data:`, `ftp:` and `file:` are text too: only http and https ever count as a link.
 */
export function detect(text: string): Detection {
  const lower = text.toLowerCase();
  for (const [prefix, id] of Object.entries(FORMATTED)) {
    if (lower.startsWith(prefix)) return { id, payload: text, guessed: false };
  }
  if (EPC.test(text)) return { id: 'sepa', payload: text, guessed: false };

  if (isWebLink(text)) return hasHost(text) ? { id: 'link', payload: text, guessed: false } : { id: 'text', payload: text, guessed: false };
  if (isEmail(text)) return { id: 'email', payload: `mailto:${text}`, guessed: true };
  if (isBareAddress(text)) return { id: 'link', payload: `https://${text}`, guessed: true };

  const point = DECIMAL_PAIR.test(text) ? coordinates(text) : null;
  if (point) return { id: 'location', payload: `geo:${point.lat},${point.lng}`, guessed: true };

  const number = DATE_LIKE.test(text) ? null : phoneNumber(text, 7);
  if (number) return { id: 'phone', payload: `tel:${dialled(number)}`, guessed: true };
  return { id: 'text', payload: text, guessed: false };
}
