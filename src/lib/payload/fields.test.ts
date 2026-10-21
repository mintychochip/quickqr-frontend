import { cleanValues, visibleFields } from './fields';
import type { QrType } from './types';

/** A type of our own, so these tests say nothing about the real ones. */
const made: QrType = {
  id: 'text',
  label: 'Made up',
  group: 'everyday',
  bar: { label: 'Bar', placeholder: '' },
  fields: [
    {
      key: 'mode',
      label: 'Mode',
      control: 'select',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    },
    { key: 'name', label: 'Name', control: 'text' },
    { key: 'extra', label: 'Extra', control: 'text', when: (v) => v.mode === 'b' },
    { key: 'flag', label: 'Flag', control: 'checkbox' },
    { key: 'day', label: 'Day', control: 'date', when: (v) => v.flag === 'true' },
    { key: 'at', label: 'At', control: 'datetime' },
  ],
  build: () => ({ payload: '' }),
};

describe('cleanValues', () => {
  test('gives every field an entry, empty when nothing was typed, and the first option for a select', () => {
    expect(cleanValues(made, {})).toEqual({ mode: 'a', name: '', extra: '', flag: '', day: '', at: '' });
  });

  test('trims text', () => {
    expect(cleanValues(made, { name: '  Jane  ' }).name).toBe('Jane');
  });

  test('keeps a select value that is an option and falls back to the first for one that is not', () => {
    expect(cleanValues(made, { mode: 'b' }).mode).toBe('b');
    expect(cleanValues(made, { mode: 'c' }).mode).toBe('a');
  });

  test('a checkbox is "true" or empty, whatever else it was given', () => {
    expect(cleanValues(made, { flag: 'true' }).flag).toBe('true');
    for (const other of ['on', '1', 'false', 'TRUE', ' true']) expect(cleanValues(made, { flag: other }).flag).toBe('');
  });

  test('a date and a datetime are kept only when well formed', () => {
    expect(cleanValues(made, { flag: 'true', day: '2026-10-21', at: '2026-10-21T18:30' })).toEqual({
      mode: 'a',
      name: '',
      extra: '',
      flag: 'true',
      day: '2026-10-21',
      at: '2026-10-21T18:30',
    });
    expect(cleanValues(made, { flag: 'true', day: '21/10/2026' }).day).toBe('');
    expect(cleanValues(made, { at: '2026-10-21 18:30' }).at).toBe('');
    expect(cleanValues(made, { at: '2026-10-21T18:30:00' }).at).toBe('');
  });

  test('a field that is not showing is empty, even if something was typed into it earlier', () => {
    expect(cleanValues(made, { mode: 'a', extra: 'left over' }).extra).toBe('');
    expect(cleanValues(made, { mode: 'b', extra: 'now shown' }).extra).toBe('now shown');
    expect(cleanValues(made, { flag: '', day: '2026-10-21' }).day).toBe('');
  });

  test('whether a field shows is decided on the cleaned values, so an untouched select counts as its default', () => {
    const defaultsToB: QrType = {
      ...made,
      fields: [
        { key: 'mode', label: 'Mode', control: 'select', options: [{ value: 'b', label: 'B' }] },
        { key: 'extra', label: 'Extra', control: 'text', when: (v) => v.mode === 'b' },
      ],
    };
    expect(cleanValues(defaultsToB, { extra: 'x' }).extra).toBe('x');
  });

  test('ignores keys the type does not have', () => {
    expect(Object.keys(cleanValues(made, { nope: 'x', name: 'y' }))).toEqual(['mode', 'name', 'extra', 'flag', 'day', 'at']);
  });
});

describe('visibleFields', () => {
  const keys = (values: Record<string, string>) => visibleFields(made, values).map((f) => f.key);

  test('lists the fields whose condition holds, in order', () => {
    expect(keys({})).toEqual(['mode', 'name', 'flag', 'at']);
    expect(keys({ mode: 'b', flag: 'true' })).toEqual(['mode', 'name', 'extra', 'flag', 'day', 'at']);
  });

  test('agrees with cleanValues about what is hidden', () => {
    const values = { mode: 'a', flag: '' };
    const shown = keys(values);
    const hidden = Object.keys(cleanValues(made, values)).filter((key) => !shown.includes(key));
    expect(hidden).toEqual(['extra', 'day']);
  });

  test('an untouched select counts as its default for what shows', () => {
    const defaultsToB: QrType = {
      ...made,
      fields: [
        { key: 'mode', label: 'Mode', control: 'select', options: [{ value: 'b', label: 'B' }] },
        { key: 'extra', label: 'Extra', control: 'text', when: (v) => v.mode === 'b' },
      ],
    };
    expect(visibleFields(defaultsToB, {}).map((f) => f.key)).toEqual(['mode', 'extra']);
  });
});
