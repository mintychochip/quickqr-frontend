/**
 * Decides what the studio's bar holds and what the QR code carries. The preview, the Create button and the
 * downloads all read this one answer, so they cannot disagree.
 *
 * The bar is auto-detected until a type is chosen. Web links keep their redirect and compression flows;
 * everything else goes into the code as it is, because the backend only redirects to web addresses (it rewrites
 * any other destination to `https://...`).
 */

import { connectTypes } from './connect';
import { detect } from './detect';
import { everydayTypes } from './everyday';
import { cleanValues } from './fields';
import { byteLength } from './format';
import { payTypes } from './pay';
import { placesTypes } from './places';
import type { GroupId, QrType, TypeId, Values } from './types';

export { cleanValues, visibleFields } from './fields';
export type { Field, FieldValues, GroupId, QrType, TypeId, Values } from './types';

/** Largest direct payload in bytes. Level H codes top out near 1,270 bytes, and denser codes stop scanning. */
export const MAX_DIRECT_BYTES = 1000;

/** Every type, in the order the menu lists them. */
export const TYPES: readonly QrType[] = [...everydayTypes, ...placesTypes, ...connectTypes, ...payTypes];

export const TYPE_BY_ID = Object.fromEntries(TYPES.map((type) => [type.id, type])) as Record<TypeId, QrType>;

const GROUP_LABELS: ReadonlyArray<{ id: GroupId; label: string }> = [
  { id: 'everyday', label: 'Everyday' },
  { id: 'places', label: 'Places & time' },
  { id: 'connect', label: 'Connect' },
  { id: 'pay', label: 'Pay' },
];

export const GROUPS = GROUP_LABELS.map(({ id, label }) => ({ id, label, types: TYPES.filter((type) => type.group === id) }));

export type Resolved =
  | { status: 'empty' }
  | { status: 'too-long'; limit: number }
  /** A type was chosen and the bar or its fields do not fit it. `problem` says what to change. */
  | { status: 'invalid'; type: QrType; problem: string }
  /** `guessed` is true when auto-detect inferred the type from the shape of the text. Only a guess is worth offering to undo. */
  | { status: 'ready'; type: QrType; payload: string; guessed: boolean };

/** A type the person chose, with what they filled in under the bar. */
export type Forced = { type: TypeId; values?: Values };

function fitted(type: QrType, payload: string, guessed: boolean): Resolved {
  // A link is shortened or compressed elsewhere, so only what goes into the code as it is has to fit.
  if (type.id !== 'link' && byteLength(payload) > MAX_DIRECT_BYTES) return { status: 'too-long', limit: MAX_DIRECT_BYTES };
  return { status: 'ready', type, payload, guessed };
}

/** What `raw` is and what the code should hold. Without `forced`, the type is detected from the text. */
export function resolve(raw: string, forced?: Forced): Resolved {
  const bar = raw.trim();
  if (!bar) return { status: 'empty' };
  if (!forced) {
    const found = detect(bar);
    return fitted(TYPE_BY_ID[found.id], found.payload, found.guessed);
  }
  const type = TYPE_BY_ID[forced.type];
  const built = type.build(bar, cleanValues(type, forced.values ?? {}));
  return 'problem' in built ? { status: 'invalid', type, problem: built.problem } : fitted(type, built.payload, false);
}
