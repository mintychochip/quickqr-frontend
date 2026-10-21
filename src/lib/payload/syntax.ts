/**
 * What typed text looks like. Small checks shared by the detector, which uses them to guess a type, and by the
 * type builders, which use them to refuse input that cannot be one.
 */

const WEB_LINK = /^https?:\/\//i;
const EMAIL = /^[^\s@<>()[\],;:"\\]+@[^\s@<>()[\],;:"\\]+\.[A-Za-z]{2,}$/;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#]\S*)?$/i;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::\d{1,5})?(?:[/?#]\S*)?$/;
const PHONE_CHARS = /^\+?[\d\s().-]+$/;
const COORDINATES = /^([+-]?\d{1,2}(?:\.\d+)?)\s*(?:,\s*|\s+)([+-]?\d{1,3}(?:\.\d+)?)$/;

export function isEmail(text: string): boolean {
  return EMAIL.test(text);
}

/** Starts with `http://` or `https://`. Says nothing about whether what follows is an address. */
export function isWebLink(text: string): boolean {
  return WEB_LINK.test(text);
}

export function hasHost(text: string): boolean {
  try {
    return new URL(text).hostname !== '';
  } catch {
    return false;
  }
}

/** A domain or IPv4 address written without `https://`, optionally with a port and a path. */
export function isBareAddress(text: string): boolean {
  if (DOMAIN.test(text)) return true;
  const octets = IPV4.exec(text);
  return octets !== null && octets.slice(1, 5).every((octet) => Number(octet) <= 255);
}

/** The web address `text` means: a link as typed, or `https://` added to a bare domain. Null when it is neither. */
export function webAddress(text: string): string | null {
  if (isWebLink(text)) return hasHost(text) ? text : null;
  return isBareAddress(text) ? `https://${text}` : null;
}

/**
 * The digits of something written like a phone number, with whether it began with `+`. Null when other characters
 * are present, or there are fewer than `min` digits or more than 15 (the most any number can have). A country
 * code is never guessed.
 */
export function phoneNumber(text: string, min: number): { plus: boolean; digits: string } | null {
  if (!PHONE_CHARS.test(text)) return null;
  const digits = text.replace(/\D/g, '');
  if (digits.length < min || digits.length > 15) return null;
  return { plus: text.startsWith('+'), digits };
}

/** How a number is written in a tel: or sms: link: its digits, and a + only if one was typed. */
export function dialled(number: { plus: boolean; digits: string }): string {
  return `${number.plus ? '+' : ''}${number.digits}`;
}

/** A latitude and longitude, kept exactly as typed (a leading `+` dropped). Null outside the globe. */
export function coordinates(text: string): { lat: string; lng: string } | null {
  const found = COORDINATES.exec(text.trim());
  if (!found) return null;
  const lat = found[1]!.replace(/^\+/, '');
  const lng = found[2]!.replace(/^\+/, '');
  return Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180 ? { lat, lng } : null;
}
