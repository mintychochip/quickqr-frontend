import { cleanValues, visibleFields } from './fields';
import { placesTypes } from './places';
import type { Built } from './types';

/** What the studio does: clean what was typed, then ask the type to build. */
function build(id: string, bar: string, values: Record<string, string> = {}): Built {
  const type = placesTypes.find((t) => t.id === id);
  if (!type) throw new Error(`no type ${id}`);
  return type.build(bar, cleanValues(type, values));
}

const payload = (built: Built) => ('payload' in built ? built.payload : `PROBLEM: ${built.problem}`);

/** TEXT as RFC 5545 allows it: a backslash, semicolon or comma only as an escape, and no line break inside the line. */
const VALID_TEXT = /^(?:[^\\;,\r\n]|\\[nN;,\\])*$/;

/** An iCalendar reader written for the test, so the builder is not marked by its own rules. Names keep their parameters. */
function readCalendar(text: string): Record<string, string | undefined> {
  const properties: Record<string, string | undefined> = {};
  for (const line of text.split('\r\n')) {
    const colon = line.indexOf(':');
    const value = line.slice(colon + 1);
    if (!VALID_TEXT.test(value)) throw new Error(`not valid iCalendar text: ${JSON.stringify(value)}`);
    properties[line.slice(0, colon)] = value.replace(/\\([nN;,\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
  }
  return properties;
}

describe('the places types', () => {
  test('are location, directions and event, in the places group', () => {
    expect(placesTypes.map((t) => [t.id, t.label, t.group])).toEqual([
      ['location', 'Location', 'places'],
      ['directions', 'Directions', 'places'],
      ['event', 'Event', 'places'],
    ]);
  });
});

describe('location', () => {
  test('writes a geo: link for coordinates, as typed', () => {
    expect(payload(build('location', '37.7749, -122.4194'))).toBe('geo:37.7749,-122.4194');
    expect(payload(build('location', '37.7749 -122.4194'))).toBe('geo:37.7749,-122.4194');
    expect(payload(build('location', '+37.7749,-122.4194'))).toBe('geo:37.7749,-122.4194');
    expect(payload(build('location', '37.7700, -122.4100'))).toBe('geo:37.7700,-122.4100');
    expect(payload(build('location', '-33.8688, 151.2093'))).toBe('geo:-33.8688,151.2093');
  });

  test('turns an address into a Google Maps search that reads back as typed', () => {
    for (const address of ['1 Main St, Springfield', 'Café & Bar #1, Zürich', '東京都千代田区 1-1', '95.0, 10.0']) {
      const url = new URL(payload(build('location', address)));
      expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/');
      expect(url.searchParams.get('api')).toBe('1');
      expect(url.searchParams.get('query')).toBe(address);
    }
  });
});

describe('directions', () => {
  test('sends the destination to Google Maps directions, reading back as typed', () => {
    for (const address of ['1 Main St, Springfield', 'Café & Bar #1, Zürich']) {
      const url = new URL(payload(build('directions', address)));
      expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
      expect(url.searchParams.get('api')).toBe('1');
      expect(url.searchParams.get('destination')).toBe(address);
    }
  });

  test('takes coordinates as a latitude,longitude destination', () => {
    const url = new URL(payload(build('directions', '37.7749 -122.4194')));
    expect(url.searchParams.get('destination')).toBe('37.7749,-122.4194');
  });
});

describe('event', () => {
  const type = placesTypes.find((t) => t.id === 'event')!;

  test('shows the time fields for a timed event and the day fields for an all-day one', () => {
    const keys = (values: Record<string, string>) => visibleFields(type, values).map((f) => f.key);
    expect(keys({})).toEqual(['allDay', 'starts', 'ends', 'place', 'notes']);
    expect(keys({ allDay: 'true' })).toEqual(['allDay', 'startDate', 'endDate', 'place', 'notes']);
  });

  test('writes a timed event in the exact iCalendar layout, floating local time', () => {
    const text = payload(
      build('event', 'Spring tasting', {
        starts: '2026-10-21T18:00',
        ends: '2026-10-21T20:00',
        place: 'Main Hall',
        notes: 'Bring a friend',
      }),
    );
    expect(text).toBe(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//quickqr.app//EN',
        'BEGIN:VEVENT',
        'SUMMARY:Spring tasting',
        'DTSTART:20261021T180000',
        'DTEND:20261021T200000',
        'LOCATION:Main Hall',
        'DESCRIPTION:Bring a friend',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
    );
  });

  test('leaves out the end, place and notes when they are empty, and never uses a bare line feed', () => {
    const text = payload(build('event', 'Drop-in', { starts: '2026-10-21T09:05' }));
    expect(readCalendar(text)).toEqual({
      'BEGIN': 'VEVENT',
      'VERSION': '2.0',
      'PRODID': '-//quickqr.app//EN',
      'SUMMARY': 'Drop-in',
      'DTSTART': '20261021T090500',
      'END': 'VCALENDAR',
    });
    expect(/(?<!\r)\n/.test(text)).toBe(false);
  });

  test('accepts an end equal to the start', () => {
    const text = payload(build('event', 'Moment', { starts: '2026-10-21T18:00', ends: '2026-10-21T18:00' }));
    expect(readCalendar(text).DTEND).toBe('20261021T180000');
  });

  test('writes an all-day event with an exclusive end: the day after the last day', () => {
    const text = payload(build('event', 'Fair', { allDay: 'true', startDate: '2026-10-21' }));
    const read = readCalendar(text);
    expect(read['DTSTART;VALUE=DATE']).toBe('20261021');
    expect(read['DTEND;VALUE=DATE']).toBe('20261022');
    expect(read.DTSTART).toBe(undefined);

    const days = readCalendar(payload(build('event', 'Fair', { allDay: 'true', startDate: '2026-10-21', endDate: '2026-10-23' })));
    expect(days['DTEND;VALUE=DATE']).toBe('20261024');
    const one = readCalendar(payload(build('event', 'Fair', { allDay: 'true', startDate: '2026-10-21', endDate: '2026-10-21' })));
    expect(one['DTEND;VALUE=DATE']).toBe('20261022');
  });

  const ROLLOVERS: ReadonlyArray<readonly [start: string, end: string]> = [
    ['2026-03-31', '20260401'],
    ['2026-12-31', '20270101'],
    ['2028-02-28', '20280229'],
    ['2028-02-29', '20280301'],
    ['2027-02-28', '20270301'],
    ['0099-12-31', '01000101'],
  ];
  const endsOn = (startDate: string) =>
    readCalendar(payload(build('event', 'Fair', { allDay: 'true', startDate })))['DTEND;VALUE=DATE'];

  test('rolls the exclusive end over month, year and leap day', () => {
    for (const [start, end] of ROLLOVERS) expect(endsOn(start)).toBe(end);
  });

  test('gives the same days in a time zone behind UTC, where local midnight is the evening before', () => {
    const zone = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
      for (const [start, end] of ROLLOVERS) expect(endsOn(start)).toBe(end);
      expect(readCalendar(payload(build('event', 'Fair', { allDay: 'true', startDate: '2026-10-21' })))['DTSTART;VALUE=DATE']).toBe('20261021');
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
  });

  test('says what is missing, and refuses an end before the start', () => {
    expect(payload(build('event', 'Fair'))).toBe('PROBLEM: Pick when the event starts.');
    expect(payload(build('event', 'Fair', { allDay: 'true' }))).toBe('PROBLEM: Pick the day the event starts.');
    expect(payload(build('event', 'Fair', { starts: '2026-10-21T18:00', ends: '2026-10-21T17:59' }))).toBe(
      'PROBLEM: The event ends before it starts.',
    );
    expect(payload(build('event', 'Fair', { allDay: 'true', startDate: '2026-10-21', endDate: '2026-10-20' }))).toBe(
      'PROBLEM: The event ends before it starts.',
    );
  });

  test('only reads the fields of the mode that is on', () => {
    const allDay = readCalendar(
      payload(build('event', 'Fair', { allDay: 'true', startDate: '2026-10-21', starts: '2026-01-01T00:00', ends: '2026-01-02T00:00' })),
    );
    expect(allDay['DTSTART;VALUE=DATE']).toBe('20261021');
    expect(allDay.DTSTART).toBe(undefined);
    expect(allDay.DTEND).toBe(undefined);

    const timed = readCalendar(payload(build('event', 'Fair', { starts: '2026-10-21T18:00', startDate: '2026-01-01', endDate: '2026-01-02' })));
    expect(timed.DTSTART).toBe('20261021T180000');
    expect(timed['DTSTART;VALUE=DATE']).toBe(undefined);
    expect(timed['DTEND;VALUE=DATE']).toBe(undefined);
  });

  test('escapes the title, place and notes so that they read back as typed', () => {
    const title = 'Wine, cheese; and more \\ done';
    const place = 'Hall A, Floor 2; "East" wing';
    const notes = 'Line one\nLine two, café 日本語';
    const text = payload(build('event', title, { starts: '2026-10-21T18:00', place, notes }));
    const read = readCalendar(text);
    expect(read.SUMMARY).toBe(title);
    expect(read.LOCATION).toBe(place);
    expect(read.DESCRIPTION).toBe(notes);
    expect(text.split('\r\n')).toHaveLength(10);
  });
});
